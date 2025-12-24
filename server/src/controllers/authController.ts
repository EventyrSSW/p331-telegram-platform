import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { verifyTelegramWebAppData } from '../utils/telegram';
import { telegramAuthSchema, debugAuthSchema } from '../schemas/auth';
import { config } from '../config';

export const authController = {
  /**
   * POST /api/auth/telegram
   * Authenticate user from Telegram initData
   */
  async authenticate(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = telegramAuthSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }

      const { initData } = parsed.data;

      // Verify Telegram data
      const verified = verifyTelegramWebAppData(initData, config.telegram.botToken);

      if (!verified) {
        return res.status(401).json({ error: 'Invalid Telegram authentication' });
      }

      // Authenticate and get token
      const result = await authService.authenticateFromTelegram(verified.user);

      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/debug
   * Debug authentication - bypasses Telegram verification
   * Only available when ALLOW_WEB_DEBUG=true
   */
  async debugAuth(req: Request, res: Response, next: NextFunction) {
    try {
      if (!config.allowWebDebug) {
        return res.status(403).json({ error: 'Debug authentication is disabled' });
      }

      const parsed = debugAuthSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }

      const { telegramId, username } = parsed.data;

      // Use debug-specific auth that preserves existing user data
      const result = await authService.authenticateDebug(telegramId, username);

      console.log('[Auth] Debug authentication for telegramId:', telegramId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/me
   * Get current authenticated user
   */
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization token' });
      }

      const token = authHeader.substring(7);
      const payload = authService.verifyToken(token);

      if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const user = await authService.getUserById(payload.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      next(error);
    }
  },
};
