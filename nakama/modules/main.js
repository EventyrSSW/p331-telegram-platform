// Nakama Server Runtime Module

// Default fallback values
var DEFAULT_WAIT_TIMEOUT_SEC = 30;
var DEFAULT_PLAY_TIMEOUT_SEC = 300; // 5 minutes
var DEFAULT_COMMISSION_RATE = 0.10;
var DEFAULT_HOUSE_EDGE = 0.51;
var DEFAULT_MIN_BET = 50;    // 50 cents = $0.50
var DEFAULT_MAX_BET = 10000; // 10000 cents = $100
var DEFAULT_DISCONNECT_GRACE_SEC = 60; // 60 seconds grace period for PVP reconnection
var DEFAULT_PVH_GRACE_SEC = 30; // 30 seconds grace period for PVH (then House wins)

function getConfig(nk) {
  // Default config
  var defaults = {
    commissionRate: DEFAULT_COMMISSION_RATE,
    waitTimeoutSec: DEFAULT_WAIT_TIMEOUT_SEC,
    playTimeoutSec: DEFAULT_PLAY_TIMEOUT_SEC,
    houseEdge: DEFAULT_HOUSE_EDGE,
    minBet: DEFAULT_MIN_BET,
    maxBet: DEFAULT_MAX_BET,
    skillTiers: [],
    games: {}
  };

  try {
    var configReads = nk.storageRead([
      { collection: "config", key: "game_settings" }
    ]);
    if (configReads.length > 0) {
      var stored = configReads[0].value;
      // Merge stored with defaults (stored values take precedence)
      return {
        commissionRate: stored.commissionRate !== undefined ? stored.commissionRate : defaults.commissionRate,
        waitTimeoutSec: stored.waitTimeoutSec !== undefined ? stored.waitTimeoutSec : defaults.waitTimeoutSec,
        playTimeoutSec: stored.playTimeoutSec !== undefined ? stored.playTimeoutSec : defaults.playTimeoutSec,
        houseEdge: stored.houseEdge !== undefined ? stored.houseEdge : defaults.houseEdge,
        minBet: stored.minBet !== undefined ? stored.minBet : defaults.minBet,
        maxBet: stored.maxBet !== undefined ? stored.maxBet : defaults.maxBet,
        skillTiers: stored.skillTiers || defaults.skillTiers,
        games: stored.games || defaults.games
      };
    }
  } catch (e) {
    // Fall through to defaults
  }
  return defaults;
}

function getGameLevels(nk, logger, gameId) {
  // Read system-owned levels (same pattern as mahjong init)
  try {
    var reads = nk.storageRead([
      { collection: "levels", key: gameId }
    ]);
    if (reads.length > 0) {
      var levels = reads[0].value.levels || [];
      logger.info("getGameLevels: found " + levels.length + " levels for " + gameId);
      return levels;
    }
  } catch (e) {
    logger.error("getGameLevels error for " + gameId + ": " + e.message);
  }

  logger.warn("getGameLevels: no levels found for " + gameId);
  return [];
}

function getPlayerStats(nk, userId, gameId) {
  try {
    var statsReads = nk.storageRead([
      { collection: "player_stats", key: gameId, userId: userId }
    ]);
    if (statsReads.length > 0) {
      var stats = statsReads[0].value;
      // Ensure totalAmountWon exists for backwards compatibility
      if (stats.totalAmountWon === undefined) {
        stats.totalAmountWon = 0;
      }
      return stats;
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
    losses: 0,
    totalAmountWon: 0
  };
}

function updatePlayerStats(nk, userId, gameId, score, won, amountWon) {
  var stats = getPlayerStats(nk, userId, gameId);

  stats.gamesPlayed++;
  stats.totalScore += score;
  stats.averageScore = Math.floor(stats.totalScore / stats.gamesPlayed);
  if (score > stats.highScore) {
    stats.highScore = score;
  }
  if (won) {
    stats.wins++;
    // Track amount won (payout - betAmount = net profit, but we store gross payout)
    if (amountWon && amountWon > 0) {
      stats.totalAmountWon += amountWon;
    }
  } else {
    stats.losses++;
  }

  nk.storageWrite([
    {
      collection: "player_stats",
      key: gameId,
      userId: userId,
      value: stats,
      permissionRead: 1, // Owner only
      permissionWrite: 0 // Server only
    }
  ]);

  return stats;
}

// ===== Match History Helper Functions =====

function writeMatchHistoryEntry(nk, logger, userId, matchId, gameId, betAmount, matchType, levelId) {
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

  logger.info("Created match history entry for user " + userId + ", match " + matchId);
  return entry;
}

function updateMatchHistoryStatus(nk, logger, matchId, userId, status) {
  var reads = nk.storageRead([
    { collection: "match_history", key: matchId, userId: userId }
  ]);

  if (reads.length > 0) {
    var entry = reads[0].value;
    entry.status = status;
    entry.updatedAt = Date.now();

    nk.storageWrite([{
      collection: "match_history",
      key: matchId,
      userId: userId,
      value: entry,
      permissionRead: 1,
      permissionWrite: 0
    }]);

    logger.info("Updated match history status to " + status + " for user " + userId + ", match " + matchId);
    return entry;
  }
  return null;
}

function updateMatchHistoryOpponent(nk, logger, matchId, userId, opponentId, opponentName, opponentAvatar) {
  var reads = nk.storageRead([
    { collection: "match_history", key: matchId, userId: userId }
  ]);

  if (reads.length > 0) {
    var entry = reads[0].value;
    entry.status = "ready";
    entry.updatedAt = Date.now();
    entry.opponentId = opponentId;
    entry.opponentName = opponentName;
    entry.opponentAvatar = opponentAvatar || null;

    nk.storageWrite([{
      collection: "match_history",
      key: matchId,
      userId: userId,
      value: entry,
      permissionRead: 1,
      permissionWrite: 0
    }]);

    logger.info("Updated opponent info for user " + userId + ", match " + matchId + ", opponent: " + opponentName);
    return entry;
  }
  return null;
}

function updateMatchHistoryScore(nk, logger, matchId, userId, score) {
  var reads = nk.storageRead([
    { collection: "match_history", key: matchId, userId: userId }
  ]);

  if (reads.length > 0) {
    var entry = reads[0].value;
    entry.status = "submitted";
    entry.updatedAt = Date.now();
    entry.myScore = score;

    nk.storageWrite([{
      collection: "match_history",
      key: matchId,
      userId: userId,
      value: entry,
      permissionRead: 1,
      permissionWrite: 0
    }]);

    logger.info("Updated score to " + score + " for user " + userId + ", match " + matchId);
    return entry;
  }
  return null;
}

function updateMatchHistoryComplete(nk, logger, matchId, userId, result, payout, opponentScore) {
  var reads = nk.storageRead([
    { collection: "match_history", key: matchId, userId: userId }
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
      userId: userId,
      value: entry,
      permissionRead: 1,
      permissionWrite: 0
    }]);

    logger.info("Completed match history for user " + userId + ", match " + matchId + ", result: " + result);
    return entry;
  }
  return null;
}

function updateMatchHistoryCancelled(nk, logger, matchId, userId) {
  var reads = nk.storageRead([
    { collection: "match_history", key: matchId, userId: userId }
  ]);

  if (reads.length > 0) {
    var entry = reads[0].value;
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

    logger.info("Cancelled match history for user " + userId + ", match " + matchId);
    return entry;
  }
  return null;
}

// ===== End Match History Helper Functions =====

function selectLevelForPlayer(nk, logger, userId, gameId, config) {
  var levels = getGameLevels(nk, logger, gameId);

  if (levels.length === 0) {
    return null;
  }

  // DEBUG: Always return the first level for testing
  logger.info("DEBUG: Returning first level (id=" + levels[0].id + ") for debugging");
  return levels[0];

  /* ORIGINAL SKILL-BASED LEVEL SELECTION - commented out for debugging
  var stats = getPlayerStats(nk, userId, gameId);

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
  END ORIGINAL SKILL-BASED LEVEL SELECTION */
}

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

/**
 * RPC to update user wallet balance
 * IMPORTANT: This should only be called by the Node.js backend after blockchain verification
 *
 * Payload: {
 *   userId: string,      // Nakama user ID
 *   amount: number,       // Amount to add (in cents/smallest unit)
 *   tonTxHash: string,    // TON transaction hash (for idempotency)
 *   tonAmount: string,    // TON amount in nanoTON
 *   reason: string        // Reason for update (e.g., "ton_purchase")
 * }
 */
function rpcUpdateUserWallet(ctx, logger, nk, payload) {
  logger.info("update_user_wallet called");

  var data;
  try {
    data = JSON.parse(payload);
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: "Invalid payload",
      code: "INVALID_PAYLOAD"
    });
  }

  var userId = data.userId;
  var amount = data.amount;
  var tonTxHash = data.tonTxHash;
  var tonAmount = data.tonAmount;
  var reason = data.reason || "ton_purchase";

  if (!userId || typeof amount !== 'number' || amount <= 0 || !tonTxHash) {
    return JSON.stringify({
      success: false,
      error: "Missing required fields: userId, amount, tonTxHash",
      code: "MISSING_FIELDS"
    });
  }

  // Idempotency check - have we already processed this transaction?
  try {
    var reads = nk.storageRead([
      { collection: "processed_transactions", key: tonTxHash }
    ]);

    if (reads.length > 0) {
      logger.info("Transaction " + tonTxHash + " already processed, returning cached result");
      return JSON.stringify({
        success: true,
        alreadyProcessed: true,
        previousResult: reads[0].value
      });
    }
  } catch (e) {
    logger.warn("Could not check idempotency: " + e.message);
  }

  // Update wallet
  try {
    nk.walletUpdate(userId, { coins: amount }, {
      type: reason,
      tonTxHash: tonTxHash,
      tonAmount: tonAmount,
      timestamp: Date.now()
    }, true);

    logger.info("Added " + amount + " coins to user " + userId + " for tx " + tonTxHash);
  } catch (e) {
    logger.error("Failed to update wallet: " + e.message);
    return JSON.stringify({
      success: false,
      error: "Wallet update failed: " + e.message,
      code: "WALLET_UPDATE_FAILED"
    });
  }

  // Store processed transaction for idempotency
  var processedRecord = {
    userId: userId,
    amount: amount,
    tonTxHash: tonTxHash,
    tonAmount: tonAmount,
    reason: reason,
    processedAt: Date.now()
  };

  try {
    nk.storageWrite([{
      collection: "processed_transactions",
      key: tonTxHash,
      value: processedRecord,
      permissionRead: 0,  // Server only
      permissionWrite: 0  // Server only
    }]);
  } catch (e) {
    logger.warn("Could not store idempotency record: " + e.message);
    // Continue - wallet update succeeded
  }

  // Get updated wallet balance
  var newBalance = 0;
  try {
    var account = nk.accountGetId(userId);
    var wallet = account.wallet || {};
    newBalance = wallet.coins || 0;
  } catch (e) {
    logger.warn("Could not fetch updated balance: " + e.message);
  }

  return JSON.stringify({
    success: true,
    userId: userId,
    addedAmount: amount,
    newBalance: newBalance,
    tonTxHash: tonTxHash
  });
}

function InitModule(ctx, logger, nk, initializer) {
  logger.info("Initializing game match module...");

  initializer.registerMatch("game_match", {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLeave: matchLeave,
    matchLoop: matchLoop,
    matchTerminate: matchTerminate,
    matchSignal: matchSignal
  });

  initializer.registerRpc("join_game", rpcJoinGame);
  initializer.registerRpc("add_test_coins", rpcAddTestCoins);
  initializer.registerRpc("get_config", rpcGetConfig);
  initializer.registerRpc("get_player_stats", rpcGetPlayerStats);
  initializer.registerRpc("get_user_profile", rpcGetUserProfile);
  initializer.registerRpc("admin_update_levels", rpcAdminUpdateLevels);

  // Match history RPCs
  initializer.registerRpc("get_match_history", rpcGetMatchHistory);
  initializer.registerRpc("cancel_match", rpcCancelMatch);
  initializer.registerRpc("sync_match_status", rpcSyncMatchStatus);

  // Wallet sync RPC - called by Node.js backend only
  initializer.registerRpc("update_user_wallet", rpcUpdateUserWallet);

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

  // Initialize game config if not exists
  var configReads = nk.storageRead([
    { collection: "config", key: "game_settings" }
  ]);

  if (configReads.length === 0) {
    var defaultConfig = {
      commissionRate: 0.10,
      waitTimeoutSec: 30,
      playTimeoutSec: 86400,
      houseEdge: 0.51,
      minBet: 0.5,
      maxBet: 100,
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
        value: defaultConfig,
        permissionRead: 2,
        permissionWrite: 0
      }
    ]);
    logger.info("Created default game config");
  }

  // Initialize mahjong levels if not exists
  var levelsReads = nk.storageRead([
    { collection: "levels", key: "mahjong" }
  ]);

  if (levelsReads.length === 0) {
    // Create sample levels structure (in production, load from file or admin API)
    var sampleLevels = generateSampleMahjongLevels();

    nk.storageWrite([
      {
        collection: "levels",
        key: "mahjong",
        value: { levels: sampleLevels },
        permissionRead: 2,
        permissionWrite: 0
      }
    ]);
    logger.info("Created " + sampleLevels.length + " mahjong levels");
  }

  // Initialize mahjong-dash levels (new format with levelJson + timeLimit)
  var mahjongDashLevelsReads = nk.storageRead([
    { collection: "levels", key: "mahjong-dash" }
  ]);

  if (mahjongDashLevelsReads.length === 0) {
    nk.storageWrite([
      {
        collection: "levels",
        key: "mahjong-dash",
        value: {
          levels: [
            {
              id: 1,
              name: "Level 1",
              tier: "beginner",
              tiles: [],
              totalPairs: 6,
              timeBonus: 300,
              timeLimit: 300,
              levelJson: '{"Layers":[{"Index":0,"Stones":[{"X":9,"Y":10},{"X":11,"Y":10},{"X":13,"Y":10},{"X":9,"Y":12},{"X":11,"Y":12},{"X":13,"Y":12}]}]}',
              metadata: { difficulty: 1, theme: "classic", createdAt: Date.now() }
            },
            {
              id: 2,
              name: "Level 2",
              tier: "intermediate",
              tiles: [],
              totalPairs: 16,
              timeBonus: 300,
              timeLimit: 300,
              levelJson: '{"Layers":[{"Index":0,"Stones":[{"X":5,"Y":2},{"X":17,"Y":2},{"X":9,"Y":3},{"X":11,"Y":4},{"X":11,"Y":6},{"X":7,"Y":7},{"X":9,"Y":7},{"X":17,"Y":7},{"X":5,"Y":8},{"X":13,"Y":8},{"X":15,"Y":8},{"X":11,"Y":9},{"X":11,"Y":11},{"X":5,"Y":12},{"X":13,"Y":12},{"X":17,"Y":12}]},{"Index":1,"Stones":[{"X":5,"Y":2},{"X":17,"Y":2},{"X":9,"Y":3},{"X":11,"Y":4},{"X":11,"Y":6},{"X":7,"Y":7},{"X":9,"Y":7},{"X":17,"Y":7},{"X":5,"Y":8},{"X":13,"Y":8},{"X":15,"Y":8},{"X":11,"Y":9},{"X":11,"Y":11},{"X":5,"Y":12},{"X":13,"Y":12},{"X":17,"Y":12}]},{"Index":2,"Stones":[{"X":9,"Y":3},{"X":11,"Y":4},{"X":11,"Y":6},{"X":7,"Y":7},{"X":9,"Y":7},{"X":17,"Y":7},{"X":5,"Y":8},{"X":13,"Y":8},{"X":15,"Y":8},{"X":11,"Y":9},{"X":11,"Y":11},{"X":13,"Y":12}]},{"Index":3,"Stones":[{"X":11,"Y":4},{"X":11,"Y":6},{"X":7,"Y":7},{"X":9,"Y":7},{"X":13,"Y":8},{"X":15,"Y":8},{"X":11,"Y":9},{"X":11,"Y":11}]},{"Index":4,"Stones":[{"X":11,"Y":6},{"X":9,"Y":7},{"X":13,"Y":8},{"X":11,"Y":9}]}]}',
              metadata: { difficulty: 2, theme: "classic", createdAt: Date.now() }
            }
          ]
        },
        permissionRead: 2,
        permissionWrite: 0
      }
    ]);
    logger.info("Created 2 mahjong-dash levels with levelJson format");
  }

  logger.info("Game match module initialized!");
}

function rpcAddTestCoins(ctx, logger, nk, payload) {
  var data = JSON.parse(payload || '{"amount": 1000}');
  var amount = data.amount || 1000;
  var userId = ctx.userId;

  nk.walletUpdate(userId, { coins: amount }, {}, true);
  logger.info("Added " + amount + " test coins to " + userId);

  return JSON.stringify({ success: true, added: amount });
}

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

function rpcGetUserProfile(ctx, logger, nk, payload) {
  var userId = ctx.userId;
  logger.info("get_user_profile called by " + userId);

  // Get user account info
  var account;
  try {
    var accounts = nk.accountsGetId([userId]);
    if (accounts && accounts.length > 0) {
      account = accounts[0];
    }
  } catch (e) {
    logger.error("Failed to get account: " + e.message);
  }

  // Get aggregated stats across all games
  // Read all player_stats entries for this user
  var totalGamesPlayed = 0;
  var totalWins = 0;
  var totalAmountWon = 0;
  var gameStats = {};

  try {
    // List all storage objects in player_stats collection for this user
    var result = nk.storageList(userId, "player_stats", 100, "");

    if (result && result.objects) {
      for (var i = 0; i < result.objects.length; i++) {
        var obj = result.objects[i];
        var stats = obj.value;
        var gameId = obj.key;

        // Aggregate totals
        totalGamesPlayed += stats.gamesPlayed || 0;
        totalWins += stats.wins || 0;
        totalAmountWon += stats.totalAmountWon || 0;

        // Store per-game stats
        gameStats[gameId] = {
          gamesPlayed: stats.gamesPlayed || 0,
          wins: stats.wins || 0,
          losses: stats.losses || 0,
          highScore: stats.highScore || 0,
          averageScore: stats.averageScore || 0,
          totalAmountWon: stats.totalAmountWon || 0
        };
      }
    }

    logger.info("Found stats for " + Object.keys(gameStats).length + " games, total: " + totalGamesPlayed + " played, " + totalWins + " wins, " + totalAmountWon + " amount won");
  } catch (e) {
    logger.error("Failed to get player stats: " + e.message);
  }

  var profile = {
    odredacted: userId,
    username: account ? account.user.username : null,
    displayName: account ? account.user.displayName : null,
    avatarUrl: account ? account.user.avatarUrl : null,
    createTime: account ? account.user.createTime : null,
    stats: {
      gamesPlayed: totalGamesPlayed,
      wins: totalWins,
      totalAmountWon: totalAmountWon
    },
    gameStats: gameStats
  };

  return JSON.stringify(profile);
}

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

  // Store as system-owned (no userId = system owned)
  nk.storageWrite([
    {
      collection: "levels",
      key: gameId,
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

// ===== Match History RPCs =====

function rpcGetMatchHistory(ctx, logger, nk, payload) {
  var data = {};
  try {
    if (payload && payload !== "" && payload !== "null") {
      data = JSON.parse(payload);
    }
  } catch (e) {
    // Use defaults
  }

  var limit = data.limit || 50;
  var cursor = data.cursor || "";
  var userId = ctx.userId;

  logger.info("get_match_history called by " + userId + ", limit: " + limit);

  try {
    var result = nk.storageList(userId, "match_history", limit, cursor);

    var history = [];
    for (var i = 0; i < result.objects.length; i++) {
      history.push(result.objects[i].value);
    }

    // Sort by updatedAt descending (newest first)
    history.sort(function(a, b) {
      return b.updatedAt - a.updatedAt;
    });

    logger.info("Returning " + history.length + " match history entries for " + userId);

    return JSON.stringify({
      history: history,
      cursor: result.cursor || ""
    });
  } catch (e) {
    logger.error("get_match_history error: " + e.message);
    return JSON.stringify({
      history: [],
      cursor: "",
      error: e.message
    });
  }
}

function rpcCancelMatch(ctx, logger, nk, payload) {
  var data;
  try {
    data = JSON.parse(payload);
  } catch (e) {
    return JSON.stringify({ success: false, error: "Invalid payload" });
  }

  var matchId = data.matchId;
  var userId = ctx.userId;

  if (!matchId) {
    return JSON.stringify({ success: false, error: "Missing matchId" });
  }

  logger.info("cancel_match called by " + userId + " for match " + matchId);

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
      error: "Can only cancel matches in waiting status",
      currentStatus: entry.status
    });
  }

  // Refund bet
  nk.walletUpdate(userId, { coins: entry.betAmount }, {
    type: "bet_refund",
    matchId: matchId,
    reason: "user_cancelled",
    timestamp: Date.now()
  }, true);

  // Update status to cancelled
  updateMatchHistoryCancelled(nk, logger, matchId, userId);

  // Signal match to terminate
  try {
    nk.matchSignal(matchId, JSON.stringify({ action: "cancel", userId: userId }));
  } catch (e) {
    // Match might already be gone
    logger.warn("Could not signal match " + matchId + ": " + e.message);
  }

  logger.info("Match " + matchId + " cancelled by user " + userId + ", refunded " + entry.betAmount);

  return JSON.stringify({
    success: true,
    refundAmount: entry.betAmount
  });
}

function rpcSyncMatchStatus(ctx, logger, nk, payload) {
  var data;
  try {
    data = JSON.parse(payload);
  } catch (e) {
    return JSON.stringify({ status: "unknown", canReconnect: false, entry: null, error: "Invalid payload" });
  }

  var matchId = data.matchId;
  var userId = ctx.userId;

  if (!matchId) {
    return JSON.stringify({ status: "unknown", canReconnect: false, entry: null, error: "Missing matchId" });
  }

  logger.info("sync_match_status called by " + userId + " for match " + matchId);

  // Read current match history entry
  var reads = nk.storageRead([
    { collection: "match_history", key: matchId, userId: userId }
  ]);

  if (reads.length === 0) {
    return JSON.stringify({ status: "unknown", canReconnect: false, entry: null, error: "Match not found" });
  }

  var entry = reads[0].value;

  // Determine if user can reconnect to this match
  // Can reconnect if status is "ready" or "playing"
  var canReconnect = entry.status === "ready" || entry.status === "playing";

  // Also check if the match still exists in Nakama
  if (canReconnect) {
    try {
      // List all matches and check if ours exists
      var matches = nk.matchList(100, true, null, null, null, null);
      var matchExists = false;
      for (var i = 0; i < matches.length; i++) {
        if (matches[i].matchId === matchId) {
          matchExists = true;
          break;
        }
      }

      if (!matchExists) {
        logger.info("Match " + matchId + " no longer exists in Nakama");
        canReconnect = false;

        // Only update to cancelled if match wasn't already completed/cancelled
        // This prevents overwriting a valid result (e.g., House win after grace period)
        if (entry.status !== "completed" && entry.status !== "cancelled" && entry.status !== "submitted") {
          logger.info("Updating match history to cancelled (was: " + entry.status + ")");
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
        } else {
          logger.info("Match history status already terminal: " + entry.status + " - not overwriting");
        }
      }
    } catch (e) {
      logger.warn("Could not check match existence: " + e.message);
      // On error, be safe and don't allow reconnect
      canReconnect = false;
    }
  }

  logger.info("sync_match_status for " + matchId + ": status=" + entry.status + ", canReconnect=" + canReconnect);

  return JSON.stringify({
    status: entry.status,
    canReconnect: canReconnect,
    entry: entry
  });
}

// ===== End Match History RPCs =====

//function rpcJoinGame(ctx, logger, nk, payload) {
//  var data = JSON.parse(payload);
function rpcJoinGame(ctx, logger, nk, payload) {
    logger.info("join_game raw payload: " + JSON.stringify(payload));
    logger.info("payload type: " + typeof payload);

    var data;
    try {
      if (!payload || payload === "" || payload === "null") {
        throw new Error("Empty payload");
      }

      // Handle potentially double-encoded JSON
      var parsed = payload;

      // First parse if it's a string
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }

      // If still a string, parse again (double-encoded case)
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }

      data = parsed;
    } catch (e) {
      logger.error("Parse error: " + e.message + ", payload was: " + payload);
      return JSON.stringify({ error: "Invalid payload format. Expected JSON with gameId and betAmount", code: "INVALID_PAYLOAD" });
    }
  var gameId = data.gameId;
  var betAmount = data.betAmount;
  var userId = ctx.userId;
logger.info("gameId type: " + typeof gameId + ", value: " + gameId);
  logger.info("betAmount type: " + typeof betAmount + ", value: " + betAmount);
  logger.info("userId type: " + typeof userId + ", value: " + userId);

betAmount = parseInt(betAmount);

  logger.info("Player " + userId + " joining game " + gameId + " with bet " + betAmount);


  var account = nk.accountGetId(userId);
  logger.info("Account wallet raw: " + JSON.stringify(account.wallet));
  logger.info("Account wallet type: " + typeof account.wallet);

  // account.wallet is already an object in Nakama, not a JSON string
  var wallet;
  if (!account.wallet) {
    logger.info("Wallet is null/undefined, using empty object");
    wallet = {};
  } else if (typeof account.wallet === 'string') {
    logger.info("Wallet is a string, parsing...");
    try {
      wallet = JSON.parse(account.wallet);
    } catch (e) {
      logger.error("Failed to parse wallet string: " + e.message);
      wallet = {};
    }
  } else {
    logger.info("Wallet is already an object");
    wallet = account.wallet;
  }

  logger.info("Final wallet: " + JSON.stringify(wallet));
  logger.info("Wallet coins: " + wallet.coins);

  if ((wallet.coins || 0) < betAmount) {
    return JSON.stringify({
      error: "Insufficient balance",
      code: "INSUFFICIENT_BALANCE",
      required: betAmount,
      available: wallet.coins || 0
    });
  }

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

logger.info("About to deduct " + betAmount + " coins from wallet");
  nk.walletUpdate(userId, { coins: -betAmount }, {
    type: "bet_placed",
    gameId: gameId,
    betAmount: betAmount,
    timestamp: Date.now()
  }, true);
logger.info("Wallet update completed successfully");
  logger.info("Deducted " + betAmount + " coins from " + userId);

  var query = "label.gameId:" + gameId + " label.betAmount:" + betAmount + " label.status:waiting";
logger.info("About to call matchList with query: " + query);
  // minSize=0, maxSize=1 means find matches with 0-1 players (has room for 1 more)
  var matches = nk.matchList(10, true, null, 0, 1, query);
logger.info("matchList returned: " + JSON.stringify(matches));

if (matches.length > 0) {
    var matchId = matches[0].matchId;
    logger.info("Found existing match with room: " + matchId);

    // Create match history entry for joining player
    // matchType and levelId will be updated when match becomes ready
    writeMatchHistoryEntry(nk, logger, userId, matchId, gameId, betAmount, "PVP", null);

    return JSON.stringify({ matchId: matchId, action: "join" });
  }

  var matchId = nk.matchCreate("game_match", {
    gameId: gameId,
    betAmount: betAmount,
    creatorId: userId,
    createdAt: Date.now()
  });

  // Create match history entry for match creator
  // matchType and levelId will be updated when match becomes ready
  writeMatchHistoryEntry(nk, logger, userId, matchId, gameId, betAmount, "PVP", null);

  logger.info("Created new match: " + matchId);
  return JSON.stringify({ matchId: matchId, action: "created" });
}

function matchInit(ctx, logger, nk, params) {
  logger.info("Match init: gameId=" + params.gameId + ", bet=" + params.betAmount);

  var config = getConfig(nk);

  // Select a level for the creator based on their skill
  var selectedLevel = selectLevelForPlayer(nk, logger, params.creatorId, params.gameId, config);

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
    allPlayersDisconnectedAt: null, // Timestamp when all players disconnected (for grace period)
    config: {
      commissionRate: config.commissionRate,
      playTimeoutSec: config.playTimeoutSec,
      disconnectGraceSec: DEFAULT_DISCONNECT_GRACE_SEC
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

function matchJoinAttempt(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
  // Allow reconnection if player is already in the match
  if (state.players[presence.userId]) {
    logger.info("Player " + presence.username + " reconnecting to match");
    return { state: state, accept: true };
  }

  var playerCount = Object.keys(state.players).length;

  if (playerCount >= 2) {
    logger.warn("Match is full, rejecting " + presence.username + " (players: " + playerCount + ")");
    return { state: state, accept: false, rejectMessage: "Match is full" };
  }

  if (state.status !== "waiting" && state.status !== "ready") {
    return { state: state, accept: false, rejectMessage: "Match already started" };
  }

  logger.info("Player " + presence.username + " attempting to join");
  return { state: state, accept: true };
}

function matchJoin(ctx, logger, nk, dispatcher, tick, state, presences) {
  for (var i = 0; i < presences.length; i++) {
    var presence = presences[i];

    // Check if this is a reconnection
    if (state.players[presence.userId]) {
      // Player reconnecting - update session and clear disconnected flag
      state.players[presence.userId].sessionId = presence.sessionId;
      state.players[presence.userId].disconnected = false;
      state.players[presence.userId].disconnectedAt = null;
      logger.info("Player " + presence.username + " reconnected to match");

      // Clear the all-players-disconnected timer since someone reconnected
      if (state.allPlayersDisconnectedAt) {
        logger.info("Clearing disconnect grace period - player reconnected");
        state.allPlayersDisconnectedAt = null;
      }
    } else {
      // New player joining
      state.players[presence.userId] = {
        userId: presence.userId,
        sessionId: presence.sessionId,
        username: presence.username,
        isHouse: false,
        disconnected: false,
        disconnectedAt: null
      };
      logger.info("Player " + presence.username + " joined match");
    }
  }

  var playerCount = Object.keys(state.players).length;

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
        levelJson: state.level.levelJson || null,
        timeLimit: state.level.timeLimit || state.level.timeBonus,
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

    // Update match history for both players with opponent info
    // Skip house player - it doesn't have a real userId for storage operations
    var playerIds = Object.keys(state.players);
    for (var p = 0; p < playerIds.length; p++) {
      var odredacted = playerIds[p];
      var playerInfo = state.players[odredacted];

      // Skip house player - "house" is not a valid Nakama userId
      if (playerInfo.isHouse) {
        continue;
      }

      var opponentId = playerIds[p === 0 ? 1 : 0];
      var opponentInfo = state.players[opponentId];

      // Update history entry with opponent info, status=ready, and levelId
      var reads = nk.storageRead([
        { collection: "match_history", key: ctx.matchId, userId: odredacted }
      ]);

      if (reads.length > 0) {
        var entry = reads[0].value;
        entry.status = "playing";  // ready -> playing since game starts immediately
        entry.updatedAt = Date.now();
        entry.opponentId = opponentId;
        entry.opponentName = opponentInfo.username;
        entry.levelId = state.level ? state.level.id : null;
        entry.matchType = "PVP";

        nk.storageWrite([{
          collection: "match_history",
          key: ctx.matchId,
          userId: odredacted,
          value: entry,
          permissionRead: 1,
          permissionWrite: 0
        }]);
        logger.info("Updated match history for player " + odredacted + " vs " + opponentInfo.username);
      }
    }

    logger.info("Match ready! PVP mode, level " + (state.level ? state.level.id : "none"));
  }

  return { state: state };
}

function matchLoop(ctx, logger, nk, dispatcher, tick, state, messages) {
  var now = Date.now();

  // Check if disconnect grace period has expired
  if (state.allPlayersDisconnectedAt) {
    // Use different grace periods for PVH vs PVP
    var gracePeriodSec;
    var matchType;
    if (state.housePlayer) {
      gracePeriodSec = DEFAULT_PVH_GRACE_SEC;
      matchType = "PVH";
    } else {
      gracePeriodSec = state.config.disconnectGraceSec || DEFAULT_DISCONNECT_GRACE_SEC;
      matchType = "PVP";
    }

    var gracePeriodMs = gracePeriodSec * 1000;
    var timeElapsed = now - state.allPlayersDisconnectedAt;

    if (timeElapsed >= gracePeriodMs) {
      // Grace period expired - handle based on match type
      logger.info(matchType + " disconnect grace period expired (" + Math.floor(timeElapsed / 1000) + "s)");

      if (state.housePlayer) {
        // PVH: House wins - player forfeits
        logger.info("=== PVH FORFEIT: House wins by player disconnect ===");
        logger.info("Match ID: " + ctx.matchId);
        logger.info("Bet amount: " + state.betAmount);

        // Assign score 0 to the real player (House will win)
        for (var odredacted in state.players) {
          var player = state.players[odredacted];
          if (!player.isHouse && !state.results[odredacted]) {
            state.results[odredacted] = { score: 0, timeMs: 999999999 };
            logger.info("Player " + odredacted + " (" + player.username + ") forfeited - assigned score 0");
          }
        }

        // Resolve match (House will generate winning score)
        state.status = "completed";
        logger.info("Calling resolveMatch for PVH forfeit...");
        resolveMatch(ctx, nk, logger, dispatcher, state);
        logger.info("=== PVH FORFEIT COMPLETE ===");
        return null;
      } else {
        // PVP: Cancel and refund all players
        logger.info("PVP match: Cancelling and refunding all players");

        for (var odredacted in state.players) {
          var player = state.players[odredacted];
          if (!player.isHouse) {
            // Refund bet
            nk.walletUpdate(odredacted, { coins: state.betAmount }, {
              type: "bet_refund",
              gameId: state.gameId,
              betAmount: state.betAmount,
              reason: "disconnect_grace_period_expired",
              matchId: ctx.matchId,
              timestamp: Date.now()
            }, true);
            logger.info("Refunded " + state.betAmount + " coins to " + odredacted);

            // Update match history to cancelled
            updateMatchHistoryCancelled(nk, logger, ctx.matchId, odredacted);
          }
        }

        // Broadcast cancellation
        dispatcher.broadcastMessage(3, JSON.stringify({
          type: "match_cancelled",
          reason: "disconnect_grace_period_expired",
          refunded: true
        }), null, null, true);

        return null; // Terminate match
      }
    } else {
      // Log progress every 10 seconds
      if (tick % 10 === 0) {
        var remaining = Math.ceil((gracePeriodMs - timeElapsed) / 1000);
        logger.info(matchType + " disconnect grace period: " + remaining + "s remaining for reconnection");
      }
    }
  }

  if (state.status === "waiting" && now > state.deadline) {
    logger.info("Timeout waiting for opponent, adding house player");

    state.housePlayer = true;
    state.players["house"] = {
      userId: "house",
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
        levelJson: state.level.levelJson || null,
        timeLimit: state.level.timeLimit || state.level.timeBonus,
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

    // Update match history for the real player with PVH info
    for (var odredacted in state.players) {
      var player = state.players[odredacted];
      if (!player.isHouse) {
        var reads = nk.storageRead([
          { collection: "match_history", key: ctx.matchId, userId: odredacted }
        ]);

        if (reads.length > 0) {
          var entry = reads[0].value;
          entry.status = "playing";
          entry.updatedAt = Date.now();
          entry.opponentId = "house";
          entry.opponentName = "House";
          entry.levelId = state.level ? state.level.id : null;
          entry.matchType = "PVH";

          nk.storageWrite([{
            collection: "match_history",
            key: ctx.matchId,
            userId: odredacted,
            value: entry,
            permissionRead: 1,
            permissionWrite: 0
          }]);
          logger.info("Updated match history for player " + odredacted + " vs House (PVH)");
        }
      }
    }

    logger.info("Match ready! PVH mode, level " + (state.level ? state.level.id : "none"));
  }

  if (state.status === "ready" && now > state.deadline) {
    logger.info("Play timeout, forfeiting match");

    for (var userId in state.players) {
      var player = state.players[userId];
      if (!player.isHouse && !state.results[userId]) {
        state.results[userId] = { score: 0, timeMs: 999999999 };
      }
    }

    resolveMatch(ctx, nk, logger, dispatcher, state);
    return null;
  }

  for (var i = 0; i < messages.length; i++) {
    var message = messages[i];
    if (message.opCode === 2) {
      var data = JSON.parse(nk.binaryToString(message.data));

      logger.info("=== SCORE SUBMISSION RECEIVED ===");
      logger.info("Match ID: " + ctx.matchId);
      logger.info("Match Status: " + state.status);
      logger.info("Player: " + message.sender.username + " (" + message.sender.userId + ")");
      logger.info("Score: " + data.score + ", Time: " + data.timeMs + "ms");
      logger.info("Existing results count: " + Object.keys(state.results).length);

      // Log FULL player state BEFORE processing
      logger.info("=== PLAYER STATE AT SUBMISSION TIME ===");
      for (var debugId in state.players) {
        var debugPlayer = state.players[debugId];
        logger.info("Player " + debugId + ": username=" + debugPlayer.username +
                   ", isHouse=" + debugPlayer.isHouse +
                   ", disconnected=" + debugPlayer.disconnected +
                   ", disconnectedAt=" + debugPlayer.disconnectedAt);
      }
      logger.info("=========================================");

      state.results[message.sender.userId] = {
        score: data.score,
        timeMs: data.timeMs
      };

      // Update match history with submitted score
      updateMatchHistoryScore(nk, logger, ctx.matchId, message.sender.userId, data.score);

      // Log all players and their submission status
      var playerList = [];
      for (var odredacted in state.players) {
        var p = state.players[odredacted];
        var hasResult = state.results[odredacted] ? "SUBMITTED" : "PENDING";
        playerList.push(p.username + "(" + (p.isHouse ? "house" : "player") + "): " + hasResult);
      }
      logger.info("Players status: " + playerList.join(", "));
      logger.info("Total results: " + Object.keys(state.results).length + "/" + Object.keys(state.players).length);

      // Check if we can resolve the match
      // Either all players submitted, or all non-submitters are disconnected
      var canResolve = true;
      var hasDisconnectedWithoutScore = false;

      logger.info("=== CHECKING IF MATCH CAN RESOLVE ===");
      for (var odredacted in state.players) {
        var player = state.players[odredacted];
        logger.info("Player " + odredacted + ": isHouse=" + player.isHouse +
                   ", hasResult=" + !!state.results[odredacted] +
                   ", disconnected=" + player.disconnected);

        if (!player.isHouse && !state.results[odredacted]) {
          // Player hasn't submitted
          if (player.disconnected) {
            hasDisconnectedWithoutScore = true;
            logger.info("Player " + odredacted + " is disconnected without score - will forfeit");
          } else {
            // Player is still connected but hasn't submitted - can't resolve yet
            logger.info("Player " + odredacted + " is CONNECTED but hasn't submitted - waiting...");
            canResolve = false;
            break;
          }
        }
      }
      logger.info("canResolve=" + canResolve + ", hasDisconnectedWithoutScore=" + hasDisconnectedWithoutScore);

      if (canResolve) {
        // Assign score 0 to all disconnected players who haven't submitted
        if (hasDisconnectedWithoutScore) {
          for (var odredacted in state.players) {
            var player = state.players[odredacted];
            if (!player.isHouse && !state.results[odredacted] && player.disconnected) {
              state.results[odredacted] = { score: 0, timeMs: 999999999 };
              logger.info("Assigned forfeit score (0) to disconnected player " + odredacted);
            }
          }
        }

        logger.info("All players submitted or forfeited - resolving match!");
        state.status = "completed";
        resolveMatch(ctx, nk, logger, dispatcher, state);
        return null;
      } else {
        logger.info("Waiting for other players to submit...");
      }
      logger.info("========================");
    }
  }

  return { state: state };
}

function matchLeave(ctx, logger, nk, dispatcher, tick, state, presences) {
  logger.info("=== MATCH LEAVE CALLED ===");
  logger.info("Match ID: " + ctx.matchId + ", Status: " + state.status);
  logger.info("Presences leaving: " + presences.length);

  for (var i = 0; i < presences.length; i++) {
    var presence = presences[i];
    logger.info("Player leaving: " + presence.username + " (" + presence.userId + ")");
    logger.info("Current match status: " + state.status);
    logger.info("Player exists in state.players: " + !!state.players[presence.userId]);

    if (state.status === "waiting") {
      // Refund if still waiting for opponent
      nk.walletUpdate(presence.userId, { coins: state.betAmount }, {
        type: "bet_refund",
        gameId: state.gameId,
        betAmount: state.betAmount,
        reason: "player_left_waiting",
        timestamp: Date.now()
      }, true);
      logger.info("Refunded " + state.betAmount + " coins to " + presence.userId);

      // Update match history to cancelled
      updateMatchHistoryCancelled(nk, logger, ctx.matchId, presence.userId);

      delete state.players[presence.userId];
    } else if (state.status === "ready" || state.status === "playing") {
      // Mark player as disconnected but don't remove (allow reconnection)
      if (state.players[presence.userId]) {
        logger.info("BEFORE: Player " + presence.userId + " disconnected flag = " + state.players[presence.userId].disconnected);
        state.players[presence.userId].disconnected = true;
        state.players[presence.userId].disconnectedAt = Date.now();
        logger.info("AFTER: Player " + presence.userId + " disconnected flag = " + state.players[presence.userId].disconnected);
        logger.info("Player " + presence.username + " MARKED AS DISCONNECTED");
      } else {
        logger.warn("Player " + presence.userId + " NOT FOUND in state.players - cannot mark as disconnected!");
      }
    } else {
      logger.info("Status is '" + state.status + "' - not handling leave specially");
    }
  }

  // Log current state of all players
  logger.info("=== PLAYER STATE AFTER LEAVE ===");
  for (var odredacted in state.players) {
    var p = state.players[odredacted];
    logger.info("Player " + odredacted + ": disconnected=" + p.disconnected + ", isHouse=" + p.isHouse);
  }
  logger.info("==============================");

  // Count connected real players
  var connectedPlayerCount = 0;
  var realPlayerCount = 0;
  for (var odredacted in state.players) {
    var player = state.players[odredacted];
    if (!player.isHouse) {
      realPlayerCount++;
      if (!player.disconnected) {
        connectedPlayerCount++;
      }
    }
  }

  logger.info("Match player count - real: " + realPlayerCount + ", connected: " + connectedPlayerCount);

  // If no real players at all, terminate
  if (realPlayerCount === 0) {
    logger.info("No real players left, terminating match");
    return null;
  }

  // If all real players disconnected during an active match
  if (connectedPlayerCount === 0 && (state.status === "ready" || state.status === "playing")) {
    logger.info("All players disconnected during active match");

    // Check if anyone submitted a score
    var anyoneSubmitted = false;
    for (var odredacted in state.players) {
      var player = state.players[odredacted];
      if (!player.isHouse && state.results[odredacted]) {
        anyoneSubmitted = true;
        break;
      }
    }

    if (anyoneSubmitted) {
      // At least one player submitted - resolve normally (non-submitters get score 0)
      logger.info("At least one player submitted - resolving match");
      for (var odredacted in state.players) {
        var player = state.players[odredacted];
        if (!player.isHouse && !state.results[odredacted]) {
          state.results[odredacted] = { score: 0, timeMs: 999999999 };
          logger.info("Assigned forfeit score to disconnected player " + odredacted);
        }
      }
      resolveMatch(ctx, nk, logger, dispatcher, state);
      return null;
    } else {
      // Nobody submitted yet - start grace period for reconnection
      // Don't cancel immediately, let matchLoop handle it after grace period expires
      if (!state.allPlayersDisconnectedAt) {
        state.allPlayersDisconnectedAt = Date.now();
        var graceSec;
        var matchType;
        if (state.housePlayer) {
          graceSec = DEFAULT_PVH_GRACE_SEC;
          matchType = "PVH";
        } else {
          graceSec = state.config.disconnectGraceSec || DEFAULT_DISCONNECT_GRACE_SEC;
          matchType = "PVP";
        }
        logger.info("Starting " + graceSec + "s " + matchType + " grace period (all players disconnected, no scores submitted)");
        if (state.housePlayer) {
          logger.info("PVH match: House will win if player doesn't reconnect within " + graceSec + "s");
        }
      }
      // Keep match alive - don't return null
      return { state: state };
    }
  }

  return { state: state };
}

function matchTerminate(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
  return { state: state };
}

function matchSignal(ctx, logger, nk, dispatcher, tick, state, data) {
  return { state: state, data: "" };
}

function checkAllResultsSubmitted(state) {
  for (var userId in state.players) {
    var player = state.players[userId];
    if (!player.isHouse && !state.results[userId]) {
      return false;
    }
  }
  return true;
}

function generateHouseScore(playerScore, houseEdge) {
  var edge = houseEdge || DEFAULT_HOUSE_EDGE;
  var houseWins = Math.random() < edge;
  if (houseWins) {
    return Math.floor(playerScore * (1 + 0.01 + Math.random() * 0.14));
  } else {
    return Math.floor(playerScore * (1 - 0.01 - Math.random() * 0.14));
  }
}

function resolveMatch(ctx, nk, logger, dispatcher, state) {
  var commissionRate = state.config.commissionRate || DEFAULT_COMMISSION_RATE;
  var pool = state.betAmount * 2;
  var commission = Math.floor(pool * commissionRate);
  var payout = pool - commission;

  var winner = null;
  var winnerId = "";
  var winnerScore = -1;

  if (state.housePlayer) {
    for (var userId in state.players) {
      var player = state.players[userId];
      if (!player.isHouse) {
        var playerResult = state.results[userId];
        if (playerResult) {
          var houseScore = generateHouseScore(playerResult.score, state.config.houseEdge);
          state.results["house"] = { score: houseScore, timeMs: 0 };
          logger.info("House score: " + houseScore + ", Player score: " + playerResult.score);
        }
        break;
      }
    }
  }

  for (var userId in state.players) {
    var result = state.results[userId];
    if (result && result.score > winnerScore) {
      winnerScore = result.score;
      winner = state.players[userId];
      winnerId = userId;
    }
  }

  // Update player stats for all real players
  for (var userId in state.players) {
    var player = state.players[userId];
    if (!player.isHouse) {
      var playerResult = state.results[userId];
      var playerScore = playerResult ? playerResult.score : 0;
      var playerWon = (userId === winnerId);
      var playerPayout = playerWon ? payout : 0;

      updatePlayerStats(nk, userId, state.gameId, playerScore, playerWon, playerPayout);
      logger.info("Updated stats for " + userId + ": score=" + playerScore + ", won=" + playerWon + ", payout=" + playerPayout);
    }
  }

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

        try {
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
            null,
            true
          );
        } catch (e) {
          logger.warn("Failed to send house loss notification: " + e.message);
        }

        logger.info("Player " + odredacted + " lost " + state.betAmount + " coins to house");
        break;
      }
    }
  }

  if (winner && !winner.isHouse) {
    nk.walletUpdate(winner.userId, { coins: payout }, {
      type: "match_won",
      gameId: state.gameId,
      matchType: state.housePlayer ? "PVH" : "PVP",
      betAmount: state.betAmount,
      payout: payout,
      opponentType: state.housePlayer ? "house" : "player",
      timestamp: Date.now()
    }, true);

    try {
      nk.notificationSend(
        winner.userId,
        "You won!",
        { payout: payout, matchType: state.housePlayer ? "PVH" : "PVP" },
        100,
        null,
        true
      );
    } catch (e) {
      logger.warn("Failed to send win notification: " + e.message);
    }

    logger.info("Paid " + payout + " coins to " + winner.userId);

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
  }

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

      try {
        nk.notificationSend(
          odredacted,
          "You lost",
          { matchType: state.housePlayer ? "PVH" : "PVP" },
          101,
          null,
          true
        );
      } catch (e) {
        logger.warn("Failed to send loss notification: " + e.message);
      }
    }
  }

  // Update match history for all real players with final results
  for (var odredacted in state.players) {
    var player = state.players[odredacted];
    if (!player.isHouse) {
      var playerWon = (odredacted === winnerId);
      var playerPayout = playerWon ? payout : null;

      // Find opponent score
      var opponentScore = null;
      if (state.housePlayer) {
        opponentScore = state.results["house"] ? state.results["house"].score : null;
      } else {
        // PVP - find the other player's score
        for (var oppId in state.players) {
          if (oppId !== odredacted && !state.players[oppId].isHouse) {
            opponentScore = state.results[oppId] ? state.results[oppId].score : null;
            break;
          }
        }
      }

      updateMatchHistoryComplete(
        nk,
        logger,
        ctx.matchId,
        odredacted,
        playerWon ? "won" : "lost",
        playerPayout,
        opponentScore
      );
    }
  }

  dispatcher.broadcastMessage(3, JSON.stringify({
    type: "match_result",
    winner: winner ? winner.username : "House",
    winnerScore: winnerScore,
    results: state.results,
    payout: (winner && !winner.isHouse) ? payout : 0
  }), null, null, true);
}
