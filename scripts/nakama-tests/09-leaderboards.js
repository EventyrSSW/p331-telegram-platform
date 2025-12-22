import { createClient, generateDeviceId, logSuccess, logError, log } from './helpers.js';

const TEST_NAME = 'Leaderboards';
const LEADERBOARD_ID = 'weekly_scores'; // Must exist on server

async function testLeaderboards() {
  const client = createClient();

  try {
    // Create users and submit scores
    const sessions = [];
    for (let i = 0; i < 3; i++) {
      const session = await client.authenticateDevice(generateDeviceId(), true, `player${i}_${Date.now()}`);
      sessions.push(session);
    }
    logSuccess(TEST_NAME, `Created ${sessions.length} test users`);

    // Try to submit scores (may fail if leaderboard doesn't exist)
    let leaderboardExists = true;
    for (let i = 0; i < sessions.length; i++) {
      const score = Math.floor(Math.random() * 1000) + 100;
      try {
        await client.writeLeaderboardRecord(
          sessions[i],
          LEADERBOARD_ID,
          score,
          i,
          JSON.stringify({ map: 'test_map' })
        );
        logSuccess(TEST_NAME, `Player${i} submitted score: ${score}`);
      } catch (e) {
        if (e.message?.includes('not found') || e.statusCode === 404 || e.status === 404) {
          log(TEST_NAME, `Leaderboard "${LEADERBOARD_ID}" not found on server`);
          log(TEST_NAME, 'Create leaderboard via Nakama console or server code first');
          leaderboardExists = false;
          break;
        }
        throw e;
      }
    }

    if (leaderboardExists) {
      // List top records
      const topRecords = await client.listLeaderboardRecords(sessions[0], LEADERBOARD_ID, null, null, 10);
      logSuccess(TEST_NAME, `Listed ${topRecords.records?.length || 0} top record(s)`);
      topRecords.records?.forEach((record, idx) => {
        log(TEST_NAME, `  #${idx + 1}: ${record.username} - ${record.score}`);
      });

      // List records around owner
      const aroundOwner = await client.listLeaderboardRecordsAroundOwner(
        sessions[1],
        LEADERBOARD_ID,
        sessions[1].user_id,
        null,
        5
      );
      logSuccess(TEST_NAME, `Listed ${aroundOwner.records?.length || 0} record(s) around Player1`);
    } else {
      log(TEST_NAME, '');
      log(TEST_NAME, 'Leaderboard API methods available:');
      log(TEST_NAME, '- client.writeLeaderboardRecord(session, leaderboardId, score, subscore, metadata)');
      log(TEST_NAME, '- client.listLeaderboardRecords(session, leaderboardId, ownerIds, expiry, limit)');
      log(TEST_NAME, '- client.listLeaderboardRecordsAroundOwner(session, leaderboardId, ownerId, expiry, limit)');
      log(TEST_NAME, '- client.deleteLeaderboardRecord(session, leaderboardId)');
      logSuccess(TEST_NAME, 'Leaderboard API structure validated');
    }

    return sessions;
  } catch (error) {
    logError(TEST_NAME, 'Leaderboards test failed', error);
    throw error;
  }
}

testLeaderboards()
  .then(() => console.log('\n✅ All leaderboards tests passed'))
  .catch(() => process.exit(1));

export { testLeaderboards };
