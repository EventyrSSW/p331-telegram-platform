import { ApiError } from '../utils/errors';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Game {
  id: string;
  slug: string;  // human-readable identifier for URLs
  title: string;
  thumbnail: string;
  category: string;
  description?: string;
  featured?: boolean;
}

export interface UserBalance {
  telegramId?: number;
  walletAddress: string | null;
  balance: number;
}

export interface TonConfig {
  network: 'mainnet' | 'testnet';
  receiverAddress: string;
}

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price: number;
  bonus: number;
  sortOrder: number;
  active: boolean;
}

export interface AppConfig {
  ton: TonConfig;
  coinPackages: CoinPackage[];
}

class ApiService {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...options?.headers as Record<string, string>,
    };

    // Add Telegram init data for authentication
    const initData = window.Telegram?.WebApp?.initData;
    if (initData) {
      headers['X-Telegram-Init-Data'] = initData;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      let errorDetails: unknown;

      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
        errorDetails = errorData.details;
      } catch {
        // Response wasn't JSON
      }

      throw new ApiError(response.status, errorMessage, errorDetails);
    }

    return await response.json();
  }

  async getGames(): Promise<{ games: Game[] }> {
    return this.fetch<{ games: Game[] }>('/games');
  }

  async getFeaturedGame(): Promise<{ game: Game }> {
    return this.fetch<{ game: Game }>('/games/featured');
  }

  async getGame(id: string): Promise<{ game: Game }> {
    return this.fetch<{ game: Game }>(`/games/${id}`);
  }

  async getUserBalance(): Promise<UserBalance> {
    return this.fetch<UserBalance>('/users/me/balance');
  }

  async addCoins(
    amount: number,
    transactionHash?: string
  ): Promise<UserBalance> {
    return this.fetch<UserBalance>('/users/me/add-coins', {
      method: 'POST',
      body: JSON.stringify({ amount, transactionHash }),
    });
  }

  async deductCoins(
    amount: number
  ): Promise<UserBalance> {
    return this.fetch<UserBalance>('/users/me/deduct-coins', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async getConfig(): Promise<AppConfig> {
    return this.fetch<AppConfig>('/config');
  }
}

export const api = new ApiService();
