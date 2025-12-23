# Implementation Plan: Nakama Test Scripts

## Overview

Create Node.js test scripts to verify Nakama server functionality at `http://136.243.136.206:7350`. Each script tests a specific Nakama feature independently with mock data.

## Prerequisites

- Nakama server running at `http://136.243.136.206:7350`
- Node.js installed
- `@heroiclabs/nakama-js` package

## Directory Structure

```
scripts/nakama-tests/
├── package.json           # Dependencies
├── config.js              # Server configuration
├── helpers.js             # Shared utilities (client creation, logging)
├── 01-authentication.js   # Device auth, session management
├── 02-user-account.js     # Get/update account, metadata
├── 03-storage.js          # Read/write/list storage objects
├── 04-friends.js          # Add/list/remove friends
├── 05-groups.js           # Create/join/list groups
├── 06-chat.js             # Join channels, send messages
├── 07-matches.js          # Create/join matches, send state
├── 08-matchmaker.js       # Add to matchmaker pool
├── 09-leaderboards.js     # Submit/list scores
├── 10-notifications.js    # List notifications
└── run-all.js             # Execute all tests sequentially
```

## Implementation Tasks

### Task 1: Project Setup
**File:** `scripts/nakama-tests/package.json`

Create package.json with dependencies:
```json
{
  "name": "nakama-tests",
  "type": "module",
  "version": "1.0.0",
  "description": "Nakama server test scripts",
  "scripts": {
    "test:all": "node run-all.js",
    "test:auth": "node 01-authentication.js",
    "test:user": "node 02-user-account.js",
    "test:storage": "node 03-storage.js",
    "test:friends": "node 04-friends.js",
    "test:groups": "node 05-groups.js",
    "test:chat": "node 06-chat.js",
    "test:matches": "node 07-matches.js",
    "test:matchmaker": "node 08-matchmaker.js",
    "test:leaderboards": "node 09-leaderboards.js",
    "test:notifications": "node 10-notifications.js"
  },
  "dependencies": {
    "@heroiclabs/nakama-js": "^2.9.0"
  }
}
```

### Task 2: Configuration & Helpers
**File:** `scripts/nakama-tests/config.js`

```javascript
export const config = {
  serverKey: 'defaultkey',
  host: '136.243.136.206',
  port: 7350,
  useSSL: false
};
```

**File:** `scripts/nakama-tests/helpers.js`

```javascript
import { Client } from '@heroiclabs/nakama-js';
import { config } from './config.js';

export function createClient() {
  return new Client(config.serverKey, config.host, config.port, config.useSSL);
}

export function generateDeviceId() {
  return `test-device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function log(testName, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${testName}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

export function logSuccess(testName, message) {
  console.log(`✅ [${testName}] ${message}`);
}

export function logError(testName, message, error) {
  console.error(`❌ [${testName}] ${message}`, error?.message || error);
}
```

### Task 3: Authentication Tests
**File:** `scripts/nakama-tests/01-authentication.js`

Tests:
1. Device authentication (create new user)
2. Device authentication (login existing user)
3. Session token refresh
4. Session logout

```javascript
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
```

### Task 4: User Account Tests
**File:** `scripts/nakama-tests/02-user-account.js`

Tests:
1. Get current account
2. Update account (username, display name, avatar, etc.)
3. Get other users by ID

```javascript
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
```

### Task 5: Storage Engine Tests
**File:** `scripts/nakama-tests/03-storage.js`

Tests:
1. Write storage object
2. Read storage object
3. List storage objects
4. Delete storage object

```javascript
import { createClient, generateDeviceId, logSuccess, logError, log } from './helpers.js';

const TEST_NAME = 'Storage';

async function testStorage() {
  const client = createClient();
  const deviceId = generateDeviceId();

  try {
    const session = await client.authenticateDevice(deviceId, true, `user_${Date.now()}`);
    logSuccess(TEST_NAME, `Authenticated as: ${session.user_id}`);

    // Write storage object
    const writeData = {
      collection: 'test_collection',
      key: 'test_key',
      value: JSON.stringify({
        score: 100,
        level: 5,
        items: ['sword', 'shield'],
        timestamp: Date.now()
      }),
      permissionRead: 1,
      permissionWrite: 1
    };

    const writeResult = await client.writeStorageObjects(session, [writeData]);
    logSuccess(TEST_NAME, 'Wrote storage object');
    log(TEST_NAME, 'Write result:', writeResult);

    // Read storage object
    const readResult = await client.readStorageObjects(session, {
      object_ids: [{
        collection: 'test_collection',
        key: 'test_key',
        user_id: session.user_id
      }]
    });
    logSuccess(TEST_NAME, 'Read storage object');
    log(TEST_NAME, 'Read data:', JSON.parse(readResult.objects[0].value));

    // List storage objects
    const listResult = await client.listStorageObjects(session, 'test_collection', session.user_id, 10);
    logSuccess(TEST_NAME, `Listed ${listResult.objects.length} storage object(s)`);

    // Delete storage object
    await client.deleteStorageObjects(session, {
      object_ids: [{
        collection: 'test_collection',
        key: 'test_key'
      }]
    });
    logSuccess(TEST_NAME, 'Deleted storage object');

    return session;
  } catch (error) {
    logError(TEST_NAME, 'Storage test failed', error);
    throw error;
  }
}

testStorage()
  .then(() => console.log('\n✅ All storage tests passed'))
  .catch(() => process.exit(1));

export { testStorage };
```

### Task 6: Friends Tests
**File:** `scripts/nakama-tests/04-friends.js`

Tests:
1. Create two users
2. Send friend request
3. List friend requests (incoming)
4. Accept friend request
5. List mutual friends
6. Remove friend

```javascript
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
    await client.addFriends(session1, { ids: [session2.user_id] });
    logSuccess(TEST_NAME, 'User1 sent friend request to User2');

    // User2 lists incoming friend requests (state=2)
    const incomingRequests = await client.listFriends(session2, 2, 10);
    logSuccess(TEST_NAME, `User2 has ${incomingRequests.friends?.length || 0} incoming request(s)`);

    // User2 accepts friend request (by adding User1)
    await client.addFriends(session2, { ids: [session1.user_id] });
    logSuccess(TEST_NAME, 'User2 accepted friend request');

    // List mutual friends (state=0)
    const mutualFriends1 = await client.listFriends(session1, 0, 10);
    const mutualFriends2 = await client.listFriends(session2, 0, 10);
    logSuccess(TEST_NAME, `User1 has ${mutualFriends1.friends?.length || 0} friend(s), User2 has ${mutualFriends2.friends?.length || 0} friend(s)`);

    // Remove friend
    await client.deleteFriends(session1, { ids: [session2.user_id] });
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
```

### Task 7: Groups Tests
**File:** `scripts/nakama-tests/05-groups.js`

Tests:
1. Create group
2. List groups
3. Join group (second user)
4. List group members
5. Leave group
6. Delete group

```javascript
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
    const groupList = await client.listGroups(session1, groupName.substring(0, 10), 10);
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
```

### Task 8: Chat Tests (Requires Socket)
**File:** `scripts/nakama-tests/06-chat.js`

Tests:
1. Connect socket
2. Join room channel
3. Send message
4. List channel messages
5. Leave channel

```javascript
import { createClient, generateDeviceId, logSuccess, logError, log } from './helpers.js';

const TEST_NAME = 'Chat';

async function testChat() {
  const client = createClient();

  try {
    const session = await client.authenticateDevice(generateDeviceId(), true, `user_${Date.now()}`);
    logSuccess(TEST_NAME, `Authenticated as: ${session.user_id}`);

    // Create socket
    const socket = client.createSocket();
    await socket.connect(session, true);
    logSuccess(TEST_NAME, 'Socket connected');

    // Join room channel
    const roomName = `test_room_${Date.now()}`;
    const channel = await socket.joinChat(roomName, 1, false, false);
    logSuccess(TEST_NAME, `Joined channel: ${channel.id}`);

    // Send message
    const messageData = { text: 'Hello from test script!', timestamp: Date.now() };
    const messageAck = await socket.writeChatMessage(channel.id, messageData);
    logSuccess(TEST_NAME, `Sent message: ${messageAck.message_id}`);

    // List channel messages
    const messages = await client.listChannelMessages(session, channel.id, 10, true);
    logSuccess(TEST_NAME, `Retrieved ${messages.messages?.length || 0} message(s)`);

    // Leave channel
    await socket.leaveChat(channel.id);
    logSuccess(TEST_NAME, 'Left channel');

    // Disconnect socket
    socket.disconnect(false);
    logSuccess(TEST_NAME, 'Socket disconnected');

    return session;
  } catch (error) {
    logError(TEST_NAME, 'Chat test failed', error);
    throw error;
  }
}

testChat()
  .then(() => console.log('\n✅ All chat tests passed'))
  .catch(() => process.exit(1));

export { testChat };
```

### Task 9: Matches Tests (Requires Socket)
**File:** `scripts/nakama-tests/07-matches.js`

Tests:
1. Create match
2. Join match (second user)
3. Send match state
4. Receive match state
5. Leave match

```javascript
import { createClient, generateDeviceId, logSuccess, logError, log } from './helpers.js';

const TEST_NAME = 'Matches';

async function testMatches() {
  const client = createClient();

  try {
    // Create two users with sockets
    const session1 = await client.authenticateDevice(generateDeviceId(), true, `user1_${Date.now()}`);
    const session2 = await client.authenticateDevice(generateDeviceId(), true, `user2_${Date.now()}`);
    logSuccess(TEST_NAME, 'Created two users');

    const socket1 = client.createSocket();
    const socket2 = client.createSocket();

    await socket1.connect(session1, true);
    await socket2.connect(session2, true);
    logSuccess(TEST_NAME, 'Both sockets connected');

    // Create match
    const match = await socket1.createMatch();
    logSuccess(TEST_NAME, `Created match: ${match.match_id}`);

    // Set up match state receiver for user1
    let receivedState = null;
    socket1.onmatchdata = (matchData) => {
      receivedState = matchData;
      log(TEST_NAME, 'Received match state:', {
        opCode: matchData.op_code,
        data: new TextDecoder().decode(matchData.data)
      });
    };

    // User2 joins match
    const joinedMatch = await socket2.joinMatch(match.match_id);
    logSuccess(TEST_NAME, `User2 joined match, ${joinedMatch.presences?.length || 0} presence(s)`);

    // Wait briefly for presence updates
    await new Promise(resolve => setTimeout(resolve, 500));

    // User2 sends match state
    const opCode = 1;
    const stateData = JSON.stringify({ position: { x: 10, y: 20 }, action: 'move' });
    await socket2.sendMatchState(match.match_id, opCode, stateData);
    logSuccess(TEST_NAME, 'User2 sent match state');

    // Wait for state to be received
    await new Promise(resolve => setTimeout(resolve, 500));

    // Leave match
    await socket1.leaveMatch(match.match_id);
    await socket2.leaveMatch(match.match_id);
    logSuccess(TEST_NAME, 'Both users left match');

    // Disconnect
    socket1.disconnect(false);
    socket2.disconnect(false);
    logSuccess(TEST_NAME, 'Sockets disconnected');

    return { session1, session2, matchId: match.match_id };
  } catch (error) {
    logError(TEST_NAME, 'Matches test failed', error);
    throw error;
  }
}

testMatches()
  .then(() => console.log('\n✅ All matches tests passed'))
  .catch(() => process.exit(1));

export { testMatches };
```

### Task 10: Matchmaker Tests (Requires Socket)
**File:** `scripts/nakama-tests/08-matchmaker.js`

Tests:
1. Add to matchmaker pool
2. Wait for match (with two users)
3. Remove from matchmaker

```javascript
import { createClient, generateDeviceId, logSuccess, logError, log } from './helpers.js';

const TEST_NAME = 'Matchmaker';

async function testMatchmaker() {
  const client = createClient();

  try {
    // Create two users with sockets
    const session1 = await client.authenticateDevice(generateDeviceId(), true, `user1_${Date.now()}`);
    const session2 = await client.authenticateDevice(generateDeviceId(), true, `user2_${Date.now()}`);
    logSuccess(TEST_NAME, 'Created two users');

    const socket1 = client.createSocket();
    const socket2 = client.createSocket();

    await socket1.connect(session1, true);
    await socket2.connect(session2, true);
    logSuccess(TEST_NAME, 'Both sockets connected');

    // Set up matchmaker matched handlers
    let matched1 = false, matched2 = false;

    socket1.onmatchmakermatched = (matched) => {
      matched1 = true;
      logSuccess(TEST_NAME, `User1 matched! Token: ${matched.token?.substring(0, 20)}...`);
    };

    socket2.onmatchmakermatched = (matched) => {
      matched2 = true;
      logSuccess(TEST_NAME, `User2 matched! Token: ${matched.token?.substring(0, 20)}...`);
    };

    // Add both users to matchmaker
    const minPlayers = 2;
    const maxPlayers = 2;
    const query = '*';

    const ticket1 = await socket1.addMatchmaker(query, minPlayers, maxPlayers);
    logSuccess(TEST_NAME, `User1 added to matchmaker: ${ticket1.ticket}`);

    const ticket2 = await socket2.addMatchmaker(query, minPlayers, maxPlayers);
    logSuccess(TEST_NAME, `User2 added to matchmaker: ${ticket2.ticket}`);

    // Wait for matching (up to 10 seconds)
    const startTime = Date.now();
    while ((!matched1 || !matched2) && Date.now() - startTime < 10000) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (matched1 && matched2) {
      logSuccess(TEST_NAME, 'Both users were matched successfully!');
    } else {
      log(TEST_NAME, 'Matching timed out (this is expected if matchmaker needs more players)');
    }

    // Remove from matchmaker (if still in queue)
    try {
      await socket1.removeMatchmaker(ticket1.ticket);
      await socket2.removeMatchmaker(ticket2.ticket);
    } catch (e) {
      // Ignore errors - tickets may have already been used
    }

    // Disconnect
    socket1.disconnect(false);
    socket2.disconnect(false);
    logSuccess(TEST_NAME, 'Sockets disconnected');

    return { session1, session2 };
  } catch (error) {
    logError(TEST_NAME, 'Matchmaker test failed', error);
    throw error;
  }
}

testMatchmaker()
  .then(() => console.log('\n✅ All matchmaker tests passed'))
  .catch(() => process.exit(1));

export { testMatchmaker };
```

### Task 11: Leaderboards Tests
**File:** `scripts/nakama-tests/09-leaderboards.js`

Tests:
1. Write leaderboard record
2. List top records
3. List records around owner

Note: Leaderboards must be created on server first. This script assumes a leaderboard named "weekly_scores" exists.

```javascript
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

      // Submit score
      const score = Math.floor(Math.random() * 1000) + 100;
      try {
        await client.writeLeaderboardRecord(session, LEADERBOARD_ID, {
          score: score,
          subscore: i,
          metadata: JSON.stringify({ map: 'test_map' })
        });
        logSuccess(TEST_NAME, `Player${i} submitted score: ${score}`);
      } catch (e) {
        logError(TEST_NAME, `Failed to write score (leaderboard may not exist): ${e.message}`);
        log(TEST_NAME, 'Note: Create leaderboard "weekly_scores" on server first');
        return;
      }
    }

    // List top records
    const topRecords = await client.listLeaderboardRecords(sessions[0], LEADERBOARD_ID, null, null, 10);
    logSuccess(TEST_NAME, `Listed ${topRecords.records?.length || 0} top record(s)`);
    topRecords.records?.forEach((record, idx) => {
      log(TEST_NAME, `#${idx + 1}: ${record.username} - ${record.score}`);
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
```

### Task 12: Notifications Tests
**File:** `scripts/nakama-tests/10-notifications.js`

Tests:
1. List notifications
2. Delete notification

Note: Notifications are typically sent from the server. This tests the client-side listing and deletion.

```javascript
import { createClient, generateDeviceId, logSuccess, logError, log } from './helpers.js';

const TEST_NAME = 'Notifications';

async function testNotifications() {
  const client = createClient();

  try {
    const session = await client.authenticateDevice(generateDeviceId(), true, `user_${Date.now()}`);
    logSuccess(TEST_NAME, `Authenticated as: ${session.user_id}`);

    // List notifications
    const notifications = await client.listNotifications(session, 100);
    logSuccess(TEST_NAME, `Listed ${notifications.notifications?.length || 0} notification(s)`);

    if (notifications.notifications?.length > 0) {
      log(TEST_NAME, 'Notifications:');
      notifications.notifications.forEach((n, idx) => {
        log(TEST_NAME, `${idx + 1}. [Code: ${n.code}] ${n.subject}`);
      });

      // Delete first notification
      const firstNotification = notifications.notifications[0];
      await client.deleteNotifications(session, [firstNotification.id]);
      logSuccess(TEST_NAME, `Deleted notification: ${firstNotification.id}`);
    } else {
      log(TEST_NAME, 'No notifications to display (expected for new users)');
    }

    // Test socket notification listener setup
    const socket = client.createSocket();
    await socket.connect(session, true);

    socket.onnotification = (notification) => {
      log(TEST_NAME, 'Received notification:', {
        code: notification.code,
        subject: notification.subject,
        content: notification.content
      });
    };
    logSuccess(TEST_NAME, 'Set up real-time notification listener');

    socket.disconnect(false);
    logSuccess(TEST_NAME, 'Socket disconnected');

    return session;
  } catch (error) {
    logError(TEST_NAME, 'Notifications test failed', error);
    throw error;
  }
}

testNotifications()
  .then(() => console.log('\n✅ All notifications tests passed'))
  .catch(() => process.exit(1));

export { testNotifications };
```

### Task 13: Run All Tests Script
**File:** `scripts/nakama-tests/run-all.js`

```javascript
import { testDeviceAuth } from './01-authentication.js';
import { testUserAccount } from './02-user-account.js';
import { testStorage } from './03-storage.js';
import { testFriends } from './04-friends.js';
import { testGroups } from './05-groups.js';
import { testChat } from './06-chat.js';
import { testMatches } from './07-matches.js';
import { testMatchmaker } from './08-matchmaker.js';
import { testLeaderboards } from './09-leaderboards.js';
import { testNotifications } from './10-notifications.js';

const tests = [
  { name: 'Authentication', fn: testDeviceAuth },
  { name: 'User Account', fn: testUserAccount },
  { name: 'Storage', fn: testStorage },
  { name: 'Friends', fn: testFriends },
  { name: 'Groups', fn: testGroups },
  { name: 'Chat', fn: testChat },
  { name: 'Matches', fn: testMatches },
  { name: 'Matchmaker', fn: testMatchmaker },
  { name: 'Leaderboards', fn: testLeaderboards },
  { name: 'Notifications', fn: testNotifications },
];

async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           NAKAMA SERVER TEST SUITE                        ║');
  console.log('║           Server: http://136.243.136.206:7350             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const results = [];

  for (const test of tests) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`Running: ${test.name}`);
    console.log('═'.repeat(60));

    try {
      await test.fn();
      results.push({ name: test.name, status: 'PASSED' });
    } catch (error) {
      results.push({ name: test.name, status: 'FAILED', error: error.message });
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;

  results.forEach(r => {
    const icon = r.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} ${r.name}: ${r.status}`);
    if (r.error) console.log(`   Error: ${r.error}`);
  });

  console.log(`\nTotal: ${passed} passed, ${failed} failed out of ${tests.length} tests`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
```

## Verification Steps

After implementation, verify by running:

```bash
cd scripts/nakama-tests
npm install
npm run test:all
```

Individual tests can be run with:
```bash
npm run test:auth       # Authentication only
npm run test:storage    # Storage only
# etc.
```

## Notes

1. **Leaderboards require server setup:** The leaderboard tests assume a leaderboard named "weekly_scores" exists. Create it via Nakama console or server code.

2. **Socket tests require stable connection:** Chat, Matches, and Matchmaker tests use WebSocket connections. Ensure the server allows WebSocket connections on port 7350.

3. **Device IDs are unique:** Each test run creates new users with unique device IDs to avoid conflicts.

4. **Error handling:** All tests include try/catch blocks with descriptive error messages.
