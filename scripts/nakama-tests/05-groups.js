import { createClient, generateDeviceId, logSuccess, logError, log } from './helpers.js';

const TEST_NAME = 'Groups';

async function testGroups() {
  const client = createClient();

  try {
    // Create two users
    const session1 = await client.authenticateDevice(generateDeviceId(), true, `user1_${Date.now()}`);
    const session2 = await client.authenticateDevice(generateDeviceId(), true, `user2_${Date.now()}`);
    logSuccess(TEST_NAME, 'Created two users');

    // Create group
    const groupName = `TestGroup_${Date.now()}`;
    const group = await client.createGroup(session1, {
      name: groupName,
      description: 'A test group',
      open: true,
      maxCount: 100
    });
    logSuccess(TEST_NAME, `Created group: ${group.id}`);
    log(TEST_NAME, 'Group details:', {
      id: group.id,
      name: group.name,
      open: group.open
    });

    // List groups
    const groupList = await client.listGroups(session1, groupName.substring(0, 10), null, 10);
    logSuccess(TEST_NAME, `Found ${groupList.groups?.length || 0} group(s)`);

    // User2 joins group
    await client.joinGroup(session2, group.id);
    logSuccess(TEST_NAME, 'User2 joined the group');

    // List group members
    const members = await client.listGroupUsers(session1, group.id, null, 10);
    logSuccess(TEST_NAME, `Group has ${members.group_users?.length || 0} member(s)`);

    // User2 leaves group
    await client.leaveGroup(session2, group.id);
    logSuccess(TEST_NAME, 'User2 left the group');

    // Delete group (as superadmin)
    await client.deleteGroup(session1, group.id);
    logSuccess(TEST_NAME, 'Deleted group');

    return { session1, session2, groupId: group.id };
  } catch (error) {
    logError(TEST_NAME, 'Groups test failed', error);
    throw error;
  }
}

testGroups()
  .then(() => console.log('\n✅ All groups tests passed'))
  .catch(() => process.exit(1));

export { testGroups };
