# Telegram User Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-save Telegram user data to database on app launch and provide authenticated user context throughout the app.

**Architecture:** When the app launches, the frontend extracts Telegram initData, calls a new `/api/auth/telegram` endpoint which verifies the data and upserts the user to the database. The backend returns a JWT token that the frontend stores and uses for subsequent authenticated requests. An `AuthContext` provides user state and loading status to all components.

**Tech Stack:** Express.js, Prisma, JWT (jsonwebtoken), React Context API, Zod validation

---

## Task 1: Install jsonwebtoken package

**Files:**
- Modify: `server/package.json`

**Step 1: Install the dependency**

```bash
cd /Users/olegvoytenko/Development/p331-telegram-platform/server
npm install jsonwebtoken
npm install -D @types/jsonwebtoken
```

**Step 2: Verify installation**

Run: `npm ls jsonwebtoken`
Expected: Shows jsonwebtoken version

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add jsonwebtoken for auth"
```

---

## Task 2: Create auth service

**Files:**
- Create: `server/src/services/authService.ts`

**Step 1: Create the auth service with JWT handling**

```typescript
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../db/client';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface AuthPayload {
  userId: string;
  telegramId: number;
}

export class AuthService {
  /**
   * Authenticate user from Telegram data and return JWT
   */
  async authenticateFromTelegram(telegramUser: TelegramUser) {
    // Upsert user to database
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(telegramUser.id) },
      update: {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      },
      create: {
        telegramId: BigInt(telegramUser.id),
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      },
    });

    // Generate JWT token
    const token = this.generateToken({
      userId: user.id,
      telegramId: telegramUser.id,
    });

    return {
      token,
      user: {
        id: user.id,
        telegramId: Number(user.telegramId),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        coinBalance: user.coinBalance,
        walletAddress: user.walletAddress,
      },
    };
  }

  /**
   * Generate JWT token
   */
  private generateToken(payload: AuthPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): AuthPayload | null {
    try {
      return jwt.verify(token, config.jwt.secret) as AuthPayload;
    } catch {
      return null;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    return {
      id: user.id,
      telegramId: Number(user.telegramId),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      coinBalance: user.coinBalance,
      walletAddress: user.walletAddress,
    };
  }
}

export const authService = new AuthService();
```

**Step 2: Verify file compiles**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform/server && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/services/authService.ts
git commit -m "feat: add auth service with JWT handling"
```

---

## Task 3: Create auth controller

**Files:**
- Create: `server/src/controllers/authController.ts`
- Create: `server/src/schemas/auth.ts`

**Step 1: Create auth schemas**

```typescript
// server/src/schemas/auth.ts
import { z } from 'zod';

export const telegramAuthSchema = z.object({
  initData: z.string().min(1, 'initData is required'),
});

export type TelegramAuthInput = z.infer<typeof telegramAuthSchema>;
```

**Step 2: Create auth controller**

```typescript
// server/src/controllers/authController.ts
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { verifyTelegramWebAppData } from '../utils/telegram';
import { telegramAuthSchema } from '../schemas/auth';
import { config } from '../config';

export const authController = {
  /**
   * POST /api/auth/telegram
   * Authenticate user from Telegram initData
   */
  async authenticate(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = telegramAuthSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }

      const { initData } = parsed.data;

      // Verify Telegram data
      const verified = verifyTelegramWebAppData(initData, config.telegram.botToken);

      if (!verified) {
        return res.status(401).json({ error: 'Invalid Telegram authentication' });
      }

      // Authenticate and get token
      const result = await authService.authenticateFromTelegram(verified.user);

      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/me
   * Get current authenticated user
   */
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization token' });
      }

      const token = authHeader.substring(7);
      const payload = authService.verifyToken(token);

      if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const user = await authService.getUserById(payload.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      next(error);
    }
  },
};
```

**Step 3: Verify files compile**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform/server && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/schemas/auth.ts src/controllers/authController.ts
git commit -m "feat: add auth controller with telegram authentication"
```

---

## Task 4: Create auth routes

**Files:**
- Create: `server/src/routes/auth.ts`
- Modify: `server/src/routes/index.ts`

**Step 1: Create auth routes**

```typescript
// server/src/routes/auth.ts
import { Router } from 'express';
import { authController } from '../controllers/authController';

const router = Router();

router.post('/telegram', authController.authenticate);
router.get('/me', authController.getMe);

export default router;
```

**Step 2: Add auth routes to main router**

Modify `server/src/routes/index.ts` to add auth routes:

```typescript
import { Router } from 'express';
import gamesRoutes from './games';
import usersRoutes from './users';
import configRoutes from './config';
import authRoutes from './auth';
import { telegramAuthMiddleware } from '../middleware/telegramAuth';

const router = Router();

// Health check (public)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
router.use('/games', gamesRoutes);
router.use('/config', configRoutes);
router.use('/auth', authRoutes);

// Protected routes
router.use('/users', telegramAuthMiddleware, usersRoutes);

export default router;
```

**Step 3: Verify files compile**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform/server && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/routes/auth.ts src/routes/index.ts
git commit -m "feat: add auth routes"
```

---

## Task 5: Build and test backend auth endpoint

**Step 1: Build the server**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform/server && npm run build`
Expected: Build succeeds

**Step 2: Test the endpoint responds**

Run server and test:
```bash
# In one terminal
cd /Users/olegvoytenko/Development/p331-telegram-platform/server && node dist/index.js

# In another terminal - test with invalid data (should fail gracefully)
curl -X POST http://localhost:3001/api/auth/telegram \
  -H "Content-Type: application/json" \
  -d '{"initData": "test"}'
```

Expected: `{"error":"Invalid Telegram authentication"}` (401 status)

**Step 3: Test /me without token**

```bash
curl http://localhost:3001/api/auth/me
```

Expected: `{"error":"Missing authorization token"}` (401 status)

**Step 4: Commit**

```bash
git add .
git commit -m "test: verify auth endpoints work"
```

---

## Task 6: Add auth to frontend API service

**Files:**
- Modify: `src/services/api.ts`

**Step 1: Add auth methods and token handling**

Update `src/services/api.ts`:

```typescript
import { ApiError } from '../utils/errors';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'p331_auth_token';

export interface Game {
  id: string;
  slug: string;
  title: string;
  thumbnail: string;
  category: string;
  description?: string;
  featured?: boolean;
}

export interface User {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  coinBalance: number;
  walletAddress: string | null;
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

export interface AuthResponse {
  token: string;
  user: User;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on init
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

    // Add Telegram init data for legacy endpoints
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

  // Auth methods
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

  // Game methods
  async getGames(): Promise<{ games: Game[] }> {
    return this.fetch<{ games: Game[] }>('/games');
  }

  async getFeaturedGame(): Promise<{ game: Game }> {
    return this.fetch<{ game: Game }>('/games/featured');
  }

  async getGame(id: string): Promise<{ game: Game }> {
    return this.fetch<{ game: Game }>(`/games/${id}`);
  }

  // User methods
  async getUserBalance(): Promise<UserBalance> {
    return this.fetch<UserBalance>('/users/me/balance');
  }

  async addCoins(
    amount: number,
    transactionHash?: string
  ): Promise<UserBalance> {
    return this.fetch<UserBalance>('/users/me/add-coins', {
      method: 'POST',
      body: JSON.stringify({ amount, transactionHash }),
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

  // Config methods
  async getConfig(): Promise<AppConfig> {
    return this.fetch<AppConfig>('/config');
  }
}

export const api = new ApiService();
```

**Step 2: Verify file compiles**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform && npx tsc --noEmit`
Expected: No errors (or only existing errors)

**Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: add auth methods to API service"
```

---

## Task 7: Create AuthContext

**Files:**
- Create: `src/contexts/AuthContext.tsx`

**Step 1: Create auth context with auto-login**

```typescript
// src/contexts/AuthContext.tsx
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

  // Auto-login on mount if we have Telegram context
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Step 2: Verify file compiles**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/contexts/AuthContext.tsx
git commit -m "feat: add AuthContext with auto-login"
```

---

## Task 8: Add AuthProvider to App

**Files:**
- Modify: `src/App.tsx`

**Step 1: Update App.tsx to use AuthProvider**

```typescript
import { RouterProvider } from 'react-router-dom'
import { TelegramProvider, useTelegram } from './providers/TelegramProvider'
import { TonConnectProvider } from './providers/TonConnectProvider'
import { ConfigProvider } from './contexts/ConfigContext'
import { AuthProvider } from './contexts/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { router } from './router'

function AppContent() {
  const { isReady } = useTelegram()

  if (!isReady) {
    return <div>Loading...</div>
  }

  return <RouterProvider router={router} />
}

function App() {
  return (
    <ErrorBoundary>
      <TonConnectProvider>
        <ConfigProvider>
          <TelegramProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </TelegramProvider>
        </ConfigProvider>
      </TonConnectProvider>
    </ErrorBoundary>
  )
}

export default App
```

**Step 2: Verify file compiles**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add AuthProvider to app"
```

---

## Task 9: Update pages to use auth context

**Files:**
- Modify: `src/pages/SettingsPage/SettingsPage.tsx` (or wherever balance is displayed)

**Step 1: Find and update components that show user data**

First, find pages that use user data:

```bash
grep -r "coinBalance\|balance\|getUserBalance" src/
```

**Step 2: Update SettingsPage to use AuthContext**

Update the component to use `useAuth()` instead of separate API calls:

```typescript
// Example update - use auth context for user data
import { useAuth } from '../../contexts/AuthContext';

// In the component:
const { user, refreshUser } = useAuth();

// Use user.coinBalance instead of separate API call
// Call refreshUser() after coin purchases
```

**Step 3: Verify compilation**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/pages/
git commit -m "feat: update pages to use auth context"
```

---

## Task 10: Test end-to-end in Telegram

**Step 1: Build frontend**

```bash
cd /Users/olegvoytenko/Development/p331-telegram-platform
npm run build
```

**Step 2: Deploy backend**

```bash
# On Hetzner server
cd /opt/p331-telegram-platform
bash deploy.sh
```

**Step 3: Deploy frontend to Vercel**

```bash
cd /Users/olegvoytenko/Development/p331-telegram-platform
vercel --prod
```

**Step 4: Test in Telegram**

1. Open the Mini App in Telegram
2. Check browser dev tools Network tab for `/api/auth/telegram` call
3. Verify response contains `token` and `user` object
4. Check subsequent requests have `Authorization: Bearer <token>` header

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete telegram auth integration"
git push origin main
```

---

## Summary

This implementation:

1. **Backend**: Creates `/api/auth/telegram` endpoint that:
   - Receives Telegram `initData`
   - Verifies it using HMAC
   - Upserts user to database
   - Returns JWT token + user data

2. **Frontend**: Creates `AuthContext` that:
   - Auto-authenticates on app launch using Telegram data
   - Stores JWT in localStorage
   - Provides `user`, `isLoading`, `isAuthenticated` to all components
   - Includes `refreshUser()` for updating after purchases

3. **Security**:
   - JWT tokens expire in 7 days (configurable in config.ts)
   - Telegram initData verified with bot token HMAC
   - Auth date checked to be within 1 hour
