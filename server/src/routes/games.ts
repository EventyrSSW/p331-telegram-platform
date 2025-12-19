import { Router } from 'express';
import { gameService } from '../services/gameService';
import { logger } from '../utils/logger';

const router = Router();

// GET / - return all games
router.get('/', async (req, res) => {
  try {
    const games = await gameService.getAllGames();
    res.json({ games });
  } catch (error) {
    logger.error('Error fetching games', { error });
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// GET /featured - return the featured game
router.get('/featured', async (req, res) => {
  try {
    const game = await gameService.getFeaturedGame();
    if (!game) {
      return res.status(404).json({ error: 'No featured game found' });
    }
    res.json({ game });
  } catch (error) {
    logger.error('Error fetching featured game', { error });
    res.status(500).json({ error: 'Failed to fetch featured game' });
  }
});

// GET /:slug - return single game by slug (404 if not found)
router.get('/:slug', async (req, res) => {
  try {
    const game = await gameService.getGameBySlug(req.params.slug);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json({ game });
  } catch (error) {
    logger.error('Error fetching game', { error });
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

export default router;
