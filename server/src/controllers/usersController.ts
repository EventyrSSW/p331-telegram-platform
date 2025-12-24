import { Request, Response, NextFunction } from 'express';
import { userService, fromMilliCoins } from '../services/userService';
import { coinAmountSchema, addCoinsSchema, linkWalletSchema } from '../schemas/users';

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
        balance: fromMilliCoins(user.coinBalance),
      });
    } catch (error) {
      next(error);
    }
  },

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser!;

      // Ensure user exists in database
      await userService.findOrCreateByTelegramId(telegramUser.id, {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      });

      const user = await userService.getProfile(telegramUser.id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Convert BigInt to string for JSON serialization
      res.json({
        user: {
          ...user,
          telegramId: user.telegramId.toString(),
          coinBalance: fromMilliCoins(user.coinBalance),
        },
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

      const { amount, transactionHash, tonAmount } = bodyParse.data;

      // Ensure user exists in database
      await userService.findOrCreateByTelegramId(telegramUser.id, {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      });

      const user = await userService.addCoins(telegramUser.id, amount, {
        tonTxHash: transactionHash,
        tonAmount: tonAmount ? BigInt(tonAmount) : undefined,
      });

      res.json({
        telegramId: telegramUser.id,
        balance: fromMilliCoins(user.coinBalance),
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
        balance: fromMilliCoins(user.coinBalance),
      });
    } catch (error: any) {
      if (error.message === 'Insufficient balance') {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      next(error);
    }
  },

  async linkWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser!;
      const bodyParse = linkWalletSchema.safeParse(req.body);

      if (!bodyParse.success) {
        return res.status(400).json({ error: bodyParse.error.issues[0].message });
      }

      const { walletAddress } = bodyParse.data;

      const user = await userService.linkWallet(telegramUser.id, walletAddress);

      res.json({
        telegramId: telegramUser.id,
        walletAddress: user.walletAddress,
      });
    } catch (error) {
      next(error);
    }
  },
};
