import { prisma } from '../db/client';
import { TransactionType, TransactionStatus } from '@prisma/client';

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
   * Add coins to user balance with transaction record
   * Uses Prisma transaction for consistency
   */
  async addCoins(telegramId: number, amount: number, tonTxHash?: string) {
    return prisma.$transaction(async (tx) => {
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
          tonTxHash,
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
    return prisma.$transaction(async (tx) => {
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
}

export const userService = new UserService();
