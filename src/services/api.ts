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
    return this.fetch<UserBalance>(`/balance/${walletAddress}`);
  }

  async addCoins(
    walletAddress: string,
    amount: number
  ): Promise<UserBalance & { added: number }> {
    return this.fetch<UserBalance & { added: number }>('/balance/add', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, amount }),
    });
  }

  async deductCoins(
    walletAddress: string,
    amount: number
  ): Promise<UserBalance & { deducted: number }> {
    return this.fetch<UserBalance & { deducted: number }>('/balance/deduct', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, amount }),
    });
  }
}

export const api = new ApiService();
