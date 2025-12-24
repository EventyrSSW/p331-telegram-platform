import { useState, useEffect, useCallback } from 'react';
import { nakamaService } from '../services/nakama';
import { useNakama } from '../contexts/NakamaContext';

export function useNakamaWallet() {
  const { isConnected } = useNakama();
  const [coins, setCoins] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    try {
      const wallet = await nakamaService.getWallet();
      setCoins(wallet.coins || 0);
    } catch (error) {
      console.error('[useNakamaWallet] Failed to fetch wallet:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTestCoins = useCallback(async (amount: number = 1000) => {
    await nakamaService.addTestCoins(amount);
    await refresh();
  }, [refresh]);

  return {
    coins,
    isLoading,
    refresh,
    addTestCoins,
  };
}
