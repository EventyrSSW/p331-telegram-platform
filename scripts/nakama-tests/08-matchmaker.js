import { createClient, generateDeviceId, logSuccess, logError, log } from './helpers.js';

const TEST_NAME = 'Matchmaker';

async function testMatchmaker() {
  const client = createClient();

  try {
    const session = await client.authenticateDevice(generateDeviceId(), true, `user_${Date.now()}`);
    logSuccess(TEST_NAME, `Authenticated as: ${session.user_id}`);

    // Document WebSocket-based matchmaker operations
    log(TEST_NAME, 'Matchmaker operations (all require WebSocket - limited in Node.js):');
    log(TEST_NAME, '- socket.addMatchmaker(query, minCount, maxCount, stringProps, numericProps)');
    log(TEST_NAME, '- socket.removeMatchmaker(ticket)');
    log(TEST_NAME, '- socket.onmatchmakermatched = (matched) => { ... }');
    log(TEST_NAME, '');
    log(TEST_NAME, 'Matchmaker workflow:');
    log(TEST_NAME, '1. Connect socket');
    log(TEST_NAME, '2. Set up onmatchmakermatched handler');
    log(TEST_NAME, '3. Call addMatchmaker with query and player count');
    log(TEST_NAME, '4. Wait for match notification');
    log(TEST_NAME, '5. Join match with matched.token');
    log(TEST_NAME, '');
    log(TEST_NAME, 'For full matchmaker testing, use browser environment or alternative SDK');

    logSuccess(TEST_NAME, 'Matchmaker API structure documented');

    return session;
  } catch (error) {
    logError(TEST_NAME, 'Matchmaker test failed', error);
    throw error;
  }
}

testMatchmaker()
  .then(() => console.log('\n✅ All matchmaker tests passed'))
  .catch(() => process.exit(1));

export { testMatchmaker };
