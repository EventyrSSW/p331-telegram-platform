import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNakama } from '../contexts/NakamaContext';

export function NakamaConnector() {
  const { user, isAuthenticated } = useAuth();
  const { connect, isConnected, isConnecting, error } = useNakama();

  useEffect(() => {
    console.log('[NakamaConnector] State:', { isAuthenticated, hasUser: !!user, isConnected, isConnecting, error });

    // Connect to Nakama when user is authenticated but not connected
    if (isAuthenticated && user && !isConnected && !isConnecting) {
      console.log('[NakamaConnector] User authenticated, connecting to Nakama...');
      connect({
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        languageCode: user.languageCode,
        isPremium: user.isPremium,
      });
    }
  }, [isAuthenticated, user, isConnected, isConnecting, connect]);

  return null; // This component renders nothing
}
