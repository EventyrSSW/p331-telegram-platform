import { Router } from 'express';
import { coinOperationLimiter } from '../middleware/rateLimit';
import { walletAddressSchema, coinAmountSchema } from '../schemas/users';

const router = Router();

// In-memory storage for user balances
const userBalances: Record<string, number> = {};

// GET /:walletAddress/balance - return user balance (default 0)
router.get('/:walletAddress/balance', (req, res) => {
  const parseResult = walletAddressSchema.safeParse(req.params.walletAddress);

  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.errors[0].message });
  }

  const walletAddress = parseResult.data;
  const balance = userBalances[walletAddress] || 0;
  res.json({ walletAddress, balance });
});

// POST /:walletAddress/add-coins - add coins to balance
router.post('/:walletAddress/add-coins', coinOperationLimiter, (req, res) => {
  const walletParse = walletAddressSchema.safeParse(req.params.walletAddress);
  const bodyParse = coinAmountSchema.safeParse(req.body);

  if (!walletParse.success) {
    return res.status(400).json({ error: walletParse.error.errors[0].message });
  }
  if (!bodyParse.success) {
    return res.status(400).json({ error: bodyParse.error.errors[0].message });
  }

  const walletAddress = walletParse.data;
  const { amount } = bodyParse.data;

  const currentBalance = userBalances[walletAddress] || 0;
  userBalances[walletAddress] = currentBalance + amount;

  res.json({ walletAddress, balance: userBalances[walletAddress] });
});

// POST /:walletAddress/deduct-coins - deduct coins from balance
router.post('/:walletAddress/deduct-coins', coinOperationLimiter, (req, res) => {
  const walletParse = walletAddressSchema.safeParse(req.params.walletAddress);
  const bodyParse = coinAmountSchema.safeParse(req.body);

  if (!walletParse.success) {
    return res.status(400).json({ error: walletParse.error.errors[0].message });
  }
  if (!bodyParse.success) {
    return res.status(400).json({ error: bodyParse.error.errors[0].message });
  }

  const walletAddress = walletParse.data;
  const { amount } = bodyParse.data;

  const currentBalance = userBalances[walletAddress] || 0;

  if (currentBalance < amount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  userBalances[walletAddress] = currentBalance - amount;

  res.json({ walletAddress, balance: userBalances[walletAddress] });
});

export default router;
