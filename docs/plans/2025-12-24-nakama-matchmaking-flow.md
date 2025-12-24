# Nakama Matchmaking Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement real-time PvP matchmaking where users bet coins, get matched with opponents, play the same level, and see live match results with automatic wallet updates.

**Architecture:**
- NakamaService extended with socket connection and match handling
- useMatch hook manages match lifecycle (join → play → submit → result)
- GameDetailPage calls Nakama RPC to join match with bet amount
- GamePage receives level from match state, submits score on completion
- MatchResultModal shows live opponent status and final results via socket events

**Tech Stack:** @heroiclabs/nakama-js (Client, Session, Socket), React hooks, WebSocket real-time updates

---

## Task 1: Extend NakamaService with Socket and Match Methods

**Files:**
- Modify: `src/services/nakama.ts`

**Step 1: Add socket and match types**

Add after the imports:

```typescript
import { Client, Session, Socket, Match, MatchData, Notification } from '@heroiclabs/nakama-js';

interface MatchState {
  matchId: string;
  gameId: string;
  betAmount: number;
  level: MatchLevel | null;
  status: 'waiting' | 'ready' | 'playing' | 'completed';
  matchType: 'PVP' | 'PVH';
  players: { [userId: string]: PlayerInfo };
  results: { [userId: string]: PlayerResult };
  payout?: number;
  winner?: string;
}

interface MatchLevel {
  id: number;
  name: string;
  tier: string;
  tiles: any[];
  totalPairs: number;
  timeBonus: number;
}

interface PlayerInfo {
  odredacted: string;
  username: string;
  isHouse: boolean;
}

interface PlayerResult {
  score: number;
  timeMs: number;
}

interface JoinGameResponse {
  matchId?: string;
  action?: string;
  error?: string;
  code?: string;
}
```

**Step 2: Add socket property and connection methods**

Add to NakamaService class:

```typescript
private socket: Socket | null = null;
private currentMatch: MatchState | null = null;
private matchCallbacks: {
  onMatchReady?: (data: MatchState) => void;
  onMatchResult?: (data: MatchState) => void;
  onOpponentScore?: (userId: string, score: number) => void;
  onError?: (error: string) => void;
} = {};

async connectSocket(): Promise<Socket> {
  if (!this.session) {
    throw new Error('Not authenticated');
  }

  if (this.socket) {
    return this.socket;
  }

  this.socket = this.client.createSocket(nakamaConfig.useSSL, false);
  await this.socket.connect(this.session, true);

  // Setup socket event handlers
  this.socket.onmatchdata = this.handleMatchData.bind(this);
  this.socket.onnotification = this.handleNotification.bind(this);
  this.socket.ondisconnect = () => {
    console.log('[Nakama] Socket disconnected');
    this.socket = null;
  };

  console.log('[Nakama] Socket connected');
  return this.socket;
}

private handleMatchData(matchData: MatchData): void {
  const data = JSON.parse(new TextDecoder().decode(matchData.data));
  console.log('[Nakama] Match data received:', matchData.op_code, data);

  switch (matchData.op_code) {
    case 1: // match_ready
      this.currentMatch = {
        matchId: matchData.match_id,
        gameId: data.game?.id || '',
        betAmount: data.betAmount,
        level: data.game?.level || null,
        status: 'ready',
        matchType: data.matchType,
        players: {},
        results: {},
      };
      this.matchCallbacks.onMatchReady?.(this.currentMatch);
      break;
    case 3: // match_result
      if (this.currentMatch) {
        this.currentMatch.status = 'completed';
        this.currentMatch.results = data.results || {};
        this.currentMatch.winner = data.winner;
        this.currentMatch.payout = data.payout;
        this.matchCallbacks.onMatchResult?.(this.currentMatch);
      }
      break;
  }
}

private handleNotification(notification: Notification): void {
  console.log('[Nakama] Notification:', notification.code, notification.content);
  // Handle win/lose notifications (codes 100, 101, 102)
}
```

**Step 3: Add match methods**

```typescript
async joinGame(gameId: string, betAmount: number): Promise<JoinGameResponse> {
  if (!this.session) {
    throw new Error('Not authenticated');
  }

  const response = await this.client.rpc(
    this.session,
    'join_game',
    { gameId, betAmount }
  );

  const result = response.payload as JoinGameResponse;

  if (result.error) {
    throw new Error(result.error);
  }

  // Join the match via socket
  if (result.matchId && this.socket) {
    await this.socket.joinMatch(result.matchId);
    console.log('[Nakama] Joined match:', result.matchId);
  }

  return result;
}

async submitScore(matchId: string, score: number, timeMs: number): Promise<void> {
  if (!this.socket) {
    throw new Error('Socket not connected');
  }

  const data = JSON.stringify({ score, timeMs });
  await this.socket.sendMatchState(matchId, 2, data);
  console.log('[Nakama] Submitted score:', score);
}

async leaveMatch(matchId: string): Promise<void> {
  if (this.socket) {
    await this.socket.leaveMatch(matchId);
    console.log('[Nakama] Left match:', matchId);
  }
  this.currentMatch = null;
}

setMatchCallbacks(callbacks: typeof this.matchCallbacks): void {
  this.matchCallbacks = callbacks;
}

getCurrentMatch(): MatchState | null {
  return this.currentMatch;
}

getSocket(): Socket | null {
  return this.socket;
}
```

**Step 4: Add wallet methods**

```typescript
async getWallet(): Promise<{ coins: number }> {
  if (!this.session) {
    throw new Error('Not authenticated');
  }

  const account = await this.client.getAccount(this.session);
  const wallet = account.wallet ? JSON.parse(account.wallet) : { coins: 0 };
  return wallet;
}

async addTestCoins(amount: number = 1000): Promise<void> {
  if (!this.session) {
    throw new Error('Not authenticated');
  }

  await this.client.rpc(this.session, 'add_test_coins', { amount });
  console.log('[Nakama] Added', amount, 'test coins');
}
```

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```bash
git add src/services/nakama.ts
git commit -m "feat: extend NakamaService with socket and match methods"
```

---

## Task 2: Create useMatch Hook

**Files:**
- Create: `src/hooks/useMatch.ts`

**Step 1: Create the hook file**

```typescript
import { useState, useCallback, useEffect, useRef } from 'react';
import { nakamaService } from '../services/nakama';
import { useNakama } from '../contexts/NakamaContext';

export interface MatchLevel {
  id: number;
  name: string;
  tier: string;
  tiles: any[];
  totalPairs: number;
  timeBonus: number;
}

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
      onMatchReady: (matchData) => {
        console.log('[useMatch] Match ready:', matchData);
        setState(prev => ({
          ...prev,
          matchId: matchData.matchId,
          level: matchData.level,
          status: 'ready',
          matchType: matchData.matchType,
        }));
      },
      onMatchResult: (matchData) => {
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
      onError: (error) => {
        setState(prev => ({ ...prev, error, status: 'idle' }));
      },
    });

    return () => {
      nakamaService.setMatchCallbacks({});
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
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/hooks/useMatch.ts
git commit -m "feat: add useMatch hook for match lifecycle management"
```

---

## Task 3: Create MatchResultModal Component

**Files:**
- Create: `src/components/MatchResultModal/MatchResultModal.tsx`
- Create: `src/components/MatchResultModal/MatchResultModal.module.css`
- Create: `src/components/MatchResultModal/index.ts`

**Step 1: Create component directory**

```bash
mkdir -p src/components/MatchResultModal
```

**Step 2: Create MatchResultModal.tsx**

```typescript
import { createPortal } from 'react-dom';
import styles from './MatchResultModal.module.css';
import { haptic } from '../../providers/TelegramProvider';

interface MatchPlayer {
  username: string;
  score: number | null;
  isMe: boolean;
  isWinner: boolean;
}

interface MatchResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'waiting' | 'playing' | 'submitted' | 'completed';
  matchType: 'PVP' | 'PVH' | null;
  players: MatchPlayer[];
  myScore: number | null;
  payout: number | null;
  isWinner: boolean;
  onPlayAgain?: () => void;
}

export function MatchResultModal({
  isOpen,
  onClose,
  status,
  matchType,
  players,
  myScore,
  payout,
  isWinner,
  onPlayAgain,
}: MatchResultModalProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    haptic.light();
    onClose();
  };

  const handlePlayAgain = () => {
    haptic.medium();
    onPlayAgain?.();
  };

  const isLoading = status === 'submitted' || status === 'playing';
  const showResult = status === 'completed';

  const modalContent = (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={handleClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className={styles.content}>
          {isLoading && (
            <>
              <div className={styles.spinner} />
              <h2 className={styles.title}>
                {status === 'submitted' ? 'Waiting for opponent...' : 'Match in progress...'}
              </h2>
              <p className={styles.subtitle}>
                {matchType === 'PVH' ? 'Playing against House' : 'PvP Match'}
              </p>
            </>
          )}

          {showResult && (
            <>
              <div className={styles.resultIcon}>
                {isWinner ? '🏆' : '😔'}
              </div>
              <h2 className={styles.title}>
                {isWinner ? 'You Won!' : 'You Lost'}
              </h2>
              {payout !== null && payout > 0 && (
                <div className={styles.payout}>+{payout} coins</div>
              )}
            </>
          )}

          <div className={styles.playerList}>
            {players.map((player, idx) => (
              <div
                key={idx}
                className={`${styles.playerRow} ${player.isMe ? styles.playerMe : ''} ${player.isWinner ? styles.playerWinner : ''}`}
              >
                <span className={styles.playerName}>
                  {player.isMe ? 'You' : player.username}
                </span>
                <span className={styles.playerScore}>
                  {player.score !== null ? player.score.toLocaleString() : (
                    <span className={styles.pendingDots}>...</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {showResult && (
            <div className={styles.buttons}>
              {onPlayAgain && (
                <button className={styles.playAgainButton} onClick={handlePlayAgain}>
                  Play Again
                </button>
              )}
              <button className={styles.backButton} onClick={handleClose}>
                Back to Games
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
```

**Step 3: Create MatchResultModal.module.css**

```css
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.85);
  z-index: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal {
  background: linear-gradient(180deg, #1F1F1F 0%, #171717 100%);
  border-radius: 24px;
  width: 100%;
  max-width: 360px;
  position: relative;
  padding: 32px 24px;
}

.closeButton {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #3D3D3D;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
}

.closeButton svg {
  width: 18px;
  height: 18px;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #3D3D3D;
  border-top-color: #10B981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.resultIcon {
  font-size: 64px;
  margin-bottom: 12px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 14px;
  color: #9CA3AF;
  margin: 0 0 24px 0;
}

.payout {
  font-size: 32px;
  font-weight: 700;
  color: #10B981;
  margin-bottom: 24px;
}

.playerList {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.playerRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(61, 61, 61, 0.3);
  border-radius: 12px;
}

.playerMe {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.playerWinner {
  border: 2px solid #F59E0B;
}

.playerName {
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
}

.playerScore {
  font-size: 18px;
  font-weight: 700;
  color: #10B981;
}

.pendingDots {
  color: #9CA3AF;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.playAgainButton {
  width: 100%;
  height: 52px;
  background: linear-gradient(180deg, #FF7A45 0%, #F97316 100%);
  border: none;
  border-radius: 26px;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
  cursor: pointer;
}

.backButton {
  width: 100%;
  height: 52px;
  background-color: #2D2D2D;
  border: none;
  border-radius: 26px;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
  cursor: pointer;
}
```

**Step 4: Create index.ts**

```typescript
export { MatchResultModal } from './MatchResultModal';
```

**Step 5: Export from components index**

Add to `src/components/index.ts`:

```typescript
export { MatchResultModal } from './MatchResultModal';
```

**Step 6: Commit**

```bash
git add src/components/MatchResultModal/ src/components/index.ts
git commit -m "feat: add MatchResultModal with live opponent status"
```

---

## Task 4: Create SearchOpponentModal Component

**Files:**
- Create: `src/components/SearchOpponentModal/SearchOpponentModal.tsx`
- Create: `src/components/SearchOpponentModal/SearchOpponentModal.module.css`
- Create: `src/components/SearchOpponentModal/index.ts`

**Purpose:** Full-screen overlay shown when user clicks Play, displaying real-time matchmaking status with timer and opponent found notification.

**Step 1: Create component directory**

```bash
mkdir -p src/components/SearchOpponentModal
```

**Step 2: Create SearchOpponentModal.tsx**

```typescript
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './SearchOpponentModal.module.css';
import { haptic } from '../../providers/TelegramProvider';

interface SearchOpponentModalProps {
  isOpen: boolean;
  onCancel: () => void;
  status: 'searching' | 'found' | 'starting';
  opponentName?: string;
  matchType?: 'PVP' | 'PVH' | null;
  betAmount: number;
  onOpponentFound?: () => void;
}

export function SearchOpponentModal({
  isOpen,
  onCancel,
  status,
  opponentName,
  matchType,
  betAmount,
  onOpponentFound,
}: SearchOpponentModalProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showFoundAnimation, setShowFoundAnimation] = useState(false);

  // Timer effect
  useEffect(() => {
    if (isOpen && status === 'searching') {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, status]);

  // Handle opponent found animation
  useEffect(() => {
    if (status === 'found') {
      haptic.success();
      setShowFoundAnimation(true);

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Auto-dismiss after animation
      const timeout = setTimeout(() => {
        onOpponentFound?.();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [status, onOpponentFound]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setElapsedSeconds(0);
      setShowFoundAnimation(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCancel = () => {
    haptic.light();
    onCancel();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusMessage = (): string => {
    switch (status) {
      case 'searching':
        return 'Searching for opponent...';
      case 'found':
        return matchType === 'PVH' ? 'Playing against House!' : 'Opponent found!';
      case 'starting':
        return 'Starting game...';
      default:
        return 'Preparing match...';
    }
  };

  const modalContent = (
    <div className={styles.overlay}>
      <div className={styles.content}>
        {/* Animated search indicator */}
        <div className={`${styles.searchIndicator} ${showFoundAnimation ? styles.found : ''}`}>
          {status === 'searching' ? (
            <div className={styles.radarContainer}>
              <div className={styles.radarPulse} />
              <div className={styles.radarPulse} style={{ animationDelay: '0.5s' }} />
              <div className={styles.radarPulse} style={{ animationDelay: '1s' }} />
              <div className={styles.radarCenter}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            </div>
          ) : (
            <div className={styles.foundIcon}>
              {matchType === 'PVH' ? '🏠' : '👥'}
            </div>
          )}
        </div>

        {/* Status message */}
        <h2 className={styles.title}>{getStatusMessage()}</h2>

        {/* Opponent name when found */}
        {status === 'found' && opponentName && (
          <div className={styles.opponentName}>
            vs {opponentName}
          </div>
        )}

        {/* Timer */}
        {status === 'searching' && (
          <div className={styles.timer}>
            {formatTime(elapsedSeconds)}
          </div>
        )}

        {/* Bet amount display */}
        <div className={styles.betInfo}>
          <span className={styles.betLabel}>Entry:</span>
          <span className={styles.betAmount}>{betAmount} coins</span>
        </div>

        {/* Search tips */}
        {status === 'searching' && elapsedSeconds > 10 && (
          <p className={styles.tip}>
            No opponents yet. You'll play against House if no one joins in {30 - elapsedSeconds}s
          </p>
        )}

        {/* Cancel button */}
        {status === 'searching' && (
          <button className={styles.cancelButton} onClick={handleCancel}>
            Cancel
          </button>
        )}

        {/* Starting game indicator */}
        {status === 'starting' && (
          <div className={styles.startingIndicator}>
            <div className={styles.loadingDots}>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
```

**Step 3: Create SearchOpponentModal.module.css**

```css
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #0A0A0A 0%, #1A1A2E 100%);
  z-index: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 320px;
  width: 100%;
}

/* Radar animation for searching */
.searchIndicator {
  width: 160px;
  height: 160px;
  margin-bottom: 32px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radarContainer {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radarPulse {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid rgba(16, 185, 129, 0.4);
  animation: radarPulse 2s ease-out infinite;
}

@keyframes radarPulse {
  0% {
    transform: scale(0.3);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

.radarCenter {
  width: 64px;
  height: 64px;
  background: linear-gradient(180deg, #10B981 0%, #059669 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 0 40px rgba(16, 185, 129, 0.5);
  z-index: 1;
}

/* Found state */
.searchIndicator.found {
  animation: foundBounce 0.6s ease-out;
}

@keyframes foundBounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.foundIcon {
  font-size: 72px;
  animation: foundPop 0.5s ease-out;
}

@keyframes foundPop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Text styles */
.title {
  font-size: 24px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 12px 0;
}

.opponentName {
  font-size: 20px;
  font-weight: 600;
  color: #10B981;
  margin-bottom: 16px;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.timer {
  font-size: 48px;
  font-weight: 700;
  color: #9CA3AF;
  font-variant-numeric: tabular-nums;
  margin-bottom: 24px;
}

.betInfo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: rgba(61, 61, 61, 0.3);
  border-radius: 24px;
  margin-bottom: 24px;
}

.betLabel {
  font-size: 14px;
  color: #9CA3AF;
}

.betAmount {
  font-size: 16px;
  font-weight: 600;
  color: #10B981;
}

.tip {
  font-size: 14px;
  color: #6B7280;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.cancelButton {
  padding: 14px 48px;
  background-color: transparent;
  border: 2px solid #4B5563;
  border-radius: 28px;
  font-size: 16px;
  font-weight: 600;
  color: #9CA3AF;
  cursor: pointer;
  transition: all 0.2s;
}

.cancelButton:hover {
  border-color: #6B7280;
  color: #FFFFFF;
}

.cancelButton:active {
  transform: scale(0.98);
}

/* Starting indicator */
.startingIndicator {
  margin-top: 16px;
}

.loadingDots {
  display: flex;
  gap: 8px;
}

.loadingDots span {
  width: 12px;
  height: 12px;
  background-color: #10B981;
  border-radius: 50%;
  animation: dotPulse 1.4s infinite ease-in-out both;
}

.loadingDots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loadingDots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes dotPulse {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
```

**Step 4: Create index.ts**

```typescript
export { SearchOpponentModal } from './SearchOpponentModal';
```

**Step 5: Export from components index**

Add to `src/components/index.ts`:

```typescript
export { SearchOpponentModal } from './SearchOpponentModal';
```

**Step 6: Commit**

```bash
git add src/components/SearchOpponentModal/ src/components/index.ts
git commit -m "feat: add SearchOpponentModal with timer and found animation"
```

---

## Task 5: Update GameDetailPage for Nakama Matchmaking

**Files:**
- Modify: `src/pages/GameDetailPage/GameDetailPage.tsx`

**Step 1: Add imports and hook**

Add to imports:
```typescript
import { useMatch } from '../../hooks/useMatch';
import { MatchResultModal } from '../../components/MatchResultModal';
import { useNakama } from '../../contexts/NakamaContext';
```

**Step 2: Add match state to component**

Inside component, add:
```typescript
const { isConnected } = useNakama();
const match = useMatch();
const [isJoining, setIsJoining] = useState(false);
```

**Step 3: Update handlePlay function**

Replace handlePlay with:
```typescript
const handlePlay = async () => {
  haptic.medium();
  if (!gameId) return;

  // Remove debug prompt - use actual bet from UI
  const betAmount = Math.floor(currentTier.entry * 100); // Convert to coins (cents)

  if (!isConnected) {
    setError('Not connected to game server');
    return;
  }

  setIsJoining(true);

  try {
    const result = await match.joinGame(gameId, betAmount);

    if (result?.matchId) {
      // Wait for match ready event, then navigate
      console.log('[GameDetailPage] Joined match:', result.matchId);
    }
  } catch (err) {
    console.error('[GameDetailPage] Failed to join game:', err);
    setError(err instanceof Error ? err.message : 'Failed to join game');
  } finally {
    setIsJoining(false);
  }
};
```

**Step 4: Add effect to navigate when match is ready**

```typescript
useEffect(() => {
  if (match.status === 'ready' && match.level && gameId) {
    console.log('[GameDetailPage] Match ready, navigating to game with level:', match.level.id);
    navigate(`/game/${gameId}`, {
      state: {
        level: match.level.id,
        matchId: match.matchId,
        betAmount: match.betAmount,
      },
    });
  }
}, [match.status, match.level, match.matchId, gameId, navigate]);
```

**Step 5: Add match result modal**

At end of JSX (after GameResultModal):
```typescript
<MatchResultModal
  isOpen={match.status === 'submitted' || match.status === 'completed'}
  onClose={() => match.reset()}
  status={match.status as any}
  matchType={match.matchType}
  players={[
    { username: 'You', score: match.myScore, isMe: true, isWinner: match.winner === 'You' },
    { username: match.matchType === 'PVH' ? 'House' : 'Opponent', score: match.opponentScore, isMe: false, isWinner: match.winner !== 'You' && match.winner !== null },
  ]}
  myScore={match.myScore}
  payout={match.payout}
  isWinner={match.winner === 'You' || (match.payout !== null && match.payout > 0)}
  onPlayAgain={handlePlayAgain}
/>
```

**Step 6: Update play button to show loading**

Update play button:
```typescript
<button
  className={styles.playButton}
  onClick={handlePlay}
  disabled={isJoining || match.status === 'joining' || match.status === 'waiting'}
>
  {isJoining || match.status === 'joining' ? (
    <span>Joining...</span>
  ) : match.status === 'waiting' ? (
    <span>Finding opponent...</span>
  ) : (
    <>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5V19L19 12L8 5Z"/>
      </svg>
      <span>Play</span>
    </>
  )}
</button>
```

**Step 7: Commit**

```bash
git add src/pages/GameDetailPage/GameDetailPage.tsx
git commit -m "feat: integrate Nakama matchmaking in GameDetailPage"
```

---

## Task 5: Update GamePage to Submit Score to Match

**Files:**
- Modify: `src/pages/GamePage/GamePage.tsx`

**Step 1: Add match hook**

Add imports:
```typescript
import { useMatch } from '../../hooks/useMatch';
```

Add in component:
```typescript
const match = useMatch();
```

**Step 2: Update location state interface**

```typescript
interface LocationState {
  level?: number;
  matchId?: string;
  betAmount?: number;
}
```

**Step 3: Extract match info from state**

```typescript
const state = location.state as LocationState | null;
const levelData = state?.level;
const matchId = state?.matchId;
```

**Step 4: Update handleLevelComplete**

```typescript
const handleLevelComplete = useCallback((data: LevelCompleteData) => {
  console.log('[GamePage] Level complete:', data);

  // If in a match, submit score
  if (matchId) {
    const timeMs = Date.now(); // TODO: Get actual time from game
    match.submitScore(data.score, timeMs);
  }

  // Navigate to game detail page with result
  navigate(`/game/${gameId}/details`, {
    state: { gameResult: data },
    replace: true,
  });
}, [gameId, navigate, matchId, match]);
```

**Step 5: Commit**

```bash
git add src/pages/GamePage/GamePage.tsx
git commit -m "feat: submit match score on level complete"
```

---

## Task 6: Update NakamaContext to Expose Socket Status

**Files:**
- Modify: `src/contexts/NakamaContext.tsx`

**Step 1: Add socket status to context**

Update interface:
```typescript
interface NakamaContextValue {
  session: Session | null;
  isConnected: boolean;
  isConnecting: boolean;
  isSocketConnected: boolean;
  error: string | null;
  connect: (userData: TelegramUserData) => Promise<void>;
  disconnect: () => void;
  connectSocket: () => Promise<void>;
}
```

**Step 2: Add socket state and method**

```typescript
const [isSocketConnected, setIsSocketConnected] = useState(false);

const connectSocket = useCallback(async () => {
  try {
    await nakamaService.connectSocket();
    setIsSocketConnected(true);
  } catch (err) {
    console.error('[NakamaContext] Socket connection error:', err);
    setIsSocketConnected(false);
  }
}, []);
```

**Step 3: Update value object**

```typescript
const value: NakamaContextValue = {
  session,
  isConnected: nakamaService.isAuthenticated(),
  isConnecting,
  isSocketConnected,
  error,
  connect,
  disconnect,
  connectSocket,
};
```

**Step 4: Commit**

```bash
git add src/contexts/NakamaContext.tsx
git commit -m "feat: expose socket connection status in NakamaContext"
```

---

## Task 7: Add Wallet Display Component

**Files:**
- Create: `src/hooks/useNakamaWallet.ts`

**Step 1: Create wallet hook**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { nakamaService } from '../services/nakama';
import { useNakama } from '../contexts/NakamaContext';

export function useNakamaWallet() {
  const { isConnected } = useNakama();
  const [coins, setCoins] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    try {
      const wallet = await nakamaService.getWallet();
      setCoins(wallet.coins || 0);
    } catch (error) {
      console.error('[useNakamaWallet] Failed to fetch wallet:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTestCoins = useCallback(async (amount: number = 1000) => {
    await nakamaService.addTestCoins(amount);
    await refresh();
  }, [refresh]);

  return {
    coins,
    isLoading,
    refresh,
    addTestCoins,
  };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useNakamaWallet.ts
git commit -m "feat: add useNakamaWallet hook for wallet balance"
```

---

## Task 8: Test and Verify

**Step 1: Build check**

```bash
npx tsc --noEmit
npm run build
```

**Step 2: Manual testing checklist**

1. Connect to Nakama on app load
2. Navigate to game detail page
3. Select bet tier
4. Click Play → should call join_game RPC
5. Wait for match (or house player timeout)
6. Game should start with level from match
7. Complete game → score submitted
8. MatchResultModal shows with live opponent status
9. Final result shows winner and payout
10. Check wallet balance updated

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address testing issues"
```

---

## Task 9: Push to Remote

**Step 1: Push all commits**

```bash
git push
```

---

## Summary

The implementation creates a complete matchmaking flow:

1. **NakamaService** extended with socket, RPC calls, and match state management
2. **useMatch hook** manages match lifecycle with real-time callbacks
3. **MatchResultModal** shows live opponent status and final results
4. **GameDetailPage** joins match via RPC, waits for match_ready, navigates with level
5. **GamePage** submits score on level complete
6. **Wallet** updated automatically by Nakama backend on win/lose

**Backend already handles:**
- Player vs Player matchmaking
- Player vs House (after timeout)
- Bet deduction on join
- Prize pool distribution
- Leaderboard updates
- Player stats tracking
