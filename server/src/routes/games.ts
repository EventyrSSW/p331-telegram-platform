import { Router } from 'express';
import { games } from '../data/games';

const router = Router();

// GET / - return all games
router.get('/', (req, res) => {
  res.json(games);
});

// GET /featured - return the featured game
router.get('/featured', (req, res) => {
  const featuredGame = games.find(game => game.featured);
  if (featuredGame) {
    res.json(featuredGame);
  } else {
    res.status(404).json({ error: 'Featured game not found' });
  }
});

// GET /:id - return single game by id (404 if not found)
router.get('/:id', (req, res) => {
  const game = games.find(g => g.id === req.params.id);
  if (game) {
    res.json(game);
  } else {
    res.status(404).json({ error: 'Game not found' });
  }
});

export default router;
