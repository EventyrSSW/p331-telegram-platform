import { Router } from 'express';
import gamesRoutes from './games';
import usersRoutes from './users';
import { telegramAuthMiddleware } from '../middleware/telegramAuth';

const router = Router();

// Health check (public)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
router.use('/games', gamesRoutes);

// Protected routes
router.use('/users', telegramAuthMiddleware, usersRoutes);

export default router;
