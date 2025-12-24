import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { Session } from '@heroiclabs/nakama-js';
import { nakamaService, TelegramUserData } from '../services/nakama';

interface NakamaContextValue {
  session: Session | null;
  isConnected: boolean;
  isConnecting: boolean;
  isSocketConnected: boolean;
  error: string | null;
  connect: (userData: TelegramUserData) => Promise<void>;
  disconnect: () => void;
  connectSocket: () => Promise<void>;
}

const NakamaContext = createContext<NakamaContextValue | null>(null);

export function useNakama() {
  const context = useContext(NakamaContext);
  if (!context) {
    throw new Error('useNakama must be used within a NakamaProvider');
  }
  return context;
}

interface NakamaProviderProps {
  children: ReactNode;
}

export function NakamaProvider({ children }: NakamaProviderProps) {
  const [session, setSession] = useState<Session | null>(nakamaService.getSession());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async (userData: TelegramUserData) => {
    setIsConnecting(true);
    setError(null);

    try {
      const newSession = await nakamaService.authenticateWithTelegram(userData);
      setSession(newSession);
      console.log('[NakamaContext] Connected successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      console.error('[NakamaContext] Connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    nakamaService.logout();
    setSession(null);
    setIsSocketConnected(false);
  }, []);

  const connectSocket = useCallback(async () => {
    try {
      await nakamaService.connectSocket();
      setIsSocketConnected(true);
    } catch (err) {
      console.error('[NakamaContext] Socket connection error:', err);
      setIsSocketConnected(false);
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const existingSession = nakamaService.getSession();
    if (existingSession && nakamaService.isAuthenticated()) {
      setSession(existingSession);
      console.log('[NakamaContext] Restored existing session');
    }
  }, []);

  const value: NakamaContextValue = {
    session,
    isConnected: nakamaService.isAuthenticated(),
    isConnecting,
    isSocketConnected,
    error,
    connect,
    disconnect,
    connectSocket,
  };

  return (
    <NakamaContext.Provider value={value}>
      {children}
    </NakamaContext.Provider>
  );
}
