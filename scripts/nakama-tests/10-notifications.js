import { createClient, generateDeviceId, logSuccess, logError, log } from './helpers.js';

const TEST_NAME = 'Notifications';

async function testNotifications() {
  const client = createClient();

  try {
    const session = await client.authenticateDevice(generateDeviceId(), true, `user_${Date.now()}`);
    logSuccess(TEST_NAME, `Authenticated as: ${session.user_id}`);

    // List notifications (HTTP - works in Node.js)
    const notifications = await client.listNotifications(session, 100);
    logSuccess(TEST_NAME, `Listed ${notifications.notifications?.length || 0} notification(s)`);

    if (notifications.notifications?.length > 0) {
      log(TEST_NAME, 'Notifications:');
      notifications.notifications.forEach((n, idx) => {
        log(TEST_NAME, `  ${idx + 1}. [Code: ${n.code}] ${n.subject}`);
      });

      // Delete first notification
      const firstNotification = notifications.notifications[0];
      await client.deleteNotifications(session, [firstNotification.id]);
      logSuccess(TEST_NAME, `Deleted notification: ${firstNotification.id}`);
    } else {
      log(TEST_NAME, 'No notifications to display (expected for new users)');
    }

    // Document WebSocket notification listener
    log(TEST_NAME, '');
    log(TEST_NAME, 'Real-time notifications (requires WebSocket):');
    log(TEST_NAME, '- socket.onnotification = (notification) => { ... }');
    log(TEST_NAME, '');
    log(TEST_NAME, 'Notification codes:');
    log(TEST_NAME, '- 0 and below: System reserved');
    log(TEST_NAME, '- 1+: Custom notifications from server');

    logSuccess(TEST_NAME, 'Notification API validated');

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
