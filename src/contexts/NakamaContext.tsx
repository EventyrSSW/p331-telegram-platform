import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import { Session } from '@heroiclabs/nakama-js';
import {
  nakamaService,
  TelegramUserData,
  MatchState as ServiceMatchState,
  MatchLevel,
  MatchPresence,
  PresenceInfo,
} from '../services/nakama';

export type { MatchLevel, PresenceInfo, MatchPresence };

// Match state managed at context level
export interface MatchState {
  matchId: string;
  gameId: string;
  betAmount: number;
  level: MatchLevel | null;
  status: 'idle' | 'joining' | 'waiting' | 'ready' | 'playing' | 'submitted' | 'completed';
  matchType: 'PVP' | 'PVH' | null;
  presences: MatchPresence;
  myScore: number | null;
  opponentScore: number | null;
  winner: string | null;
  payout: number | null;
  error: string | null;
}

const initialMatchState: MatchState = {
  matchId: '',
  gameId: '',
  betAmount: 0,
  level: null,
  status: 'idle',
  matchType: null,
  presences: {},
  myScore: null,
  opponentScore: null,
  winner: null,
  payout: null,
  error: null,
};

interface JoinGameResponse {
  matchId?: string;
  action?: string;
  error?: string;
}

interface RejoinMatchParams {
  matchId: string;
  gameId: string;
  betAmount: number;
  levelId: number | null;
  matchType: 'PVP' | 'PVH';
}

interface NakamaContextValue {
  // Session state
  session: Session | null;
  isConnected: boolean;
  isConnecting: boolean;

  // Socket state
  isSocketConnected: boolean;
  isSocketConnecting: boolean;
  socketError: string | null;

  // Match state
  match: MatchState;

  // Auth actions
  connect: (userData: TelegramUserData) => Promise<void>;
  disconnect: () => void;

  // Socket actions
  connectSocket: () => Promise<void>;

  // Match actions
  joinGame: (gameId: string, betAmount: number) => Promise<JoinGameResponse | null>;
  rejoinMatch: (params: RejoinMatchParams) => Promise<boolean>;
  submitScore: (score: number, timeMs: number) => Promise<void>;
  leaveMatch: () => Promise<void>;
  resetMatch: () => void;
  setMatchStatus: (status: MatchState['status']) => void;
}

const NakamaContext = createContext<NakamaContextValue | null>(null);

export function useNakama() {
  const context = useContext(NakamaContext);
  if (!context) {
    throw new Error('useNakama must be used within a NakamaProvider');
  }
  return context;
}

interface NakamaProviderProps {
  children: ReactNode;
}

export function NakamaProvider({ children }: NakamaProviderProps) {
  const [session, setSession] = useState<Session | null>(nakamaService.getSession());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isSocketConnecting, setIsSocketConnecting] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchState>(initialMatchState);

  const matchRef = useRef(match);
  matchRef.current = match;

  // Setup match callbacks once when provider mounts
  useEffect(() => {
    nakamaService.setMatchCallbacks({
      onMatchReady: (matchData: ServiceMatchState) => {
        console.log('[NakamaContext] Match ready:', matchData);
        setMatch(prev => ({
          ...prev,
          matchId: matchData.matchId,
          level: matchData.level,
          status: 'ready',
          matchType: matchData.matchType,
        }));
      },
      onMatchResult: (matchData: ServiceMatchState) => {
        console.log('[NakamaContext] Match result:', matchData);
        const myUserId = session?.user_id;
        const myResult = myUserId ? matchData.results[myUserId] : null;

        let opponentScore: number | null = null;
        for (const odredacted in matchData.results) {
          if (odredacted !== myUserId) {
            opponentScore = matchData.results[odredacted].score;
            break;
          }
        }

        setMatch(prev => ({
          ...prev,
          status: 'completed',
          myScore: myResult?.score ?? prev.myScore,
          opponentScore,
          winner: matchData.winner || null,
          payout: matchData.payout || null,
        }));
      },
      onPresenceChange: (presences: MatchPresence) => {
        console.log('[NakamaContext] Presence change:', presences);
        setMatch(prev => ({
          ...prev,
          presences,
        }));
      },
      onError: (error: string) => {
        console.error('[NakamaContext] Match error:', error);
        setSocketError(error);
      },
    });

    return () => {
      nakamaService.setMatchCallbacks({});
    };
  }, [session]);

  // Auto-connect socket when session is established
  useEffect(() => {
    if (session && !isSocketConnected && !isSocketConnecting) {
      console.log('[NakamaContext] Session established, connecting socket...');
      connectSocketInternal();
    }
  }, [session, isSocketConnected, isSocketConnecting]);

  const connectSocketInternal = async () => {
    setIsSocketConnecting(true);
    setSocketError(null);
    try {
      await nakamaService.connectSocket();
      setIsSocketConnected(true);
    } catch (err) {
      console.error('[NakamaContext] Socket connection error:', err);
      setSocketError(err instanceof Error ? err.message : 'Socket connection failed');
      setIsSocketConnected(false);
    } finally {
      setIsSocketConnecting(false);
    }
  };

  const connect = useCallback(async (userData: TelegramUserData) => {
    setIsConnecting(true);
    setSocketError(null);

    try {
      const newSession = await nakamaService.authenticateWithTelegram(userData);
      setSession(newSession);
      console.log('[NakamaContext] Connected successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setSocketError(message);
      console.error('[NakamaContext] Connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    nakamaService.logout();
    setSession(null);
    setIsSocketConnected(false);
    setMatch(initialMatchState);
  }, []);

  const connectSocket = useCallback(async () => {
    await connectSocketInternal();
  }, []);

  const joinGame = useCallback(async (gameId: string, betAmount: number): Promise<JoinGameResponse | null> => {
    if (!session) {
      setMatch(prev => ({ ...prev, error: 'Not connected to Nakama' }));
      return null;
    }

    setMatch(prev => ({
      ...prev,
      status: 'joining',
      gameId,
      betAmount,
      error: null,
    }));

    try {
      // Ensure socket is connected
      if (!isSocketConnected) {
        await connectSocketInternal();
      }

      const result = await nakamaService.joinGame(gameId, betAmount);

      setMatch(prev => ({
        ...prev,
        matchId: result.matchId || '',
        status: 'waiting',
      }));

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join game';
      setMatch(prev => ({ ...prev, error: message, status: 'idle' }));
      return null;
    }
  }, [session, isSocketConnected]);

  const submitScore = useCallback(async (score: number, timeMs: number) => {
    console.log('[NakamaContext] submitScore called:', { score, timeMs });

    if (!matchRef.current.matchId) {
      console.error('[NakamaContext] No active match - cannot submit score');
      return;
    }

    const matchId = matchRef.current.matchId;
    console.log('[NakamaContext] Submitting score to match:', matchId);

    setMatch(prev => ({
      ...prev,
      myScore: score,
      status: 'submitted',
    }));
    console.log('[NakamaContext] Local state updated to "submitted"');

    try {
      console.log('[NakamaContext] Calling nakamaService.submitScore...');
      await nakamaService.submitScore(matchId, score, timeMs);
      console.log('[NakamaContext] Score submitted successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit score';
      console.error('[NakamaContext] Failed to submit score:', error);
      setMatch(prev => ({ ...prev, error: message }));
    }
  }, []);

  const rejoinMatch = useCallback(async (params: RejoinMatchParams): Promise<boolean> => {
    console.log('[NakamaContext] Rejoining match:', params);

    try {
      // Ensure socket is connected
      if (!isSocketConnected) {
        await connectSocketInternal();
      }

      const socket = nakamaService.getSocket();
      if (!socket) {
        console.error('[NakamaContext] Socket not available for rejoin');
        return false;
      }

      // Clear old presences before rejoining
      nakamaService.clearMatchPresences();

      // Join the match via socket
      const matchResult = await socket.joinMatch(params.matchId);
      console.log('[NakamaContext] Rejoined match, presences:', matchResult.presences);

      // Build presences map from the match result
      // This includes all players currently in the match
      const presences: MatchPresence = {};
      if (matchResult.presences) {
        matchResult.presences.forEach(p => {
          presences[p.user_id] = {
            userId: p.user_id,
            username: p.username,
            avatarUrl: undefined,
            isOnline: true,
          };
        });
      }

      // Also add current user to presences (we just joined)
      if (session?.user_id && session?.username) {
        presences[session.user_id] = {
          userId: session.user_id,
          username: session.username,
          avatarUrl: undefined,
          isOnline: true,
        };
      }

      console.log('[NakamaContext] Final presences after rejoin:', presences);

      // Update match state with all the info
      setMatch({
        matchId: params.matchId,
        gameId: params.gameId,
        betAmount: params.betAmount,
        level: params.levelId ? { id: params.levelId, name: '', tier: '', tiles: [], totalPairs: 0, timeBonus: 0 } : null,
        status: 'playing',
        matchType: params.matchType,
        presences,
        myScore: null,
        opponentScore: null,
        winner: null,
        payout: null,
        error: null,
      });

      console.log('[NakamaContext] Match state updated after rejoin');
      return true;
    } catch (error) {
      console.error('[NakamaContext] Failed to rejoin match:', error);
      return false;
    }
  }, [isSocketConnected, session]);

  const leaveMatch = useCallback(async () => {
    try {
      if (matchRef.current.matchId) {
        await nakamaService.leaveMatch(matchRef.current.matchId);
      }
    } catch (error) {
      console.warn('[NakamaContext] Error leaving match:', error);
    } finally {
      setMatch(initialMatchState);
    }
  }, []);

  const resetMatch = useCallback(() => {
    setMatch(initialMatchState);
    nakamaService.clearMatchPresences();
  }, []);

  const setMatchStatus = useCallback((status: MatchState['status']) => {
    setMatch(prev => ({ ...prev, status }));
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const existingSession = nakamaService.getSession();
    if (existingSession && nakamaService.isAuthenticated()) {
      setSession(existingSession);
      console.log('[NakamaContext] Restored existing session');
    }
  }, []);

  const value: NakamaContextValue = {
    session,
    isConnected: nakamaService.isAuthenticated(),
    isConnecting,
    isSocketConnected,
    isSocketConnecting,
    socketError,
    match,
    connect,
    disconnect,
    connectSocket,
    joinGame,
    rejoinMatch,
    submitScore,
    leaveMatch,
    resetMatch,
    setMatchStatus,
  };

  return (
    <NakamaContext.Provider value={value}>
      {children}
    </NakamaContext.Provider>
  );
}
