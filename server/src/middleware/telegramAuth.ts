import { Request, Response, NextFunction } from 'express';
import { verifyTelegramWebAppData, TelegramInitData } from '../utils/telegram';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      telegramUser?: TelegramInitData['user'];
    }
  }
}

export function telegramAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const initData = req.headers['x-telegram-init-data'] as string;

  if (!initData) {
    return res.status(401).json({ error: 'Missing Telegram init data' });
  }

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
  next();
}
