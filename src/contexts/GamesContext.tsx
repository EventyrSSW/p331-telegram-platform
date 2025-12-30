import { createContext, useContext, useState, useEffect, useRef, useMemo, ReactNode } from 'react';
import { api, Game } from '../services/api';

interface GamesContextType {
  games: Game[];
  featuredGames: Game[];
  allGames: Game[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const GamesContext = createContext<GamesContextType>({
  games: [],
  featuredGames: [],
  allGames: [],
  isLoading: true,
  error: null,
  refetch: () => {},
});

export function GamesProvider({ children }: { children: ReactNode }) {
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchInitiatedRef = useRef(false);

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
    // Prevent double fetch in React StrictMode
    if (fetchInitiatedRef.current) return;
    fetchInitiatedRef.current = true;

    fetchGames();
  }, []);

  // Memoize filtered arrays to prevent unnecessary re-renders
  const featuredGames = useMemo(
    () => allGames.filter((game) => game.featured === true),
    [allGames]
  );

  const games = useMemo(
    () => allGames.filter((game) => game.featured !== true),
    [allGames]
  );

  const value = useMemo(
    () => ({
      games,
      featuredGames,
      allGames,
      isLoading,
      error,
      refetch: fetchGames,
    }),
    [games, featuredGames, allGames, isLoading, error]
  );

  return (
    <GamesContext.Provider value={value}>
      {children}
    </GamesContext.Provider>
  );
}

export function useGames() {
  return useContext(GamesContext);
}
