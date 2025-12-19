const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Game {
  id: string;
  title: string;
  thumbnail: string;
  category: string;
  description?: string;
  featured?: boolean;
}

export interface UserBalance {
  walletAddress: string;
  balance: number;
}

class ApiService {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
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

  async getUserBalance(walletAddress: string): Promise<UserBalance> {
    return this.fetch<UserBalance>(`/users/${walletAddress}/balance`);
  }

  async addCoins(
    walletAddress: string,
    amount: number
  ): Promise<UserBalance> {
    return this.fetch<UserBalance>(`/users/${walletAddress}/add-coins`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async deductCoins(
    walletAddress: string,
    amount: number
  ): Promise<UserBalance> {
    return this.fetch<UserBalance>(`/users/${walletAddress}/deduct-coins`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }
}

export const api = new ApiService();
