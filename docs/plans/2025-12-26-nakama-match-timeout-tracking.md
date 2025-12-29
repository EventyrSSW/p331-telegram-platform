# Nakama Match Timeout with Active Player Tracking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement config-based match timeout that terminates matches when all players disconnect and time limit + grace period expires. Timer ONLY starts when 2 players connect and game begins.

**Architecture:** Add connection tracking fields to player state, read game-specific `defaultTimeLimit` from config, track `gameStartTime` when match becomes "ready" (2 players connected), and implement inactivity check in `matchLoop` that auto-forfeits and terminates when 0 active players remain beyond the timeout threshold. The timer is disabled during the "waiting" phase.

**Tech Stack:** Nakama server runtime (JavaScript), ES5 syntax

---

## Task 1: Add Default Constants and Helper Functions

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js:1-10`

**Step 1: Add new default constants after existing ones**

Add after line 9 (after `DEFAULT_MAX_BET`):

```javascript
var DEFAULT_DISCONNECT_GRACE_SEC = 60; // 60 seconds grace period for reconnection
```

**Step 2: Add helper function to count active players**

Add before `matchInit` function (before line 563):

```javascript
// Count connected, non-house players
function countActivePlayers(state) {
  var count = 0;
  for (var userId in state.players) {
    var player = state.players[userId];
    if (!player.isHouse && player.connected) {
      count++;
    }
  }
  return count;
}

// Check if match should terminate due to inactivity
// IMPORTANT: Timer only runs after game starts (gameStartTime is set when 2 players connect)
function shouldTerminateForInactivity(state, now, logger) {
  // Only check during active gameplay phases (NOT during "waiting")
  if (state.status !== "ready" && state.status !== "playing") {
    return false;
  }

  // Only check if game has started (2 players connected)
  if (!state.inactivityCheckEnabled || !state.gameStartTime) {
    return false;
  }

  var activeCount = countActivePlayers(state);

  // If there are active players, no termination
  if (activeCount > 0) {
    return false;
  }

  // All players disconnected - check if grace period + game time exceeded
  // Use lastActivityTime (when last player disconnected) as the baseline
  var timeSinceActivity = Math.floor((now - state.lastActivityTime) / 1000);
  var totalTimeout = state.gameTimeLimit + state.disconnectGracePeriod;

  if (timeSinceActivity >= totalTimeout) {
    var timeSinceGameStart = Math.floor((now - state.gameStartTime) / 1000);
    logger.info("Inactivity timeout triggered: " + timeSinceActivity + "s since last activity, " +
                timeSinceGameStart + "s since game start, " +
                "threshold: " + totalTimeout + "s (game: " + state.gameTimeLimit +
                "s + grace: " + state.disconnectGracePeriod + "s)");
    return true;
  }

  return false;
}
```

**Step 3: Verify no syntax errors**

Run: `node --check scripts/nakama-tests/nakama-server/modules/main.js`
Expected: No output (no syntax errors)

**Step 4: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): add helper functions for active player tracking"
```

---

## Task 2: Update matchInit to Read Game-Specific Config and Add Tracking Fields

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js:563-602`

**Step 1: Update matchInit to extract game-specific time limit**

Replace lines 563-602 with:

```javascript
function matchInit(ctx, logger, nk, params) {
  logger.info("Match init: gameId=" + params.gameId + ", bet=" + params.betAmount);

  var config = getConfig(nk);

  // Select a level for the creator based on their skill
  var selectedLevel = selectLevelForPlayer(nk, logger, params.creatorId, params.gameId, config);

  // Extract game-specific time limit from config
  var gameTimeLimit = DEFAULT_PLAY_TIMEOUT_SEC; // Fallback to 24 hours
  var disconnectGracePeriod = DEFAULT_DISCONNECT_GRACE_SEC;

  if (config.games && config.games[params.gameId]) {
    var gameConfig = config.games[params.gameId];
    if (gameConfig.defaultTimeLimit) {
      gameTimeLimit = gameConfig.defaultTimeLimit;
      logger.info("Using game-specific time limit: " + gameTimeLimit + "s for " + params.gameId);
    }
  }

  var state = {
    gameId: params.gameId,
    betAmount: params.betAmount,
    status: "waiting",
    players: {},
    housePlayer: false,
    creatorId: params.creatorId,
    createdAt: Date.now(),
    deadline: Date.now() + (config.waitTimeoutSec * 1000),
    results: {},
    level: selectedLevel,
    config: {
      commissionRate: config.commissionRate,
      playTimeoutSec: config.playTimeoutSec,
      houseEdge: config.houseEdge
    },
    // Activity tracking fields - timer starts when 2 players connect (game begins)
    gameTimeLimit: gameTimeLimit,
    disconnectGracePeriod: disconnectGracePeriod,
    gameStartTime: null,            // Set when 2 players connect and game starts
    lastActivityTime: null,         // Set when game starts, updated on player activity
    inactivityCheckEnabled: false   // Enable when match starts (2 players connected)
  };

  var label = JSON.stringify({
    gameId: params.gameId,
    betAmount: params.betAmount,
    status: "waiting",
    levelId: selectedLevel ? selectedLevel.id : 0
  });

  logger.info("Selected level " + (selectedLevel ? selectedLevel.id : "none") + " for player " + params.creatorId);
  logger.info("Game time limit: " + gameTimeLimit + "s, grace period: " + disconnectGracePeriod + "s");

  return {
    state: state,
    tickRate: 1,
    label: label
  };
}
```

**Step 2: Verify no syntax errors**

Run: `node --check scripts/nakama-tests/nakama-server/modules/main.js`
Expected: No output (no syntax errors)

**Step 3: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): read game-specific timeLimit from config in matchInit"
```

---

## Task 3: Update matchJoin to Track Connection Status

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js:626-682`

**Step 1: Replace matchJoin function with connection tracking**

Replace the entire `matchJoin` function (lines 626-682) with:

```javascript
function matchJoin(ctx, logger, nk, dispatcher, tick, state, presences) {
  for (var i = 0; i < presences.length; i++) {
    var presence = presences[i];

    // Check if player is reconnecting
    var isReconnect = state.players[presence.userId] !== undefined;

    state.players[presence.userId] = {
      userId: presence.userId,
      sessionId: presence.sessionId,
      username: presence.username,
      isHouse: false,
      connected: true,              // Track connection status
      lastDisconnectTime: null      // Clear disconnect timestamp on join
    };

    if (isReconnect) {
      logger.info("Player " + presence.username + " RECONNECTED to match");

      // Update activity time on reconnection (if game already started)
      if (state.gameStartTime) {
        state.lastActivityTime = Date.now();
        logger.info("Activity time updated on reconnect");
      }

      // Notify other players about reconnection
      dispatcher.broadcastMessage(4, JSON.stringify({
        type: "player_reconnected",
        username: presence.username,
        userId: presence.userId
      }), null, null, true);
    } else {
      logger.info("Player " + presence.username + " joined match");
    }
  }

  var playerCount = Object.keys(state.players).length;

  if (playerCount === 2) {
    // GAME STARTS NOW - both players connected
    var now = Date.now();
    state.status = "ready";
    state.deadline = now + (state.config.playTimeoutSec * 1000);

    // START THE TIMER - these fields enable inactivity tracking
    state.gameStartTime = now;           // Record when game started
    state.lastActivityTime = now;        // Initialize activity tracker
    state.inactivityCheckEnabled = true; // Enable inactivity checks

    logger.info("GAME STARTED - Timer begins now. gameStartTime: " + now);

    dispatcher.matchLabelUpdate(JSON.stringify({
      gameId: state.gameId,
      betAmount: state.betAmount,
      status: "ready",
      levelId: state.level ? state.level.id : 0
    }));

    var playerNames = [];
    for (var userId in state.players) {
      playerNames.push(state.players[userId].username);
    }

    var gameInfo = {
      id: state.gameId,
      level: state.level ? {
        id: state.level.id,
        name: state.level.name,
        tier: state.level.tier,
        tiles: state.level.tiles,
        totalPairs: state.level.totalPairs,
        timeBonus: state.level.timeBonus,
        metadata: state.level.metadata
      } : null
    };

    dispatcher.broadcastMessage(1, JSON.stringify({
      type: "match_ready",
      matchType: "PVP",
      opponentName: playerNames,
      game: gameInfo,
      betAmount: state.betAmount,
      commissionRate: state.config.commissionRate,
      timeLimit: state.gameTimeLimit // Send time limit to clients
    }), null, null, true);

    logger.info("Match ready! PVP mode, level " + (state.level ? state.level.id : "none") +
                ", time limit: " + state.gameTimeLimit + "s");
  }

  return { state: state };
}
```

**Step 2: Verify no syntax errors**

Run: `node --check scripts/nakama-tests/nakama-server/modules/main.js`
Expected: No output (no syntax errors)

**Step 3: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): track connection status and reconnections in matchJoin"
```

---

## Task 4: Update matchLeave to Track Disconnection Time

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js:770-800`

**Step 1: Replace matchLeave function with disconnect tracking**

Replace the entire `matchLeave` function (lines 770-800) with:

```javascript
function matchLeave(ctx, logger, nk, dispatcher, tick, state, presences) {
  var now = Date.now();

  for (var i = 0; i < presences.length; i++) {
    var presence = presences[i];
    logger.info("Player " + presence.username + " left match (status: " + state.status + ")");

    // In waiting phase, refund and remove player
    if (state.status === "waiting") {
      nk.walletUpdate(presence.userId, { coins: state.betAmount }, {
        type: "bet_refund",
        gameId: state.gameId,
        betAmount: state.betAmount,
        reason: "player_left_waiting",
        timestamp: now
      }, true);
      logger.info("Refunded " + state.betAmount + " coins to " + presence.userId);
      delete state.players[presence.userId];
    }
    // In ready/playing phase, mark as disconnected but keep in match
    else if (state.status === "ready" || state.status === "playing") {
      if (state.players[presence.userId]) {
        state.players[presence.userId].connected = false;
        state.players[presence.userId].lastDisconnectTime = now;

        logger.info("Player " + presence.username + " marked as disconnected, grace period: " +
                    state.disconnectGracePeriod + "s");

        // Notify other players about disconnection
        dispatcher.broadcastMessage(5, JSON.stringify({
          type: "player_disconnected",
          username: presence.username,
          userId: presence.userId,
          gracePeriod: state.disconnectGracePeriod
        }), null, null, true);
      }
    }
  }

  // Count real (non-house) players still in match
  var realPlayerCount = 0;
  for (var userId in state.players) {
    if (!state.players[userId].isHouse) {
      realPlayerCount++;
    }
  }

  // Terminate if no real players remain
  if (realPlayerCount === 0) {
    logger.info("No real players remaining, terminating match");
    return null;
  }

  return { state: state };
}
```

**Step 2: Verify no syntax errors**

Run: `node --check scripts/nakama-tests/nakama-server/modules/main.js`
Expected: No output (no syntax errors)

**Step 3: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): track disconnection time in matchLeave for grace period"
```

---

## Task 5: Update matchLoop with Inactivity Check

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js:684-768`

**Step 1: Replace matchLoop function with inactivity check**

Replace the entire `matchLoop` function (lines 684-768) with:

```javascript
function matchLoop(ctx, logger, nk, dispatcher, tick, state, messages) {
  var now = Date.now();

  // Update activity time if we have active players
  // Only track after game has started (gameStartTime is set)
  if (state.inactivityCheckEnabled && state.gameStartTime) {
    var activeCount = countActivePlayers(state);
    if (activeCount > 0) {
      state.lastActivityTime = now;
    }
  }

  // CHECK 1: Waiting phase timeout (existing logic)
  if (state.status === "waiting" && now > state.deadline) {
    logger.info("Timeout waiting for opponent, adding house player");

    state.housePlayer = true;
    state.players["house"] = {
      userId: "house",
      sessionId: "house",
      username: "House",
      isHouse: true,
      connected: true,
      lastDisconnectTime: null
    };

    state.status = "ready";
    state.deadline = now + (state.config.playTimeoutSec * 1000);

    // START THE TIMER for PVH mode - game starts now with house player
    state.gameStartTime = now;           // Record when game started
    state.lastActivityTime = now;        // Initialize activity tracker
    state.inactivityCheckEnabled = true; // Enable inactivity checks

    logger.info("GAME STARTED (PVH) - Timer begins now. gameStartTime: " + now);

    dispatcher.matchLabelUpdate(JSON.stringify({
      gameId: state.gameId,
      betAmount: state.betAmount,
      status: "ready",
      matchType: "PVH",
      levelId: state.level ? state.level.id : 0
    }));

    var gameInfo = {
      id: state.gameId,
      level: state.level ? {
        id: state.level.id,
        name: state.level.name,
        tier: state.level.tier,
        tiles: state.level.tiles,
        totalPairs: state.level.totalPairs,
        timeBonus: state.level.timeBonus,
        metadata: state.level.metadata
      } : null
    };

    dispatcher.broadcastMessage(1, JSON.stringify({
      type: "match_ready",
      matchType: "PVH",
      message: "No opponent found, playing against house",
      game: gameInfo,
      betAmount: state.betAmount,
      commissionRate: state.config.commissionRate,
      timeLimit: state.gameTimeLimit
    }), null, null, true);

    logger.info("Match ready! PVH mode, level " + (state.level ? state.level.id : "none") +
                ", time limit: " + state.gameTimeLimit + "s");
  }

  // CHECK 2: Inactivity timeout (0 active players for too long)
  if (shouldTerminateForInactivity(state, now, logger)) {
    logger.warn("TERMINATING match due to inactivity: all players disconnected beyond time limit");

    // Auto-forfeit for all non-house players who haven't submitted results
    for (var odredacted in state.players) {
      var player = state.players[odredacted];
      if (!player.isHouse && !state.results[odredacted]) {
        state.results[odredacted] = {
          score: 0,
          timeMs: 999999999,
          forfeited: true,
          reason: "inactivity_timeout"
        };
        logger.info("Auto-forfeited " + player.username + " due to inactivity");
      }
    }

    // Broadcast timeout notification
    dispatcher.broadcastMessage(6, JSON.stringify({
      type: "match_timeout",
      reason: "inactivity",
      message: "Match terminated: all players inactive"
    }), null, null, true);

    resolveMatch(nk, logger, dispatcher, state);
    return null; // Terminate match
  }

  // CHECK 3: Existing play timeout (hard deadline - fallback safety)
  if (state.status === "ready" && now > state.deadline) {
    logger.info("Play timeout (hard deadline), forfeiting match");

    for (var odredacted in state.players) {
      var player = state.players[odredacted];
      if (!player.isHouse && !state.results[odredacted]) {
        state.results[odredacted] = {
          score: 0,
          timeMs: 999999999,
          forfeited: true,
          reason: "hard_deadline"
        };
      }
    }

    resolveMatch(nk, logger, dispatcher, state);
    return null;
  }

  // PROCESS MESSAGES: Handle score submissions
  for (var i = 0; i < messages.length; i++) {
    var message = messages[i];
    if (message.opCode === 2) {
      var data = JSON.parse(nk.binaryToString(message.data));
      state.results[message.sender.userId] = {
        score: data.score,
        timeMs: data.timeMs,
        forfeited: false
      };

      logger.info("Player " + message.sender.username + " submitted score: " + data.score);

      // Update activity time on score submission
      state.lastActivityTime = now;

      if (checkAllResultsSubmitted(state)) {
        state.status = "completed";
        resolveMatch(nk, logger, dispatcher, state);
        return null;
      }
    }
  }

  return { state: state };
}
```

**Step 2: Verify no syntax errors**

Run: `node --check scripts/nakama-tests/nakama-server/modules/main.js`
Expected: No output (no syntax errors)

**Step 3: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): add inactivity timeout check in matchLoop"
```

---

## Task 6: Update checkAllResultsSubmitted for Grace Period

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js:810-818`

**Step 1: Replace checkAllResultsSubmitted with grace period handling**

Replace the `checkAllResultsSubmitted` function (lines 810-818) with:

```javascript
function checkAllResultsSubmitted(state) {
  var now = Date.now();

  for (var userId in state.players) {
    var player = state.players[userId];
    // Only wait for results from non-house players
    if (!player.isHouse) {
      var hasResult = state.results[userId] !== undefined;

      if (!hasResult) {
        // If player is connected, we're still waiting for their result
        if (player.connected) {
          return false;
        }

        // If disconnected, check if they're within grace period
        if (player.lastDisconnectTime) {
          var timeSinceDisconnect = now - player.lastDisconnectTime;
          var gracePeriodMs = state.disconnectGracePeriod * 1000;

          if (timeSinceDisconnect < gracePeriodMs) {
            // Still within grace period, wait for possible reconnection
            return false;
          }
          // Beyond grace period - auto-forfeit this player
          state.results[userId] = {
            score: 0,
            timeMs: 999999999,
            forfeited: true,
            reason: "disconnect_timeout"
          };
        }
      }
    }
  }
  return true;
}
```

**Step 2: Verify no syntax errors**

Run: `node --check scripts/nakama-tests/nakama-server/modules/main.js`
Expected: No output (no syntax errors)

**Step 3: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): handle grace period in checkAllResultsSubmitted"
```

---

## Task 7: Update matchTerminate for Proper Cleanup Logging

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js:802-804`

**Step 1: Replace matchTerminate with logging**

Replace the `matchTerminate` function (lines 802-804) with:

```javascript
function matchTerminate(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
  logger.info("Match terminating - Status: " + state.status + ", Grace: " + graceSeconds + "s");

  // Log final state for debugging
  var playerList = [];
  var connectedCount = 0;
  for (var userId in state.players) {
    var player = state.players[userId];
    playerList.push(userId + (player.connected ? "(online)" : "(offline)"));
    if (player.connected && !player.isHouse) {
      connectedCount++;
    }
  }

  logger.info("Final players: " + playerList.join(", "));
  logger.info("Results submitted: " + Object.keys(state.results).length);
  logger.info("Connected players at termination: " + connectedCount);

  return { state: state };
}
```

**Step 2: Verify no syntax errors**

Run: `node --check scripts/nakama-tests/nakama-server/modules/main.js`
Expected: No output (no syntax errors)

**Step 3: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): add cleanup logging in matchTerminate"
```

---

## Task 8: Final Verification and Testing

**Files:**
- Test: `scripts/nakama-tests/nakama-server/modules/main.js`

**Step 1: Run final syntax check**

Run: `node --check scripts/nakama-tests/nakama-server/modules/main.js`
Expected: No output (no syntax errors)

**Step 2: Verify config structure exists**

The default config at lines 276-301 already includes:
```javascript
games: {
  mahjong: {
    name: "Mahjong Solitaire",
    description: "Match tiles to clear the board",
    enabled: true,
    defaultTimeLimit: 300,  // This is what we read
    levelCount: 120
  }
}
```

**Step 3: Push changes**

```bash
git push origin main
```

---

## Summary of Changes

| Task | Description | Lines Modified |
|------|-------------|----------------|
| 1 | Add DEFAULT_DISCONNECT_GRACE_SEC constant and helper functions | 10, 560-562 |
| 2 | Update matchInit with gameTimeLimit from config | 563-602 |
| 3 | Update matchJoin with connection tracking | 626-682 |
| 4 | Update matchLeave with disconnect tracking | 770-800 |
| 5 | Update matchLoop with inactivity check | 684-768 |
| 6 | Update checkAllResultsSubmitted with grace period | 810-818 |
| 7 | Update matchTerminate with logging | 802-804 |
| 8 | Final verification | N/A |

## When Timer Starts

**IMPORTANT:** The inactivity timer ONLY starts when:
1. **PVP Mode:** Both players connect (playerCount === 2) → `gameStartTime` is set
2. **PVH Mode:** Waiting timeout expires and house player is added → `gameStartTime` is set

**Timer does NOT run during:**
- "waiting" phase (only 1 player in match)
- Before `gameStartTime` is set

## Behavior After Implementation

| Scenario | Timeout | Result |
|----------|---------|--------|
| Waiting for opponent (1 player) | N/A | Timer NOT running |
| Both players online, submit results | N/A | Normal completion |
| Player disconnects < 60s, reconnects | Grace period | Game continues |
| Player disconnects > 360s (300+60) | Inactivity | Auto-forfeit, match terminates |
| Both disconnect > 360s | Inactivity | Both forfeit, match terminates |

## Configuration

The timeout is read from Nakama storage config:
- Path: `config.games.mahjong.defaultTimeLimit` (currently 300 seconds)
- Grace period: 60 seconds (hardcoded, can be made configurable later)
- Total timeout: `defaultTimeLimit + gracePeriod` = 360 seconds

## Key State Fields

| Field | Initial Value | Set When | Purpose |
|-------|---------------|----------|---------|
| `gameStartTime` | `null` | 2 players connect OR house added | Records when game actually started |
| `lastActivityTime` | `null` | Same as above, updated on activity | Tracks last player activity |
| `inactivityCheckEnabled` | `false` | Same as above | Enables timeout checking |
