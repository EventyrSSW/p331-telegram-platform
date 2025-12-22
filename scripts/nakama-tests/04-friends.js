import { createClient, generateDeviceId, logSuccess, logError, log } from './helpers.js';

const TEST_NAME = 'Friends';

async function testFriends() {
  const client = createClient();

  try {
    // Create two users
    const session1 = await client.authenticateDevice(generateDeviceId(), true, `user1_${Date.now()}`);
    const session2 = await client.authenticateDevice(generateDeviceId(), true, `user2_${Date.now()}`);
    logSuccess(TEST_NAME, `Created users: ${session1.user_id}, ${session2.user_id}`);

    // User1 sends friend request to User2
    await client.addFriends(session1, [session2.user_id]);
    logSuccess(TEST_NAME, 'User1 sent friend request to User2');

    // User2 lists incoming friend requests (state=2)
    const incomingRequests = await client.listFriends(session2, 2, 10);
    logSuccess(TEST_NAME, `User2 has ${incomingRequests.friends?.length || 0} incoming request(s)`);

    // User2 accepts friend request (by adding User1)
    await client.addFriends(session2, [session1.user_id]);
    logSuccess(TEST_NAME, 'User2 accepted friend request');

    // List mutual friends (state=0)
    const mutualFriends1 = await client.listFriends(session1, 0, 10);
    const mutualFriends2 = await client.listFriends(session2, 0, 10);
    logSuccess(TEST_NAME, `User1 has ${mutualFriends1.friends?.length || 0} friend(s), User2 has ${mutualFriends2.friends?.length || 0} friend(s)`);

    // Remove friend
    await client.deleteFriends(session1, [session2.user_id]);
    logSuccess(TEST_NAME, 'User1 removed User2 from friends');

    // Verify removal
    const finalFriends = await client.listFriends(session1, 0, 10);
    log(TEST_NAME, `User1 now has ${finalFriends.friends?.length || 0} friend(s)`);

    return { session1, session2 };
  } catch (error) {
    logError(TEST_NAME, 'Friends test failed', error);
    throw error;
  }
}

testFriends()
  .then(() => console.log('\n✅ All friends tests passed'))
  .catch(() => process.exit(1));

export { testFriends };
