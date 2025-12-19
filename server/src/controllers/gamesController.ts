import { Request, Response, NextFunction } from 'express';
import { gameService } from '../services/gameService';

export const gamesController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const games = await gameService.getAllGames();
      res.json({ games });
    } catch (error) {
      next(error);
    }
  },

  async getFeatured(req: Request, res: Response, next: NextFunction) {
    try {
      const game = await gameService.getFeaturedGame();
      if (!game) {
        return res.status(404).json({ error: 'No featured game found' });
      }
      res.json({ game });
    } catch (error) {
      next(error);
    }
  },

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const game = await gameService.getGameBySlug(req.params.slug);
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }
      res.json({ game });
    } catch (error) {
      next(error);
    }
  },
};
