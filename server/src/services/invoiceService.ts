// server/src/services/invoiceService.ts
import { prisma } from '../db/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';
import { nanoid } from 'nanoid';
import { normalizeAddress } from '../utils/addressNormalizer';

const INVOICE_EXPIRY_MINUTES = 15;
const TON_TO_COINS_RATE = 100; // 1 TON = 100 coins (adjust as needed)

export interface CreateInvoiceResult {
  invoiceId: string;
  memo: string;
  amountNano: string;
  amountCoins: number;
  expiresAt: Date;
  senderAddress: string | null;
}

export interface InvoiceStatus {
  id: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'paid_pending_nakama';
  amountNano: string;
  amountCoins: number;
  memo: string;
  createdAt: Date;
  expiresAt: Date;
  paidAt: Date | null;
  senderAddress: string | null;
  bocHash: string | null;
}

class InvoiceService {
  /**
   * Create a new payment invoice
   */
  async createInvoice(userId: string, amountNano: bigint, walletAddress?: string): Promise<CreateInvoiceResult> {
    const memo = `p331_${nanoid(12)}`;
    const tonAmount = Number(amountNano) / 1e9;
    const coinsAmount = tonAmount * TON_TO_COINS_RATE;
    const expiresAt = new Date(Date.now() + INVOICE_EXPIRY_MINUTES * 60 * 1000);

    try {
      // Normalize wallet address if provided
      const normalizedSenderAddress = walletAddress
        ? await normalizeAddress(walletAddress)
        : null;

      const invoice = await prisma.paymentInvoice.create({
        data: {
          userId,
          amountNano: amountNano.toString(),
          amountCoins: new Decimal(coinsAmount),
          memo,
          expiresAt,
          senderAddress: normalizedSenderAddress,
        },
      });

      logger.info('Created payment invoice', {
        invoiceId: invoice.id,
        memo,
        amountNano: amountNano.toString(),
        userId,
        senderAddress: normalizedSenderAddress,
      });

      return {
        invoiceId: invoice.id,
        memo,
        amountNano: amountNano.toString(),
        amountCoins: coinsAmount,
        expiresAt,
        senderAddress: normalizedSenderAddress,
      };
    } catch (error) {
      logger.error('Failed to create invoice', {
        userId,
        amountNano: amountNano.toString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<InvoiceStatus | null> {
    const invoice = await prisma.paymentInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) return null;

    return {
      id: invoice.id,
      status: invoice.status as InvoiceStatus['status'],
      amountNano: invoice.amountNano,
      amountCoins: invoice.amountCoins.toNumber(),
      memo: invoice.memo,
      createdAt: invoice.createdAt,
      expiresAt: invoice.expiresAt,
      paidAt: invoice.paidAt,
      senderAddress: invoice.senderAddress,
      bocHash: invoice.bocHash,
    };
  }

  /**
   * Get invoice by memo (for transaction matching)
   */
  async getInvoiceByMemo(memo: string): Promise<InvoiceStatus | null> {
    const invoice = await prisma.paymentInvoice.findUnique({
      where: { memo },
    });

    if (!invoice) return null;

    return {
      id: invoice.id,
      status: invoice.status as InvoiceStatus['status'],
      amountNano: invoice.amountNano,
      amountCoins: invoice.amountCoins.toNumber(),
      memo: invoice.memo,
      createdAt: invoice.createdAt,
      expiresAt: invoice.expiresAt,
      paidAt: invoice.paidAt,
      senderAddress: invoice.senderAddress,
      bocHash: invoice.bocHash,
    };
  }

  /**
   * Update sender address on first verification attempt
   * This captures the address even if verification fails, enabling cron recovery
   */
  async updateSenderAddress(invoiceId: string, senderAddress: string): Promise<void> {
    await prisma.paymentInvoice.update({
      where: { id: invoiceId },
      data: { senderAddress },
    });
    logger.info('Updated invoice sender address', { invoiceId, senderAddress });
  }

  /**
   * Save verification data on first attempt (enables cron recovery)
   * Called early in verification flow before blockchain check
   * senderAddress is always updated from BOC (actual sender wins)
   * bocHash is only saved on first attempt
   */
  async saveFirstAttemptData(
    invoiceId: string,
    data: { senderAddress?: string; bocHash?: string }
  ): Promise<void> {
    const updateData: { senderAddress?: string; bocHash?: string } = {};

    // Always update senderAddress from BOC (actual sender wins over expected)
    // Normalize to user-friendly format
    if (data.senderAddress) {
      updateData.senderAddress = await normalizeAddress(data.senderAddress);
    }
    // Only save bocHash if not already set
    if (data.bocHash) updateData.bocHash = data.bocHash;

    if (Object.keys(updateData).length === 0) return;

    await prisma.paymentInvoice.update({
      where: { id: invoiceId },
      data: updateData,
    });
    logger.info('Saved first attempt data', { invoiceId, ...updateData });
  }

  /**
   * Check if BOC hash already used (idempotency layer 2)
   */
  async isBocHashUsed(bocHash: string): Promise<boolean> {
    const existing = await prisma.paymentInvoice.findFirst({
      where: { bocHash, status: 'paid' },
    });
    return !!existing;
  }

  /**
   * Check if blockchain tx hash already used (idempotency layer 3)
   * Checks both PaymentInvoice and Transaction tables to handle partial failures
   */
  async isBlockchainTxHashUsed(blockchainTxHash: string): Promise<boolean> {
    // Check PaymentInvoice table
    const invoiceExists = await prisma.paymentInvoice.findFirst({
      where: { blockchainTxHash, status: 'paid' },
    });
    if (invoiceExists) return true;

    // Also check Transaction table (in case addCoins succeeded but markAsPaid failed)
    const transactionExists = await prisma.transaction.findUnique({
      where: { tonTxHash: blockchainTxHash },
    });
    return !!transactionExists;
  }

  /**
   * Check all duplicate conditions at once
   */
  async checkDuplicate(bocHash: string, blockchainTxHash: string): Promise<{
    isDuplicate: boolean;
    reason?: 'boc_hash' | 'blockchain_tx_hash';
  }> {
    const [bocDupe, txDupe] = await Promise.all([
      this.isBocHashUsed(bocHash),
      this.isBlockchainTxHashUsed(blockchainTxHash),
    ]);

    if (bocDupe) return { isDuplicate: true, reason: 'boc_hash' };
    if (txDupe) return { isDuplicate: true, reason: 'blockchain_tx_hash' };
    return { isDuplicate: false };
  }

  /**
   * Mark invoice as paid and link to transaction (atomic)
   */
  async markAsPaid(
    invoiceId: string,
    transactionId: string,
    bocHash: string | null,
    blockchainTxHash: string,
    senderAddress: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.paymentInvoice.update({
        where: { id: invoiceId },
        data: {
          status: 'paid',
          paidAt: new Date(),
          transactionId,
          ...(bocHash && { bocHash }), // Only set if not null/empty
          blockchainTxHash,
          senderAddress,
        },
      });

      logger.info('Invoice marked as paid', {
        invoiceId,
        transactionId,
        bocHash,
        blockchainTxHash,
      });

      return { success: true };
    } catch (error) {
      // Handle unique constraint violation (race condition)
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        logger.warn('Duplicate payment attempt blocked by DB constraint', {
          invoiceId,
          bocHash,
          blockchainTxHash,
        });
        return { success: false, error: 'duplicate_payment' };
      }
      throw error; // Re-throw unexpected errors
    }
  }

  /**
   * Cancel an invoice
   */
  async cancelInvoice(invoiceId: string, userId: string): Promise<boolean> {
    const invoice = await prisma.paymentInvoice.findFirst({
      where: { id: invoiceId, userId, status: 'pending' },
    });

    if (!invoice) return false;

    await prisma.paymentInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    logger.info('Invoice cancelled', { invoiceId });
    return true;
  }

  /**
   * Expire old pending invoices (call from cron)
   */
  async expireOldInvoices(): Promise<number> {
    const result = await prisma.paymentInvoice.updateMany({
      where: {
        status: 'pending',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'expired',
      },
    });

    if (result.count > 0) {
      logger.info('Expired old invoices', { count: result.count });
    }

    return result.count;
  }

  /**
   * Get pending invoices older than threshold for cron processing
   * @param minAgeSeconds - Minimum age in seconds (default 90 = after frontend polling window)
   * @param limit - Maximum invoices to return per batch
   */
  async getUnverifiedInvoices(minAgeSeconds = 90, limit = 50): Promise<Array<{
    id: string;
    userId: string;
    memo: string;
    amountNano: string;
    amountCoins: number;
    senderAddress: string | null;
    expiresAt: Date;
    createdAt: Date;
  }>> {
    const cutoffTime = new Date(Date.now() - minAgeSeconds * 1000);

    const invoices = await prisma.paymentInvoice.findMany({
      where: {
        status: 'pending',
        createdAt: { lt: cutoffTime },
      },
      orderBy: { createdAt: 'asc' },  // Process oldest first
      take: limit,
      select: {
        id: true,
        userId: true,
        memo: true,
        amountNano: true,
        amountCoins: true,
        senderAddress: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return invoices.map(inv => ({
      ...inv,
      amountCoins: inv.amountCoins.toNumber(),
    }));
  }

  /**
   * Mark invoice as paid but pending Nakama sync
   */
  async markAsPaidPendingNakama(
    invoiceId: string,
    transactionId: string,
    bocHash: string | null,
    blockchainTxHash: string,
    senderAddress: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.paymentInvoice.update({
        where: { id: invoiceId },
        data: {
          status: 'paid_pending_nakama',
          paidAt: new Date(),
          transactionId,
          bocHash,
          blockchainTxHash,
          senderAddress,
        },
      });

      logger.info('Invoice marked as paid_pending_nakama', {
        invoiceId,
        transactionId,
        blockchainTxHash,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        return { success: false, error: 'duplicate_payment' };
      }
      throw error;
    }
  }

  /**
   * Update invoice status from paid_pending_nakama to paid after Nakama sync
   */
  async markNakamaSynced(invoiceId: string): Promise<void> {
    await prisma.paymentInvoice.update({
      where: { id: invoiceId },
      data: { status: 'paid' },
    });
    logger.info('Invoice Nakama sync completed', { invoiceId });
  }

  /**
   * Get analytics for a user
   */
  async getUserInvoiceStats(userId: string) {
    const [total, paid, expired, cancelled, pending] = await Promise.all([
      prisma.paymentInvoice.count({ where: { userId } }),
      prisma.paymentInvoice.count({ where: { userId, status: 'paid' } }),
      prisma.paymentInvoice.count({ where: { userId, status: 'expired' } }),
      prisma.paymentInvoice.count({ where: { userId, status: 'cancelled' } }),
      prisma.paymentInvoice.count({ where: { userId, status: 'pending' } }),
    ]);

    return {
      total,
      paid,
      expired,
      cancelled,
      pending,
      conversionRate: total > 0 ? (paid / total) * 100 : 0,
    };
  }

  /**
   * Get global analytics (admin)
   */
  async getGlobalInvoiceStats() {
    const [total, paid, expired, cancelled, pending, totalVolume] = await Promise.all([
      prisma.paymentInvoice.count(),
      prisma.paymentInvoice.count({ where: { status: 'paid' } }),
      prisma.paymentInvoice.count({ where: { status: 'expired' } }),
      prisma.paymentInvoice.count({ where: { status: 'cancelled' } }),
      prisma.paymentInvoice.count({ where: { status: 'pending' } }),
      prisma.paymentInvoice.aggregate({
        where: { status: 'paid' },
        _sum: { amountCoins: true },
      }),
    ]);

    return {
      total,
      paid,
      expired,
      cancelled,
      pending,
      conversionRate: total > 0 ? (paid / total) * 100 : 0,
      totalVolumeCoins: totalVolume._sum.amountCoins?.toNumber() || 0,
    };
  }
}

export const invoiceService = new InvoiceService();
