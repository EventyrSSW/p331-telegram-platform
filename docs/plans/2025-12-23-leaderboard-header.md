# Leaderboard Header Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the wallet connect button in the header with a leaderboard button that navigates to a new leaderboard page displaying mock player rankings.

**Architecture:** Create a new LeaderboardPage component with mock data showing player rankings (rank, username, avatar, score). Update the Header component to replace the wallet button with a trophy icon link to /leaderboard. Add the new route to the router.

**Tech Stack:** React 18, TypeScript, CSS Modules, React Router

---

## Task 1: Create LeaderboardPage Component Directory Structure

**Files:**
- Create: `src/pages/LeaderboardPage/LeaderboardPage.tsx`
- Create: `src/pages/LeaderboardPage/LeaderboardPage.module.css`
- Create: `src/pages/LeaderboardPage/index.ts`

**Step 1: Create the page directory**

Run:
```bash
mkdir -p src/pages/LeaderboardPage
```

**Step 2: Create the barrel export file**

Create `src/pages/LeaderboardPage/index.ts`:
```typescript
export { LeaderboardPage } from './LeaderboardPage';
```

**Step 3: Commit directory structure**

```bash
git add src/pages/LeaderboardPage/index.ts
git commit -m "chore: add LeaderboardPage directory structure"
```

---

## Task 2: Create LeaderboardPage CSS Module

**Files:**
- Create: `src/pages/LeaderboardPage/LeaderboardPage.module.css`

**Step 1: Create the stylesheet**

Create `src/pages/LeaderboardPage/LeaderboardPage.module.css`:
```css
.page {
  min-height: 100vh;
  background-color: var(--color-bg-primary);
}

.main {
  padding: 16px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 24px 0;
}

.leaderboardList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.playerCard {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
}

.rank {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
}

.rankTop1 {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
}

.rankTop2 {
  background: linear-gradient(135deg, #C0C0C0, #A8A8A8);
  color: #000;
}

.rankTop3 {
  background: linear-gradient(135deg, #CD7F32, #B87333);
  color: #000;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--color-accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.playerInfo {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.playerName {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.playerStats {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.score {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-accent-primary);
}

.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--color-text-secondary);
  text-align: center;
  gap: 8px;
}

.emptyIcon {
  font-size: 48px;
  opacity: 0.5;
}
```

**Step 2: Commit the stylesheet**

```bash
git add src/pages/LeaderboardPage/LeaderboardPage.module.css
git commit -m "feat(leaderboard): add LeaderboardPage styles"
```

---

## Task 3: Create LeaderboardPage React Component

**Files:**
- Create: `src/pages/LeaderboardPage/LeaderboardPage.tsx`

**Step 1: Create the component with mock data**

Create `src/pages/LeaderboardPage/LeaderboardPage.tsx`:
```tsx
import { Header } from '../../components';
import styles from './LeaderboardPage.module.css';

interface LeaderboardPlayer {
  id: string;
  rank: number;
  username: string;
  avatar: string;
  score: number;
  gamesPlayed: number;
}

const MOCK_LEADERBOARD: LeaderboardPlayer[] = [
  { id: '1', rank: 1, username: 'CryptoKing', avatar: '👑', score: 125000, gamesPlayed: 342 },
  { id: '2', rank: 2, username: 'GameMaster', avatar: '🎮', score: 98500, gamesPlayed: 287 },
  { id: '3', rank: 3, username: 'TonPlayer', avatar: '💎', score: 87200, gamesPlayed: 256 },
  { id: '4', rank: 4, username: 'LuckyWinner', avatar: '🍀', score: 72100, gamesPlayed: 198 },
  { id: '5', rank: 5, username: 'ProGamer', avatar: '🏆', score: 65800, gamesPlayed: 175 },
  { id: '6', rank: 6, username: 'CardShark', avatar: '🃏', score: 54300, gamesPlayed: 163 },
  { id: '7', rank: 7, username: 'PuzzlePro', avatar: '🧩', score: 48900, gamesPlayed: 142 },
  { id: '8', rank: 8, username: 'ArcadeAce', avatar: '👾', score: 42500, gamesPlayed: 128 },
  { id: '9', rank: 9, username: 'BoardBoss', avatar: '♟️', score: 38200, gamesPlayed: 115 },
  { id: '10', rank: 10, username: 'SportsStar', avatar: '⚽', score: 31800, gamesPlayed: 98 },
];

const getRankClass = (rank: number): string => {
  if (rank === 1) return styles.rankTop1;
  if (rank === 2) return styles.rankTop2;
  if (rank === 3) return styles.rankTop3;
  return '';
};

const formatScore = (score: number): string => {
  return score.toLocaleString();
};

export const LeaderboardPage = () => {
  const players = MOCK_LEADERBOARD;

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <h1 className={styles.title}>Leaderboard</h1>

        {players.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🏆</span>
            <p>No players yet. Be the first!</p>
          </div>
        ) : (
          <div className={styles.leaderboardList}>
            {players.map((player) => (
              <div key={player.id} className={styles.playerCard}>
                <div className={`${styles.rank} ${getRankClass(player.rank)}`}>
                  {player.rank}
                </div>
                <div className={styles.avatar}>{player.avatar}</div>
                <div className={styles.playerInfo}>
                  <span className={styles.playerName}>{player.username}</span>
                  <span className={styles.playerStats}>
                    {player.gamesPlayed} games played
                  </span>
                </div>
                <div className={styles.score}>{formatScore(player.score)}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
```

**Step 2: Commit the component**

```bash
git add src/pages/LeaderboardPage/LeaderboardPage.tsx
git commit -m "feat(leaderboard): add LeaderboardPage component with mock data"
```

---

## Task 4: Update Router with Leaderboard Route

**Files:**
- Modify: `src/router.tsx`

**Step 1: Add leaderboard route**

Modify `src/router.tsx`:
```tsx
import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { StorePage } from './pages/StorePage';
import { GamePage } from './pages/GamePage';
import { LeaderboardPage } from './pages/LeaderboardPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/store',
    element: <StorePage />,
  },
  {
    path: '/game/:gameId',
    element: <GamePage />,
  },
  {
    path: '/leaderboard',
    element: <LeaderboardPage />,
  },
]);
```

**Step 2: Commit the router update**

```bash
git add src/router.tsx
git commit -m "feat(router): add leaderboard route"
```

---

## Task 5: Update Header - Replace Wallet Button with Leaderboard Icon

**Files:**
- Modify: `src/components/Header/Header.tsx`

**Step 1: Replace wallet button with leaderboard link**

Modify `src/components/Header/Header.tsx`:
```tsx
import { Link, useLocation } from 'react-router-dom';
import styles from './Header.module.css';

export const Header = () => {
  const location = useLocation();

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        <div className={styles.logoIcon}>G</div>
        <span className={styles.logoText}>Games</span>
      </Link>

      <div className={styles.actions}>
        <Link
          to="/store"
          className={`${styles.navLink} ${location.pathname === '/store' ? styles.navLinkActive : ''}`}
          aria-label="Store"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>

        <Link
          to="/leaderboard"
          className={`${styles.navLink} ${location.pathname === '/leaderboard' ? styles.navLinkActive : ''}`}
          aria-label="Leaderboard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 21V11H4C3.44772 11 3 11.4477 3 12V20C3 20.5523 3.44772 21 4 21H8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 21V5C14 4.44772 14.4477 4 15 4H19C19.5523 4 20 4.44772 20 5V20C20 20.5523 19.5523 21 19 21H14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 21V8C8 7.44772 8.44772 7 9 7H13C13.5523 7 14 7.44772 14 8V21H8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>
    </header>
  );
};
```

**Step 2: Commit the header update**

```bash
git add src/components/Header/Header.tsx
git commit -m "feat(header): replace wallet button with leaderboard icon"
```

---

## Task 6: Build Verification

**Step 1: Run the production build**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 2: Verify TypeScript compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No TypeScript errors

**Step 3: Final commit if any fixes needed**

If any fixes were required:
```bash
git add -A
git commit -m "fix: address build issues"
```

---

## Summary

This implementation:
- Creates a new LeaderboardPage with mock player data (top 10 players)
- Shows player rank, avatar emoji, username, games played, and score
- Gold/silver/bronze styling for top 3 players
- Replaces the wallet connect button in header with a leaderboard icon (bar chart)
- Adds `/leaderboard` route
- Maintains existing store icon in header
- Uses existing CSS design tokens for consistent styling
