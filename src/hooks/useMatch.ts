import { useNakama, MatchState, MatchLevel } from '../contexts/NakamaContext';

export type { MatchLevel };

// Re-export MatchState for backward compatibility
export type { MatchState };

// Legacy interface for components using the old shape
export interface MatchPlayer {
  userId: string;
  username: string;
  score?: number;
  isHouse: boolean;
  hasSubmitted: boolean;
}

export function useMatch() {
  const {
    match,
    joinGame,
    submitScore,
    leaveMatch,
    resetMatch,
    setMatchStatus,
  } = useNakama();

  return {
    // Spread all match state
    ...match,
    // Actions
    joinGame,
    submitScore,
    leaveMatch,
    reset: resetMatch,
    setMatchStatus,
    // Computed properties for backward compatibility
    players: Object.values(match.presences).map(p => ({
      userId: p.userId,
      username: p.username,
      score: undefined,
      isHouse: false,
      hasSubmitted: false,
    })) as MatchPlayer[],
  };
}
