import { prisma } from '../db/client';

export class GameService {
  async getAllGames() {
    return prisma.game.findMany({
      where: { active: true },
      orderBy: { title: 'asc' },
    });
  }

  async getFeaturedGame() {
    return prisma.game.findFirst({
      where: { featured: true, active: true },
    });
  }

  async getGameBySlug(slug: string) {
    return prisma.game.findUnique({
      where: { slug },
    });
  }

  async getGameById(id: string) {
    return prisma.game.findUnique({
      where: { id },
    });
  }
}

export const gameService = new GameService();
