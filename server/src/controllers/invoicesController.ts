// server/src/controllers/invoicesController.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { invoiceService } from '../services/invoiceService';
import { userService } from '../services/userService';
import { tonService } from '../services/tonService';
import { nakamaService } from '../services/nakamaService';
import { BocParser } from '../services/bocParser';
import { logger } from '../utils/logger';

const createInvoiceSchema = z.object({
  amountNano: z.string().regex(/^\d+$/, 'Amount must be positive integer in nanoTON'),
});

const verifyInvoiceSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  boc: z.string().min(1, 'BOC is required'),
  senderAddress: z.string().min(1, 'Sender address is required'),
});

export const invoicesController = {
  /**
   * Create a new payment invoice
   */
  async createInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser!;
      const parse = createInvoiceSchema.safeParse(req.body);

      if (!parse.success) {
        return res.status(400).json({ error: parse.error.issues[0].message });
      }

      const { amountNano } = parse.data;

      // Ensure user exists and get their wallet address
      const user = await userService.findOrCreateByTelegramId(telegramUser.id, {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      });

      const invoice = await invoiceService.createInvoice(
        user.id,
        BigInt(amountNano),
        user.walletAddress || undefined
      );

      res.json({
        invoiceId: invoice.invoiceId,
        memo: invoice.memo,
        amountNano: invoice.amountNano,
        amountCoins: invoice.amountCoins,
        expiresAt: invoice.expiresAt.toISOString(),
        senderAddress: invoice.senderAddress,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Verify payment and credit coins
   */
  async verifyInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser!;
      const parse = verifyInvoiceSchema.safeParse(req.body);

      if (!parse.success) {
        return res.status(400).json({ error: parse.error.issues[0].message });
      }

      const { invoiceId, boc, senderAddress } = parse.data;

      // Get invoice
      const invoice = await invoiceService.getInvoice(invoiceId);

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Parse BOC early to get hash (needed for first attempt save)
      let bocHash: string;
      try {
        const parsed = BocParser.parse(boc);
        bocHash = parsed.normalizedHash;
      } catch (error) {
        return res.status(400).json({ error: 'Invalid transaction data' });
      }

      // Save verification data on first attempt (enables cron recovery if timeout)
      // Always update senderAddress from BOC (actual sender wins)
      // Only save bocHash if not already set
      await invoiceService.saveFirstAttemptData(invoiceId, {
        senderAddress: senderAddress,
        bocHash: !invoice.bocHash ? bocHash : undefined,
      });

      // Check invoice status (Layer 1: Invoice already paid?)
      if (invoice.status === 'paid') {
        const user = await userService.getBalance(telegramUser.id);
        return res.json({
          success: true,
          alreadyProcessed: true,
          balance: user?.coinBalance || 0,
        });
      }

      if (invoice.status === 'expired') {
        return res.status(400).json({ error: 'Invoice has expired. Please create a new one.' });
      }

      if (invoice.status === 'cancelled') {
        return res.status(400).json({ error: 'Invoice was cancelled.' });
      }

      // Check if expired by time
      if (new Date() > invoice.expiresAt) {
        await invoiceService.expireOldInvoices();
        return res.status(400).json({ error: 'Invoice has expired. Please create a new one.' });
      }

      // Check if this BOC was already processed (Layer 2: BOC hash duplicate?)
      if (await invoiceService.isBocHashUsed(bocHash)) {
        logger.warn('Duplicate BOC submission', { bocHash, invoiceId });
        const user = await userService.getBalance(telegramUser.id);
        return res.json({
          success: true,
          alreadyProcessed: true,
          reason: 'boc_already_processed',
          balance: user?.coinBalance || 0,
        });
      }

      // Verify on blockchain
      const verification = await tonService.verifyTransactionByMemo(
        invoice.memo,
        BigInt(invoice.amountNano),
        senderAddress
      );

      if (!verification.verified) {
        return res.status(400).json({ error: verification.error });
      }

      // Extract blockchain tx hash from verification result
      const blockchainTxHash = verification.transaction!.hash;

      // Check if blockchain tx was already used (Layer 3: Blockchain tx duplicate?)
      if (await invoiceService.isBlockchainTxHashUsed(blockchainTxHash)) {
        logger.warn('Duplicate blockchain tx', { blockchainTxHash, invoiceId });
        const user = await userService.getBalance(telegramUser.id);
        return res.json({
          success: true,
          alreadyProcessed: true,
          reason: 'blockchain_tx_already_processed',
          balance: user?.coinBalance || 0,
        });
      }

      // Credit coins to user
      const user = await userService.findOrCreateByTelegramId(telegramUser.id, {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      });

      const { user: updatedUser, transactionId } = await userService.addCoins(telegramUser.id, invoice.amountCoins, {
        tonTxHash: blockchainTxHash,
        tonAmount: BigInt(invoice.amountNano),
      });

      // Update Nakama wallet (primary source of truth for game balance)
      const nakamaUserId = await nakamaService.getNakamaUserIdFromTelegramId(telegramUser.id);
      if (nakamaUserId) {
        try {
          const nakamaResult = await nakamaService.updateUserWallet({
            userId: nakamaUserId,
            amount: invoice.amountCoins,
            tonTxHash: blockchainTxHash,
            tonAmount: invoice.amountNano,
            reason: 'ton_purchase',
          });

          if (!nakamaResult.success && !nakamaResult.alreadyProcessed) {
            logger.error('Nakama wallet update failed', {
              error: nakamaResult.error,
              userId: nakamaUserId,
              invoiceId,
            });
          } else {
            logger.info('Nakama wallet updated', {
              userId: nakamaUserId,
              amount: invoice.amountCoins,
              newBalance: nakamaResult.newBalance,
            });
          }
        } catch (error) {
          logger.error('Nakama wallet update error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: nakamaUserId,
            invoiceId,
          });
        }
      } else {
        logger.warn('No Nakama user found for invoice payment', {
          telegramId: telegramUser.id,
          invoiceId,
        });
      }

      // Mark invoice as paid
      const markResult = await invoiceService.markAsPaid(
        invoiceId,
        transactionId,
        bocHash,
        blockchainTxHash,
        senderAddress
      );

      if (!markResult.success) {
        // Race condition - another request already processed this
        const balance = await userService.getBalance(telegramUser.id);
        return res.json({
          success: true,
          alreadyProcessed: true,
          balance: balance?.coinBalance || 0,
        });
      }

      res.json({
        success: true,
        balance: Number(updatedUser.coinBalance),
        alreadyProcessed: false,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get invoice status
   */
  async getInvoiceStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { invoiceId } = req.params;

      const invoice = await invoiceService.getInvoice(invoiceId);

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      res.json(invoice);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Cancel a pending invoice
   */
  async cancelInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser!;
      const { invoiceId } = req.params;

      const user = await userService.findOrCreateByTelegramId(telegramUser.id, {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      });

      const cancelled = await invoiceService.cancelInvoice(invoiceId, user.id);

      if (!cancelled) {
        return res.status(400).json({ error: 'Invoice cannot be cancelled' });
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get user's invoice stats
   */
  async getUserInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser!;

      const user = await userService.findOrCreateByTelegramId(telegramUser.id, {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      });

      const stats = await invoiceService.getUserInvoiceStats(user.id);

      res.json(stats);
    } catch (error) {
      next(error);
    }
  },
};
