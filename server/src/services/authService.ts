import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../db/client';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface AuthPayload {
  userId: string;
  telegramId: number;
}

export class AuthService {
  /**
   * Authenticate user from Telegram data and return JWT
   */
  async authenticateFromTelegram(telegramUser: TelegramUser) {
    // Upsert user to database
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(telegramUser.id) },
      update: {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      },
      create: {
        telegramId: BigInt(telegramUser.id),
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      },
    });

    // Generate JWT token
    const token = this.generateToken({
      userId: user.id,
      telegramId: telegramUser.id,
    });

    return {
      token,
      user: {
        id: user.id,
        telegramId: Number(user.telegramId),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        coinBalance: user.coinBalance,
        walletAddress: user.walletAddress,
      },
    };
  }

  /**
   * Generate JWT token
   */
  private generateToken(payload: AuthPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): AuthPayload | null {
    try {
      return jwt.verify(token, config.jwt.secret) as AuthPayload;
    } catch {
      return null;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    return {
      id: user.id,
      telegramId: Number(user.telegramId),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      coinBalance: user.coinBalance,
      walletAddress: user.walletAddress,
    };
  }
}

export const authService = new AuthService();
