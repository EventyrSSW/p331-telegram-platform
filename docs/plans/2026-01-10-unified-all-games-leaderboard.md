# Unified All-Games Leaderboard Implementation Plan

**Goal:** Create a single unified leaderboard (`all_games_wins`) that tracks player wins across ALL games and displays real data on the frontend.

**Architecture:** Add a new `all_games_wins` leaderboard in Nakama that increments when ANY game is won. Create an RPC endpoint to fetch leaderboard data. Update frontend to fetch and display real data instead of mocks. Refresh user's rank in header after match completion.

**Tech Stack:** Nakama JS Runtime, React, TypeScript, CSS Modules

---

## Task 1: Create Unified Leaderboard in Nakama

**Files:**
- Modify: `nakama/modules/main.js:587` (after existing leaderboard creation)

**Step 1: Add unified leaderboard creation**

Add after line 587 (after the for loop creating per-game leaderboards):

```javascript
  // Create unified "all games" leaderboard
  try {
    nk.leaderboardCreate(
      "all_games_wins",
      false,
      "desc",
      "incr",
      "",
      { type: "unified", description: "All games combined wins" }
    );
    logger.info("Created leaderboard: all_games_wins");
  } catch (e) {
    logger.debug("Leaderboard all_games_wins already exists or error: " + e.message);
  }
```

**Step 2: Deploy and verify**

Run: Deploy to Nakama server and check Nakama console for `all_games_wins` leaderboard.
Expected: New leaderboard visible in Nakama Admin Console under Leaderboards.

**Step 3: Commit**

```bash
git add nakama/modules/main.js
git commit -m "feat(nakama): create unified all_games_wins leaderboard"
```

---

## Task 2: Update resolveMatch to Write to Unified Leaderboard

**Files:**
- Modify: `nakama/modules/main.js:2021` (after per-game leaderboard write)

**Step 1: Add unified leaderboard write after per-game write**

Add after line 2021 (after the per-game leaderboard write try/catch block):

```javascript
      // Update unified "all games" leaderboard
      try {
        var totalGamesPlayed = 0;
        var statsResult = nk.storageList(winner.userId, "player_stats", 100, "");
        if (statsResult && statsResult.objects) {
          for (var j = 0; j < statsResult.objects.length; j++) {
            totalGamesPlayed += statsResult.objects[j].value.gamesPlayed || 0;
          }
        }

        // Check if user already has a unified leaderboard record (lazy migration)
        var existingRecord = nk.leaderboardRecordsList("all_games_wins", [winner.odredacted], 1, "", 0);
        var isFirstEntry = !existingRecord || !existingRecord.records || existingRecord.records.length === 0;

        if (isFirstEntry) {
          // First entry - calculate total existing wins for migration
          var totalExistingWins = 0;
          if (statsResult && statsResult.objects) {
            for (var k = 0; k < statsResult.objects.length; k++) {
              totalExistingWins += statsResult.objects[k].value.wins || 0;
            }
          }
          nk.leaderboardRecordWrite(
            "all_games_wins",
            winner.odredacted,
            winner.username,
            totalExistingWins,
            totalGamesPlayed,
            { lastGameId: state.gameId, lastMatchId: ctx.matchId, lastMatchType: state.housePlayer ? "PVH" : "PVP" },
            1
          );
          logger.info("Unified leaderboard: created initial record for " + winner.username + " with " + totalExistingWins + " wins");
        } else {
          nk.leaderboardRecordWrite(
            "all_games_wins",
            winner.odredacted,
            winner.username,
            1,
            totalGamesPlayed,
            { lastGameId: state.gameId, lastMatchId: ctx.matchId, lastMatchType: state.housePlayer ? "PVH" : "PVP" },
            2
          );
          logger.info("Unified leaderboard: incremented wins for " + winner.username);
        }
      } catch (e) {
        logger.warn("Failed to update unified leaderboard: " + e.message);
      }
```

**Step 2: Test by playing a game**

Play a game and win. Check Nakama console that a record appears in `all_games_wins`.

**Step 3: Commit**

```bash
git add nakama/modules/main.js
git commit -m "feat(nakama): write to unified leaderboard on game win"
```

---

## Task 3: Create get_leaderboard RPC Endpoint

**Files:**
- Modify: `nakama/modules/main.js` (add function before InitModule, register in InitModule)

**Step 1: Add RPC function**

Add before the `InitModule` function (around line 520):

```javascript
function rpcGetLeaderboard(ctx, logger, nk, payload) {
  var userId = ctx.userId;
  logger.info("get_leaderboard called by " + userId);

  var data;
  try {
    data = JSON.parse(payload || "{}");
  } catch (e) {
    data = {};
  }

  var limit = data.limit || 50;
  var cursor = data.cursor || "";

  var records = [];
  var nextCursor = "";
  var myRank = null;
  var myRecord = null;

  try {
    var result = nk.leaderboardRecordsList("all_games_wins", [], limit, cursor, 0);

    if (result && result.records) {
      var userIds = [];
      for (var i = 0; i < result.records.length; i++) {
        userIds.push(result.records[i].ownerId);
      }

      var accounts = {};
      if (userIds.length > 0) {
        try {
          var accountsList = nk.accountsGetId(userIds);
          for (var j = 0; j < accountsList.length; j++) {
            accounts[accountsList[j].user.id] = accountsList[j].user;
          }
        } catch (e) {
          logger.warn("Failed to fetch accounts: " + e.message);
        }
      }

      for (var k = 0; k < result.records.length; k++) {
        var record = result.records[k];
        var account = accounts[record.ownerId];

        records.push({
          odredacted: record.ownerId,
          rank: record.rank,
          username: record.username || (account ? account.username : "Unknown"),
          displayName: account ? account.displayName : null,
          avatarUrl: account ? account.avatarUrl : null,
          score: record.score,
          subscore: record.subscore,
          metadata: record.metadata
        });
      }

      nextCursor = result.nextCursor || "";
    }

    var myRecordResult = nk.leaderboardRecordsList("all_games_wins", [userId], 1, "", 0);

    if (myRecordResult && myRecordResult.records && myRecordResult.records.length > 0) {
      var myRec = myRecordResult.records[0];
      var myAccount = null;
      try {
        var myAccountsList = nk.accountsGetId([userId]);
        if (myAccountsList && myAccountsList.length > 0) {
          myAccount = myAccountsList[0].user;
        }
      } catch (e) {}

      myRecord = {
        odredacted: myRec.ownerId,
        rank: myRec.rank,
        username: myRec.username || (myAccount ? myAccount.username : "Unknown"),
        displayName: myAccount ? myAccount.displayName : null,
        avatarUrl: myAccount ? myAccount.avatarUrl : null,
        score: myRec.score,
        subscore: myRec.subscore,
        metadata: myRec.metadata
      };
      myRank = myRec.rank;
    }

  } catch (e) {
    logger.error("Failed to get leaderboard: " + e.message);
    return JSON.stringify({ error: "Failed to get leaderboard", code: "LEADERBOARD_ERROR" });
  }

  return JSON.stringify({
    records: records,
    myRank: myRank,
    myRecord: myRecord,
    nextCursor: nextCursor
  });
}
```

**Step 2: Register RPC in InitModule**

Add after line 556 (where other RPCs are registered):

```javascript
  initializer.registerRpc("get_leaderboard", rpcGetLeaderboard);
```

**Step 3: Deploy and test RPC**

Use Nakama console or test script to call `get_leaderboard` RPC.
Expected: Returns JSON with records array, myRank, myRecord.

**Step 4: Commit**

```bash
git add nakama/modules/main.js
git commit -m "feat(nakama): add get_leaderboard RPC endpoint"
```

---

## Task 4: Add Leaderboard Types and Method to Frontend Nakama Service

**Files:**
- Modify: `src/services/nakama.ts`

**Step 1: Add TypeScript interfaces**

Add after the existing interfaces (around line 130):

```typescript
export interface LeaderboardRecord {
  odredacted: string;
  rank: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  score: number;
  subscore: number;
  metadata?: {
    lastGameId?: string;
    lastMatchId?: string;
    lastMatchType?: string;
  };
}

export interface LeaderboardResponse {
  records: LeaderboardRecord[];
  myRank: number | null;
  myRecord: LeaderboardRecord | null;
  nextCursor: string;
}
```

**Step 2: Add getLeaderboard method to NakamaService class**

Add after getUserProfile method (around line 755):

```typescript
  async getLeaderboard(limit: number = 50, cursor: string = ''): Promise<LeaderboardResponse> {
    if (!this.session) {
      throw new Error('Not authenticated');
    }

    try {
      console.log('[Nakama] Getting leaderboard, limit:', limit);
      const response = await this.client.rpc(this.session, 'get_leaderboard', { limit, cursor });
      const result = typeof response.payload === 'string'
        ? JSON.parse(response.payload)
        : response.payload;

      console.log('[Nakama] Got', result.records?.length || 0, 'leaderboard records, myRank:', result.myRank);
      return result as LeaderboardResponse;
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    }
  }
```

**Step 3: Update exports**

Update the type exports at the end of the file to include new types:

```typescript
export type { TelegramUserData, MatchState, MatchLevel, MatchCallbacks, PresenceInfo, MatchPresence, LeaderboardRecord, LeaderboardResponse };
```

**Step 4: Verify TypeScript compiles**

Run: `npm run type-check` or `tsc --noEmit`
Expected: No TypeScript errors.

**Step 5: Commit**

```bash
git add src/services/nakama.ts
git commit -m "feat(frontend): add leaderboard types and getLeaderboard method"
```

---

## Task 5: Update LeaderboardPage to Fetch Real Data

**Files:**
- Modify: `src/pages/LeaderboardPage/LeaderboardPage.tsx`
- Modify: `src/pages/LeaderboardPage/LeaderboardPage.module.css`

**Step 1: Read current LeaderboardPage**

Read the current implementation to understand existing structure.

**Step 2: Replace LeaderboardPage with real data fetching**

Replace the entire file content:

```typescript
import { useEffect, useState, useRef } from 'react';
import { Header, BottomNavBar } from '../../components';
import { nakamaService, LeaderboardRecord, LeaderboardResponse } from '../../services/nakama';
import styles from './LeaderboardPage.module.css';

const getRankClass = (rank: number): string => {
  if (rank === 1) return styles.rankTop1;
  if (rank === 2) return styles.rankTop2;
  if (rank === 3) return styles.rankTop3;
  return '';
};

const formatScore = (score: number): string => {
  return score.toLocaleString();
};

const getAvatarEmoji = (username: string): string => {
  const emojis = ['👑', '🎮', '💎', '🍀', '🏆', '🃏', '🧩', '👾', '♟️', '⚽', '🎯', '🎲'];
  const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return emojis[hash % emojis.length];
};

export const LeaderboardPage = () => {
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [myRecord, setMyRecord] = useState<LeaderboardRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchInitiatedRef = useRef(false);

  useEffect(() => {
    if (fetchInitiatedRef.current) return;
    fetchInitiatedRef.current = true;
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    if (!nakamaService.isAuthenticated()) {
      setLoading(false);
      setError('Please sign in to view the leaderboard');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response: LeaderboardResponse = await nakamaService.getLeaderboard(50);
      setRecords(response.records);
      setMyRecord(response.myRecord);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const myRankVisible = myRecord && records.some(r => r.odredacted === myRecord.odredacted);

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <h1 className={styles.title}>Leaderboard</h1>

        {loading ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>⏳</span>
            <p>Loading...</p>
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>⚠️</span>
            <p>{error}</p>
          </div>
        ) : records.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🏆</span>
            <p>No players yet. Be the first!</p>
          </div>
        ) : (
          <>
            <div className={styles.leaderboardList}>
              {records.map((player) => (
                <div key={player.odredacted} className={styles.playerCard}>
                  <div className={`${styles.rank} ${getRankClass(player.rank)}`}>
                    {player.rank}
                  </div>
                  <div className={styles.avatar}>
                    {player.avatarUrl ? (
                      <img src={player.avatarUrl} alt="" className={styles.avatarImage} />
                    ) : (
                      getAvatarEmoji(player.username)
                    )}
                  </div>
                  <div className={styles.playerInfo}>
                    <span className={styles.playerName}>
                      {player.displayName || player.username}
                    </span>
                    <span className={styles.playerStats}>
                      {player.subscore} games played
                    </span>
                  </div>
                  <div className={styles.score}>{formatScore(player.score)} wins</div>
                </div>
              ))}
            </div>

            {myRecord && !myRankVisible && (
              <div className={styles.myRankSection}>
                <div className={styles.myRankDivider}>...</div>
                <div className={`${styles.playerCard} ${styles.myRankCard}`}>
                  <div className={styles.rank}>{myRecord.rank}</div>
                  <div className={styles.avatar}>
                    {myRecord.avatarUrl ? (
                      <img src={myRecord.avatarUrl} alt="" className={styles.avatarImage} />
                    ) : (
                      getAvatarEmoji(myRecord.username)
                    )}
                  </div>
                  <div className={styles.playerInfo}>
                    <span className={styles.playerName}>
                      {myRecord.displayName || myRecord.username} (You)
                    </span>
                    <span className={styles.playerStats}>
                      {myRecord.subscore} games played
                    </span>
                  </div>
                  <div className={styles.score}>{formatScore(myRecord.score)} wins</div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <BottomNavBar />
    </div>
  );
};
```

**Step 3: Add CSS for avatar image and my rank section**

Add to `LeaderboardPage.module.css`:

```css
.avatarImage {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius-full);
}

.myRankSection {
  margin-top: 24px;
}

.myRankDivider {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 20px;
  letter-spacing: 4px;
  margin-bottom: 12px;
}

.myRankCard {
  border: 2px solid var(--color-accent-primary);
  background: var(--color-bg-tertiary);
}
```

**Step 4: Verify page loads**

Run: `npm run dev`
Navigate to `/leaderboard` and verify real data loads (or empty state if no records).

**Step 5: Commit**

```bash
git add src/pages/LeaderboardPage/LeaderboardPage.tsx src/pages/LeaderboardPage/LeaderboardPage.module.css
git commit -m "feat(leaderboard): replace mock data with real Nakama leaderboard"
```

---

## Task 6: Add Leaderboard Rank to NakamaContext

**Files:**
- Modify: `src/contexts/NakamaContext.tsx`

**Step 1: Read current NakamaContext**

Read to understand current interface and state structure.

**Step 2: Add leaderboardRank to context interface**

Add to the `NakamaContextValue` interface:

```typescript
  leaderboardRank: number | null;
  isLeaderboardLoading: boolean;
  refreshLeaderboardRank: () => Promise<void>;
```

**Step 3: Add state and refresh function**

Add state declarations with other useState calls:

```typescript
const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
```

Add the refresh function:

```typescript
const refreshLeaderboardRank = useCallback(async () => {
  if (!nakamaService.isAuthenticated()) return;

  setIsLeaderboardLoading(true);
  try {
    const response = await nakamaService.getLeaderboard(1);
    setLeaderboardRank(response.myRank);
  } catch (err) {
    console.error('[NakamaContext] Failed to fetch leaderboard rank:', err);
  } finally {
    setIsLeaderboardLoading(false);
  }
}, []);
```

**Step 4: Call refresh on session established and match completion**

Add to useEffect that handles session establishment:

```typescript
refreshLeaderboardRank();
```

Add to useEffect that handles match completion (where refreshWallet is called):

```typescript
refreshLeaderboardRank();
```

**Step 5: Add to context value**

Update the context value object to include new properties:

```typescript
leaderboardRank,
isLeaderboardLoading,
refreshLeaderboardRank,
```

**Step 6: Commit**

```bash
git add src/contexts/NakamaContext.tsx
git commit -m "feat(context): add leaderboard rank tracking to NakamaContext"
```

---

## Task 7: Update Header to Display Real Rank

**Files:**
- Modify: `src/components/Header/Header.tsx`

**Step 1: Read current Header implementation**

Read to find where MOCK_RANK is used.

**Step 2: Import and use real rank from context**

Add import:

```typescript
import { useNakama } from '../../contexts/NakamaContext';
```

Inside component, get rank from context:

```typescript
const { leaderboardRank } = useNakama();
```

**Step 3: Replace MOCK_RANK with real rank**

Find where `MOCK_RANK` is used and replace:

```typescript
<span className={styles.rankValue}>{leaderboardRank ?? '-'}</span>
```

**Step 4: Remove MOCK_RANK import if no longer needed elsewhere**

**Step 5: Verify header shows rank**

Run: `npm run dev`
Check header shows real rank or `-` if not ranked.

**Step 6: Commit**

```bash
git add src/components/Header/Header.tsx
git commit -m "feat(header): display real leaderboard rank"
```

---

## Verification Checklist

1. [ ] Nakama console shows `all_games_wins` leaderboard
2. [ ] Win a game → record appears in unified leaderboard
3. [ ] `/leaderboard` page shows real data from Nakama
4. [ ] User's own rank shows below list if not in top 50
5. [ ] Header displays real rank after winning
6. [ ] Rank updates after match completion without page refresh
7. [ ] TypeScript compiles without errors: `npm run type-check`
8. [ ] App runs without console errors: `npm run dev`
