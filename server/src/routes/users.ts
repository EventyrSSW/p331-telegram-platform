import { Router } from 'express';
import { coinOperationLimiter } from '../middleware/rateLimit';
import { addCoinsSchema, coinAmountSchema } from '../schemas/users';
import { userService } from '../services/userService';

const router = Router();

// GET /me/balance - get authenticated user's balance
router.get('/me/balance', async (req, res) => {
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
    console.error('Error getting balance:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// POST /me/add-coins - add coins after purchase
router.post('/me/add-coins', coinOperationLimiter, async (req, res) => {
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
    console.error('Error adding coins:', error);
    res.status(500).json({ error: 'Failed to add coins' });
  }
});

// POST /me/deduct-coins - deduct coins for game play
router.post('/me/deduct-coins', coinOperationLimiter, async (req, res) => {
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
    console.error('Error deducting coins:', error);
    res.status(500).json({ error: 'Failed to deduct coins' });
  }
});

export default router;
