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
   *
   * TEMPORARY IMPLEMENTATION - MOCK DATA
   *
   * Current Status:
   * - Returns static mock data for UI development
   * - Database queries removed (no longer using GameSession table)
   *
   * Future Implementation:
   * - Integrate with external game service API
   * - Add service configuration (API endpoint, auth)
   * - Add error handling for external service failures
   * - Add caching layer for performance
   * - Consider fallback to default values if service unavailable
   *
   * Expected External API Contract:
   * GET /api/v1/users/{userId}/stats
   * Response: { gamesPlayed: number, totalWins: number, amountWon: number }
   *
   * @param userId - Internal user ID (may need to be mapped to external service ID)
   * @returns Promise<{ gamesPlayed: number, totalWins: number, amountWon: number }>
   */
  async getUserGameStats(userId: string) {
    // TODO: Replace with external game service API call
    // Example:
    // const response = await fetch(`${GAME_SERVICE_URL}/users/${userId}/stats`);
    // return response.json();

    // Mock data with slight user-based variation
    // This makes it easier to spot that mock data is being used
    const userHash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const variation = userHash % 10;

    return {
      gamesPlayed: 40 + variation,
      totalWins: 15 + Math.floor(variation / 2),
      amountWon: 1200 + (variation * 50),
    };
  }
}

export const userService = new UserService();
