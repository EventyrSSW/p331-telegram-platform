import { prisma } from '../db/client';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { tonService, TonService } from './tonService';
import { nakamaService } from './nakamaService';

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

// Helper to convert Prisma Decimal to number for API responses
export function decimalToNumber(decimal: unknown): number {
  if (decimal === null || decimal === undefined) return 0;
  return Number(decimal);
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
          amount: amount,
          tonTxHash: options?.tonTxHash,
          tonAmount: options?.tonAmount,
          status: TransactionStatus.COMPLETED,
        },
      });

      return user;
    });
  }

  /**
   * Add coins after verifying TON transaction on blockchain
   * This is the secure method that should be used for real payments
   */
  async addCoinsVerified(
    telegramId: number,
    tonAmountNano: bigint,
    transactionHash: string
  ): Promise<{
    success: boolean;
    error?: string;
    balance?: number;
    alreadyProcessed?: boolean;
  }> {
    // Step 1: Check if transaction already processed (database level)
    const existingTx = await prisma.transaction.findUnique({
      where: { tonTxHash: transactionHash },
    });

    if (existingTx) {
      // Already processed - return success (idempotent)
      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
      });
      return {
        success: true,
        alreadyProcessed: true,
        balance: user ? decimalToNumber(user.coinBalance) : 0,
      };
    }

    // Step 2: Verify transaction on TON blockchain
    const verificationResult = await tonService.verifyTransaction(
      transactionHash,
      tonAmountNano
    );

    if (!verificationResult.verified) {
      return {
        success: false,
        error: verificationResult.error || 'Transaction verification failed',
      };
    }

    // Step 3: Calculate coin amount from TON
    // Using a rate of 1 TON = 100 coins (configurable)
    const TON_TO_COINS_RATE = 100;
    const tonAmount = TonService.fromNano(tonAmountNano);
    const coinAmount = Math.floor(tonAmount * TON_TO_COINS_RATE);

    // Step 4: Get Nakama user ID
    const nakamaUserId = await nakamaService.getNakamaUserIdFromTelegramId(telegramId);

    // Step 5: Update Nakama wallet (if user exists there)
    if (nakamaUserId) {
      try {
        const nakamaResult = await nakamaService.updateUserWallet({
          userId: nakamaUserId,
          amount: coinAmount,
          tonTxHash: transactionHash,
          tonAmount: tonAmountNano.toString(),
          reason: 'ton_purchase',
        });

        if (!nakamaResult.success && !nakamaResult.alreadyProcessed) {
          console.error('Nakama wallet update failed:', nakamaResult.error);
          // Continue to update PostgreSQL for audit, but log the error
        }
      } catch (error) {
        console.error('Nakama wallet update error:', error);
        // Continue to update PostgreSQL for audit
      }
    }

    // Step 6: Update PostgreSQL (for audit and backup)
    try {
      return await prisma.$transaction(async (tx: TransactionClient) => {
        const user = await tx.user.update({
          where: { telegramId: BigInt(telegramId) },
          data: { coinBalance: { increment: coinAmount } },
        });

        await tx.transaction.create({
          data: {
            userId: user.id,
            type: TransactionType.PURCHASE,
            amount: coinAmount,
            tonTxHash: transactionHash,
            tonAmount: tonAmountNano,
            tonSenderAddress: verificationResult.transaction?.sender,
            status: TransactionStatus.COMPLETED,
            verifiedAt: new Date(),
          },
        });

        return {
          success: true,
          balance: decimalToNumber(user.coinBalance),
        };
      });
    } catch (error) {
      // Handle unique constraint violation on tonTxHash (race condition)
      // If two requests pass the initial idempotency check simultaneously,
      // the second one will fail here with P2002
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Another request already processed this transaction
        const user = await prisma.user.findUnique({
          where: { telegramId: BigInt(telegramId) },
        });
        return {
          success: true,
          alreadyProcessed: true,
          balance: user ? decimalToNumber(user.coinBalance) : 0,
        };
      }
      throw error;
    }
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

      if (!user || decimalToNumber(user.coinBalance) < amount) {
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
          userId: updated.id,
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
