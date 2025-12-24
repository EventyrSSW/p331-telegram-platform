import { Router } from 'express';
import { authController } from '../controllers/authController';

const router = Router();

router.post('/telegram', authController.authenticate);
router.post('/debug', authController.debugAuth);
router.get('/me', authController.getMe);

export default router;
