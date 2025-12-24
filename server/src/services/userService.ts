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
    amount: number,
    options?: {
      tonTxHash?: string;
      tonAmount?: bigint;
    }
  ) {
    return prisma.$transaction(async (tx: TransactionClient) => {
      // Update user balance
      const user = await tx.user.update({
        where: { telegramId: BigInt(telegramId) },
        data: { coinBalance: { increment: amount } },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: TransactionType.PURCHASE,
          amount,
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
    return prisma.$transaction(async (tx: TransactionClient) => {
      // Check user balance first
      const user = await tx.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
      });

      if (!user || user.coinBalance < amount) {
        throw new Error('Insufficient balance');
      }

      // Deduct coins
      const updated = await tx.user.update({
        where: { telegramId: BigInt(telegramId) },
        data: { coinBalance: { decrement: amount } },
      });

      // Create transaction record (negative amount for deduction)
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: TransactionType.GAME_SPEND,
          amount: -amount,
          status: TransactionStatus.COMPLETED,
        },
      });

      return updated;
    });
  }

  /**
   * Get user's game statistics
   * TEMPORARY: Returns mock data until external game service integration
   * TODO: Replace with actual game service API calls
   */
  async getUserGameStats(userId: string) {
    // Mock data for UI development
    // This will be replaced with external game service API
    return {
      gamesPlayed: 42,
      totalWins: 18,
      amountWon: 1250,
    };
  }
}

export const userService = new UserService();
