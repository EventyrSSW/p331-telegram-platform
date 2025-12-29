# Global Nakama Socket Management + Player Avatar Overlay

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix socket disconnection when navigating between GameDetailPage and GamePage by moving socket and match state to global context, plus add a player avatar overlay for debugging match presence.

**Architecture:** Move match state from per-component `useMatch` hook to `NakamaContext`. Socket connects once on session creation and persists across navigation. Match callbacks and presence tracking live in context. Add reconnection with exponential backoff. Player avatar overlay consumes presence from context.

**Tech Stack:** React Context, TypeScript, @heroiclabs/nakama-js, CSS Modules

---

## Task 1: Extend NakamaService with Reconnection and Presence Tracking

**Files:**
- Modify: `src/services/nakama.ts`

**Step 1: Add reconnection state and presence types**

Add these properties and types at the top of `nakama.ts`:

```typescript
// Add after line 59 (MatchCallbacks interface)
interface PresenceInfo {
  odredacted: string;
  username: string;
  avatarUrl?: string;
  isOnline: boolean;
}

interface MatchPresence {
  [odredacted: string]: PresenceInfo;
}

// Add to MatchCallbacks interface:
onPresenceChange?: (presences: MatchPresence) => void;
```

Add these private properties to the `NakamaService` class:

```typescript
// Add after line 76 (matchCallbacks property)
private matchPresences: MatchPresence = {};
private isSocketConnecting = false;
private reconnectAttempts = 0;
private maxReconnectAttempts = 5;
private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
```

**Step 2: Update handleMatchPresence to track presence**

Replace the `handleMatchPresence` method:

```typescript
private handleMatchPresence(presenceEvent: MatchPresenceEvent): void {
  console.log('[Nakama] Match presence:', presenceEvent);

  presenceEvent.joins?.forEach(p => {
    console.log('[Nakama] Player joined:', p.username);
    this.matchPresences[p.user_id] = {
      odredacted: p.user_id,
      username: p.username,
      avatarUrl: undefined, // Will be populated from account data
      isOnline: true,
    };
  });

  presenceEvent.leaves?.forEach(p => {
    console.log('[Nakama] Player left:', p.username);
    if (this.matchPresences[p.user_id]) {
      this.matchPresences[p.user_id].isOnline = false;
    }
    this.matchCallbacks.onError?.(`${p.username} disconnected`);
  });

  this.matchCallbacks.onPresenceChange?.({ ...this.matchPresences });
}
```

**Step 3: Add reconnection logic to connectSocket**

Update the `connectSocket` method to handle reconnection:

```typescript
async connectSocket(): Promise<Socket> {
  if (!this.session) {
    throw new Error('Not authenticated');
  }

  if (this.session.isexpired(Date.now() / 1000)) {
    throw new Error('Session expired, please re-authenticate');
  }

  // Return existing socket if connected
  if (this.socket) {
    return this.socket;
  }

  // Prevent concurrent connection attempts
  if (this.isSocketConnecting) {
    // Wait for ongoing connection
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.socket) {
          clearInterval(checkInterval);
          resolve(this.socket);
        } else if (!this.isSocketConnecting) {
          clearInterval(checkInterval);
          reject(new Error('Socket connection failed'));
        }
      }, 100);
    });
  }

  this.isSocketConnecting = true;

  try {
    this.socket = this.client.createSocket(nakamaConfig.useSSL, false);
    await this.socket.connect(this.session, true);

    this.socket.onmatchdata = this.handleMatchData.bind(this);
    this.socket.onnotification = this.handleNotification.bind(this);
    this.socket.onmatchpresence = this.handleMatchPresence.bind(this);
    this.socket.ondisconnect = (evt) => {
      console.log('[Nakama] Socket disconnected', evt);
      this.socket = null;
      this.attemptReconnect();
    };

    console.log('[Nakama] Socket connected');
    this.reconnectAttempts = 0; // Reset on successful connection
    return this.socket;
  } finally {
    this.isSocketConnecting = false;
  }
}
```

**Step 4: Add reconnection attempt method**

Add this new method to the class:

```typescript
private attemptReconnect(): void {
  if (this.reconnectAttempts >= this.maxReconnectAttempts) {
    console.error('[Nakama] Max reconnection attempts reached');
    this.matchCallbacks.onError?.('Connection lost. Please refresh to reconnect.');
    return;
  }

  const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
  console.log(`[Nakama] Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

  this.reconnectTimeoutId = setTimeout(async () => {
    this.reconnectAttempts++;
    try {
      await this.connectSocket();
      // Rejoin match if we had one
      if (this.currentMatch?.matchId && this.socket) {
        console.log('[Nakama] Rejoining match after reconnect:', this.currentMatch.matchId);
        await this.socket.joinMatch(this.currentMatch.matchId);
      }
    } catch (error) {
      console.error('[Nakama] Reconnection failed:', error);
      this.attemptReconnect();
    }
  }, delay);
}
```

**Step 5: Add presence and socket state getters**

Add these methods:

```typescript
getMatchPresences(): MatchPresence {
  return { ...this.matchPresences };
}

isSocketConnecting_(): boolean {
  return this.isSocketConnecting;
}

clearMatchPresences(): void {
  this.matchPresences = {};
}
```

**Step 6: Update leaveMatch to clear presences**

```typescript
async leaveMatch(matchId: string): Promise<void> {
  if (this.socket && matchId) {
    try {
      await this.socket.leaveMatch(matchId);
      console.log('[Nakama] Left match:', matchId);
    } catch (e) {
      console.warn('[Nakama] Error leaving match:', e);
    }
  }
  this.currentMatch = null;
  this.matchPresences = {};
  // Don't clear callbacks - they're managed by context now
}
```

**Step 7: Export new types**

Update the export line at the bottom:

```typescript
export type { TelegramUserData, MatchState, MatchLevel, MatchCallbacks, PresenceInfo, MatchPresence };
```

**Step 8: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 9: Commit**

```bash
git add src/services/nakama.ts
git commit -m "feat(nakama): add reconnection logic and presence tracking"
```

---

## Task 2: Rewrite NakamaContext with Match State and Socket Lifecycle

**Files:**
- Modify: `src/contexts/NakamaContext.tsx`

**Step 1: Add match state types and imports**

Replace the entire file with:

```typescript
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
  }, [session]);

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
    if (!matchRef.current.matchId) {
      console.error('[NakamaContext] No active match');
      return;
    }

    setMatch(prev => ({
      ...prev,
      myScore: score,
      status: 'submitted',
    }));

    try {
      await nakamaService.submitScore(matchRef.current.matchId, score, timeMs);
    } catch (error) {
      console.error('[NakamaContext] Failed to submit score:', error);
    }
  }, []);

  const leaveMatch = useCallback(async () => {
    if (matchRef.current.matchId) {
      await nakamaService.leaveMatch(matchRef.current.matchId);
    }
    setMatch(initialMatchState);
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
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors (may have errors in files that import from context - that's expected)

**Step 3: Commit**

```bash
git add src/contexts/NakamaContext.tsx
git commit -m "feat(nakama): rewrite context with global match state and socket lifecycle"
```

---

## Task 3: Simplify useMatch Hook to Context Consumer

**Files:**
- Modify: `src/hooks/useMatch.ts`

**Step 1: Rewrite useMatch as thin wrapper**

Replace the entire file:

```typescript
import { useNakama, MatchState, MatchLevel } from '../contexts/NakamaContext';

export type { MatchLevel };

// Re-export MatchState for backward compatibility
export type { MatchState };

// Legacy interface for components using the old shape
export interface MatchPlayer {
  odredacted: string;
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
      odredacted: p.odredacted,
      username: p.username,
      score: undefined,
      isHouse: false,
      hasSubmitted: false,
    })) as MatchPlayer[],
  };
}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/hooks/useMatch.ts
git commit -m "refactor(nakama): simplify useMatch to context consumer"
```

---

## Task 4: Create MatchPresenceOverlay Component

**Files:**
- Create: `src/components/MatchPresenceOverlay/MatchPresenceOverlay.tsx`
- Create: `src/components/MatchPresenceOverlay/MatchPresenceOverlay.module.css`
- Modify: `src/components/index.ts`

**Step 1: Create component directory**

Run: `mkdir -p src/components/MatchPresenceOverlay`
Expected: Directory created

**Step 2: Create the component file**

```typescript
// src/components/MatchPresenceOverlay/MatchPresenceOverlay.tsx
import { useNakama, PresenceInfo } from '../../contexts/NakamaContext';
import styles from './MatchPresenceOverlay.module.css';

interface MatchPresenceOverlayProps {
  className?: string;
}

export function MatchPresenceOverlay({ className }: MatchPresenceOverlayProps) {
  const { match, session } = useNakama();

  // Only show when in a match
  if (!match.matchId || match.status === 'idle') {
    return null;
  }

  const presences = Object.values(match.presences);
  const myUserId = session?.user_id;

  // Sort: current user first, then others
  const sortedPresences = presences.sort((a, b) => {
    if (a.odredacted === myUserId) return -1;
    if (b.odredacted === myUserId) return 1;
    return 0;
  });

  // Always show 2 slots (for PVP)
  const slots: (PresenceInfo | null)[] = [
    sortedPresences[0] || null,
    sortedPresences[1] || null,
  ];

  return (
    <div className={`${styles.overlay} ${className || ''}`}>
      <div className={styles.presenceList}>
        {slots.map((presence, index) => (
          <div
            key={presence?.odredacted || `empty-${index}`}
            className={`${styles.presenceItem} ${presence?.isOnline === false ? styles.offline : ''}`}
          >
            {presence ? (
              <>
                <div className={styles.avatarWrapper}>
                  {presence.avatarUrl ? (
                    <img
                      src={presence.avatarUrl}
                      alt={presence.username}
                      className={styles.avatar}
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {presence.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div
                    className={`${styles.statusDot} ${presence.isOnline ? styles.online : styles.disconnected}`}
                  />
                </div>
                <span className={styles.username}>
                  {presence.odredacted === myUserId ? 'You' : presence.username}
                </span>
              </>
            ) : (
              <div className={styles.emptySlot}>
                <div className={styles.avatarPlaceholder}>?</div>
                <span className={styles.waitingText}>Waiting...</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className={styles.matchInfo}>
        <span className={styles.matchType}>{match.matchType || 'Match'}</span>
        <span className={styles.matchStatus}>{match.status}</span>
      </div>
    </div>
  );
}
```

**Step 3: Create the CSS module**

```css
/* src/components/MatchPresenceOverlay/MatchPresenceOverlay.module.css */
.overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 100;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 120px;
}

.presenceList {
  display: flex;
  gap: 8px;
}

.presenceItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: opacity 0.3s ease;
}

.presenceItem.offline {
  opacity: 0.5;
}

.avatarWrapper {
  position: relative;
  width: 40px;
  height: 40px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.avatarPlaceholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.statusDot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 0.75);
}

.statusDot.online {
  background: #22c55e;
}

.statusDot.disconnected {
  background: #ef4444;
}

.username {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
  max-width: 50px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.emptySlot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  opacity: 0.6;
}

.waitingText {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
}

.matchInfo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.matchType {
  font-size: 10px;
  font-weight: 600;
  color: #a78bfa;
  text-transform: uppercase;
}

.matchStatus {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: capitalize;
}
```

**Step 4: Export component from index**

Add to `src/components/index.ts`:

```typescript
export { MatchPresenceOverlay } from './MatchPresenceOverlay/MatchPresenceOverlay';
```

**Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/components/MatchPresenceOverlay/
git add src/components/index.ts
git commit -m "feat(ui): add MatchPresenceOverlay component for debugging match presence"
```

---

## Task 5: Update GamePage to Use Overlay and Context

**Files:**
- Modify: `src/pages/GamePage/GamePage.tsx`

**Step 1: Add overlay import and render**

Update the file:

```typescript
import { useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { UnityGame } from '../../components/UnityGame';
import { MatchPresenceOverlay } from '../../components/MatchPresenceOverlay/MatchPresenceOverlay';
import { useNakama } from '../../contexts/NakamaContext';

// Map game IDs to their Unity build slugs
const GAME_SLUGS: Record<string, string> = {
  'mahjong-dash': 'mahjong3',
  'puzzle-master': 'mahjong-dash',
};

interface LocationState {
  level?: number;
  matchId?: string;
  betAmount?: number;
}

interface LevelCompleteData {
  level: number;
  score: number;
  coins: number;
}

export const GamePage = () => {
  const { gameId } = useParams<{ gameId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { match, submitScore, setMatchStatus } = useNakama();
  const gameStartTime = useRef<number>(Date.now());

  const gameSlug = gameId ? GAME_SLUGS[gameId] : null;
  const state = location.state as LocationState | null;
  const levelData = state?.level ?? match.level?.id;
  const matchId = state?.matchId ?? match.matchId;

  console.log('[GamePage] Render state:', {
    levelData,
    matchId,
    matchStatus: match.status,
    presences: match.presences
  });

  // Set status to playing when game starts
  useEffect(() => {
    if (matchId && match.status === 'ready') {
      setMatchStatus('playing');
      gameStartTime.current = Date.now();
    }
  }, [matchId, match.status, setMatchStatus]);

  const handleLevelComplete = useCallback((data: LevelCompleteData) => {
    console.log('[GamePage] Level complete:', data);

    // If in a match, submit score to Nakama
    if (matchId) {
      const timeMs = Date.now() - gameStartTime.current;
      console.log('[GamePage] Submitting score to match:', matchId, 'score:', data.score, 'time:', timeMs);
      submitScore(data.score, timeMs);
    }

    // Navigate to game detail page with result
    navigate(`/game/${gameId}/details`, {
      state: { gameResult: data },
      replace: true,
    });
  }, [gameId, navigate, matchId, submitScore]);

  const handleBack = useCallback(() => {
    navigate(`/game/${gameId}/details`);
  }, [gameId, navigate]);

  if (!gameSlug) {
    return (
      <div style={{ padding: 20, color: 'white', textAlign: 'center' }}>
        <h1>Game not found</h1>
        <button onClick={() => navigate('/')}>Back to Home</button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MatchPresenceOverlay />
      <UnityGame
        gameSlug={gameSlug}
        levelData={levelData}
        onBack={handleBack}
        onLevelComplete={handleLevelComplete}
      />
    </div>
  );
};
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/pages/GamePage/GamePage.tsx
git commit -m "feat(game): add presence overlay and use context for match state"
```

---

## Task 6: Update GameDetailPage to Use Context Match State

**Files:**
- Modify: `src/pages/GameDetailPage/GameDetailPage.tsx`

**Step 1: Update imports and hook usage**

The file mostly uses `useMatch` which now consumes from context. The key change is removing any direct state management that conflicts with context.

Update the imports:

```typescript
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Header } from '../../components/Header/Header';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { api, Game } from '../../services/api';
import { haptic } from '../../providers/TelegramProvider';
import { GameResultModal, GameResultData } from '../../components/GameResultModal';
import { MatchResultModal } from '../../components/MatchResultModal';
import { SearchOpponentModal } from '../../components/SearchOpponentModal';
import { useNakama } from '../../contexts/NakamaContext';
import styles from './GameDetailPage.module.css';
```

Replace the hook destructuring:

```typescript
// Replace this:
// const match = useMatch();

// With this:
const {
  match,
  joinGame,
  leaveMatch,
  resetMatch,
  isConnected
} = useNakama();
```

Update all references from `match.joinGame(...)` to `joinGame(...)`, `match.leaveMatch()` to `leaveMatch()`, etc.

Update the effect that watches match status:

```typescript
// Handle match status changes
useEffect(() => {
  console.log('[GameDetailPage] Match status effect:', { status: match.status, level: match.level, gameId });
  if (match.status === 'waiting') {
    setShowSearchModal(true);
    setSearchStatus('searching');
  } else if (match.status === 'ready' && gameId) {
    console.log('[GameDetailPage] Match is ready, setting found status');
    setSearchStatus('found');
    const timer = setTimeout(() => {
      console.log('[GameDetailPage] Timeout fired, navigating...');
      setShowSearchModal(false);
      navigate(`/game/${gameId}`, {
        state: {
          level: match.level?.id || null,
          matchId: match.matchId,
          betAmount: match.betAmount,
        },
      });
    }, 1500);
    return () => clearTimeout(timer);
  }
}, [match.status, match.level, match.matchId, match.betAmount, gameId, navigate]);
```

Update the handlePlay callback:

```typescript
const handlePlay = useCallback(async () => {
  haptic.medium();
  if (!gameId) return;

  const selectedTier = BET_TIERS[betTierIndex];
  const betAmount = Math.round(selectedTier.entry * 100);

  if (!isConnected) {
    setError('Not connected to game server');
    return;
  }

  try {
    const result = await joinGame(gameId, betAmount);
    if (result?.matchId) {
      console.log('[GameDetailPage] Joined match:', result.matchId);
    }
  } catch (err) {
    console.error('[GameDetailPage] Failed to join game:', err);
    setError(err instanceof Error ? err.message : 'Failed to join game');
  }
}, [gameId, betTierIndex, isConnected, joinGame]);
```

Update handleCancelSearch:

```typescript
const handleCancelSearch = useCallback(() => {
  haptic.light();
  setShowSearchModal(false);
  leaveMatch();
}, [leaveMatch]);
```

Update MatchResultModal onClose:

```typescript
<MatchResultModal
  isOpen={match.status === 'submitted' || match.status === 'completed'}
  onClose={() => resetMatch()}
  // ... rest unchanged
/>
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/pages/GameDetailPage/GameDetailPage.tsx
git commit -m "refactor(game-detail): use NakamaContext for match state"
```

---

## Task 7: Remove NakamaConnector (Logic Moved to Provider)

**Files:**
- Delete: `src/components/NakamaConnector.tsx`
- Modify: `src/App.tsx`

**Step 1: Update App.tsx to remove NakamaConnector**

The `NakamaConnector` component auto-connects to Nakama when user authenticates. This logic now lives in `NakamaProvider` (auto socket connection on session). However, we still need to trigger the initial Nakama authentication.

Create a new simpler connector or keep it for authentication only:

Actually, reviewing the code, `NakamaConnector` triggers `connect()` (authentication), not socket connection. The socket connection is separate. We should keep this component but it's already correct - it only handles auth.

**No changes needed** - `NakamaConnector` handles authentication, `NakamaProvider` handles socket auto-connection.

**Step 2: Commit (if any changes)**

```bash
git status
# If no changes, skip this step
```

---

## Task 8: Integration Test

**Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts

**Step 2: Manual testing checklist**

1. Open app in Telegram Mini App or browser
2. Navigate to a game detail page
3. Click Play to join a match
4. Verify SearchOpponentModal shows "Searching..."
5. When match found, verify navigation to GamePage
6. **Verify avatar overlay shows in top-left corner**
7. Verify both player slots show (one may be "Waiting..." for PVH)
8. Complete the game
9. Verify score submission works
10. Navigate back to GameDetailPage
11. Verify match result modal shows

**Step 3: Test socket persistence**

1. Join a match
2. Navigate to GamePage
3. Check browser console for "[Nakama] Socket disconnected" - should NOT appear
4. Complete game and navigate back
5. Socket should remain connected throughout

**Step 4: Commit all changes**

```bash
git add .
git commit -m "feat(nakama): complete global socket management implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add reconnection & presence to NakamaService | `src/services/nakama.ts` |
| 2 | Rewrite NakamaContext with match state | `src/contexts/NakamaContext.tsx` |
| 3 | Simplify useMatch to context consumer | `src/hooks/useMatch.ts` |
| 4 | Create MatchPresenceOverlay component | `src/components/MatchPresenceOverlay/` |
| 5 | Update GamePage with overlay | `src/pages/GamePage/GamePage.tsx` |
| 6 | Update GameDetailPage to use context | `src/pages/GameDetailPage/GameDetailPage.tsx` |
| 7 | Verify NakamaConnector (no changes needed) | - |
| 8 | Integration test | - |

**Key Benefits:**
- Socket persists across page navigation
- Match state is single source of truth in context
- Automatic reconnection with exponential backoff
- Visual debugging via presence overlay
- Cleaner component code (no local match state)
