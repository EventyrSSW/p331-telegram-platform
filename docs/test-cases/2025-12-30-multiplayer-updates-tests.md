# Multiplayer Updates — Test Cases

> **Version:** 1.0
> **Date:** 2025-12-30
> **Branch:** `multiplayer-updates`

---

## Prerequisites

- Nakama server running locally
- Frontend dev server running (`npm run dev`)
- Two browser windows/devices for PVP testing
- Access to Nakama console (http://localhost:7351)

---

## 1. Server-Side Tests

### 1.1 Play Timeout Configuration

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| S-1.1 | Verify DEFAULT_PLAY_TIMEOUT_SEC is 300 | 1. Open `nakama/modules/main.js`<br>2. Search for `DEFAULT_PLAY_TIMEOUT_SEC` | Value should be `300` (5 minutes) |
| S-1.2 | Match timeout after 5 minutes | 1. Start a match<br>2. Don't submit score<br>3. Wait 5 minutes | Match should auto-resolve with timeout |

### 1.2 Match History Storage

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| S-2.1 | History entry created on join | 1. Join a game<br>2. Check Nakama Storage for `match_history` collection | Entry exists with status `waiting` |
| S-2.2 | History entry has correct fields | 1. Join a game<br>2. Read storage entry | Entry contains: matchId, gameId, betAmount, status, createdAt, updatedAt, matchType |
| S-2.3 | History updates on opponent join | 1. Player 1 joins<br>2. Player 2 joins | Both entries updated with opponentId, opponentName, status = `ready` |
| S-2.4 | History updates on game start | 1. Match becomes ready<br>2. Check storage | Status updated to `playing` |
| S-2.5 | History updates on score submit | 1. Submit score<br>2. Check storage | Status = `submitted`, myScore populated |
| S-2.6 | History updates on match complete | 1. Both players submit<br>2. Check storage | Status = `completed`, result = `won`/`lost`, payout populated |

### 1.3 RPCs

#### 1.3.1 get_match_history RPC

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| S-3.1 | Get empty history | 1. New user calls `get_match_history` | Returns `{ history: [], cursor: "" }` |
| S-3.2 | Get history with entries | 1. Play some matches<br>2. Call `get_match_history` | Returns array of MatchHistoryEntry sorted by updatedAt desc |
| S-3.3 | Limit parameter works | 1. Have 10+ matches<br>2. Call with `{ limit: 5 }` | Returns max 5 entries |
| S-3.4 | Cursor pagination works | 1. Have 100+ matches<br>2. Call with limit 50<br>3. Call again with returned cursor | Returns next page of results |

#### 1.3.2 cancel_match RPC

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| S-3.5 | Cancel waiting match | 1. Join game (status: waiting)<br>2. Call `cancel_match` | Success, refund issued, status = `cancelled` |
| S-3.6 | Cannot cancel non-waiting match | 1. Start playing (status: playing)<br>2. Call `cancel_match` | Error: "Can only cancel matches in waiting status" |
| S-3.7 | Cancel refunds correct amount | 1. Join with 100 coins bet<br>2. Cancel match<br>3. Check wallet | Wallet increased by 100 coins |
| S-3.8 | Cancel non-existent match | 1. Call `cancel_match` with fake matchId | Error: "Match not found" |

#### 1.3.3 sync_match_status RPC

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| S-3.9 | Sync active match | 1. Have match in `playing` status<br>2. Call `sync_match_status` | Returns `{ status: "playing", canReconnect: true, entry: {...} }` |
| S-3.10 | Sync completed match | 1. Have completed match<br>2. Call `sync_match_status` | Returns `{ status: "completed", canReconnect: false, entry: {...} }` |
| S-3.11 | Sync cancelled match | 1. Have cancelled match<br>2. Call `sync_match_status` | Returns `{ status: "cancelled", canReconnect: false, entry: {...} }` |
| S-3.12 | Sync non-existent match | 1. Call with fake matchId | Returns `{ canReconnect: false, entry: null }` |

### 1.4 Level Selection (Debug Mode)

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| S-4.1 | Always returns first level | 1. Join multiple matches<br>2. Check assigned level each time | Always level ID = 1 (first level) |
| S-4.2 | Works regardless of player skill | 1. Play as new user<br>2. Play as experienced user | Both get same first level |

---

## 2. Client-Side Tests

### 2.1 Nakama Service Methods

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| C-1.1 | getMatchHistory returns data | 1. Open browser console<br>2. Call `nakamaService.getMatchHistory()` | Returns MatchHistoryResponse object |
| C-1.2 | cancelMatch works | 1. Join a game<br>2. Call `nakamaService.cancelMatch(matchId)` | Returns success with refundAmount |
| C-1.3 | syncMatchStatus works | 1. Have active match<br>2. Call `nakamaService.syncMatchStatus(matchId)` | Returns current status and canReconnect flag |
| C-1.4 | Methods throw when not authenticated | 1. Logout<br>2. Call any method | Throws "Not authenticated" error |

### 2.2 NakamaContext rejoinMatch

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| C-2.1 | rejoinMatch connects socket | 1. Disconnect socket<br>2. Call rejoinMatch | Socket reconnected automatically |
| C-2.2 | rejoinMatch joins match | 1. Leave match<br>2. Call rejoinMatch | Successfully rejoins via socket.joinMatch |
| C-2.3 | rejoinMatch populates presences | 1. Player 1 in match<br>2. Player 2 rejoins | Player 2 sees Player 1 in presences |
| C-2.4 | rejoinMatch sets correct status | 1. Call rejoinMatch | Match status set to `playing` |
| C-2.5 | rejoinMatch returns false on error | 1. Call with invalid matchId | Returns false, doesn't crash |

### 2.3 Results Page UI

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| C-3.1 | Navigate to Results page | 1. Click "Results" in bottom nav | Results page loads |
| C-3.2 | Loading state shown | 1. Navigate to Results (slow network) | "Loading match history..." displayed |
| C-3.3 | Empty state shown | 1. New user views Results | Empty state with "No match results yet" |
| C-3.4 | Error state with retry | 1. Simulate network error<br>2. View Results | Error message with "Try Again" button |
| C-3.5 | History grouped by date | 1. Have matches from multiple days<br>2. View Results | Sections: "Today", "Yesterday", "December 28", etc. |

### 2.4 Pending Section

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| C-4.1 | Waiting match shows in Pending | 1. Join game, wait for opponent<br>2. Open Results | Match appears in "Pending" section |
| C-4.2 | Playing match shows in Pending | 1. Start playing<br>2. Navigate to Results | Match appears in "Pending" with "Continue" button |
| C-4.3 | Submitted match shows in Pending | 1. Submit score<br>2. Navigate to Results | Match appears showing "Waiting for results" |
| C-4.4 | Cancel button on waiting match | 1. Join game<br>2. Open Results | "Cancel" button visible on waiting match card |
| C-4.5 | Continue button on playing match | 1. Start playing<br>2. Leave game<br>3. Open Results | "Continue" button visible |

### 2.5 Continue Button Flow

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| C-5.1 | Continue syncs before reconnect | 1. Click Continue<br>2. Monitor network | `sync_match_status` called before rejoin |
| C-5.2 | Continue navigates to game | 1. Click Continue on playing match | Navigates to `/game/{gameId}` |
| C-5.3 | Continue passes correct data | 1. Click Continue<br>2. Check navigation state | State includes: level, matchId, betAmount |
| C-5.4 | Continue shows error if match ended | 1. Match ends while on Results<br>2. Click Continue | Alert: "Match has ended", page refreshes |
| C-5.5 | Continue handles network error | 1. Disconnect network<br>2. Click Continue | Error toast, stays on Results page |

### 2.6 Cancel Button Flow

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| C-6.1 | Cancel shows confirmation | 1. Click Cancel | Confirmation dialog appears |
| C-6.2 | Cancel dismisses on "No" | 1. Click Cancel<br>2. Click "No" in dialog | Dialog closes, nothing happens |
| C-6.3 | Cancel refunds on confirm | 1. Click Cancel<br>2. Confirm | Alert shows refund amount, page refreshes |
| C-6.4 | Cancel updates history | 1. Cancel a match<br>2. Check Results | Match no longer in Pending |
| C-6.5 | Cancel handles error | 1. Match starts while clicking Cancel | Error: "Match already started" |

### 2.7 Result Cards

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| C-7.1 | Won match shows green + amount | 1. Win a match<br>2. View in Results | Card shows "+{payout}" in green |
| C-7.2 | Lost match shows red - amount | 1. Lose a match<br>2. View in Results | Card shows "-{bet}" in red |
| C-7.3 | Card shows game thumbnail | 1. View any result | Game thumbnail displayed |
| C-7.4 | Card shows opponent name | 1. Play PVP match<br>2. View result | Shows "vs {opponentName}" |
| C-7.5 | Card shows "House" for PVH | 1. Play vs House<br>2. View result | Shows "vs House" |

---

## 3. Bug Fix Verification

### 3.1 Player 2 Navigation Timing

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| B-1.1 | Player 2 navigates to game | 1. Player 1 joins<br>2. Player 2 joins | Both players navigate to game screen |
| B-1.2 | Navigation happens after "found" animation | 1. Join as Player 2<br>2. Observe modal | "Opponent Found" shows briefly, then navigates |
| B-1.3 | No duplicate navigation | 1. Join match<br>2. Check console logs | Only one navigation occurs |

### 3.2 Reconnect Data Passing

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| B-2.1 | Correct level on reconnect | 1. Start match on level 1<br>2. Leave<br>3. Reconnect from Results | Game loads level 1 |
| B-2.2 | Correct matchId on reconnect | 1. Note matchId<br>2. Leave and reconnect | Same matchId used |
| B-2.3 | Correct betAmount on reconnect | 1. Bet 100 coins<br>2. Leave and reconnect | betAmount shows 100 |

### 3.3 Presence Display After Rejoin

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| B-3.1 | Player 2 sees Player 1 online | 1. Player 1 in match<br>2. Player 2 rejoins | Player 2 sees "Player 1 - Online" |
| B-3.2 | Both players shown in presences | 1. Both players in match<br>2. Check presences | Both user IDs in presences object |
| B-3.3 | No "waiting for opponent" bug | 1. Player 1 in match<br>2. Player 2 rejoins | Player 2 does NOT see "Waiting for opponent" |

---

## 4. Integration Tests

### 4.1 Full Match Flow

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| I-1.1 | Complete PVH match flow | 1. Join game<br>2. Wait for House<br>3. Play and submit<br>4. View in Results | Match appears in history with correct result |
| I-1.2 | Complete PVP match flow | 1. Two players join<br>2. Both play and submit<br>3. Both view Results | Both see match with correct win/loss |
| I-1.3 | Cancel flow end-to-end | 1. Join game<br>2. Go to Results<br>3. Cancel<br>4. Check wallet | Refund received, match cancelled |
| I-1.4 | Reconnect flow end-to-end | 1. Start match<br>2. Close browser<br>3. Reopen app<br>4. Go to Results<br>5. Click Continue | Rejoins and can finish match |

### 4.2 Edge Cases

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| I-2.1 | Reconnect after timeout | 1. Start match<br>2. Wait 5 minutes<br>3. Try to continue | Shows "Match has ended" |
| I-2.2 | Cancel race condition | 1. Player 1 waiting<br>2. Player 2 joins same moment Player 1 cancels | Either cancel succeeds (refund) or match starts |
| I-2.3 | Network disconnect during match | 1. Playing match<br>2. Disconnect network<br>3. Reconnect<br>4. Open Results | Can continue match |
| I-2.4 | Multiple pending matches | 1. Join game A<br>2. Join game B (different game) | Both shown in Pending section |

---

## 5. Test Execution Checklist

### Before Testing
- [ ] Nakama server is running
- [ ] Frontend dev server is running
- [ ] Database is seeded with games
- [ ] Test user accounts created

### Server-Side Tests
- [ ] S-1.1, S-1.2 (Timeout)
- [ ] S-2.1 to S-2.6 (History Storage)
- [ ] S-3.1 to S-3.4 (get_match_history)
- [ ] S-3.5 to S-3.8 (cancel_match)
- [ ] S-3.9 to S-3.12 (sync_match_status)
- [ ] S-4.1, S-4.2 (Level Selection)

### Client-Side Tests
- [ ] C-1.1 to C-1.4 (Service Methods)
- [ ] C-2.1 to C-2.5 (rejoinMatch)
- [ ] C-3.1 to C-3.5 (Results Page UI)
- [ ] C-4.1 to C-4.5 (Pending Section)
- [ ] C-5.1 to C-5.5 (Continue Flow)
- [ ] C-6.1 to C-6.5 (Cancel Flow)
- [ ] C-7.1 to C-7.5 (Result Cards)

### Bug Fix Tests
- [ ] B-1.1 to B-1.3 (Navigation Timing)
- [ ] B-2.1 to B-2.3 (Reconnect Data)
- [ ] B-3.1 to B-3.3 (Presence Display)

### Integration Tests
- [ ] I-1.1 to I-1.4 (Full Flows)
- [ ] I-2.1 to I-2.4 (Edge Cases)

---

## 6. Known Limitations

1. **Debug mode active**: Level selection always returns first level
2. **No pagination UI**: Results page loads max 50 entries
3. **No real-time updates**: Must refresh to see status changes
4. **5-minute timeout**: Shorter than production may need

---

## Appendix: Quick Test Commands

```bash
# Start all services
npm run dev:local

# Check Nakama logs
docker-compose logs -f nakama

# Access Nakama console
open http://localhost:7351

# Test RPC via curl
curl -X POST http://localhost:7350/v2/rpc/get_match_history \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```
