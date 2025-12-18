import { useState, useEffect } from 'react';
import { api, Game } from '../services/api';

export interface UseGamesResult {
  games: Game[];
  featuredGame: Game | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useGames(): UseGamesResult {
  const [games, setGames] = useState<Game[]>([]);
  const [featuredGame, setFeaturedGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [gamesResponse, featuredResponse] = await Promise.all([
        api.getGames(),
        api.getFeaturedGame(),
      ]);

      const featured = featuredResponse.game;
      setFeaturedGame(featured);

      // Filter out featured game from games list
      const filteredGames = gamesResponse.games.filter(
        (game) => game.id !== featured.id
      );
      setGames(filteredGames);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch games');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  return {
    games,
    featuredGame,
    isLoading,
    error,
    refetch: fetchGames,
  };
}
