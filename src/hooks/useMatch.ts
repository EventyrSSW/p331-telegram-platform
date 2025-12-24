import { useState, useCallback, useEffect, useRef } from 'react';
import { nakamaService, MatchState as ServiceMatchState, MatchLevel } from '../services/nakama';
import { useNakama } from '../contexts/NakamaContext';

export type { MatchLevel };

export interface MatchPlayer {
  odredacted: string;
  username: string;
  score?: number;
  isHouse: boolean;
  hasSubmitted: boolean;
}

export interface MatchState {
  matchId: string;
  gameId: string;
  betAmount: number;
  level: MatchLevel | null;
  status: 'idle' | 'joining' | 'waiting' | 'ready' | 'playing' | 'submitted' | 'completed';
  matchType: 'PVP' | 'PVH' | null;
  players: MatchPlayer[];
  myScore: number | null;
  opponentScore: number | null;
  winner: string | null;
  payout: number | null;
  error: string | null;
}

const initialState: MatchState = {
  matchId: '',
  gameId: '',
  betAmount: 0,
  level: null,
  status: 'idle',
  matchType: null,
  players: [],
  myScore: null,
  opponentScore: null,
  winner: null,
  payout: null,
  error: null,
};

export function useMatch() {
  const { session, isConnected } = useNakama();
  const [state, setState] = useState<MatchState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Setup match callbacks
  useEffect(() => {
    if (!isConnected) return;

    nakamaService.setMatchCallbacks({
      onMatchReady: (matchData: ServiceMatchState) => {
        console.log('[useMatch] Match ready:', matchData);
        setState(prev => ({
          ...prev,
          matchId: matchData.matchId,
          level: matchData.level,
          status: 'ready',
          matchType: matchData.matchType,
        }));
      },
      onMatchResult: (matchData: ServiceMatchState) => {
        console.log('[useMatch] Match result:', matchData);
        const myUserId = session?.user_id;
        const myResult = myUserId ? matchData.results[myUserId] : null;

        // Find opponent result
        let opponentScore: number | null = null;
        for (const odredacted in matchData.results) {
          if (odredacted !== myUserId) {
            opponentScore = matchData.results[odredacted].score;
            break;
          }
        }

        setState(prev => ({
          ...prev,
          status: 'completed',
          myScore: myResult?.score || prev.myScore,
          opponentScore,
          winner: matchData.winner || null,
          payout: matchData.payout || null,
        }));
      },
      onError: (error: string) => {
        setState(prev => ({ ...prev, error, status: 'idle' }));
      },
    });

    return () => {
      nakamaService.setMatchCallbacks({});
      // Leave any active match on unmount
      if (stateRef.current.matchId && stateRef.current.status !== 'idle') {
        nakamaService.leaveMatch(stateRef.current.matchId);
      }
    };
  }, [isConnected, session]);

  const joinGame = useCallback(async (gameId: string, betAmount: number) => {
    if (!isConnected) {
      setState(prev => ({ ...prev, error: 'Not connected to Nakama' }));
      return null;
    }

    setState(prev => ({
      ...prev,
      status: 'joining',
      gameId,
      betAmount,
      error: null,
    }));

    try {
      // Ensure socket is connected
      await nakamaService.connectSocket();

      // Join game via RPC
      const result = await nakamaService.joinGame(gameId, betAmount);

      setState(prev => ({
        ...prev,
        matchId: result.matchId || '',
        status: 'waiting',
      }));

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join game';
      setState(prev => ({ ...prev, error: message, status: 'idle' }));
      return null;
    }
  }, [isConnected]);

  const submitScore = useCallback(async (score: number, timeMs: number) => {
    if (!stateRef.current.matchId) {
      console.error('[useMatch] No active match');
      return;
    }

    setState(prev => ({
      ...prev,
      myScore: score,
      status: 'submitted',
    }));

    try {
      await nakamaService.submitScore(stateRef.current.matchId, score, timeMs);
    } catch (error) {
      console.error('[useMatch] Failed to submit score:', error);
    }
  }, []);

  const leaveMatch = useCallback(async () => {
    if (stateRef.current.matchId) {
      await nakamaService.leaveMatch(stateRef.current.matchId);
    }
    setState(initialState);
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    joinGame,
    submitScore,
    leaveMatch,
    reset,
  };
}
