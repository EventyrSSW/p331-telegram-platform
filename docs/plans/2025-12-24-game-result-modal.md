# Game Result Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When Unity game emits levelComplete event, redirect user to GameDetailPage and show a result popup with level, score, and coins data.

**Architecture:** GamePage handles onLevelComplete callback → quits Unity → navigates to GameDetailPage with result data in state → GameDetailPage reads state and shows GameResultModal overlay.

**Tech Stack:** React, React Router (useLocation/navigate with state), CSS Modules, createPortal

---

## Task 1: Create GameResultModal Component

**Files:**
- Create: `src/components/GameResultModal/GameResultModal.tsx`
- Create: `src/components/GameResultModal/GameResultModal.module.css`
- Create: `src/components/GameResultModal/index.ts`

**Step 1: Create component directory**

```bash
mkdir -p src/components/GameResultModal
```

**Step 2: Create the modal component**

Create `src/components/GameResultModal/GameResultModal.tsx`:

```tsx
import { createPortal } from 'react-dom';
import styles from './GameResultModal.module.css';
import { haptic } from '../../providers/TelegramProvider';

export interface GameResultData {
  level: number;
  score: number;
  coins: number;
}

interface GameResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: GameResultData | null;
  onPlayAgain?: () => void;
}

export function GameResultModal({
  isOpen,
  onClose,
  result,
  onPlayAgain,
}: GameResultModalProps) {
  if (!isOpen || !result) return null;

  const handleClose = () => {
    haptic.light();
    onClose();
  };

  const handlePlayAgain = () => {
    haptic.medium();
    onPlayAgain?.();
  };

  const modalContent = (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={handleClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className={styles.content}>
          <div className={styles.trophy}>🏆</div>
          <h2 className={styles.title}>Level Complete!</h2>

          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Level</span>
              <span className={styles.statValue}>{result.level}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Score</span>
              <span className={styles.statValue}>{result.score.toLocaleString()}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Coins</span>
              <span className={styles.statValue}>+{result.coins}</span>
            </div>
          </div>

          <div className={styles.buttons}>
            {onPlayAgain && (
              <button className={styles.playAgainButton} onClick={handlePlayAgain}>
                Play Again
              </button>
            )}
            <button className={styles.closeButtonAlt} onClick={handleClose}>
              Back to Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
```

**Step 3: Create the modal styles**

Create `src/components/GameResultModal/GameResultModal.module.css`:

```css
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
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
  max-width: 340px;
  position: relative;
  padding: 32px 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
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
  transition: background-color 0.2s;
}

.closeButton:hover {
  background-color: #4D4D4D;
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

.trophy {
  font-size: 64px;
  margin-bottom: 16px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 24px 0;
}

.stats {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
}

.statItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.statLabel {
  font-size: 12px;
  font-weight: 500;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.statValue {
  font-size: 24px;
  font-weight: 700;
  color: #10B981;
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
  box-shadow: 0 4px 20px rgba(249, 115, 22, 0.3);
  transition: all 0.2s;
}

.playAgainButton:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(249, 115, 22, 0.4);
}

.playAgainButton:active {
  transform: scale(0.98);
}

.closeButtonAlt {
  width: 100%;
  height: 52px;
  background-color: #2D2D2D;
  border: none;
  border-radius: 26px;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
  cursor: pointer;
  transition: background-color 0.2s;
}

.closeButtonAlt:hover {
  background-color: #3D3D3D;
}

.closeButtonAlt:active {
  transform: scale(0.98);
}
```

**Step 4: Create the barrel export**

Create `src/components/GameResultModal/index.ts`:

```ts
export { GameResultModal } from './GameResultModal';
export type { GameResultData } from './GameResultModal';
```

**Step 5: Verify files exist**

Run: `ls -la src/components/GameResultModal/`

Expected: 3 files listed (GameResultModal.tsx, GameResultModal.module.css, index.ts)

**Step 6: Commit**

```bash
git add src/components/GameResultModal/
git commit -m "feat: add GameResultModal component"
```

---

## Task 2: Update GamePage to Handle Level Complete

**Files:**
- Modify: `src/pages/GamePage/GamePage.tsx`

**Step 1: Read current file**

Verify current implementation of GamePage.

**Step 2: Update GamePage with onLevelComplete handler**

Update `src/pages/GamePage/GamePage.tsx`:

```tsx
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';
import { UnityGame } from '../../components/UnityGame';

// Map game IDs to their Unity build slugs
const GAME_SLUGS: Record<string, string> = {
  'mahjong-dash': 'mahjong3',
  'puzzle-master': 'mahjong-dash',
};

interface LocationState {
  level?: number;
}

interface LevelCompleteData {
  level: number;
  score: number;
  coins: number;
}

export const GamePage = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const gameSlug = gameId ? GAME_SLUGS[gameId] : null;
  const state = location.state as LocationState | null;
  const levelData = state?.level;

  console.log('[GamePage] Received level from navigation state:', levelData);

  const handleLevelComplete = useCallback((data: LevelCompleteData) => {
    console.log('[GamePage] Level complete, navigating to details with result:', data);
    // Navigate to game detail page with result data
    navigate(`/game/${gameId}/details`, {
      state: { gameResult: data },
      replace: true,
    });
  }, [gameId, navigate]);

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
    <UnityGame
      gameSlug={gameSlug}
      levelData={levelData}
      onLevelComplete={handleLevelComplete}
      onBack={handleBack}
    />
  );
};
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors related to GamePage.tsx

**Step 4: Commit**

```bash
git add src/pages/GamePage/GamePage.tsx
git commit -m "feat: handle level complete in GamePage"
```

---

## Task 3: Update GameDetailPage to Show Result Modal

**Files:**
- Modify: `src/pages/GameDetailPage/GameDetailPage.tsx`

**Step 1: Read current file**

Verify current implementation of GameDetailPage.

**Step 2: Update GameDetailPage with modal**

Add imports, state for modal, and render GameResultModal:

At the top, add imports:
```tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Header } from '../../components/Header/Header';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { GameResultModal, GameResultData } from '../../components/GameResultModal';
import { api, Game } from '../../services/api';
import { haptic } from '../../providers/TelegramProvider';
import styles from './GameDetailPage.module.css';
```

Add interface for location state:
```tsx
interface LocationState {
  gameResult?: GameResultData;
}
```

Inside the component, add state and effect to handle game result:
```tsx
const location = useLocation();
const locationState = location.state as LocationState | null;
const [showResultModal, setShowResultModal] = useState(false);
const [gameResult, setGameResult] = useState<GameResultData | null>(null);

// Check for game result from navigation state
useEffect(() => {
  if (locationState?.gameResult) {
    console.log('[GameDetailPage] Received game result:', locationState.gameResult);
    setGameResult(locationState.gameResult);
    setShowResultModal(true);
    // Clear the state to prevent showing modal on refresh
    window.history.replaceState({}, document.title);
  }
}, [locationState]);

const handleCloseResultModal = () => {
  setShowResultModal(false);
  setGameResult(null);
};

const handlePlayAgain = () => {
  setShowResultModal(false);
  setGameResult(null);
  handlePlay();
};
```

At the end of the component's return statement (before the closing `</div>`), add:
```tsx
<GameResultModal
  isOpen={showResultModal}
  onClose={handleCloseResultModal}
  result={gameResult}
  onPlayAgain={handlePlayAgain}
/>
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors

**Step 4: Commit**

```bash
git add src/pages/GameDetailPage/GameDetailPage.tsx
git commit -m "feat: show game result modal on GameDetailPage"
```

---

## Task 4: Export GameResultModal from Components Index

**Files:**
- Modify: `src/components/index.ts`

**Step 1: Read current file**

Check current exports in components index.

**Step 2: Add export**

Add to `src/components/index.ts`:

```ts
export { GameResultModal } from './GameResultModal';
export type { GameResultData } from './GameResultModal';
```

**Step 3: Commit**

```bash
git add src/components/index.ts
git commit -m "chore: export GameResultModal from components"
```

---

## Task 5: Test the Full Flow

**Step 1: Start dev server**

Run: `npm run dev`

Expected: Dev server starts without errors

**Step 2: Manual testing checklist**

1. Navigate to game detail page for mahjong-dash
2. Click Play, enter a level number
3. When Unity loads and game completes (fires onLevelComplete), verify:
   - User is redirected to GameDetailPage
   - Result modal appears with level, score, coins
   - Close button works
   - Play Again button works (starts new game)
4. Check console logs show the flow:
   - `[GamePage] Level complete, navigating to details with result: {...}`
   - `[GameDetailPage] Received game result: {...}`

**Step 3: Commit final changes if any fixes needed**

```bash
git add -A
git commit -m "test: verify game result modal flow"
```

---

## Task 6: Push to Remote

**Step 1: Push all commits**

```bash
git push
```

Expected: All commits pushed successfully

---

## Summary

The implementation creates a complete flow:
1. **UnityGame** fires `onLevelComplete({ level, score, coins })`
2. **GamePage** receives callback, navigates to `/game/:gameId/details` with `{ state: { gameResult } }`
3. **GameDetailPage** reads location state, shows **GameResultModal** with the data
4. User can close modal or click "Play Again" to start a new game
