import { Router } from 'express';
import { usersController } from '../controllers/usersController';
import { coinOperationLimiter } from '../middleware/rateLimit';

const router = Router();

router.get('/me/balance', usersController.getBalance);
router.get('/me/profile', usersController.getProfile);
router.get('/me/stats', usersController.getUserStats);
// DEPRECATED: /me/add-coins removed - use /api/invoices/create + /api/invoices/verify instead
router.post('/me/deduct-coins', coinOperationLimiter, usersController.deductCoins);
router.post('/me/link-wallet', usersController.linkWallet);

export default router;
