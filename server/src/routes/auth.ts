import { Router } from 'express';
import { authController } from '../controllers/authController';

const router = Router();

router.post('/telegram', authController.authenticate);
router.get('/me', authController.getMe);

export default router;
