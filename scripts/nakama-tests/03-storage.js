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
      value: {
        score: 100,
        level: 5,
        items: ['sword', 'shield'],
        timestamp: Date.now()
      },
      permission_read: 1,
      permission_write: 1
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
    log(TEST_NAME, 'Read data:', readResult.objects[0].value);

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
