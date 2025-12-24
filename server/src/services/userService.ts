import { prisma } from '../db/client';
import type { PrismaClient } from '@prisma/client';

// Use string literals for enum values to avoid import issues during build
const TransactionType = {
  PURCHASE: 'PURCHASE',
  GAME_SPEND: 'GAME_SPEND',
  GAME_WIN: 'GAME_WIN',
  ADMIN_GRANT: 'ADMIN_GRANT',
} as const;

const TransactionStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

// Transaction client type for Prisma interactive transactions
type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

// MilliCoins conversion helpers
const MILLICOINS_PER_COIN = 1000n;

function toMilliCoins(coins: number): bigint {
  return BigInt(Math.round(coins * 1000));
}

export function fromMilliCoins(milliCoins: bigint): number {
  return Number(milliCoins) / 1000;
}

export class UserService {
  /**
   * Find or create a user by Telegram ID
   * Uses upsert to ensure user exists with latest data
   */
  async findOrCreateByTelegramId(telegramId: number, userData: {
    username?: string;
    firstName?: string;
    lastName?: string;
  }) {
    return prisma.user.upsert({
      where: { telegramId: BigInt(telegramId) },
      update: {
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
      create: {
        telegramId: BigInt(telegramId),
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
    });
  }

  /**
   * Link a wallet address to a user by Telegram ID
   */
  async linkWallet(telegramId: number, walletAddress: string) {
    return prisma.user.update({
      where: { telegramId: BigInt(telegramId) },
      data: { walletAddress },
    });
  }

  /**
   * Get user's coin balance and wallet address
   */
  async getBalance(telegramId: number) {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      select: { coinBalance: true, walletAddress: true },
    });
    return user;
  }

  /**
   * Get full user profile by Telegram ID
   */
  async getProfile(telegramId: number) {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        isPremium: true,
        walletAddress: true,
        coinBalance: true,
        createdAt: true,
      },
    });
    return user;
  }

  /**
   * Add coins to user balance with transaction record
   * Uses Prisma transaction for consistency
   */
  async addCoins(
    telegramId: number,
    amount: number,  // Keep as number from API
    options?: {
      tonTxHash?: string;
      tonAmount?: bigint;
    }
  ) {
    const milliCoins = toMilliCoins(amount);

    return prisma.$transaction(async (tx: TransactionClient) => {
      // Update user balance
      const user = await tx.user.update({
        where: { telegramId: BigInt(telegramId) },
        data: { coinBalance: { increment: milliCoins } },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: TransactionType.PURCHASE,
          amount: milliCoins,
          tonTxHash: options?.tonTxHash,
          tonAmount: options?.tonAmount,
          status: TransactionStatus.COMPLETED,
        },
      });

      return user;
    });
  }

  /**
   * Deduct coins from user balance with transaction record
   * Checks balance before deducting, uses Prisma transaction for consistency
   */
  async deductCoins(telegramId: number, amount: number) {
    const milliCoins = toMilliCoins(amount);

    return prisma.$transaction(async (tx: TransactionClient) => {
      // Check user balance first
      const user = await tx.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
      });

      if (!user || user.coinBalance < milliCoins) {
        throw new Error('Insufficient balance');
      }

      // Deduct coins
      const updated = await tx.user.update({
        where: { telegramId: BigInt(telegramId) },
        data: { coinBalance: { decrement: milliCoins } },
      });

      // Create transaction record (negative amount for deduction)
      await tx.transaction.create({
        data: {
          userId: updated.id,
          type: TransactionType.GAME_SPEND,
          amount: -milliCoins,
          status: TransactionStatus.COMPLETED,
        },
      });

      return updated;
    });
  }
}

export const userService = new UserService();
