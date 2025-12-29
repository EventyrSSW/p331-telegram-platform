#!/usr/bin/env node

/**
 * Seeds Nakama storage with game level data
 * Run after Nakama is healthy: node scripts/seed-nakama.js
 */

const NAKAMA_URL = process.env.NAKAMA_URL || 'http://localhost:7350';
const NAKAMA_SERVER_KEY = process.env.NAKAMA_SERVER_KEY || 'defaultkey';

const levelsData = {
  levels: [
    { id: 1, name: "Level 1", tier: "beginner", tiles: [], timeBonus: 300, totalPairs: 36 },
    { id: 2, name: "Level 2", tier: "beginner", tiles: [], timeBonus: 295, totalPairs: 36 },
    { id: 3, name: "Level 3", tier: "beginner", tiles: [], timeBonus: 290, totalPairs: 36 },
    { id: 4, name: "Level 4", tier: "beginner", tiles: [], timeBonus: 285, totalPairs: 38 },
    { id: 5, name: "Level 5", tier: "beginner", tiles: [], timeBonus: 280, totalPairs: 38 },
    { id: 6, name: "Level 6", tier: "novice", tiles: [], timeBonus: 275, totalPairs: 40 },
    { id: 7, name: "Level 7", tier: "novice", tiles: [], timeBonus: 270, totalPairs: 40 },
    { id: 8, name: "Level 8", tier: "novice", tiles: [], timeBonus: 265, totalPairs: 42 },
    { id: 9, name: "Level 9", tier: "novice", tiles: [], timeBonus: 260, totalPairs: 42 },
    { id: 10, name: "Level 10", tier: "novice", tiles: [], timeBonus: 255, totalPairs: 44 },
    { id: 11, name: "Level 11", tier: "intermediate", tiles: [], timeBonus: 250, totalPairs: 44 },
    { id: 12, name: "Level 12", tier: "intermediate", tiles: [], timeBonus: 245, totalPairs: 46 },
    { id: 13, name: "Level 13", tier: "intermediate", tiles: [], timeBonus: 240, totalPairs: 46 },
    { id: 14, name: "Level 14", tier: "intermediate", tiles: [], timeBonus: 235, totalPairs: 48 },
    { id: 15, name: "Level 15", tier: "intermediate", tiles: [], timeBonus: 230, totalPairs: 48 },
    { id: 16, name: "Level 16", tier: "advanced", tiles: [], timeBonus: 225, totalPairs: 50 },
    { id: 17, name: "Level 17", tier: "advanced", tiles: [], timeBonus: 220, totalPairs: 50 },
    { id: 18, name: "Level 18", tier: "advanced", tiles: [], timeBonus: 215, totalPairs: 52 },
    { id: 19, name: "Level 19", tier: "advanced", tiles: [], timeBonus: 210, totalPairs: 52 },
    { id: 20, name: "Level 20", tier: "advanced", tiles: [], timeBonus: 205, totalPairs: 54 },
    { id: 21, name: "Level 21", tier: "expert", tiles: [], timeBonus: 200, totalPairs: 54 },
    { id: 22, name: "Level 22", tier: "expert", tiles: [], timeBonus: 195, totalPairs: 56 },
    { id: 23, name: "Level 23", tier: "expert", tiles: [], timeBonus: 190, totalPairs: 56 },
    { id: 24, name: "Level 24", tier: "expert", tiles: [], timeBonus: 185, totalPairs: 58 },
    { id: 25, name: "Level 25", tier: "expert", tiles: [], timeBonus: 180, totalPairs: 58 },
    { id: 26, name: "Level 26", tier: "master", tiles: [], timeBonus: 175, totalPairs: 60 },
    { id: 27, name: "Level 27", tier: "master", tiles: [], timeBonus: 170, totalPairs: 60 },
    { id: 28, name: "Level 28", tier: "master", tiles: [], timeBonus: 165, totalPairs: 62 },
    { id: 29, name: "Level 29", tier: "master", tiles: [], timeBonus: 160, totalPairs: 64 },
    { id: 30, name: "Level 30", tier: "master", tiles: [], timeBonus: 155, totalPairs: 66 }
  ],
  updatedAt: Date.now(),
  updatedBy: "local-dev-seed"
};

async function seedNakamaStorage() {
  console.log('Seeding Nakama storage with game levels...');

  // Create basic auth header (server key with empty secret)
  const auth = Buffer.from(`${NAKAMA_SERVER_KEY}:`).toString('base64');

  try {
    // Write to storage using Nakama's console API
    const response = await fetch(`${NAKAMA_URL}/v2/console/storage`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        collection: 'levels',
        key: 'puzzle-master',
        user_id: '00000000-0000-0000-0000-000000000000', // System user
        value: JSON.stringify(levelsData),
        permission_read: 2, // Public read
        permission_write: 0  // No client write
      })
    });

    if (response.ok) {
      console.log('✅ Nakama storage seeded: levels/puzzle-master (30 levels)');
      return true;
    } else {
      // Try alternative approach using SQL directly
      console.log('Console API not available, trying direct DB insert...');
      return await seedViaDatabase();
    }
  } catch (error) {
    console.log('Console API failed, trying direct DB insert...');
    return await seedViaDatabase();
  }
}

async function seedViaDatabase() {
  // Use psql to insert directly into Nakama's storage table
  const { execSync } = require('child_process');

  const value = JSON.stringify(levelsData).replace(/'/g, "''");
  const sql = `
    INSERT INTO storage (collection, key, user_id, value, version, read, write, create_time, update_time)
    VALUES (
      'levels',
      'puzzle-master',
      '00000000-0000-0000-0000-000000000000',
      '${value}',
      '*',
      2,
      0,
      NOW(),
      NOW()
    )
    ON CONFLICT (collection, key, user_id)
    DO UPDATE SET value = EXCLUDED.value, update_time = NOW();
  `;

  try {
    execSync(`docker exec p331-nakama-postgres psql -U nakama -d nakama -c "${sql}"`, {
      stdio: 'pipe'
    });
    console.log('✅ Nakama storage seeded: levels/puzzle-master (30 levels)');
    return true;
  } catch (error) {
    console.error('❌ Failed to seed Nakama storage:', error.message);
    return false;
  }
}

seedNakamaStorage().then(success => {
  process.exit(success ? 0 : 1);
});
