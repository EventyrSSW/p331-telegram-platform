# Results Page — Technical Specification

> **Version:** 1.0
> **Date:** 2025-12-30
> **Status:** Approved

---

## 1. Overview

### 1.1 Goals

Создать страницу Results, которая:
- Показывает **все матчи пользователя** (pending и completed)
- Позволяет **reconnect** к активным матчам (status: `playing`)
- Позволяет **отменить** ожидающие матчи (status: `waiting`)
- Группирует завершённые матчи **по датам**
- Синхронизируется с сервером для актуальных статусов

### 1.2 User Stories

1. Как игрок, я хочу видеть историю своих матчей, чтобы отслеживать результаты
2. Как игрок, я хочу вернуться в игру, если я случайно вышел во время матча
3. Как игрок, я хочу отменить матч, если слишком долго жду оппонента

---

## 2. Data Architecture

### 2.1 Storage Strategy

**Nakama Storage** вместо Wallet Ledger:

```
Collection: "match_history"
Key: {matchId}
UserId: {odredacted}
Value: MatchHistoryEntry
```

**Преимущества:**
- Полный контроль над схемой
- Нет лимита на количество записей
- Безопасные concurrent updates
- Встроенная пагинация через `storageList`

### 2.2 Data Schema

```typescript
interface MatchHistoryEntry {
  // Identification
  matchId: string;              // UUID матча

  // Status & Timing
  status: MatchStatus;          // Текущий статус
  createdAt: number;            // Timestamp создания (ms)
  updatedAt: number;            // Timestamp последнего обновления (ms)

  // Game Info
  gameId: string;               // "mahjong", "solitaire", etc.
  matchType: "PVP" | "PVH";
  betAmount: number;            // Ставка в coins
  levelId: number | null;       // ID уровня (если применимо)

  // Player Results (заполняется постепенно)
  myScore: number | null;       // Мой счёт (после submit)
  result: "won" | "lost" | null; // Результат (после completion)
  payout: number | null;        // Выигрыш (только если won)

  // Opponent Info (заполняется когда opponent joins)
  opponentId: string | null;    // odredacted оппонента или "house"
  opponentName: string | null;  // Username или "House"
  opponentScore: number | null; // Счёт оппонента (после completion)
  opponentAvatar: string | null; // URL аватара (optional)
}

type MatchStatus =
  | "waiting"    // Ожидание оппонента
  | "ready"      // Оппонент найден, матч начинается
  | "playing"    // Игра в процессе
  | "submitted"  // Score отправлен, ожидание результатов
  | "completed"  // Матч завершён
  | "cancelled"; // Матч отменён (timeout или user cancel)
```

### 2.3 Status Transitions

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [JOIN] ──► waiting ──┬──► ready ──► playing ──► submitted │
│                        │       │          │           │     │
│                        │       │          │           │     │
│                        ▼       ▼          ▼           ▼     │
│                   cancelled  cancelled  cancelled  completed│
│                   (timeout/  (timeout)  (timeout/   (results│
│                    cancel)              auto-lose)   ready) │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Server-Side Logic

### 3.1 Configuration

```javascript
// nakama/modules/main.js
var DEFAULT_WAIT_TIMEOUT_SEC = 30;     // Ожидание оппонента
var DEFAULT_PLAY_TIMEOUT_SEC = 300;    // 5 минут на игру (было 86400)
```

### 3.2 New RPCs

#### 3.2.1 `get_match_history`

Получение истории матчей пользователя.

**Request:**
```javascript
{
  limit: number,    // default: 50
  cursor: string    // для пагинации, default: ""
}
```

**Response:**
```javascript
{
  history: MatchHistoryEntry[],
  cursor: string    // для следующей страницы
}
```

**Implementation:**
```javascript
function rpcGetMatchHistory(ctx, logger, nk, payload) {
  var data = JSON.parse(payload || '{}');
  var limit = data.limit || 50;
  var cursor = data.cursor || "";

  var result = nk.storageList(ctx.userId, "match_history", limit, cursor);

  var history = [];
  for (var i = 0; i < result.objects.length; i++) {
    history.push(result.objects[i].value);
  }

  // Sort by updatedAt descending
  history.sort(function(a, b) {
    return b.updatedAt - a.updatedAt;
  });

  return JSON.stringify({
    history: history,
    cursor: result.cursor || ""
  });
}
```

#### 3.2.2 `cancel_match`

Отмена матча пользователем (только для `waiting` статуса).

**Request:**
```javascript
{
  matchId: string
}
```

**Response:**
```javascript
{
  success: boolean,
  refundAmount: number,
  error?: string
}
```

**Implementation:**
```javascript
function rpcCancelMatch(ctx, logger, nk, payload) {
  var data = JSON.parse(payload);
  var matchId = data.matchId;
  var userId = ctx.userId;

  // Read current match history entry
  var reads = nk.storageRead([
    { collection: "match_history", key: matchId, userId: userId }
  ]);

  if (reads.length === 0) {
    return JSON.stringify({ success: false, error: "Match not found" });
  }

  var entry = reads[0].value;

  // Only allow cancel for "waiting" status
  if (entry.status !== "waiting") {
    return JSON.stringify({
      success: false,
      error: "Can only cancel matches in waiting status"
    });
  }

  // Refund bet
  nk.walletUpdate(userId, { coins: entry.betAmount }, {
    type: "bet_refund",
    matchId: matchId,
    reason: "user_cancelled"
  }, true);

  // Update status to cancelled
  entry.status = "cancelled";
  entry.updatedAt = Date.now();

  nk.storageWrite([{
    collection: "match_history",
    key: matchId,
    userId: userId,
    value: entry,
    permissionRead: 1,
    permissionWrite: 0
  }]);

  // Signal match to terminate
  try {
    nk.matchSignal(matchId, JSON.stringify({ action: "cancel", userId: userId }));
  } catch (e) {
    // Match might already be gone
  }

  logger.info("Match " + matchId + " cancelled by user " + userId);

  return JSON.stringify({
    success: true,
    refundAmount: entry.betAmount
  });
}
```

#### 3.2.3 `sync_match_status`

Синхронизация статуса матча (проверка актуальности перед reconnect).

**Request:**
```javascript
{
  matchId: string
}
```

**Response:**
```javascript
{
  status: MatchStatus,
  canReconnect: boolean,
  entry: MatchHistoryEntry | null
}
```

### 3.3 Match History Updates

Обновлять `match_history` entry при каждом изменении статуса:

#### 3.3.1 При создании матча (`rpcJoinGame`)

```javascript
// После успешного создания/присоединения к матчу
function writeMatchHistoryEntry(nk, userId, matchId, gameId, betAmount, matchType, levelId) {
  var entry = {
    matchId: matchId,
    status: "waiting",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    gameId: gameId,
    matchType: matchType,
    betAmount: betAmount,
    levelId: levelId,
    myScore: null,
    result: null,
    payout: null,
    opponentId: null,
    opponentName: null,
    opponentScore: null,
    opponentAvatar: null
  };

  nk.storageWrite([{
    collection: "match_history",
    key: matchId,
    userId: userId,
    value: entry,
    permissionRead: 1,
    permissionWrite: 0
  }]);
}
```

#### 3.3.2 При присоединении оппонента (`matchJoin`)

```javascript
function updateMatchHistoryOpponent(nk, odredacted, odredactedInfo, opponentId, opponentInfo) {
  // Update player's entry with opponent info
  var reads = nk.storageRead([
    { collection: "match_history", key: matchId, odredacted: odredacted }
  ]);

  if (reads.length > 0) {
    var entry = reads[0].value;
    entry.status = "ready";
    entry.updatedAt = Date.now();
    entry.opponentId = opponentId;
    entry.opponentName = opponentInfo.username;
    entry.opponentAvatar = opponentInfo.avatarUrl || null;

    nk.storageWrite([{
      collection: "match_history",
      key: matchId,
      userId: odredacted,
      value: entry,
      permissionRead: 1,
      permissionWrite: 0
    }]);
  }
}
```

#### 3.3.3 При старте игры (MATCH_READY broadcast)

```javascript
function updateMatchHistoryPlaying(nk, matchId, playerIds) {
  for (var i = 0; i < playerIds.length; i++) {
    var odredacted = playerIds[i];
    updateMatchHistoryStatus(nk, matchId, odredacted, "playing");
  }
}
```

#### 3.3.4 При отправке score (SCORE_SUBMIT)

```javascript
function updateMatchHistoryScore(nk, matchId, odredacted, score) {
  var reads = nk.storageRead([
    { collection: "match_history", key: matchId, odredacted: odredacted }
  ]);

  if (reads.length > 0) {
    var entry = reads[0].value;
    entry.status = "submitted";
    entry.updatedAt = Date.now();
    entry.myScore = score;

    nk.storageWrite([{
      collection: "match_history",
      key: matchId,
      userId: odredacted,
      value: entry,
      permissionRead: 1,
      permissionWrite: 0
    }]);
  }
}
```

#### 3.3.5 При завершении матча (`resolveMatch`)

```javascript
function updateMatchHistoryComplete(nk, matchId, odredacted, result, payout, opponentScore) {
  var reads = nk.storageRead([
    { collection: "match_history", key: matchId, odredacted: odredacted }
  ]);

  if (reads.length > 0) {
    var entry = reads[0].value;
    entry.status = "completed";
    entry.updatedAt = Date.now();
    entry.result = result;  // "won" or "lost"
    entry.payout = payout;
    entry.opponentScore = opponentScore;

    nk.storageWrite([{
      collection: "match_history",
      key: matchId,
      userId: odredacted,
      value: entry,
      permissionRead: 1,
      permissionWrite: 0
    }]);
  }
}
```

### 3.4 Auto-Resolution Rules

| Scenario | Condition | Result |
|----------|-----------|--------|
| Wait timeout | `waiting` + 30s elapsed | Cancel + Refund |
| PVH timeout | `playing` + 5min, no score | House wins |
| PVP one submitted | Player A submitted, Player B timeout | Player A wins |
| PVP both timeout | Neither submitted in 5min | Cancel + Refund both |

### 3.5 Timeout Handling in `matchLoop`

```javascript
function matchLoop(ctx, logger, nk, dispatcher, tick, state, messages) {
  var now = Date.now();

  // Check waiting timeout
  if (state.status === "waiting" && now > state.waitDeadline) {
    // No opponent found - cancel and refund
    for (var odredacted in state.players) {
      if (!state.players[odredacted].isHouse) {
        refundAndCancel(nk, logger, state.matchId, odredacted, state.betAmount);
      }
    }
    return null; // Terminate match
  }

  // Check play timeout
  if (state.status === "ready" && now > state.playDeadline) {
    // Check who submitted
    var submittedCount = 0;
    var submittedPlayer = null;

    for (var odredacted in state.players) {
      if (!state.players[odredacted].isHouse && state.results[odredacted]) {
        submittedCount++;
        submittedPlayer = odredacted;
      }
    }

    if (submittedCount === 0) {
      // Nobody played - cancel all
      for (var odredacted in state.players) {
        if (!state.players[odredacted].isHouse) {
          refundAndCancel(nk, logger, state.matchId, odredacted, state.betAmount);
        }
      }
    } else {
      // At least one played - resolve normally
      // Non-submitters get score 0
      for (var odredacted in state.players) {
        if (!state.players[odredacted].isHouse && !state.results[odredacted]) {
          state.results[odredacted] = { score: 0, timeMs: 999999999 };
        }
      }
      resolveMatch(nk, logger, dispatcher, state);
    }
    return null;
  }

  // ... rest of matchLoop
}
```

---

## 4. Client-Side Logic

### 4.1 NakamaContext Changes

#### 4.1.1 New State

```typescript
interface NakamaContextValue {
  // ... existing fields ...

  // New fields for reconnect
  reconnectMatchId: string | null;
  setReconnectMatch: (matchId: string | null) => void;
}
```

#### 4.1.2 New Methods

```typescript
// Set match to reconnect to (called from Results page)
const setReconnectMatch = useCallback((matchId: string | null) => {
  setReconnectMatchId(matchId);
}, []);

// Clear reconnect match (called after successful reconnect or on error)
const clearReconnectMatch = useCallback(() => {
  setReconnectMatchId(null);
}, []);
```

### 4.2 Nakama Service Changes

#### 4.2.1 New Types

```typescript
// src/services/nakama.ts

export interface MatchHistoryEntry {
  matchId: string;
  status: 'waiting' | 'ready' | 'playing' | 'submitted' | 'completed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
  gameId: string;
  matchType: 'PVP' | 'PVH';
  betAmount: number;
  levelId: number | null;
  myScore: number | null;
  result: 'won' | 'lost' | null;
  payout: number | null;
  opponentId: string | null;
  opponentName: string | null;
  opponentScore: number | null;
  opponentAvatar: string | null;
}

export interface MatchHistoryResponse {
  history: MatchHistoryEntry[];
  cursor: string;
}

export interface CancelMatchResponse {
  success: boolean;
  refundAmount?: number;
  error?: string;
}

export interface SyncMatchStatusResponse {
  status: MatchHistoryEntry['status'];
  canReconnect: boolean;
  entry: MatchHistoryEntry | null;
}
```

#### 4.2.2 New Methods

```typescript
class NakamaService {
  // ... existing methods ...

  async getMatchHistory(limit: number = 50, cursor: string = ''): Promise<MatchHistoryResponse> {
    if (!this.session) throw new Error('Not authenticated');

    const response = await this.client.rpc(this.session, 'get_match_history', { limit, cursor });
    return typeof response.payload === 'string'
      ? JSON.parse(response.payload)
      : response.payload;
  }

  async cancelMatch(matchId: string): Promise<CancelMatchResponse> {
    if (!this.session) throw new Error('Not authenticated');

    const response = await this.client.rpc(this.session, 'cancel_match', { matchId });
    return typeof response.payload === 'string'
      ? JSON.parse(response.payload)
      : response.payload;
  }

  async syncMatchStatus(matchId: string): Promise<SyncMatchStatusResponse> {
    if (!this.session) throw new Error('Not authenticated');

    const response = await this.client.rpc(this.session, 'sync_match_status', { matchId });
    return typeof response.payload === 'string'
      ? JSON.parse(response.payload)
      : response.payload;
  }
}
```

### 4.3 GamePage Changes

```typescript
// src/pages/GamePage/GamePage.tsx

function GamePage() {
  const { reconnectMatchId, clearReconnectMatch, joinGame } = useNakama();
  const { gameId } = useParams();

  useEffect(() => {
    if (reconnectMatchId) {
      // Reconnect mode
      handleReconnect(reconnectMatchId);
    } else {
      // Normal mode - show bet selection
    }
  }, [reconnectMatchId]);

  const handleReconnect = async (matchId: string) => {
    try {
      // Sync status first
      const status = await nakamaService.syncMatchStatus(matchId);

      if (!status.canReconnect) {
        // Match already ended
        showError('Match has ended');
        clearReconnectMatch();
        navigate('/results');
        return;
      }

      // Reconnect to match via socket
      await nakamaService.socket?.joinMatch(matchId);
      clearReconnectMatch();

      // Continue with game UI based on status
      if (status.status === 'playing') {
        // Load game immediately
        setGameReady(true);
      }
    } catch (error) {
      showError('Failed to reconnect');
      clearReconnectMatch();
    }
  };
}
```

---

## 5. UI/UX Specification

### 5.1 Results Page Layout

```
┌────────────────────────────────────────┐
│ [Header with Balance]                  │
├────────────────────────────────────────┤
│                                        │
│ Pending (blue underlined)              │
│ ┌────────────────────────────────────┐ │
│ │ 🎮 Mahjong Dash        [Continue]  │ │
│ │    Game in progress                │ │
│ │    Price: 🪙 25                    │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ 🎮 Solitaire           [Cancel]    │ │
│ │    Waiting for opponent...         │ │
│ │    Price: 🪙 50                    │ │
│ └────────────────────────────────────┘ │
│                                        │
│ December 30                            │
│ ┌────────────────────────────────────┐ │
│ │ 🎮 Mahjong Dash           +180 🪙  │ │
│ │    vs House                        │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ 🎮 Mahjong Dash           -100 🪙  │ │
│ │    vs edwinoo                      │ │
│ └────────────────────────────────────┘ │
│                                        │
│ December 29                            │
│ ┌────────────────────────────────────┐ │
│ │ 🎮 Solitaire              +90 🪙   │ │
│ │    vs House                        │ │
│ └────────────────────────────────────┘ │
│                                        │
├────────────────────────────────────────┤
│ [Results]    [Play]    [Profile]       │
└────────────────────────────────────────┘
```

### 5.2 Result Card States

| Status | Card Content | Action Button |
|--------|--------------|---------------|
| `waiting` | Game name, "Waiting for opponent...", Price | **Cancel** (red) |
| `ready` | Game name, "Match starting...", Price | — |
| `playing` | Game name, "Game in progress", Price | **Continue** (blue) |
| `submitted` | Game name, "Waiting for results...", Score | — |
| `completed` (won) | Game name, "vs {opponent}", **+{payout}** (green) | — |
| `completed` (lost) | Game name, "vs {opponent}", **-{bet}** (red) | — |
| `cancelled` | Game name, "Cancelled - Refunded" | — |

### 5.3 Action Button Behavior

#### Continue Button (status: `playing`)
1. User clicks Continue
2. Call `syncMatchStatus(matchId)` to verify match still active
3. If `canReconnect: true`:
   - Set `reconnectMatchId` in NakamaContext
   - Navigate to `/game/{gameId}`
   - GamePage handles reconnect flow
4. If `canReconnect: false`:
   - Show toast "Match has ended"
   - Refresh Results page

#### Cancel Button (status: `waiting`)
1. User clicks Cancel
2. Show confirmation dialog: "Cancel match and get refund?"
3. If confirmed:
   - Call `cancelMatch(matchId)`
   - Show toast "Match cancelled. {amount} coins refunded"
   - Refresh Results page

### 5.4 Empty State

```
┌────────────────────────────────────────┐
│                                        │
│              🎮                        │
│                                        │
│       No match results yet             │
│   Play a game to see your results!     │
│                                        │
└────────────────────────────────────────┘
```

### 5.5 Loading State

```
┌────────────────────────────────────────┐
│                                        │
│       Loading match history...         │
│              [Spinner]                 │
│                                        │
└────────────────────────────────────────┘
```

### 5.6 Error State

```
┌────────────────────────────────────────┐
│                                        │
│   ⚠️ Failed to load match history      │
│           [Try Again]                  │
│                                        │
└────────────────────────────────────────┘
```

---

## 6. Edge Cases & Error Handling

### 6.1 Race Conditions

| Scenario | Handling |
|----------|----------|
| User clicks Continue, match ends during sync | Show "Match has ended", refresh page |
| User clicks Cancel, match starts | Cancel fails, show "Match already started" |
| Two users cancel same PVP match simultaneously | Both get refund (idempotent operation) |

### 6.2 Network Errors

| Scenario | Handling |
|----------|----------|
| getMatchHistory fails | Show error state with retry button |
| cancelMatch fails | Show toast "Failed to cancel", allow retry |
| syncMatchStatus fails | Show toast "Connection error", stay on Results |
| Reconnect socket fails | Show toast "Failed to reconnect", navigate back |

### 6.3 Stale Data

| Scenario | Handling |
|----------|----------|
| Page shows pending, but match completed | Sync on page load updates all entries |
| User offline, misses match result | Next sync updates status |
| Match timeout while user on Results page | Polling or manual refresh shows updated status |

### 6.4 Data Consistency

- Server is source of truth for match status
- Client always syncs before taking action (Continue/Cancel)
- Match history entries are immutable after `completed`/`cancelled`

---

## 7. Implementation Checklist

### 7.1 Server-Side (Nakama)

- [ ] Update `DEFAULT_PLAY_TIMEOUT_SEC` to 300 (5 minutes)
- [ ] Add `writeMatchHistoryEntry` helper function
- [ ] Add `updateMatchHistoryStatus` helper function
- [ ] Modify `rpcJoinGame` to create history entry
- [ ] Modify `matchJoin` to update opponent info
- [ ] Modify `matchLoop` to update status on MATCH_READY
- [ ] Modify score handling to update status to `submitted`
- [ ] Modify `resolveMatch` to update final result
- [ ] Modify timeout handling for auto-resolution
- [ ] Add RPC `get_match_history`
- [ ] Add RPC `cancel_match`
- [ ] Add RPC `sync_match_status`
- [ ] Register new RPCs in `InitModule`

### 7.2 Client-Side

- [ ] Add types to `src/services/nakama.ts`
- [ ] Add `getMatchHistory` method
- [ ] Add `cancelMatch` method
- [ ] Add `syncMatchStatus` method
- [ ] Export new types
- [ ] Add `reconnectMatchId` to NakamaContext
- [ ] Add `setReconnectMatch` method
- [ ] Create `ResultCard` component
- [ ] Create `ResultsPage` component
- [ ] Add `/results` route
- [ ] Update BottomNavBar link
- [ ] Modify GamePage for reconnect flow

### 7.3 Testing

- [ ] Test normal match flow creates history entry
- [ ] Test history updates on each status change
- [ ] Test reconnect to `playing` match
- [ ] Test cancel `waiting` match with refund
- [ ] Test timeout auto-resolution scenarios
- [ ] Test sync before Continue action
- [ ] Test error handling for network failures
- [ ] Test empty state
- [ ] Test pagination (if > 50 results)

---

## 8. Future Considerations

### 8.1 Not In Scope (v1)

- Match replay viewing
- Share match results
- Match statistics/analytics
- Filter/search history
- Pagination UI (infinite scroll)

### 8.2 Potential Enhancements (v2+)

- Real-time updates via socket notifications
- Match details modal with full game stats
- Export match history
- Achievement tracking based on history

---

## Appendix A: API Reference

### RPC Endpoints

| RPC Name | Request | Response | Auth |
|----------|---------|----------|------|
| `get_match_history` | `{ limit?, cursor? }` | `{ history[], cursor }` | Required |
| `cancel_match` | `{ matchId }` | `{ success, refundAmount?, error? }` | Required |
| `sync_match_status` | `{ matchId }` | `{ status, canReconnect, entry }` | Required |

### Status Codes

| Status | Description | User Can |
|--------|-------------|----------|
| `waiting` | Waiting for opponent | Cancel |
| `ready` | Match starting | — |
| `playing` | Game in progress | Continue |
| `submitted` | Score sent, awaiting result | — |
| `completed` | Match finished | — |
| `cancelled` | Match cancelled/timeout | — |
