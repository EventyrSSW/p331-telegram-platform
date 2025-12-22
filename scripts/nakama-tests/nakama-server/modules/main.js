// Nakama Server Runtime Module

var WAIT_TIMEOUT_SEC = 30;
var PLAY_TIMEOUT_SEC = 86400;

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
      throw new Error("Invalid payload format. Expected JSON with gameId and betAmount");
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
    throw new Error("Insufficient balance");
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
 var matches = nk.matchList(10, true, null, null, null, query);
logger.info("matchList returned: " + JSON.stringify(matches));
  
if (matches.length > 0) {
    var matchId = matches[0].matchId;
    logger.info("Found existing match: " + matchId);
    return JSON.stringify({ matchId: matchId, action: "join" });
  }

  var matchId = nk.matchCreate("game_match", {
    gameId: gameId,
    betAmount: betAmount,
    creatorId: userId,
    createdAt: Date.now()
  });

  logger.info("Created new match: " + matchId);
  return JSON.stringify({ matchId: matchId, action: "created" });
}

function matchInit(ctx, logger, nk, params) {
  logger.info("Match init: gameId=" + params.gameId + ", bet=" + params.betAmount);

  var state = {
    gameId: params.gameId,
    betAmount: params.betAmount,
    status: "waiting",
    players: {},
    housePlayer: false,
    creatorId: params.creatorId,
    createdAt: Date.now(),
    deadline: Date.now() + (WAIT_TIMEOUT_SEC * 1000),
    results: {}
  };

  var label = JSON.stringify({
    gameId: params.gameId,
    betAmount: params.betAmount,
    status: "waiting"
  });

  return {
    state: state,
    tickRate: 1,
    label: label
  };
}

function matchJoinAttempt(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
  var playerCount = Object.keys(state.players).length;

  if (playerCount >= 2) {
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
    state.players[presence.userId] = {
      userId: presence.userId,
      sessionId: presence.sessionId,
      username: presence.username,
      isHouse: false
    };
    logger.info("Player " + presence.username + " joined match");
  }

  var playerCount = Object.keys(state.players).length;

  if (playerCount === 2) {
    state.status = "ready";
    state.deadline = Date.now() + (PLAY_TIMEOUT_SEC * 1000);

    dispatcher.matchLabelUpdate(JSON.stringify({
      gameId: state.gameId,
      betAmount: state.betAmount,
      status: "ready"
    }));

    var playerNames = [];
    for (var userId in state.players) {
      playerNames.push(state.players[userId].username);
    }

    dispatcher.broadcastMessage(1, JSON.stringify({
      type: "match_ready",
      matchType: "PVP",
      opponentName: playerNames
    }), null, null, true);

    logger.info("Match ready! PVP mode");
  }

  return { state: state };
}

function matchLoop(ctx, logger, nk, dispatcher, tick, state, messages) {
  var now = Date.now();

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
    state.deadline = now + (PLAY_TIMEOUT_SEC * 1000);

    dispatcher.matchLabelUpdate(JSON.stringify({
      gameId: state.gameId,
      betAmount: state.betAmount,
      status: "ready",
      matchType: "PVH"
    }));

    dispatcher.broadcastMessage(1, JSON.stringify({
      type: "match_ready",
      matchType: "PVH",
      message: "No opponent found, playing against house"
    }), null, null, true);
  }

  if (state.status === "ready" && now > state.deadline) {
    logger.info("Play timeout, forfeiting match");

    for (var userId in state.players) {
      var player = state.players[userId];
      if (!player.isHouse && !state.results[userId]) {
        state.results[userId] = { score: 0, timeMs: 999999999 };
      }
    }

    resolveMatch(nk, logger, dispatcher, state);
    return null;
  }

  for (var i = 0; i < messages.length; i++) {
    var message = messages[i];
    if (message.opCode === 2) {
      var data = JSON.parse(nk.binaryToString(message.data));
      state.results[message.sender.userId] = {
        score: data.score,
        timeMs: data.timeMs
      };

      logger.info("Player " + message.sender.username + " submitted score: " + data.score);

      if (checkAllResultsSubmitted(state)) {
        state.status = "completed";
        resolveMatch(nk, logger, dispatcher, state);
        return null;
      }
    }
  }

  return { state: state };
}

function matchLeave(ctx, logger, nk, dispatcher, tick, state, presences) {
  for (var i = 0; i < presences.length; i++) {
    var presence = presences[i];
    logger.info("Player " + presence.username + " left match");

    if (state.status === "waiting") {
      nk.walletUpdate(presence.userId, { coins: state.betAmount }, {
        type: "bet_refund",
        gameId: state.gameId,
        betAmount: state.betAmount,
        reason: "player_left_waiting",
        timestamp: Date.now()
      }, true);
      logger.info("Refunded " + state.betAmount + " coins to " + presence.userId);
      delete state.players[presence.userId];
    }
  }

  var realPlayerCount = 0;
  for (var userId in state.players) {
    if (!state.players[userId].isHouse) {
      realPlayerCount++;
    }
  }

  if (realPlayerCount === 0) {
    return null;
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

function generateHouseScore(playerScore) {
  var houseWins = Math.random() < 0.51;
  if (houseWins) {
    return Math.floor(playerScore * (1 + 0.01 + Math.random() * 0.14));
  } else {
    return Math.floor(playerScore * (1 - 0.01 - Math.random() * 0.14));
  }
}

function resolveMatch(nk, logger, dispatcher, state) {
  var commissionRate = 0.10;
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
          var houseScore = generateHouseScore(playerResult.score);
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
    nk.walletUpdate(winner.userId, { coins: payout }, {
      type: "match_won",
      gameId: state.gameId,
      matchType: state.housePlayer ? "PVH" : "PVP",
      betAmount: state.betAmount,
      payout: payout,
      opponentType: state.housePlayer ? "house" : "player",
      timestamp: Date.now()
    }, true);

    nk.notificationSend(
      winner.userId,
      "You won!",
      { payout: payout, matchType: state.housePlayer ? "PVH" : "PVP" },
      100,
      "",
      true
    );

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

  dispatcher.broadcastMessage(3, JSON.stringify({
    type: "match_result",
    winner: winner ? winner.username : "House",
    winnerScore: winnerScore,
    results: state.results,
    payout: (winner && !winner.isHouse) ? payout : 0
  }), null, null, true);
}
