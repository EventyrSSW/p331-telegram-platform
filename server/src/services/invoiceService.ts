// server/src/services/invoiceService.ts
import { prisma } from '../db/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';
import { nanoid } from 'nanoid';

const INVOICE_EXPIRY_MINUTES = 15;
const TON_TO_COINS_RATE = 100; // 1 TON = 100 coins (adjust as needed)

export interface CreateInvoiceResult {
  invoiceId: string;
  memo: string;
  amountNano: string;
  amountCoins: number;
  expiresAt: Date;
}

export interface InvoiceStatus {
  id: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  amountNano: string;
  amountCoins: number;
  memo: string;
  createdAt: Date;
  expiresAt: Date;
  paidAt: Date | null;
}

class InvoiceService {
  /**
   * Create a new payment invoice
   */
  async createInvoice(userId: string, amountNano: bigint): Promise<CreateInvoiceResult> {
    const memo = `p331_${nanoid(12)}`;
    const tonAmount = Number(amountNano) / 1e9;
    const coinsAmount = tonAmount * TON_TO_COINS_RATE;
    const expiresAt = new Date(Date.now() + INVOICE_EXPIRY_MINUTES * 60 * 1000);

    try {
      const invoice = await prisma.paymentInvoice.create({
        data: {
          userId,
          amountNano: amountNano.toString(),
          amountCoins: new Decimal(coinsAmount),
          memo,
          expiresAt,
        },
      });

      logger.info('Created payment invoice', {
        invoiceId: invoice.id,
        memo,
        amountNano: amountNano.toString(),
        userId,
      });

      return {
        invoiceId: invoice.id,
        memo,
        amountNano: amountNano.toString(),
        amountCoins: coinsAmount,
        expiresAt,
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
    };
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
   */
  async isBlockchainTxHashUsed(blockchainTxHash: string): Promise<boolean> {
    const existing = await prisma.paymentInvoice.findFirst({
      where: { blockchainTxHash, status: 'paid' },
    });
    return !!existing;
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
    bocHash: string,
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
          bocHash,
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
