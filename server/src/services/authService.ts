import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../db/client';
import { decimalToNumber } from './userService';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
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
        languageCode: telegramUser.language_code,
        photoUrl: telegramUser.photo_url,
        isPremium: telegramUser.is_premium ?? false,
      },
      create: {
        telegramId: BigInt(telegramUser.id),
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        languageCode: telegramUser.language_code,
        photoUrl: telegramUser.photo_url,
        isPremium: telegramUser.is_premium ?? false,
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
        languageCode: user.languageCode,
        photoUrl: user.photoUrl,
        isPremium: user.isPremium,
        coinBalance: decimalToNumber(user.coinBalance),
        walletAddress: user.walletAddress,
      },
    };
  }

  /**
   * Debug authentication - preserves existing user data
   * Only creates user if doesn't exist, never overwrites profile data
   */
  async authenticateDebug(telegramId: number, username: string) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });

    let user;
    if (existingUser) {
      // User exists - just return them without updating profile
      user = existingUser;
    } else {
      // Create new user with debug defaults
      user = await prisma.user.create({
        data: {
          telegramId: BigInt(telegramId),
          username: username,
          firstName: 'Debug',
          lastName: 'User',
          languageCode: 'en',
          isPremium: false,
        },
      });
    }

    // Generate JWT token
    const token = this.generateToken({
      userId: user.id,
      telegramId: telegramId,
    });

    return {
      token,
      user: {
        id: user.id,
        telegramId: Number(user.telegramId),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        languageCode: user.languageCode,
        photoUrl: user.photoUrl,
        isPremium: user.isPremium,
        coinBalance: decimalToNumber(user.coinBalance),
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
      const decoded = jwt.verify(token, config.jwt.secret);

      if (
        typeof decoded === 'object' &&
        decoded !== null &&
        'userId' in decoded &&
        'telegramId' in decoded &&
        typeof (decoded as AuthPayload).userId === 'string' &&
        typeof (decoded as AuthPayload).telegramId === 'number'
      ) {
        return decoded as AuthPayload;
      }

      console.warn('Token payload has invalid shape');
      return null;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        // Token expired - this is normal, don't log as error
      } else if (error instanceof jwt.JsonWebTokenError) {
        console.warn('Invalid token signature or format');
      } else {
        console.error('Unexpected JWT verification error:', error);
      }
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
      languageCode: user.languageCode,
      photoUrl: user.photoUrl,
      isPremium: user.isPremium,
      coinBalance: decimalToNumber(user.coinBalance),
      walletAddress: user.walletAddress,
    };
  }
}

export const authService = new AuthService();
