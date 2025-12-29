import { createClient, generateDeviceId, logSuccess, logError, log } from './helpers.js';

const TEST_NAME = 'Verify Levels';

async function verifyLevels() {
  const client = createClient();
  const deviceId = generateDeviceId();

  try {
    // Authenticate
    const session = await client.authenticateDevice(deviceId, true, `verify_${Date.now()}`);
    logSuccess(TEST_NAME, `Authenticated as: ${session.user_id}`);

    // Read levels from storage directly
    log(TEST_NAME, 'Reading levels from storage...');

    const result = await client.readStorageObjects(session, {
      object_ids: [{
        collection: 'levels',
        key: 'puzzle-master'
      }]
    });

    if (result.objects && result.objects.length > 0) {
      const levelsData = result.objects[0].value;
      logSuccess(TEST_NAME, `Found levels! Count: ${levelsData.levels?.length || 0}`);
      log(TEST_NAME, 'First 3 levels:', levelsData.levels?.slice(0, 3));
    } else {
      logError(TEST_NAME, 'No levels found in storage!');
    }

    // Also try get_player_stats to test RPC
    log(TEST_NAME, 'Testing get_player_stats RPC...');
    const statsResult = await client.rpc(session, 'get_player_stats', { gameId: 'puzzle-master' });
    log(TEST_NAME, 'Player stats:', statsResult.payload);

    return result;
  } catch (error) {
    logError(TEST_NAME, 'Failed to verify levels', error);
    throw error;
  }
}

verifyLevels()
  .then(() => console.log('\n✅ Verification complete'))
  .catch(() => process.exit(1));
