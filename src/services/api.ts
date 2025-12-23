import { ApiError } from '../utils/errors';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'p331_auth_token';

export interface User {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  photoUrl: string | null;
  isPremium: boolean;
  coinBalance: number;
  walletAddress: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Game {
  id: string;
  slug: string;  // human-readable identifier for URLs
  title: string;
  thumbnail: string;
  category: string;
  description?: string;
  featured?: boolean;
  mainUrl?: string;
  screen1Url?: string;
  screen2Url?: string;
  screen3Url?: string;
  screen4Url?: string;
  rating?: number;
  reviewCount?: number;
  videoUrl?: string;
  topPromoted?: boolean;
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
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...options?.headers as Record<string, string>,
    };

    // Add JWT token if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

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

  async authenticateWithTelegram(initData: string): Promise<AuthResponse> {
    const result = await this.fetch<AuthResponse>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    });
    this.setToken(result.token);
    return result;
  }

  async getMe(): Promise<{ user: User }> {
    return this.fetch<{ user: User }>('/auth/me');
  }

  async getProfile(): Promise<{ user: User }> {
    return this.fetch<{ user: User }>('/users/me/profile');
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
    options?: {
      transactionHash?: string;
      tonAmount?: string; // nanoTON as string
    }
  ): Promise<UserBalance> {
    return this.fetch<UserBalance>('/users/me/add-coins', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        transactionHash: options?.transactionHash,
        tonAmount: options?.tonAmount,
      }),
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

  async linkWallet(walletAddress: string): Promise<{ telegramId: number; walletAddress: string }> {
    return this.fetch<{ telegramId: number; walletAddress: string }>('/users/me/link-wallet', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    });
  }

  async getConfig(): Promise<AppConfig> {
    return this.fetch<AppConfig>('/config');
  }
}

export const api = new ApiService();
