// server/src/jobs/processUnverifiedInvoices.ts
import { prisma } from '../db/client';
import { invoiceService } from '../services/invoiceService';
import { tonService } from '../services/tonService';
import { userService } from '../services/userService';
import { nakamaService } from '../services/nakamaService';
import { telegramBotService } from '../services/telegramBotService';
import { logger } from '../utils/logger';

const INTERVAL_MS = 5 * 60 * 1000; // Run every 5 minutes
const MIN_AGE_SECONDS = 90; // Only process invoices older than 90 seconds
const BATCH_LIMIT = 50; // Max invoices per run

let intervalId: NodeJS.Timeout | null = null;

export function startProcessUnverifiedInvoicesJob() {
  if (intervalId) {
    logger.warn('Process unverified invoices job already running');
    return;
  }

  logger.info('Starting process unverified invoices job', {
    intervalMs: INTERVAL_MS,
    minAgeSeconds: MIN_AGE_SECONDS,
    batchLimit: BATCH_LIMIT,
  });

  // Run immediately on start
  runProcessing();

  // Then run on interval
  intervalId = setInterval(runProcessing, INTERVAL_MS);
}

export function stopProcessUnverifiedInvoicesJob() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Stopped process unverified invoices job');
  }
}

async function runProcessing() {
  const startTime = Date.now();
  const stats = {
    processed: 0,
    verified: 0,
    expired: 0,
    skipped: 0,
    errors: 0,
    nakamaFailures: 0,
  };

  try {
    const invoices = await invoiceService.getUnverifiedInvoices(MIN_AGE_SECONDS, BATCH_LIMIT);

    if (invoices.length === 0) {
      return; // Nothing to process
    }

    logger.info('Processing unverified invoices', { count: invoices.length });

    for (const invoice of invoices) {
      stats.processed++;

      try {
        await processInvoice(invoice, stats);
      } catch (error) {
        stats.errors++;
        logger.error('Error processing invoice', {
          invoiceId: invoice.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('Process unverified invoices completed', { ...stats, durationMs: duration });
  } catch (error) {
    logger.error('Error in process unverified invoices job', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function processInvoice(
  invoice: {
    id: string;
    userId: string;
    memo: string;
    amountNano: string;
    amountCoins: number;
    senderAddress: string | null;
    expiresAt: Date;
    createdAt: Date;
  },
  stats: { verified: number; expired: number; skipped: number; errors: number; nakamaFailures: number }
) {
  // Check blockchain for transaction
  const verification = await tonService.verifyTransactionByMemoOptionalSender(
    invoice.memo,
    BigInt(invoice.amountNano),
    invoice.senderAddress
  );

  // If API error, skip this invoice (don't change status)
  if (!verification.verified && verification.error?.startsWith('API_ERROR:')) {
    logger.warn('Blockchain API error, skipping invoice', {
      invoiceId: invoice.id,
      error: verification.error,
    });
    stats.skipped++;
    return;
  }

  if (verification.verified && verification.transaction) {
    // Transaction found on blockchain - credit coins
    await creditInvoice(invoice, verification.transaction, stats);
  } else {
    // Transaction not found - check if should expire
    if (new Date() > invoice.expiresAt) {
      await expireInvoice(invoice.id);
      stats.expired++;
    } else {
      // Still within valid window, skip
      stats.skipped++;
    }
  }
}

async function creditInvoice(
  invoice: {
    id: string;
    userId: string;
    memo: string;
    amountNano: string;
    amountCoins: number;
    senderAddress: string | null;
  },
  transaction: {
    hash: string;
    lt: string;
    amount: string;
    sender: string;
    timestamp: number;
  },
  stats: { verified: number; nakamaFailures: number; errors: number }
) {
  const blockchainTxHash = transaction.hash;
  const senderAddress = transaction.sender;

  // Check if already processed (idempotency)
  // Note: Unique constraint on tonTxHash provides final protection against race conditions
  if (await invoiceService.isBlockchainTxHashUsed(blockchainTxHash)) {
    logger.info('Invoice already processed (blockchain tx exists)', {
      invoiceId: invoice.id,
      blockchainTxHash,
    });
    stats.verified++;
    return;
  }

  // Get user by internal ID
  const prismaUser = await getUserByInternalId(invoice.userId);
  if (!prismaUser) {
    logger.error('User not found for invoice', { invoiceId: invoice.id, userId: invoice.userId });
    stats.errors++;
    return;
  }

  // Credit coins to PostgreSQL
  const { transactionId } = await userService.addCoins(
    Number(prismaUser.telegramId),
    invoice.amountCoins,
    {
      tonTxHash: blockchainTxHash,
      tonAmount: BigInt(invoice.amountNano),
    }
  );

  // Update Nakama wallet
  let nakamaSynced = false;
  const nakamaUserId = await nakamaService.getNakamaUserIdFromTelegramId(Number(prismaUser.telegramId));

  if (nakamaUserId) {
    try {
      const nakamaResult = await nakamaService.updateUserWallet({
        userId: nakamaUserId,
        amount: invoice.amountCoins,
        tonTxHash: blockchainTxHash,
        tonAmount: invoice.amountNano,
        reason: 'ton_purchase_cron',
      });

      if (nakamaResult.success || nakamaResult.alreadyProcessed) {
        nakamaSynced = true;
        logger.info('Nakama wallet updated by cron', {
          invoiceId: invoice.id,
          userId: nakamaUserId,
          amount: invoice.amountCoins,
        });
      } else {
        logger.error('Nakama wallet update failed in cron', {
          invoiceId: invoice.id,
          error: nakamaResult.error,
        });
        stats.nakamaFailures++;
      }
    } catch (error) {
      logger.error('Nakama wallet update error in cron', {
        invoiceId: invoice.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      stats.nakamaFailures++;
    }
  } else {
    logger.warn('No Nakama user found for cron invoice', {
      invoiceId: invoice.id,
      telegramId: Number(prismaUser.telegramId),
    });
    // No Nakama user is okay - they might not have logged into game yet
    nakamaSynced = true; // Consider it synced since there's nothing to sync to
  }

  // Mark invoice appropriately
  if (nakamaSynced) {
    await invoiceService.markAsPaid(
      invoice.id,
      transactionId,
      '', // No BOC for cron-verified invoices
      blockchainTxHash,
      senderAddress
    );
  } else {
    await invoiceService.markAsPaidPendingNakama(
      invoice.id,
      transactionId,
      null,
      blockchainTxHash,
      senderAddress
    );
  }

  stats.verified++;
  logger.info('Invoice verified by cron', {
    invoiceId: invoice.id,
    blockchainTxHash,
    nakamaSynced,
  });

  // Send Telegram notification to user (non-blocking)
  try {
    const tonAmount = (Number(invoice.amountNano) / 1e9).toFixed(2);
    const notifyResult = await telegramBotService.sendPaymentNotification(
      Number(prismaUser.telegramId),
      tonAmount
    );

    if (notifyResult.success) {
      logger.info('Payment notification sent', {
        invoiceId: invoice.id,
        telegramId: Number(prismaUser.telegramId),
      });
    } else {
      logger.warn('Payment notification failed', {
        invoiceId: invoice.id,
        telegramId: Number(prismaUser.telegramId),
        error: notifyResult.error,
      });
    }
  } catch (error) {
    logger.error('Payment notification error', {
      invoiceId: invoice.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function expireInvoice(invoiceId: string) {
  await prisma.paymentInvoice.update({
    where: { id: invoiceId },
    data: { status: 'expired' },
  });
  logger.info('Invoice expired by cron', { invoiceId });
}

// Helper to get user by internal ID
async function getUserByInternalId(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { telegramId: true },
  });
}
