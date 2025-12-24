import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { api, User } from '../services/api';

// Web debug mode configuration
const WEB_DEBUG_ENABLED = import.meta.env.VITE_ALLOW_WEB_DEBUG === 'true';
const DEBUG_STORAGE_KEY = 'debug_user_credentials';

interface DebugCredentials {
  telegramId: number;
  username: string;
}

function getDebugCredentials(): DebugCredentials | null {
  try {
    const stored = localStorage.getItem(DEBUG_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function saveDebugCredentials(credentials: DebugCredentials): void {
  localStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(credentials));
}

function promptDebugCredentials(): DebugCredentials | null {
  const stored = getDebugCredentials();

  const telegramIdStr = window.prompt(
    'Enter Telegram ID for debug:',
    stored?.telegramId?.toString() || '123456789'
  );

  if (!telegramIdStr) return null;

  const username = window.prompt(
    'Enter Username for debug:',
    stored?.username || 'debug_user'
  );

  if (!username) return null;

  const telegramId = parseInt(telegramIdStr, 10);
  if (isNaN(telegramId)) {
    alert('Invalid Telegram ID');
    return null;
  }

  const credentials = { telegramId, username };
  saveDebugCredentials(credentials);
  return credentials;
}


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
      console.log('[Auth] Starting login, initData exists:', !!initData);

      if (!initData) {
        // Not in Telegram context
        if (WEB_DEBUG_ENABLED) {
          console.log('[Auth] Web debug mode enabled, prompting for credentials...');
          const credentials = promptDebugCredentials();

          if (credentials) {
            try {
              console.log('[Auth] Calling debug authentication API...');
              const result = await api.authenticateWithDebug(
                credentials.telegramId,
                credentials.username
              );
              console.log('[Auth] Debug login successful, user:', result.user?.telegramId);
              setUser(result.user);
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Debug authentication failed';
              setError(message);
              console.error('[Auth] Debug login error:', err);
            }
          } else {
            console.warn('[Auth] Debug login cancelled by user');
          }
        } else {
          console.warn('[Auth] Not in Telegram context and debug mode disabled, skipping auth');
        }
        setIsLoading(false);
        return;
      }

      console.log('[Auth] Calling authenticateWithTelegram...');
      const result = await api.authenticateWithTelegram(initData);
      console.log('[Auth] Login successful, user:', result.user?.telegramId);
      setUser(result.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
      console.error('[Auth] Login error:', err);
    } finally {
      console.log('[Auth] Login complete, setting isLoading=false');
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = api.getToken();
    console.log('[Auth] refreshUser called, token exists:', !!token);
    if (!token) return;

    try {
      console.log('[Auth] Calling getMe...');
      const result = await api.getMe();
      console.log('[Auth] getMe success, user:', result.user?.telegramId);
      setUser(result.user);
    } catch (err) {
      console.error('[Auth] getMe failed, logging out:', err);
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
    console.log('[Auth] useEffect mount, token exists:', !!token);

    if (token) {
      // Try to use existing token first
      console.log('[Auth] Trying existing token...');
      refreshUser()
        .then(() => {
          console.log('[Auth] Token refresh succeeded');
          setIsLoading(false);
        })
        .catch(() => {
          // Token invalid, try fresh login
          console.log('[Auth] Token refresh failed, trying fresh login');
          login();
        });
    } else {
      // No token, try to login with Telegram
      console.log('[Auth] No token, starting fresh login');
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
