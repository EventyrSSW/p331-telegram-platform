import { User } from '../services/api';

/**
 * Creates a mock user for local development
 * Only used when VITE_DEV_MODE=true and not in Telegram context
 */
export function createMockUser(): User {
  return {
    id: 'mock-user-123',
    telegramId: 123456789,
    username: 'devuser',
    firstName: 'Dev',
    lastName: 'User',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=devuser',
    coinBalance: 100,
    isPremium: false,
    walletAddress: null,
    languageCode: 'en',
  };
}

/**
 * Check if dev mode is enabled
 * Note: Dev mode is NEVER enabled in production builds for security
 */
export function isDevMode(): boolean {
  // Never allow dev mode in production builds
  if (import.meta.env.PROD) {
    return false;
  }
  // Vite env vars are always strings, so we compare to string 'true'
  return import.meta.env.VITE_DEV_MODE === 'true';
}
