# Nakama Leaderboard & Wallet Transaction Tracking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the Nakama match handler to record leaderboard entries for winners and track all wallet transactions (bet deductions, winnings, losses) with proper metadata.

**Architecture:** Enhance the `resolveMatch` function to write leaderboard records for winners. Modify all `walletUpdate` calls to include transaction metadata for tracking purposes. Use Nakama's built-in wallet ledger (4th parameter = true) for auditable transactions.

**Tech Stack:** Nakama JavaScript Runtime, Nakama Leaderboard API, Nakama Wallet API with metadata

---

## Background

### Current Behavior
- Wallet updates use `nk.walletUpdate()` without descriptive metadata
- No leaderboard records are written when matches complete
- Transactions are not easily traceable

### Target Behavior
- All wallet updates include metadata describing the transaction type
- Winners are recorded in game-specific leaderboards
- PVH (house) wins result in player losing bet with proper tracking
- PVP wins result in winner gaining payout with proper tracking

### Nakama API Reference

**Wallet Update with Metadata:**
```javascript
// nk.walletUpdate(userId, changeset, metadata, updateLedger)
// metadata: object that gets stored with the transaction
// updateLedger: true = transaction is recorded and queryable
nk.walletUpdate(userId, { coins: -100 }, {
  type: "bet",
  gameId: "mahjong",
  matchId: "abc123"
}, true);
```

**Leaderboard Record Write:**
```javascript
// nk.leaderboardRecordWrite(leaderboardId, odredacted, username, score, subscore, metadata, operator)
// operator: "best" | "set" | "incr" | "decr"
nk.leaderboardRecordWrite(
  "mahjong_weekly",      // leaderboard ID
  odredacted,             // owner
  username,              // username for display
  1,                     // score (wins count)
  0,                     // subscore
  { matchId: "abc123" }, // metadata
  "incr"                 // increment operation
);
```

---

### Task 1: Add Transaction Metadata to Bet Deduction in rpcJoinGame

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js:107-110`

**Step 1: Update the wallet deduction to include transaction metadata**

Find line 108:
```javascript
nk.walletUpdate(userId, { coins: -betAmount }, {}, false);
```

Replace with:
```javascript
nk.walletUpdate(userId, { coins: -betAmount }, {
  type: "bet_placed",
  gameId: gameId,
  betAmount: betAmount,
  timestamp: Date.now()
}, true);
```

**Step 2: Verify the change**

Review the code to ensure:
- Metadata includes `type`, `gameId`, `betAmount`, `timestamp`
- 4th parameter is `true` (enables ledger tracking)

**Step 3: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): add transaction metadata to bet deduction"
```

---

### Task 2: Add Transaction Metadata to Refund in matchLeave

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js:290-292`

**Step 1: Update the refund wallet update to include transaction metadata**

Find line 291:
```javascript
nk.walletUpdate(presence.userId, { coins: state.betAmount }, {}, true);
```

Replace with:
```javascript
nk.walletUpdate(presence.userId, { coins: state.betAmount }, {
  type: "bet_refund",
  gameId: state.gameId,
  betAmount: state.betAmount,
  reason: "player_left_waiting",
  timestamp: Date.now()
}, true);
```

**Step 2: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): add transaction metadata to bet refund"
```

---

### Task 3: Update resolveMatch - Add Leaderboard Records for Winners

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js:338-410` (resolveMatch function)

**Step 1: Add leaderboard record write after winner payout**

Find the section after line 386 (after `logger.info("Paid " + payout + " coins to " + winner.userId);`):

Add after line 386:
```javascript
    // Update leaderboard for winner
    var leaderboardId = state.gameId + "_wins";
    try {
      nk.leaderboardRecordWrite(
        leaderboardId,
        winner.userId,
        winner.username,
        1,  // score: increment wins by 1
        winnerScore,  // subscore: their game score
        {
          matchId: ctx ? ctx.matchId : "unknown",
          matchType: state.housePlayer ? "PVH" : "PVP",
          betAmount: state.betAmount,
          payout: payout
        },
        2  // operator: 2 = increment
      );
      logger.info("Leaderboard updated for " + winner.username + " on " + leaderboardId);
    } catch (e) {
      logger.warn("Failed to update leaderboard: " + e.message);
    }
```

**Step 2: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): add leaderboard record for match winners"
```

---

### Task 4: Update resolveMatch - Add Transaction Metadata to Winner Payout

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js:374-375`

**Step 1: Update winner payout with transaction metadata**

Find line 375:
```javascript
nk.walletUpdate(winner.userId, { coins: payout }, {}, true);
```

Replace with:
```javascript
    nk.walletUpdate(winner.userId, { coins: payout }, {
      type: "match_won",
      gameId: state.gameId,
      matchType: state.housePlayer ? "PVH" : "PVP",
      betAmount: state.betAmount,
      payout: payout,
      opponentType: state.housePlayer ? "house" : "player",
      timestamp: Date.now()
    }, true);
```

**Step 2: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): add transaction metadata to winner payout"
```

---

### Task 5: Add Explicit Loss Transaction for Losers (PVP)

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js:389-401`

**Step 1: Add wallet transaction record for losers**

The losing player already had their bet deducted in `rpcJoinGame`. However, for clear tracking, we should record the loss as a separate ledger entry with zero coin change but descriptive metadata.

Find the section starting at line 389 (the for loop for losers):
```javascript
  for (var userId in state.players) {
    var player = state.players[userId];
    if (!player.isHouse && userId !== winnerId) {
      nk.notificationSend(
```

Replace the entire for loop (lines 389-401) with:
```javascript
  for (var odredacted in state.players) {
    var player = state.players[odredacted];
    if (!player.isHouse && odredacted !== winnerId) {
      // Record loss transaction (0 coins, but tracked in ledger)
      nk.walletUpdate(odredacted, { coins: 0 }, {
        type: "match_lost",
        gameId: state.gameId,
        matchType: state.housePlayer ? "PVH" : "PVP",
        betAmount: state.betAmount,
        lostAmount: state.betAmount,
        opponentType: state.housePlayer ? "house" : "player",
        winnerId: winnerId,
        timestamp: Date.now()
      }, true);

      nk.notificationSend(
        odredacted,
        "You lost",
        { matchType: state.housePlayer ? "PVH" : "PVP" },
        101,
        "",
        true
      );
    }
  }
```

**Step 2: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): add transaction record for match losers"
```

---

### Task 6: Handle House Win - Record Player Loss Transaction

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js:372-387`

**Step 1: Add explicit handling when house wins**

Find the section after winner determination (around line 372):
```javascript
  logger.info("Winner: " + (winner ? winner.username : "none") + ", Payout: " + payout);

  if (winner && !winner.isHouse) {
```

Replace with:
```javascript
  logger.info("Winner: " + (winner ? winner.username : "none") + ", Payout: " + payout);

  // Handle house winning - player loses bet (already deducted, just record it)
  if (winner && winner.isHouse) {
    // Find the real player who lost to house
    for (var odredacted in state.players) {
      var player = state.players[odredacted];
      if (!player.isHouse) {
        // Record loss to house (bet was already deducted at join time)
        nk.walletUpdate(odredacted, { coins: 0 }, {
          type: "match_lost_to_house",
          gameId: state.gameId,
          matchType: "PVH",
          betAmount: state.betAmount,
          lostAmount: state.betAmount,
          playerScore: state.results[odredacted] ? state.results[odredacted].score : 0,
          houseScore: state.results["house"] ? state.results["house"].score : 0,
          timestamp: Date.now()
        }, true);

        nk.notificationSend(
          odredacted,
          "You lost to House",
          {
            matchType: "PVH",
            lostAmount: state.betAmount,
            playerScore: state.results[odredacted] ? state.results[odredacted].score : 0,
            houseScore: state.results["house"] ? state.results["house"].score : 0
          },
          102,  // Different code for house loss
          "",
          true
        );

        logger.info("Player " + odredacted + " lost " + state.betAmount + " coins to house");
        break;
      }
    }
  }

  if (winner && !winner.isHouse) {
```

**Step 2: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): add explicit house win handling with loss tracking"
```

---

### Task 7: Create Leaderboards in InitModule

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js:6-23` (InitModule function)

**Step 1: Add leaderboard creation for each game type**

Find the end of InitModule (before `logger.info("Game match module initialized!");`):

Add before line 22:
```javascript
  // Create leaderboards for each game type
  var gameTypes = ["mahjong", "solitaire", "puzzle"];
  for (var i = 0; i < gameTypes.length; i++) {
    var gameId = gameTypes[i];
    var leaderboardId = gameId + "_wins";
    try {
      nk.leaderboardCreate(
        leaderboardId,                    // id
        false,                            // authoritative
        "desc",                           // sort order
        "incr",                           // operator
        "0 0 * * 1",                      // reset schedule (weekly on Monday)
        { gameId: gameId, type: "wins" }  // metadata
      );
      logger.info("Created leaderboard: " + leaderboardId);
    } catch (e) {
      // Leaderboard already exists, ignore
      logger.debug("Leaderboard " + leaderboardId + " already exists or error: " + e.message);
    }
  }
```

**Step 2: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): create game leaderboards on module init"
```

---

### Task 8: Final Commit and Deploy

**Step 1: Review all changes**

```bash
git diff HEAD~7..HEAD --stat
```

**Step 2: Push to remote**

```bash
git push origin main
```

**Step 3: Deploy to Nakama server**

```bash
scp scripts/nakama-tests/nakama-server/modules/main.js root@136.243.136.206:/root/nakama/modules/
ssh root@136.243.136.206 "cd /root/nakama && docker-compose restart nakama"
```

**Step 4: Verify deployment**

```bash
ssh root@136.243.136.206 "docker logs nakama 2>&1 | tail -20"
```

Look for:
- "Game match module initialized!"
- "Created leaderboard: mahjong_wins"
- "Created leaderboard: solitaire_wins"
- "Created leaderboard: puzzle_wins"

---

## Summary of Changes

| Location | Change |
|----------|--------|
| `rpcJoinGame` line 108 | Add metadata to bet deduction: `type: "bet_placed"` |
| `matchLeave` line 291 | Add metadata to refund: `type: "bet_refund"` |
| `resolveMatch` winner section | Add metadata to payout: `type: "match_won"` |
| `resolveMatch` winner section | Add leaderboard record write |
| `resolveMatch` loser section | Add metadata: `type: "match_lost"` |
| `resolveMatch` house win | Add metadata: `type: "match_lost_to_house"` |
| `InitModule` | Create leaderboards on startup |

## Transaction Types Reference

| Type | Description | Coin Change |
|------|-------------|-------------|
| `bet_placed` | Player places bet to join match | -betAmount |
| `bet_refund` | Player left during waiting phase | +betAmount |
| `match_won` | Player won the match | +payout |
| `match_lost` | Player lost to another player | 0 (already deducted) |
| `match_lost_to_house` | Player lost to house | 0 (already deducted) |
