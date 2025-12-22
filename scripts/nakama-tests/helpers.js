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
