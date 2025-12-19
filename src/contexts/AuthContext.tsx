import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { api, User } from '../services/api';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateWallet: (walletAddress: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const initData = window.Telegram?.WebApp?.initData;

      if (!initData) {
        // Not in Telegram context - development mode
        console.warn('Not in Telegram context, skipping auth');
        setIsLoading(false);
        return;
      }

      const result = await api.authenticateWithTelegram(initData);
      setUser(result.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!api.getToken()) return;

    try {
      const result = await api.getMe();
      setUser(result.user);
    } catch (err) {
      // Token might be expired
      logout();
    }
  }, [logout]);

  const updateWallet = useCallback(async (walletAddress: string) => {
    if (!user) return;

    try {
      await api.linkWallet(walletAddress);
      // Update local user state with new wallet address
      setUser(prev => prev ? { ...prev, walletAddress } : null);
    } catch (err) {
      console.error('Failed to link wallet:', err);
      throw err;
    }
  }, [user]);

  // Auto-login on mount
  useEffect(() => {
    const token = api.getToken();

    if (token) {
      // Try to use existing token first
      refreshUser().catch(() => {
        // Token invalid, try fresh login
        login();
      });
    } else {
      // No token, try to login with Telegram
      login();
    }
  }, [login, refreshUser]);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    logout,
    refreshUser,
    updateWallet,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
