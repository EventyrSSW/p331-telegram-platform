# Nakama Config API & Dynamic Level Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add RPC endpoints to retrieve game configuration and implement dynamic level selection for mahjong based on player score/rating, with flexible JSON-based level data containing tile positions.

**Architecture:** Store game config and level data in Nakama storage. Levels are organized by difficulty tiers. Player's historical score determines which tier range they access, then a random level is selected from that range. Level data contains tile positions as flexible JSON.

**Tech Stack:** Nakama JavaScript Runtime, Nakama Storage API, Nakama RPC API

---

## Background

### Current Behavior
- Commission rate (10%) is hardcoded
- No level system exists
- No player skill tracking

### Target Behavior
- Configurable commission rates, timeouts, bet limits in storage
- Mahjong has 100+ levels stored as JSON with tile position data
- Player's average score determines their skill tier
- System randomly selects a level from appropriate tier range
- Flexible structure to add more games later

### Level Selection Algorithm
```
Player Average Score → Skill Tier → Level Range → Random Level

Example:
- Player avg score: 2500
- Skill tier: "intermediate" (score 2000-4000)
- Level range: levels 30-60
- Random selection: level 47
```

### Level Data Structure
```json
{
  "id": 47,
  "name": "Dragon's Path",
  "tier": "intermediate",
  "tiles": [
    { "id": 1, "type": "bamboo_1", "layer": 0, "x": 0, "y": 0 },
    { "id": 2, "type": "bamboo_1", "layer": 0, "x": 1, "y": 0 },
    { "id": 3, "type": "character_5", "layer": 1, "x": 0.5, "y": 0 }
  ],
  "totalPairs": 72,
  "timeBonus": 300,
  "metadata": {
    "author": "system",
    "difficulty": 3,
    "theme": "dragon"
  }
}
```

---

### Task 1: Create Config Structure with Flexible Game Support

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js:6-44` (InitModule function)

**Step 1: Add config and level initialization after leaderboard creation**

Find line 41 (after the leaderboard creation loop ends with `}`):

Add after line 41:
```javascript

  // Initialize game config if not exists
  var configReads = nk.storageRead([
    { collection: "config", key: "game_settings", userId: null }
  ]);

  if (configReads.length === 0) {
    var defaultConfig = {
      commissionRate: 0.10,
      waitTimeoutSec: 30,
      playTimeoutSec: 86400,
      houseEdge: 0.51,
      minBet: 10,
      maxBet: 10000,
      // Skill tiers define level ranges based on player average score
      skillTiers: [
        { name: "beginner", minScore: 0, maxScore: 1000, levelRange: [1, 20] },
        { name: "novice", minScore: 1001, maxScore: 2000, levelRange: [15, 40] },
        { name: "intermediate", minScore: 2001, maxScore: 4000, levelRange: [30, 60] },
        { name: "advanced", minScore: 4001, maxScore: 7000, levelRange: [50, 85] },
        { name: "expert", minScore: 7001, maxScore: 10000, levelRange: [70, 100] },
        { name: "master", minScore: 10001, maxScore: 999999, levelRange: [85, 120] }
      ],
      games: {
        mahjong: {
          name: "Mahjong Solitaire",
          description: "Match tiles to clear the board",
          enabled: true,
          defaultTimeLimit: 300,
          levelCount: 120
        }
      }
    };

    nk.storageWrite([
      {
        collection: "config",
        key: "game_settings",
        userId: null,
        value: defaultConfig,
        permissionRead: 2,
        permissionWrite: 0
      }
    ]);
    logger.info("Created default game config");
  }

  // Initialize mahjong levels if not exists
  var levelsReads = nk.storageRead([
    { collection: "levels", key: "mahjong", userId: null }
  ]);

  if (levelsReads.length === 0) {
    // Create sample levels structure (in production, load from file or admin API)
    var sampleLevels = generateSampleMahjongLevels();

    nk.storageWrite([
      {
        collection: "levels",
        key: "mahjong",
        userId: null,
        value: { levels: sampleLevels },
        permissionRead: 2,
        permissionWrite: 0
      }
    ]);
    logger.info("Created " + sampleLevels.length + " mahjong levels");
  }
```

**Step 2: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): initialize config and level storage structure"
```

---

### Task 2: Add Sample Level Generator Function

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js` (add before InitModule)

**Step 1: Add generateSampleMahjongLevels function at top of file**

Find line 5 (after constants):

Add after:
```javascript

// Generate sample mahjong levels for initial setup
// In production, these would be loaded from a file or admin API
function generateSampleMahjongLevels() {
  var levels = [];
  var tileTypes = [
    "bamboo_1", "bamboo_2", "bamboo_3", "bamboo_4", "bamboo_5",
    "bamboo_6", "bamboo_7", "bamboo_8", "bamboo_9",
    "character_1", "character_2", "character_3", "character_4", "character_5",
    "character_6", "character_7", "character_8", "character_9",
    "circle_1", "circle_2", "circle_3", "circle_4", "circle_5",
    "circle_6", "circle_7", "circle_8", "circle_9",
    "wind_east", "wind_south", "wind_west", "wind_north",
    "dragon_red", "dragon_green", "dragon_white",
    "flower_1", "flower_2", "flower_3", "flower_4",
    "season_1", "season_2", "season_3", "season_4"
  ];

  for (var i = 1; i <= 120; i++) {
    // Determine tier based on level number
    var tier = "beginner";
    if (i > 85) tier = "master";
    else if (i > 70) tier = "expert";
    else if (i > 50) tier = "advanced";
    else if (i > 30) tier = "intermediate";
    else if (i > 15) tier = "novice";

    // Generate tile layout (simplified - real layouts would be designed)
    var tiles = [];
    var pairCount = 36 + Math.floor(i / 10) * 4; // More pairs for higher levels
    var tileId = 1;

    for (var p = 0; p < pairCount; p++) {
      var tileType = tileTypes[p % tileTypes.length];
      var layer = Math.floor(p / 24);
      var posInLayer = p % 24;
      var row = Math.floor(posInLayer / 6);
      var col = posInLayer % 6;

      // Add pair of matching tiles
      tiles.push({
        id: tileId++,
        type: tileType,
        layer: layer,
        x: col * 2 + (layer * 0.5),
        y: row * 2 + (layer * 0.5)
      });
      tiles.push({
        id: tileId++,
        type: tileType,
        layer: layer,
        x: col * 2 + 1 + (layer * 0.5),
        y: row * 2 + (layer * 0.5)
      });
    }

    levels.push({
      id: i,
      name: "Level " + i,
      tier: tier,
      tiles: tiles,
      totalPairs: pairCount,
      timeBonus: 300 - Math.floor(i / 2), // Less time bonus for harder levels
      metadata: {
        difficulty: Math.ceil(i / 20),
        theme: i % 5 === 0 ? "special" : "classic",
        createdAt: Date.now()
      }
    });
  }

  return levels;
}
```

**Step 2: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): add sample mahjong level generator"
```

---

### Task 3: Add Helper Functions for Config and Player Stats

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js` (add helper functions)

**Step 1: Replace hardcoded constants with helper functions**

Find lines 3-4:
```javascript
var WAIT_TIMEOUT_SEC = 30;
var PLAY_TIMEOUT_SEC = 86400;
```

Replace with:
```javascript
// Default fallback values
var DEFAULT_WAIT_TIMEOUT_SEC = 30;
var DEFAULT_PLAY_TIMEOUT_SEC = 86400;
var DEFAULT_COMMISSION_RATE = 0.10;
var DEFAULT_HOUSE_EDGE = 0.51;

function getConfig(nk) {
  try {
    var configReads = nk.storageRead([
      { collection: "config", key: "game_settings", userId: null }
    ]);
    if (configReads.length > 0) {
      return configReads[0].value;
    }
  } catch (e) {
    // Fall through to defaults
  }
  return {
    commissionRate: DEFAULT_COMMISSION_RATE,
    waitTimeoutSec: DEFAULT_WAIT_TIMEOUT_SEC,
    playTimeoutSec: DEFAULT_PLAY_TIMEOUT_SEC,
    houseEdge: DEFAULT_HOUSE_EDGE,
    minBet: 10,
    maxBet: 10000,
    skillTiers: [],
    games: {}
  };
}

function getGameLevels(nk, gameId) {
  try {
    var levelsReads = nk.storageRead([
      { collection: "levels", key: gameId, userId: null }
    ]);
    if (levelsReads.length > 0) {
      return levelsReads[0].value.levels || [];
    }
  } catch (e) {
    // Fall through to empty
  }
  return [];
}

function getPlayerStats(nk, odredacted, gameId) {
  try {
    var statsReads = nk.storageRead([
      { collection: "player_stats", key: gameId, odredacted: odredacted }
    ]);
    if (statsReads.length > 0) {
      return statsReads[0].value;
    }
  } catch (e) {
    // Fall through to defaults
  }
  return {
    gamesPlayed: 0,
    totalScore: 0,
    averageScore: 0,
    highScore: 0,
    wins: 0,
    losses: 0
  };
}

function updatePlayerStats(nk, odredacted, gameId, score, won) {
  var stats = getPlayerStats(nk, odredacted, gameId);

  stats.gamesPlayed++;
  stats.totalScore += score;
  stats.averageScore = Math.floor(stats.totalScore / stats.gamesPlayed);
  if (score > stats.highScore) {
    stats.highScore = score;
  }
  if (won) {
    stats.wins++;
  } else {
    stats.losses++;
  }

  nk.storageWrite([
    {
      collection: "player_stats",
      key: gameId,
      odredacted: odredacted,
      value: stats,
      permissionRead: 1, // Owner only
      permissionWrite: 0 // Server only
    }
  ]);

  return stats;
}

function selectLevelForPlayer(nk, odredacted, gameId, config) {
  var stats = getPlayerStats(nk, odredacted, gameId);
  var levels = getGameLevels(nk, gameId);

  if (levels.length === 0) {
    return null;
  }

  // Find appropriate tier based on player's average score
  var playerAvgScore = stats.averageScore || 0;
  var levelRange = [1, 20]; // Default to beginner range

  var skillTiers = config.skillTiers || [];
  for (var i = 0; i < skillTiers.length; i++) {
    var tier = skillTiers[i];
    if (playerAvgScore >= tier.minScore && playerAvgScore <= tier.maxScore) {
      levelRange = tier.levelRange;
      break;
    }
  }

  // Filter levels within the range
  var eligibleLevels = [];
  for (var j = 0; j < levels.length; j++) {
    var level = levels[j];
    if (level.id >= levelRange[0] && level.id <= levelRange[1]) {
      eligibleLevels.push(level);
    }
  }

  if (eligibleLevels.length === 0) {
    // Fallback to first level
    return levels[0];
  }

  // Random selection from eligible levels
  var randomIndex = Math.floor(Math.random() * eligibleLevels.length);
  return eligibleLevels[randomIndex];
}
```

**Step 2: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): add helper functions for config, stats, level selection"
```

---

### Task 4: Create get_config RPC

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js` (InitModule and new function)

**Step 1: Register the new RPC in InitModule**

Find line 20:
```javascript
  initializer.registerRpc("add_test_coins", rpcAddTestCoins);
```

Add after:
```javascript
  initializer.registerRpc("get_config", rpcGetConfig);
  initializer.registerRpc("get_player_stats", rpcGetPlayerStats);
```

**Step 2: Add the RPC functions after rpcAddTestCoins**

Find end of rpcAddTestCoins function:

Add after:
```javascript

function rpcGetConfig(ctx, logger, nk, payload) {
  logger.info("get_config called by " + ctx.userId);

  var config = getConfig(nk);

  // Return public config
  return JSON.stringify({
    commissionRate: config.commissionRate,
    minBet: config.minBet,
    maxBet: config.maxBet,
    waitTimeoutSec: config.waitTimeoutSec,
    skillTiers: config.skillTiers,
    games: config.games
  });
}

function rpcGetPlayerStats(ctx, logger, nk, payload) {
  var data = {};
  try {
    if (payload && payload !== "") {
      data = JSON.parse(payload);
    }
  } catch (e) {
    // Use defaults
  }

  var gameId = data.gameId || "mahjong";
  var stats = getPlayerStats(nk, ctx.userId, gameId);

  return JSON.stringify({
    gameId: gameId,
    stats: stats
  });
}
```

**Step 3: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): add get_config and get_player_stats RPCs"
```

---

### Task 5: Update matchInit to Store Selected Level

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js` (matchInit function)

**Step 1: Update matchInit to select level and store in state**

Find matchInit function and replace entirely:
```javascript
function matchInit(ctx, logger, nk, params) {
  logger.info("Match init: gameId=" + params.gameId + ", bet=" + params.betAmount);

  var config = getConfig(nk);

  // Select a level for the creator based on their skill
  var selectedLevel = selectLevelForPlayer(nk, params.creatorId, params.gameId, config);

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
      playTimeoutSec: config.playTimeoutSec
    }
  };

  var label = JSON.stringify({
    gameId: params.gameId,
    betAmount: params.betAmount,
    status: "waiting",
    levelId: selectedLevel ? selectedLevel.id : 0
  });

  logger.info("Selected level " + (selectedLevel ? selectedLevel.id : "none") + " for player " + params.creatorId);

  return {
    state: state,
    tickRate: 1,
    label: label
  };
}
```

**Step 2: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): select level based on player skill in matchInit"
```

---

### Task 6: Update matchJoin to Send Level Data

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js` (matchJoin function)

**Step 1: Update matchJoin to include level data in broadcast**

Find in matchJoin the section where playerCount === 2 and replace:

```javascript
  if (playerCount === 2) {
    state.status = "ready";
    state.deadline = Date.now() + (state.config.playTimeoutSec * 1000);

    dispatcher.matchLabelUpdate(JSON.stringify({
      gameId: state.gameId,
      betAmount: state.betAmount,
      status: "ready",
      levelId: state.level ? state.level.id : 0
    }));

    var playerNames = [];
    for (var odredacted in state.players) {
      playerNames.push(state.players[odredacted].username);
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
      commissionRate: state.config.commissionRate
    }), null, null, true);

    logger.info("Match ready! PVP mode, level " + (state.level ? state.level.id : "none"));
  }
```

**Step 2: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): send level data with match_ready (PVP)"
```

---

### Task 7: Update matchLoop PVH to Send Level Data

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js` (matchLoop function)

**Step 1: Update PVH section in matchLoop**

Find the PVH timeout section and replace:

```javascript
  if (state.status === "waiting" && now > state.deadline) {
    logger.info("Timeout waiting for opponent, adding house player");

    state.housePlayer = true;
    state.players["house"] = {
      odredacted: "house",
      sessionId: "house",
      username: "House",
      isHouse: true
    };

    state.status = "ready";
    state.deadline = now + (state.config.playTimeoutSec * 1000);

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
      commissionRate: state.config.commissionRate
    }), null, null, true);

    logger.info("Match ready! PVH mode, level " + (state.level ? state.level.id : "none"));
  }
```

**Step 2: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): send level data with match_ready (PVH)"
```

---

### Task 8: Update resolveMatch to Track Player Stats

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js` (resolveMatch function)

**Step 1: Update resolveMatch to use config and update player stats**

Find beginning of resolveMatch:
```javascript
function resolveMatch(nk, logger, dispatcher, state) {
  var commissionRate = 0.10;
```

Replace with:
```javascript
function resolveMatch(nk, logger, dispatcher, state) {
  var commissionRate = state.config.commissionRate || DEFAULT_COMMISSION_RATE;
```

**Step 2: Add stats update after determining winner**

Find after the winner determination loop (after `winnerId = odredacted;`), add stats tracking before payouts:

After the winner is determined but before payouts, add:
```javascript

  // Update player stats for all real players
  for (var odredacted in state.players) {
    var player = state.players[odredacted];
    if (!player.isHouse) {
      var playerResult = state.results[odredacted];
      var playerScore = playerResult ? playerResult.score : 0;
      var playerWon = (odredacted === winnerId);

      updatePlayerStats(nk, odredacted, state.gameId, playerScore, playerWon);
      logger.info("Updated stats for " + odredacted + ": score=" + playerScore + ", won=" + playerWon);
    }
  }
```

**Step 3: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): track player stats in resolveMatch"
```

---

### Task 9: Update generateHouseScore to Use Config

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js` (generateHouseScore function)

**Step 1: Update function signature and implementation**

Find generateHouseScore:
```javascript
function generateHouseScore(playerScore) {
  var houseWins = Math.random() < 0.51;
```

Replace with:
```javascript
function generateHouseScore(playerScore, houseEdge) {
  var edge = houseEdge || DEFAULT_HOUSE_EDGE;
  var houseWins = Math.random() < edge;
```

**Step 2: Update the call site in resolveMatch**

Find:
```javascript
          var houseScore = generateHouseScore(playerResult.score);
```

Replace with:
```javascript
          var houseScore = generateHouseScore(playerResult.score, state.config.houseEdge || DEFAULT_HOUSE_EDGE);
```

**Step 3: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): use config house edge in generateHouseScore"
```

---

### Task 10: Add Bet Validation and Admin RPC for Level Updates

**Files:**
- Modify: `scripts/nakama-tests/nakama-server/modules/main.js` (rpcJoinGame and new admin RPC)

**Step 1: Add bet validation in rpcJoinGame after balance check**

Find after insufficient balance check:

Add:
```javascript

  // Validate bet amount against config limits
  var config = getConfig(nk);
  if (betAmount < config.minBet) {
    return JSON.stringify({
      error: "Bet amount too low",
      code: "BET_TOO_LOW",
      minBet: config.minBet,
      requested: betAmount
    });
  }
  if (betAmount > config.maxBet) {
    return JSON.stringify({
      error: "Bet amount too high",
      code: "BET_TOO_HIGH",
      maxBet: config.maxBet,
      requested: betAmount
    });
  }
```

**Step 2: Register admin RPC in InitModule**

Add after other registerRpc calls:
```javascript
  initializer.registerRpc("admin_update_levels", rpcAdminUpdateLevels);
```

**Step 3: Add admin RPC function**

Add after other RPC functions:
```javascript

function rpcAdminUpdateLevels(ctx, logger, nk, payload) {
  // Simple admin check - in production use proper admin roles
  // For now, check if user has admin metadata or specific user ID

  var data;
  try {
    data = JSON.parse(payload);
  } catch (e) {
    return JSON.stringify({ error: "Invalid JSON payload", code: "INVALID_PAYLOAD" });
  }

  var gameId = data.gameId;
  var levels = data.levels;

  if (!gameId || !levels || !Array.isArray(levels)) {
    return JSON.stringify({ error: "Missing gameId or levels array", code: "MISSING_DATA" });
  }

  // Validate level structure
  for (var i = 0; i < levels.length; i++) {
    var level = levels[i];
    if (!level.id || !level.tiles || !Array.isArray(level.tiles)) {
      return JSON.stringify({
        error: "Invalid level structure at index " + i,
        code: "INVALID_LEVEL",
        levelId: level.id
      });
    }
  }

  nk.storageWrite([
    {
      collection: "levels",
      key: gameId,
      userId: null,
      value: { levels: levels, updatedAt: Date.now(), updatedBy: ctx.userId },
      permissionRead: 2,
      permissionWrite: 0
    }
  ]);

  logger.info("Admin " + ctx.userId + " updated " + levels.length + " levels for " + gameId);

  return JSON.stringify({
    success: true,
    gameId: gameId,
    levelCount: levels.length
  });
}
```

**Step 4: Commit**

```bash
git add scripts/nakama-tests/nakama-server/modules/main.js
git commit -m "feat(nakama): add bet validation and admin level update RPC"
```

---

### Task 11: Final Push and Deploy

**Step 1: Review all changes**

```bash
git log --oneline HEAD~10..HEAD
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
ssh root@136.243.136.206 "docker logs nakama 2>&1 | tail -40"
```

Look for:
- "Created default game config"
- "Created 120 mahjong levels"
- "Game match module initialized!"

---

## Summary of Changes

| Location | Change |
|----------|--------|
| `InitModule` | Initialize config and 120 mahjong levels in storage |
| `generateSampleMahjongLevels()` | Generate level data with tiles and metadata |
| `getConfig()` | Helper to read config from storage |
| `getGameLevels()` | Helper to read game levels from storage |
| `getPlayerStats()` | Helper to read player statistics |
| `updatePlayerStats()` | Helper to update player score/win tracking |
| `selectLevelForPlayer()` | Algorithm to pick level based on skill tier |
| `rpcGetConfig` | RPC to fetch public configuration |
| `rpcGetPlayerStats` | RPC to fetch player's game statistics |
| `rpcAdminUpdateLevels` | Admin RPC to update level data |
| `matchInit` | Select level based on creator's skill |
| `matchJoin` | Send full level data with match_ready |
| `matchLoop` | Send level data for PVH matches |
| `resolveMatch` | Track player stats after match |

## Storage Collections

| Collection | Key | Contents |
|------------|-----|----------|
| `config` | `game_settings` | Commission, tiers, bet limits, game list |
| `levels` | `mahjong` | Array of 120 level objects with tiles |
| `player_stats` | `mahjong` (per user) | Player's score history, wins, losses |

## RPC Endpoints

| RPC | Description | Auth |
|-----|-------------|------|
| `get_config` | Public game configuration | Any user |
| `get_player_stats` | Player's stats for a game | Owner only |
| `admin_update_levels` | Bulk update level data | Admin only |

## Level Data Structure

```json
{
  "id": 47,
  "name": "Dragon's Path",
  "tier": "intermediate",
  "tiles": [
    { "id": 1, "type": "bamboo_1", "layer": 0, "x": 0, "y": 0 },
    { "id": 2, "type": "bamboo_1", "layer": 0, "x": 1, "y": 0 },
    { "id": 3, "type": "character_5", "layer": 1, "x": 0.5, "y": 0 }
  ],
  "totalPairs": 72,
  "timeBonus": 300,
  "metadata": {
    "difficulty": 3,
    "theme": "dragon",
    "createdAt": 1703260800000
  }
}
```

## Skill Tier System

| Tier | Avg Score Range | Level Range |
|------|-----------------|-------------|
| beginner | 0 - 1000 | 1 - 20 |
| novice | 1001 - 2000 | 15 - 40 |
| intermediate | 2001 - 4000 | 30 - 60 |
| advanced | 4001 - 7000 | 50 - 85 |
| expert | 7001 - 10000 | 70 - 100 |
| master | 10001+ | 85 - 120 |

## Updated match_ready Message

```json
{
  "type": "match_ready",
  "matchType": "PVP",
  "opponentName": ["Player1", "Player2"],
  "game": {
    "id": "mahjong",
    "level": {
      "id": 47,
      "name": "Dragon's Path",
      "tier": "intermediate",
      "tiles": [...],
      "totalPairs": 72,
      "timeBonus": 300,
      "metadata": {...}
    }
  },
  "betAmount": 100,
  "commissionRate": 0.10
}
```
