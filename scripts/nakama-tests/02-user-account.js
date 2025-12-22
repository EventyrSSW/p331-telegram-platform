import { createClient, generateDeviceId, logSuccess, logError, log } from './helpers.js';

const TEST_NAME = 'UserAccount';

async function testUserAccount() {
  const client = createClient();
  const deviceId = generateDeviceId();

  try {
    const session = await client.authenticateDevice(deviceId, true, `user_${Date.now()}`);
    logSuccess(TEST_NAME, `Authenticated as: ${session.user_id}`);

    // Get account
    const account = await client.getAccount(session);
    logSuccess(TEST_NAME, 'Retrieved account');
    log(TEST_NAME, 'Account details:', {
      userId: account.user.id,
      username: account.user.username,
      displayName: account.user.display_name,
      wallet: account.wallet
    });

    // Update account
    await client.updateAccount(session, {
      username: `updated_${Date.now()}`,
      displayName: 'Test Player',
      avatarUrl: 'https://example.com/avatar.png',
      langTag: 'en',
      location: 'Test Location',
      timezone: 'UTC'
    });
    logSuccess(TEST_NAME, 'Updated account');

    // Verify update
    const updatedAccount = await client.getAccount(session);
    log(TEST_NAME, 'Updated account:', {
      displayName: updatedAccount.user.display_name,
      location: updatedAccount.user.location
    });

    // Get users by ID
    const users = await client.getUsers(session, [session.user_id]);
    logSuccess(TEST_NAME, `Retrieved ${users.users.length} user(s)`);

    return session;
  } catch (error) {
    logError(TEST_NAME, 'User account test failed', error);
    throw error;
  }
}

testUserAccount()
  .then(() => console.log('\n✅ All user account tests passed'))
  .catch(() => process.exit(1));

export { testUserAccount };
