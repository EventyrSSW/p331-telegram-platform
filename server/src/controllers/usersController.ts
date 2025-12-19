import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { coinAmountSchema, addCoinsSchema } from '../schemas/users';

export const usersController = {
  async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser!;

      // Ensure user exists in database
      await userService.findOrCreateByTelegramId(telegramUser.id, {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      });

      const user = await userService.getBalance(telegramUser.id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        telegramId: telegramUser.id,
        walletAddress: user.walletAddress,
        balance: user.coinBalance,
      });
    } catch (error) {
      next(error);
    }
  },

  async addCoins(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser!;
      const bodyParse = addCoinsSchema.safeParse(req.body);

      if (!bodyParse.success) {
        return res.status(400).json({ error: bodyParse.error.issues[0].message });
      }

      const { amount, transactionHash: tonTxHash } = bodyParse.data;

      // Ensure user exists in database
      await userService.findOrCreateByTelegramId(telegramUser.id, {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      });

      const user = await userService.addCoins(telegramUser.id, amount, tonTxHash);

      res.json({
        telegramId: telegramUser.id,
        balance: user.coinBalance,
      });
    } catch (error) {
      next(error);
    }
  },

  async deductCoins(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser!;
      const bodyParse = coinAmountSchema.safeParse(req.body);

      if (!bodyParse.success) {
        return res.status(400).json({ error: bodyParse.error.issues[0].message });
      }

      const { amount } = bodyParse.data;

      // Ensure user exists in database
      await userService.findOrCreateByTelegramId(telegramUser.id, {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      });

      const user = await userService.deductCoins(telegramUser.id, amount);

      res.json({
        telegramId: telegramUser.id,
        balance: user.coinBalance,
      });
    } catch (error: any) {
      if (error.message === 'Insufficient balance') {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      next(error);
    }
  },
};
