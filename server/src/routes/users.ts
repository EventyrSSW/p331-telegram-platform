import { Router } from 'express';

const router = Router();

// In-memory storage for user balances
const userBalances: Record<string, number> = {};

// GET /:walletAddress/balance - return user balance (default 0)
router.get('/:walletAddress/balance', (req, res) => {
  const { walletAddress } = req.params;
  const balance = userBalances[walletAddress] || 0;
  res.json({ walletAddress, balance });
});

// POST /:walletAddress/add-coins - add coins to balance
router.post('/:walletAddress/add-coins', (req, res) => {
  const { walletAddress } = req.params;
  const { amount } = req.body;

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const currentBalance = userBalances[walletAddress] || 0;
  userBalances[walletAddress] = currentBalance + amount;

  res.json({ walletAddress, balance: userBalances[walletAddress] });
});

// POST /:walletAddress/deduct-coins - deduct coins from balance
router.post('/:walletAddress/deduct-coins', (req, res) => {
  const { walletAddress } = req.params;
  const { amount } = req.body;

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const currentBalance = userBalances[walletAddress] || 0;

  if (currentBalance < amount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  userBalances[walletAddress] = currentBalance - amount;

  res.json({ walletAddress, balance: userBalances[walletAddress] });
});

export default router;
