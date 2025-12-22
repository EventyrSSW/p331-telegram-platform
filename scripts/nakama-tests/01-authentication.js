import { createClient, generateDeviceId, log, logSuccess, logError } from './helpers.js';

const TEST_NAME = 'Authentication';

async function testDeviceAuth() {
  const client = createClient();
  const deviceId = generateDeviceId();

  log(TEST_NAME, `Testing device auth with ID: ${deviceId}`);

  try {
    // Create new user
    const session = await client.authenticateDevice(deviceId, true, `user_${Date.now()}`);
    logSuccess(TEST_NAME, `Created user: ${session.user_id}`);
    log(TEST_NAME, 'Session info:', {
      userId: session.user_id,
      username: session.username,
      token: session.token.substring(0, 20) + '...',
      expiresAt: new Date(session.expires_at * 1000).toISOString()
    });

    // Re-authenticate with same device
    const session2 = await client.authenticateDevice(deviceId, false);
    logSuccess(TEST_NAME, `Re-authenticated same user: ${session2.user_id}`);

    // Session refresh
    const refreshedSession = await client.sessionRefresh(session);
    logSuccess(TEST_NAME, 'Session refreshed successfully');

    // Logout
    await client.sessionLogout(session);
    logSuccess(TEST_NAME, 'Session logged out');

    return session;
  } catch (error) {
    logError(TEST_NAME, 'Device auth failed', error);
    throw error;
  }
}

// Run if executed directly
testDeviceAuth()
  .then(() => console.log('\n✅ All authentication tests passed'))
  .catch(() => process.exit(1));

export { testDeviceAuth };
