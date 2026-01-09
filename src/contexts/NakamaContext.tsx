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
import { useNetworkToast } from './NetworkToastContext';

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

export interface GameAnalytics {
  timeLeft?: number;
  timerDuration?: number;
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

  // Wallet state
  coins: number;
  isWalletLoading: boolean;
  refreshWallet: () => Promise<void>;

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
  submitScore: (score: number, timeMs: number, analytics?: GameAnalytics) => Promise<void>;
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

  // Track if we've had a successful connection before (for reconnect detection)
  const hadPreviousConnection = useRef(false);
  const wasDisconnected = useRef(false);
  const [match, setMatch] = useState<MatchState>(initialMatchState);
  const [coins, setCoins] = useState<number>(0);
  const [isWalletLoading, setIsWalletLoading] = useState(false);

  const matchRef = useRef(match);
  matchRef.current = match;

  const { showToast, hideToast } = useNetworkToast();

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

  // Setup socket disconnect/reconnect callbacks for toast notifications
  useEffect(() => {
    nakamaService.setSocketCallbacks({
      onDisconnect: () => {
        console.log('[NakamaContext] Socket disconnected - showing toast');
        wasDisconnected.current = true;
        setIsSocketConnected(false);
        showToast('Connection lost. Reconnecting...', 'warning', true);
      },
      onReconnect: () => {
        console.log('[NakamaContext] Socket reconnected via auto-reconnect - showing success toast');
        wasDisconnected.current = false;
        setIsSocketConnected(true);
        hideToast();
        showToast('Reconnected!', 'success', false);
      },
      onReconnectFailed: () => {
        console.log('[NakamaContext] Reconnect failed - showing error toast');
        showToast('Connection failed. Check your network.', 'error', false);
      },
    });

    return () => {
      nakamaService.setSocketCallbacks({});
    };
  }, [showToast, hideToast]);

  // Setup session expired callback to handle 401 errors
  useEffect(() => {
    nakamaService.setSessionExpiredCallback(() => {
      console.log('[NakamaContext] Session expired - clearing state and showing toast');
      setSession(null);
      setIsSocketConnected(false);
      showToast('Session expired. Please refresh the page.', 'error', false);
    });

    return () => {
      nakamaService.setSessionExpiredCallback(null);
    };
  }, [showToast]);

  // Fetch wallet from Nakama
  const refreshWallet = useCallback(async () => {
    if (!nakamaService.isAuthenticated()) {
      return;
    }

    setIsWalletLoading(true);
    try {
      const wallet = await nakamaService.getWallet();
      setCoins(wallet.coins || 0);
      console.log('[NakamaContext] Wallet refreshed, coins:', wallet.coins);
    } catch (err) {
      console.error('[NakamaContext] Failed to fetch wallet:', err);
    } finally {
      setIsWalletLoading(false);
    }
  }, []);

  // Refresh wallet when match completes (to show updated balance after win/loss)
  useEffect(() => {
    if (match.status === 'completed') {
      console.log('[NakamaContext] Match completed, refreshing wallet...');
      refreshWallet();
    }
  }, [match.status, refreshWallet]);

  // Auto-connect socket and fetch wallet when session is established
  useEffect(() => {
    if (session && !isSocketConnected && !isSocketConnecting) {
      console.log('[NakamaContext] Session established, connecting socket...');
      connectSocketInternal();
      // Also fetch wallet
      refreshWallet();
    }
  }, [session, isSocketConnected, isSocketConnecting, refreshWallet]);

  const connectSocketInternal = async () => {
    setIsSocketConnecting(true);
    setSocketError(null);
    try {
      await nakamaService.connectSocket();
      setIsSocketConnected(true);

      // If we were disconnected before, this is a reconnection - show toast
      if (wasDisconnected.current) {
        console.log('[NakamaContext] Socket reconnected via connectSocketInternal - showing success toast');
        wasDisconnected.current = false;
        hideToast();
        showToast('Reconnected!', 'success', false);
      }

      // Track that we've had a successful connection
      hadPreviousConnection.current = true;
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
      // Check actual socket state (not React state) to handle race conditions
      // where socket disconnects but React state hasn't updated yet
      const actualSocket = nakamaService.getSocket();
      if (!actualSocket) {
        console.log('[NakamaContext] Socket not available, connecting...');
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
  }, [session]);

  const submitScore = useCallback(async (score: number, timeMs: number, analytics?: GameAnalytics) => {
    console.log('[NakamaContext] submitScore called:', { score, timeMs, analytics });

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
      await nakamaService.submitScore(matchId, score, timeMs, analytics);
      console.log('[NakamaContext] Score submitted successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit score';
      console.error('[NakamaContext] Failed to submit score:', error);
      setMatch(prev => ({ ...prev, error: message }));
    }
  }, []);

  const rejoinMatch = useCallback(async (params: RejoinMatchParams): Promise<boolean> => {
    // Stop any auto-reconnect and mark as manual reconnect
    nakamaService.stopAutoReconnect();
    nakamaService.setManualReconnect(true);

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

      // Clear manual reconnect flag and hide any reconnecting toast
      nakamaService.setManualReconnect(false);
      hideToast();

      return true;
    } catch (error) {
      console.error('[NakamaContext] Failed to rejoin match:', error);
      nakamaService.setManualReconnect(false);
      return false;
    }
  }, [isSocketConnected, session, hideToast]);

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
    coins,
    isWalletLoading,
    refreshWallet,
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
