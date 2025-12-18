import { useState, useEffect, useCallback } from 'react';
import { useTonWallet } from '@tonconnect/ui-react';
import { api } from '../services/api';

export interface UseUserBalanceResult {
  balance: number;
  isLoading: boolean;
  error: string | null;
  addCoins: (amount: number) => Promise<void>;
  deductCoins: (amount: number) => Promise<void>;
  refetch: () => void;
}

export function useUserBalance(): UseUserBalanceResult {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const wallet = useTonWallet();
  const walletAddress = wallet?.account?.address;

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance(0);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getUserBalance(walletAddress);
      setBalance(response.balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const addCoins = useCallback(async (amount: number) => {
    if (!walletAddress) {
      setError('No wallet connected');
      return;
    }

    setError(null);

    try {
      const response = await api.addCoins(walletAddress, amount);
      setBalance(response.balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add coins');
      throw err;
    }
  }, [walletAddress]);

  const deductCoins = useCallback(async (amount: number) => {
    if (!walletAddress) {
      setError('No wallet connected');
      return;
    }

    setError(null);

    try {
      const response = await api.deductCoins(walletAddress, amount);
      setBalance(response.balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deduct coins');
      throw err;
    }
  }, [walletAddress]);

  return {
    balance,
    isLoading,
    error,
    addCoins,
    deductCoins,
    refetch: fetchBalance,
  };
}
