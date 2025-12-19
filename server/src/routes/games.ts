import { Router } from 'express';
import { gamesController } from '../controllers/gamesController';

const router = Router();

router.get('/', gamesController.getAll);
router.get('/featured', gamesController.getFeatured);
router.get('/:slug', gamesController.getBySlug);

export default router;
