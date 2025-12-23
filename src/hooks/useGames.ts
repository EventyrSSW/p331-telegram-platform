import { useState, useEffect } from 'react';
import { api, Game } from '../services/api';

export interface UseGamesResult {
  games: Game[];
  featuredGames: Game[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useGames(): UseGamesResult {
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const gamesResponse = await api.getGames();
      setAllGames(gamesResponse.games);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch games');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  // Filter featured games (games with featured=true)
  const featuredGames = allGames.filter((game) => game.featured === true);

  // Regular games exclude featured ones to avoid duplication
  const games = allGames.filter((game) => game.featured !== true);

  return {
    games,
    featuredGames,
    isLoading,
    error,
    refetch: fetchGames,
  };
}
