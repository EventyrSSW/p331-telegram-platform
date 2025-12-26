import { User, UserStats } from '../services/api';

export const MOCK_USER: User = {
  id: 'mock-user-local-dev',
  telegramId: 123456789,
  username: 'perretbenkert',
  firstName: 'Peter',
  lastName: 'Benkert',
  languageCode: 'en',
  photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=perretbenkert',
  isPremium: false,
  coinBalance: 20,
  walletAddress: null,
};

export const MOCK_STATS: UserStats = {
  gamesPlayed: 25,
  totalWins: 20,
  amountWon: 12,
};

export const MOCK_RANK = 42;
export const MOCK_GEMS = 50;

/**
 * Check if we're running in local development mode without Telegram context
 */
export function shouldUseMockData(): boolean {
  // Check if Telegram WebApp is available
  const hasTelegramContext = Boolean(window.Telegram?.WebApp?.initData);

  // Use mock data only if NO Telegram context AND in development mode
  return !hasTelegramContext && import.meta.env.DEV;
}
