import { Request, Response, NextFunction } from 'express';
import { verifyTelegramWebAppData, TelegramInitData } from '../utils/telegram';
import { logger } from '../utils/logger';
import { authService } from '../services/authService';
import { config } from '../config';
import { prisma } from '../db/client';

declare global {
  namespace Express {
    interface Request {
      telegramUser?: TelegramInitData['user'];
    }
  }
}

export async function telegramAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const initData = req.headers['x-telegram-init-data'] as string;

  // First, try Telegram init data (production/Telegram context)
  if (initData) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      logger.error('TELEGRAM_BOT_TOKEN not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const verified = verifyTelegramWebAppData(initData, botToken);

    if (!verified) {
      return res.status(401).json({ error: 'Invalid Telegram authentication' });
    }

    req.telegramUser = verified.user;
    return next();
  }

  // Second, try JWT Bearer token (debug mode)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ') && config.allowWebDebug) {
    const token = authHeader.substring(7);
    const payload = authService.verifyToken(token);

    if (payload) {
      // Fetch REAL user data from database instead of hardcoding fake values
      // This prevents debug mode from corrupting user profile data
      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(payload.telegramId) },
        select: {
          telegramId: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      });

      if (user) {
        req.telegramUser = {
          id: Number(user.telegramId),
          first_name: user.firstName || '',
          last_name: user.lastName || undefined,
          username: user.username || undefined,
        };
        return next();
      }

      // User not found - they need to authenticate first via /api/auth/telegram
      logger.warn('Debug auth failed: user not found in database', { telegramId: payload.telegramId });
      return res.status(401).json({ error: 'User not found. Please authenticate first.' });
    }
  }

  return res.status(401).json({ error: 'Missing Telegram init data' });
}
