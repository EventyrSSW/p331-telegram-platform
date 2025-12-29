import { Request, Response, NextFunction } from 'express';
import { verifyTelegramWebAppData, TelegramInitData } from '../utils/telegram';
import { logger } from '../utils/logger';
import { authService } from '../services/authService';
import { config } from '../config';

declare global {
  namespace Express {
    interface Request {
      telegramUser?: TelegramInitData['user'];
    }
  }
}

export function telegramAuthMiddleware(req: Request, res: Response, next: NextFunction) {
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
      // Create a minimal telegramUser object from JWT payload
      req.telegramUser = {
        id: payload.telegramId,
        first_name: 'Debug',
        username: 'debug_user',
      };
      return next();
    }
  }

  return res.status(401).json({ error: 'Missing Telegram init data' });
}
