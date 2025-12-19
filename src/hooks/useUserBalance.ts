import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export interface UseUserBalanceResult {
  balance: number;
  isLoading: boolean;
  error: string | null;
  addCoins: (amount: number, transactionHash?: string) => Promise<void>;
  deductCoins: (amount: number) => Promise<void>;
  refetch: () => void;
}

export function useUserBalance(): UseUserBalanceResult {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getUserBalance();
      setBalance(response.balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const addCoins = useCallback(async (amount: number, transactionHash?: string) => {
    setError(null);

    try {
      const response = await api.addCoins(amount, transactionHash);
      setBalance(response.balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add coins');
      throw err;
    }
  }, []);

  const deductCoins = useCallback(async (amount: number) => {
    setError(null);

    try {
      const response = await api.deductCoins(amount);
      setBalance(response.balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deduct coins');
      throw err;
    }
  }, []);

  return {
    balance,
    isLoading,
    error,
    addCoins,
    deductCoins,
    refetch: fetchBalance,
  };
}
