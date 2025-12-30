# Results Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a Results page showing pending matches and match history, accessible from the BottomNavBar "Results" tab.

**Architecture:**
- New page component at `/results` route replacing the current `/leaderboard` link in BottomNavBar
- Server-side: New Nakama RPC `get_match_history` to fetch wallet ledger transactions (match_won, match_lost, match_lost_to_house types)
- Client-side: New ResultsPage with sections for "Pending" (current active match) and historical results grouped by date

**Tech Stack:** React, TypeScript, CSS Modules, Nakama JS SDK, Nakama Server Runtime

---

## Design Reference

Based on the provided design screenshot:
- **Pending Section:** Shows current active match with game thumbnail, title, entry price (with coin icon), and player's score
- **Date Sections:** Groups completed matches by date (e.g., "December 23")
- **Result Cards:** Show game thumbnail, game title, opponent name ("vs edwinoo"), with dark card background
- Cards have rounded corners, game icon on left side (48x48 rounded square)

---

### Task 1: Add Nakama RPC for Match History

**Files:**
- Modify: `nakama/modules/main.js:243-247` (register new RPC)
- Modify: `nakama/modules/main.js` (add new function after line 383)

**Step 1: Add the RPC function to main.js**

Add after line 383 (after `rpcGetPlayerStats` function):

```javascript
function rpcGetMatchHistory(ctx, logger, nk, payload) {
  var data = {};
  try {
    if (payload && payload !== "") {
      data = JSON.parse(payload);
    }
  } catch (e) {
    // Use defaults
  }

  var limit = data.limit || 50;
  var cursor = data.cursor || "";
  var userId = ctx.userId;

  logger.info("get_match_history called by " + userId + ", limit=" + limit);

  try {
    // Get wallet ledger entries for match-related transactions
    var ledgerResult = nk.walletLedgerList(userId, limit, cursor);

    var matchHistory = [];
    var items = ledgerResult.items || [];

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var meta = item.metadata || {};
      var txType = meta.type || "";

      // Only include match-related transactions
      if (txType === "match_won" || txType === "match_lost" || txType === "match_lost_to_house" || txType === "bet_placed") {
        matchHistory.push({
          id: item.id,
          timestamp: meta.timestamp || item.createTime,
          type: txType,
          gameId: meta.gameId || "",
          matchType: meta.matchType || "PVH",
          betAmount: meta.betAmount || 0,
          payout: meta.payout || 0,
          lostAmount: meta.lostAmount || 0,
          playerScore: meta.playerScore || 0,
          houseScore: meta.houseScore || 0,
          opponentType: meta.opponentType || "house"
        });
      }
    }

    return JSON.stringify({
      history: matchHistory,
      cursor: ledgerResult.cursor || ""
    });
  } catch (e) {
    logger.error("get_match_history error: " + e.message);
    return JSON.stringify({ error: e.message, history: [] });
  }
}
```

**Step 2: Register the RPC in InitModule**

Find line 247 and add after it:

```javascript
  initializer.registerRpc("get_match_history", rpcGetMatchHistory);
```

**Step 3: Restart Nakama to apply changes**

Run: `docker-compose restart nakama`
Expected: Nakama container restarts successfully

**Step 4: Commit**

```bash
git add nakama/modules/main.js
git commit -m "feat(nakama): add get_match_history RPC endpoint"
```

---

### Task 2: Add Match History Method to Nakama Service

**Files:**
- Modify: `src/services/nakama.ts:496-514` (add new method before `addTestCoins`)

**Step 1: Add TypeScript interface and method**

Add the interface after line 45 (after `PlayerResult` interface):

```typescript
export interface MatchHistoryItem {
  id: string;
  timestamp: number;
  type: 'match_won' | 'match_lost' | 'match_lost_to_house' | 'bet_placed';
  gameId: string;
  matchType: 'PVP' | 'PVH';
  betAmount: number;
  payout: number;
  lostAmount: number;
  playerScore: number;
  houseScore: number;
  opponentType: 'house' | 'player';
}

interface MatchHistoryResponse {
  history: MatchHistoryItem[];
  cursor: string;
}
```

**Step 2: Add the method to NakamaService class**

Add before the `getWallet` method (around line 496):

```typescript
  async getMatchHistory(limit: number = 50, cursor: string = ''): Promise<MatchHistoryResponse> {
    if (!this.session) {
      throw new Error('Not authenticated');
    }

    const response = await this.client.rpc(
      this.session,
      'get_match_history',
      { limit, cursor }
    );

    let result: MatchHistoryResponse;
    if (typeof response.payload === 'string') {
      result = JSON.parse(response.payload);
    } else {
      result = response.payload as MatchHistoryResponse;
    }

    return result;
  }
```

**Step 3: Export the new type**

Update the export line at the end of the file (line 518):

```typescript
export type { TelegramUserData, MatchState, MatchLevel, MatchCallbacks, PresenceInfo, MatchPresence, MatchHistoryItem };
```

**Step 4: Commit**

```bash
git add src/services/nakama.ts
git commit -m "feat(nakama): add getMatchHistory method to client service"
```

---

### Task 3: Create ResultCard Component

**Files:**
- Create: `src/components/ResultCard/ResultCard.tsx`
- Create: `src/components/ResultCard/ResultCard.module.css`
- Create: `src/components/ResultCard/index.ts`

**Step 1: Create the component file**

Create `src/components/ResultCard/ResultCard.tsx`:

```tsx
import { Game } from '../GameCard';
import CoinIcon from '../../assets/icons/coin.svg?react';
import styles from './ResultCard.module.css';

export interface ResultCardData {
  id: string;
  game: Game | null;
  type: 'pending' | 'won' | 'lost';
  score?: number;
  betAmount: number;
  payout?: number;
  opponent?: string;
  matchType: 'PVP' | 'PVH';
}

interface ResultCardProps {
  data: ResultCardData;
  onClick?: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ data, onClick }) => {
  const isPending = data.type === 'pending';
  const isWon = data.type === 'won';

  return (
    <button className={styles.card} onClick={onClick} disabled={!onClick}>
      {/* Game Thumbnail */}
      <div className={styles.thumbnail}>
        {data.game?.thumbnail ? (
          <img src={data.game.thumbnail} alt={data.game?.title || 'Game'} />
        ) : (
          <div className={styles.thumbnailPlaceholder}>?</div>
        )}
      </div>

      {/* Game Info */}
      <div className={styles.info}>
        <span className={styles.title}>{data.game?.title || 'Unknown Game'}</span>
        {isPending ? (
          <div className={styles.priceRow}>
            <span className={styles.priceLabel}>Price</span>
            <CoinIcon className={styles.coinIcon} />
            <span className={styles.priceValue}>{data.betAmount}</span>
          </div>
        ) : (
          <span className={styles.opponent}>
            vs {data.opponent || (data.matchType === 'PVH' ? 'House' : 'Player')}
          </span>
        )}
      </div>

      {/* Score (for pending) or Result indicator */}
      {isPending && data.score !== undefined && (
        <div className={styles.scoreSection}>
          <span className={styles.scoreLabel}>Score</span>
          <span className={styles.scoreValue}>{data.score}</span>
        </div>
      )}

      {!isPending && (
        <div className={`${styles.result} ${isWon ? styles.won : styles.lost}`}>
          {isWon ? `+${data.payout}` : `-${data.betAmount}`}
        </div>
      )}
    </button>
  );
};
```

**Step 2: Create the CSS module**

Create `src/components/ResultCard/ResultCard.module.css`:

```css
.card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-bg-secondary, #1a1a1a);
  border-radius: 12px;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;
}

.card:hover:not(:disabled) {
  background: var(--color-bg-tertiary, #252525);
}

.card:disabled {
  cursor: default;
}

.thumbnail {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--color-bg-tertiary, #252525);
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnailPlaceholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary, #9F9F9F);
  font-size: 20px;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary, white);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.priceRow {
  display: flex;
  align-items: center;
  gap: 4px;
}

.priceLabel {
  font-size: 14px;
  color: #0098EA;
  font-weight: 500;
}

.coinIcon {
  width: 16px;
  height: 16px;
  color: #0098EA;
}

.priceValue {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.opponent {
  font-size: 14px;
  color: var(--color-text-secondary, #9F9F9F);
}

.scoreSection {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.scoreLabel {
  font-size: 12px;
  color: var(--color-text-secondary, #9F9F9F);
}

.scoreValue {
  font-size: 20px;
  font-weight: 700;
  color: white;
}

.result {
  font-size: 16px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
}

.won {
  color: #00C853;
  background: rgba(0, 200, 83, 0.1);
}

.lost {
  color: #FF4757;
  background: rgba(255, 71, 87, 0.1);
}
```

**Step 3: Create the index file**

Create `src/components/ResultCard/index.ts`:

```typescript
export { ResultCard, type ResultCardData } from './ResultCard';
```

**Step 4: Export from components index**

Add to `src/components/index.ts`:

```typescript
export { ResultCard, type ResultCardData } from './ResultCard';
```

**Step 5: Commit**

```bash
git add src/components/ResultCard/
git add src/components/index.ts
git commit -m "feat: add ResultCard component for match results display"
```

---

### Task 4: Create ResultsPage Component

**Files:**
- Create: `src/pages/ResultsPage/ResultsPage.tsx`
- Create: `src/pages/ResultsPage/ResultsPage.module.css`
- Create: `src/pages/ResultsPage/index.ts`

**Step 1: Create the page component**

Create `src/pages/ResultsPage/ResultsPage.tsx`:

```tsx
import { useEffect, useState, useRef } from 'react';
import { Header, BottomNavBar, ResultCard, ResultCardData } from '../../components';
import { useNakama } from '../../contexts/NakamaContext';
import { useGames } from '../../contexts/GamesContext';
import { nakamaService, MatchHistoryItem } from '../../services/nakama';
import styles from './ResultsPage.module.css';

interface GroupedResults {
  [date: string]: ResultCardData[];
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export function ResultsPage() {
  const { match, isConnected } = useNakama();
  const { allGames } = useGames();
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchInitiatedRef = useRef(false);

  useEffect(() => {
    if (fetchInitiatedRef.current) return;
    fetchInitiatedRef.current = true;

    loadHistory();
  }, []);

  const loadHistory = async () => {
    if (!isConnected) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await nakamaService.getMatchHistory(50);
      setHistory(result.history || []);
    } catch (err) {
      console.error('Failed to load match history:', err);
      setError('Failed to load match history');
    } finally {
      setLoading(false);
    }
  };

  const getGameById = (gameId: string) => {
    return allGames.find(g => g.slug === gameId || g.id === gameId) || null;
  };

  // Build pending match card from current match state
  const pendingCard: ResultCardData | null = match.status !== 'idle' && match.status !== 'completed'
    ? {
        id: match.matchId || 'pending',
        game: getGameById(match.gameId),
        type: 'pending',
        score: match.myScore ?? undefined,
        betAmount: match.betAmount,
        matchType: match.matchType || 'PVH',
      }
    : null;

  // Convert history items to ResultCardData and group by date
  const groupedHistory: GroupedResults = {};

  history.forEach(item => {
    if (item.type === 'bet_placed') return; // Skip bet transactions, only show results

    const dateKey = formatDate(item.timestamp);
    const cardData: ResultCardData = {
      id: item.id,
      game: getGameById(item.gameId),
      type: item.type === 'match_won' ? 'won' : 'lost',
      betAmount: item.betAmount,
      payout: item.payout,
      matchType: item.matchType,
      opponent: item.opponentType === 'house' ? 'House' : undefined,
    };

    if (!groupedHistory[dateKey]) {
      groupedHistory[dateKey] = [];
    }
    groupedHistory[dateKey].push(cardData);
  });

  const dateKeys = Object.keys(groupedHistory);

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        {/* Pending Section */}
        {pendingCard && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Pending</h2>
            <div className={styles.cardList}>
              <ResultCard data={pendingCard} />
            </div>
          </section>
        )}

        {/* Loading State */}
        {loading && (
          <div className={styles.loading}>Loading match history...</div>
        )}

        {/* Error State */}
        {error && (
          <div className={styles.error}>{error}</div>
        )}

        {/* Empty State */}
        {!loading && !error && dateKeys.length === 0 && !pendingCard && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🎮</span>
            <p>No match results yet</p>
            <p className={styles.emptySubtext}>Play a game to see your results here!</p>
          </div>
        )}

        {/* History Sections by Date */}
        {dateKeys.map(dateKey => (
          <section key={dateKey} className={styles.section}>
            <h2 className={styles.sectionTitle}>{dateKey}</h2>
            <div className={styles.cardList}>
              {groupedHistory[dateKey].map(card => (
                <ResultCard key={card.id} data={card} />
              ))}
            </div>
          </section>
        ))}
      </main>
      <BottomNavBar />
    </div>
  );
}
```

**Step 2: Create the CSS module**

Create `src/pages/ResultsPage/ResultsPage.module.css`:

```css
.page {
  min-height: 100vh;
  background-color: var(--color-bg-primary, #050505);
}

.main {
  padding: 16px;
  padding-bottom: 100px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sectionTitle {
  font-size: 16px;
  font-weight: 500;
  color: #0098EA;
  margin: 0;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.cardList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.loading {
  text-align: center;
  color: var(--color-text-secondary, #9F9F9F);
  padding: 40px 16px;
}

.error {
  text-align: center;
  color: #ff4757;
  padding: 16px;
  background: rgba(255, 71, 87, 0.1);
  border-radius: 12px;
}

.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: var(--color-text-secondary, #9F9F9F);
  text-align: center;
  gap: 8px;
}

.emptyIcon {
  font-size: 64px;
  opacity: 0.5;
}

.emptyState p {
  margin: 0;
  font-size: 16px;
}

.emptySubtext {
  font-size: 14px !important;
  opacity: 0.7;
}
```

**Step 3: Create the index file**

Create `src/pages/ResultsPage/index.ts`:

```typescript
export { ResultsPage } from './ResultsPage';
```

**Step 4: Commit**

```bash
git add src/pages/ResultsPage/
git commit -m "feat: add ResultsPage component with pending and history sections"
```

---

### Task 5: Update Router and BottomNavBar

**Files:**
- Modify: `src/router.tsx:6-7` (add import)
- Modify: `src/router.tsx:29-32` (add route)
- Modify: `src/components/BottomNavBar/BottomNavBar.tsx:20-28` (change link)

**Step 1: Update router to add /results route**

Add import at line 7:

```typescript
import { ResultsPage } from './pages/ResultsPage';
```

Add route after the `/leaderboard` route (around line 32):

```typescript
  {
    path: '/results',
    element: <ResultsPage />,
  },
```

**Step 2: Update BottomNavBar to link to /results**

In `src/components/BottomNavBar/BottomNavBar.tsx`, change line 21 from:

```tsx
        to="/leaderboard"
```

to:

```tsx
        to="/results"
```

And update the `isActive` check on line 22 from:

```tsx
        className={`${styles.navItem} ${isActive('/leaderboard') ? styles.navItemActive : ''}`}
```

to:

```tsx
        className={`${styles.navItem} ${isActive('/results') ? styles.navItemActive : ''}`}
```

**Step 3: Verify the app builds**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 4: Test navigation**

Run: `npm run dev`
Expected: Navigate to http://localhost:5173, click "Results" in bottom nav, see the Results page

**Step 5: Commit**

```bash
git add src/router.tsx src/components/BottomNavBar/BottomNavBar.tsx
git commit -m "feat: add /results route and update BottomNavBar navigation"
```

---

### Task 6: Test End-to-End Flow

**Step 1: Start all services**

Run: `npm run dev:local`
Expected: Frontend, backend, and Nakama all running

**Step 2: Test Results page loads**

Open: http://localhost:5173
Click "Results" in bottom nav
Expected: Results page loads with empty state or pending match

**Step 3: Play a game to generate history**

1. Go to home page, select a game
2. Play through a match
3. After match completes, navigate to Results page
Expected: Match appears in history under appropriate date section

**Step 4: Verify pending match displays**

1. Start a new game but don't complete it
2. Navigate to Results page
Expected: "Pending" section shows current match with game info and entry price

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete Results page implementation with match history"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Nakama RPC for match history | `nakama/modules/main.js` |
| 2 | Client service method | `src/services/nakama.ts` |
| 3 | ResultCard component | `src/components/ResultCard/*` |
| 4 | ResultsPage component | `src/pages/ResultsPage/*` |
| 5 | Router + BottomNavBar update | `src/router.tsx`, `src/components/BottomNavBar/BottomNavBar.tsx` |
| 6 | End-to-end testing | - |

---

## Notes

- The `/leaderboard` route is kept for backwards compatibility but can be removed if not needed
- Match history uses wallet ledger which automatically tracks all match transactions
- Pending match detection uses the NakamaContext match state
- Games are matched by slug or id from GamesContext
