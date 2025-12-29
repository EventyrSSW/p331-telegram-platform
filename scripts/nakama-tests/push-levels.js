import { createClient, generateDeviceId, logSuccess, logError, log } from './helpers.js';

const TEST_NAME = 'Push Levels';

const PUZZLE_MASTER_LEVELS = [
  { id: 1, name: "Level 1", tier: "beginner", tiles: [], totalPairs: 36, timeBonus: 300 },
  { id: 2, name: "Level 2", tier: "beginner", tiles: [], totalPairs: 36, timeBonus: 295 },
  { id: 3, name: "Level 3", tier: "beginner", tiles: [], totalPairs: 36, timeBonus: 290 },
  { id: 4, name: "Level 4", tier: "beginner", tiles: [], totalPairs: 38, timeBonus: 285 },
  { id: 5, name: "Level 5", tier: "beginner", tiles: [], totalPairs: 38, timeBonus: 280 },
  { id: 6, name: "Level 6", tier: "novice", tiles: [], totalPairs: 40, timeBonus: 275 },
  { id: 7, name: "Level 7", tier: "novice", tiles: [], totalPairs: 40, timeBonus: 270 },
  { id: 8, name: "Level 8", tier: "novice", tiles: [], totalPairs: 42, timeBonus: 265 },
  { id: 9, name: "Level 9", tier: "novice", tiles: [], totalPairs: 42, timeBonus: 260 },
  { id: 10, name: "Level 10", tier: "novice", tiles: [], totalPairs: 44, timeBonus: 255 },
  { id: 11, name: "Level 11", tier: "intermediate", tiles: [], totalPairs: 44, timeBonus: 250 },
  { id: 12, name: "Level 12", tier: "intermediate", tiles: [], totalPairs: 46, timeBonus: 245 },
  { id: 13, name: "Level 13", tier: "intermediate", tiles: [], totalPairs: 46, timeBonus: 240 },
  { id: 14, name: "Level 14", tier: "intermediate", tiles: [], totalPairs: 48, timeBonus: 235 },
  { id: 15, name: "Level 15", tier: "intermediate", tiles: [], totalPairs: 48, timeBonus: 230 },
  { id: 16, name: "Level 16", tier: "advanced", tiles: [], totalPairs: 50, timeBonus: 225 },
  { id: 17, name: "Level 17", tier: "advanced", tiles: [], totalPairs: 50, timeBonus: 220 },
  { id: 18, name: "Level 18", tier: "advanced", tiles: [], totalPairs: 52, timeBonus: 215 },
  { id: 19, name: "Level 19", tier: "advanced", tiles: [], totalPairs: 52, timeBonus: 210 },
  { id: 20, name: "Level 20", tier: "advanced", tiles: [], totalPairs: 54, timeBonus: 205 },
  { id: 21, name: "Level 21", tier: "expert", tiles: [], totalPairs: 54, timeBonus: 200 },
  { id: 22, name: "Level 22", tier: "expert", tiles: [], totalPairs: 56, timeBonus: 195 },
  { id: 23, name: "Level 23", tier: "expert", tiles: [], totalPairs: 56, timeBonus: 190 },
  { id: 24, name: "Level 24", tier: "expert", tiles: [], totalPairs: 58, timeBonus: 185 },
  { id: 25, name: "Level 25", tier: "expert", tiles: [], totalPairs: 58, timeBonus: 180 },
  { id: 26, name: "Level 26", tier: "master", tiles: [], totalPairs: 60, timeBonus: 175 },
  { id: 27, name: "Level 27", tier: "master", tiles: [], totalPairs: 60, timeBonus: 170 },
  { id: 28, name: "Level 28", tier: "master", tiles: [], totalPairs: 62, timeBonus: 165 },
  { id: 29, name: "Level 29", tier: "master", tiles: [], totalPairs: 64, timeBonus: 160 },
  { id: 30, name: "Level 30", tier: "master", tiles: [], totalPairs: 66, timeBonus: 155 }
];

async function pushLevels() {
  const client = createClient();
  const deviceId = generateDeviceId();

  try {
    // Authenticate
    const session = await client.authenticateDevice(deviceId, true, `admin_${Date.now()}`);
    logSuccess(TEST_NAME, `Authenticated as: ${session.user_id}`);

    // Push levels via RPC
    log(TEST_NAME, 'Pushing 30 levels for puzzle-master...');

    const result = await client.rpc(session, 'admin_update_levels', {
      gameId: 'puzzle-master',
      levels: PUZZLE_MASTER_LEVELS
    });

    logSuccess(TEST_NAME, 'Levels pushed successfully!');
    log(TEST_NAME, 'Result:', result.payload);

    return result;
  } catch (error) {
    logError(TEST_NAME, 'Failed to push levels', error);
    throw error;
  }
}

pushLevels()
  .then(() => console.log('\n✅ Levels pushed successfully!'))
  .catch(() => process.exit(1));
