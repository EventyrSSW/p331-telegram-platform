Game Flow & Status Documentation

  Architecture Overview

  ┌─────────────────┐     RPC/WebSocket     ┌─────────────────┐
  │  Frontend       │◄───────────────────►  │  Nakama Server  │
  │  (React/TS)     │                       │  (JavaScript)   │
  │                 │                       │                 │
  │  nakama.ts      │                       │  main.js        │
  │  NakamaContext  │                       │                 │
  └─────────────────┘                       └─────────────────┘

  ---
  Match Statuses

  | Status    | Server (main.js) | Client (nakama.ts) | Description                            |
  |-----------|------------------|--------------------|----------------------------------------|
  | waiting   | ✅               | ✅                 | Match created, waiting for opponent    |
  | ready     | ✅               | ✅                 | 2 players joined, game can start       |
  | playing   | ❌               | ✅                 | Players actively playing (client-only) |
  | completed | ✅               | ✅                 | Match finished, results calculated     |

  ---
  OpCodes (Message Types)

  | OpCode | Name          | Direction       | Payload                            |
  |--------|---------------|-----------------|------------------------------------|
  | 1      | MATCH_READY   | Server → Client | {type, matchType, game, betAmount} |
  | 2      | SCORE_SUBMIT  | Client → Server | {score, timeMs}                    |
  | 3      | MATCH_RESULT  | Server → Client | {winner, results, payout}          |
  | 4      | PLAYER_UPDATE | Bidirectional   | Player state updates               |

  ---
  Step-by-Step Flow

  1. Authentication

  ┌──────────┐                         ┌──────────┐
  │ Frontend │                         │  Nakama  │
  └────┬─────┘                         └────┬─────┘
       │                                    │
       │ authenticateCustom(telegram_id)    │
       │───────────────────────────────────►│
       │                                    │
       │ Session (JWT token)                │
       │◄───────────────────────────────────│
       │                                    │
       │ connectSocket()                    │
       │───────────────────────────────────►│
       │                                    │
       │ WebSocket connection established   │
       │◄───────────────────────────────────│

  2. Join Game Flow

  ┌──────────┐                         ┌──────────┐
  │ Frontend │                         │  Nakama  │
  └────┬─────┘                         └────┬─────┘
       │                                    │
       │ RPC: join_game(gameId, betAmount)  │
       │───────────────────────────────────►│
       │                                    │
       │     ┌──────────────────────────────┤
       │     │ 1. Check wallet balance      │
       │     │ 2. Validate bet limits       │
       │     │ 3. Deduct coins from wallet  │
       │     │ 4. Find existing match OR    │
       │     │    create new match          │
       │     └──────────────────────────────┤
       │                                    │
       │ Response: {matchId, action}        │
       │◄───────────────────────────────────│
       │                                    │
       │ socket.joinMatch(matchId)          │
       │───────────────────────────────────►│
       │                                    │
       │ Match presences                    │
       │◄───────────────────────────────────│

  3. Match Lifecycle

                      ┌─────────────┐
                      │   WAITING   │ ◄─── Match created
                      └──────┬──────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              │              ▼
      ┌───────────────┐      │      ┌───────────────┐
      │ 2nd player    │      │      │ Timeout (30s) │
      │ joins         │      │      │ → House joins │
      └───────┬───────┘      │      └───────┬───────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                             ▼
                      ┌─────────────┐
                      │    READY    │ ◄─── OpCode 1: MATCH_READY
                      │  (PVP/PVH)  │
                      └──────┬──────┘
                             │
                             │ Players play game
                             │
                             ▼
                      ┌─────────────┐
                      │   PLAYING   │ ◄─── Client-side only
                      └──────┬──────┘
                             │
                             │ All submit scores
                             │ (OpCode 2: SCORE_SUBMIT)
                             │
                             ▼
                      ┌─────────────┐
                      │  COMPLETED  │ ◄─── OpCode 3: MATCH_RESULT
                      └─────────────┘

  4. Score Submission & Resolution

  ┌──────────┐                         ┌──────────┐
  │ Frontend │                         │  Nakama  │
  └────┬─────┘                         └────┬─────┘
       │                                    │
       │ sendMatchState(SCORE_SUBMIT)       │
       │ {score: 5000, timeMs: 45000}       │
       │───────────────────────────────────►│
       │                                    │
       │     ┌──────────────────────────────┤
       │     │ matchLoop processes message: │
       │     │ 1. Store score in results    │
       │     │ 2. Check if all submitted    │
       │     │ 3. If PVH: generate house    │
       │     │    score with house edge     │
       │     │ 4. Determine winner          │
       │     │ 5. Calculate payout          │
       │     │ 6. Update wallets            │
       │     │ 7. Update leaderboard        │
       │     └──────────────────────────────┤
       │                                    │
       │ broadcastMessage(MATCH_RESULT)     │
       │◄───────────────────────────────────│

  ---
  Key Server Functions (main.js)

  rpcJoinGame (lines 437-561)

  1. Parse payload (handles double-encoding)
  2. Check wallet balance
  3. Validate bet against minBet/maxBet
  4. Deduct coins from wallet
  5. Search for existing match with same gameId + betAmount + status:waiting
  6. If found → return existing matchId
  7. If not found → create new match

  matchInit (lines 563-601)

  - Creates match state with:
    - status: "waiting"
    - deadline: now + 30 seconds
    - Selected level for creator
    - Commission rate config

  matchJoin (lines 626-682)

  - Add player to state.players
  - If 2 players → change status: "ready"
  - Broadcast MATCH_READY (OpCode 1)

  matchLoop (lines 684-783)

  - Timeout handling:
    - If waiting + deadline passed → add house player
    - If ready + deadline passed → forfeit match
  - Score processing:
    - OpCode 2 → store in state.results
    - If all submitted → call resolveMatch()

  resolveMatch (lines 846-1011)

  1. Calculate commission (10% default)
  2. For PVH: generate house score with houseEdge (51% win rate)
  3. Determine winner by highest score
  4. Update player stats
  5. Pay winner (pool - commission)
  6. Update leaderboard
  7. Broadcast MATCH_RESULT (OpCode 3)

  ---
  Configuration Values

  | Setting        | Default    | Description                  |
  |----------------|------------|------------------------------|
  | commissionRate | 0.10 (10%) | Platform fee on winnings     |
  | waitTimeoutSec | 30         | Time to wait for opponent    |
  | playTimeoutSec | 86400      | Max game duration (24h)      |
  | houseEdge      | 0.51 (51%) | House win probability in PVH |
  | minBet         | 50         | Minimum bet (cents)          |
  | maxBet         | 10000      | Maximum bet (cents)          |

  ---
  Match Types

  PVP (Player vs Player)

  - 2 real players
  - Both submit scores
  - Higher score wins pool (minus commission)

  PVH (Player vs House)

  - 1 real player + virtual "house" opponent
  - Triggered after 30s timeout
  - House score generated with 51% edge
  - Player wins → gets payout
  - House wins → player loses bet

  ---
  Client Callbacks

  interface MatchCallbacks {
    onMatchReady?: (data: MatchState) => void;    // OpCode 1
    onMatchResult?: (data: MatchState) => void;   // OpCode 3
    onOpponentScore?: (userId, score) => void;    // Future use
    onError?: (error: string) => void;            // Errors
    onPresenceChange?: (presences) => void;       // Join/leave
  }

  ---
  Wallet Transaction Types

  | Type                | Description                             |
  |---------------------|-----------------------------------------|
  | bet_placed          | Coins deducted when joining game        |
  | bet_refund          | Coins returned if leaving while waiting |
  | match_won           | Payout credited to winner               |
  | match_lost          | Record of loss (0 coins, metadata only) |
  | match_lost_to_house | Lost to house in PVH                    |
