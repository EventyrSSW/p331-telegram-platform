# Nakama Frontend Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Nakama game server with the frontend for authentication using Telegram ID and syncing user profile data.

**Architecture:** Create a NakamaService that handles connection to Nakama server. Use `authenticateCustom` with Telegram ID as the custom identifier. After authentication, update the Nakama account with Telegram user data (displayName, avatarUrl, etc.). The NakamaContext will manage the session state and provide hooks for components.

**Tech Stack:** @heroiclabs/nakama-js, React Context, TypeScript

---

## Current State Analysis

**Existing Auth Flow:**
1. `AuthContext` authenticates via our Express backend (`/auth/telegram`)
2. Backend validates Telegram `initData` and returns JWT + User
3. User data stored in `AuthContext.user`

**Nakama Test Examples:**
- `authenticateDevice(deviceId, create, username)` - creates/gets user
- `updateAccount(session, { displayName, avatarUrl, ... })` - updates profile
- `getAccount(session)` - gets user data

**Integration Strategy:**
- Keep existing Express auth for our backend data (coinBalance, walletAddress)
- Add parallel Nakama auth using Telegram ID as custom identifier
- Sync Telegram profile to Nakama account

---

### Task 1: Install Nakama JS SDK

**Files:**
- Modify: `package.json`

**Step 1: Install dependency**

Run:
```bash
npm install @heroiclabs/nakama-js
```

**Step 2: Verify installation**

Run: `npm ls @heroiclabs/nakama-js`
Expected: Shows version 2.x.x installed

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @heroiclabs/nakama-js dependency"
```

---

### Task 2: Create Nakama configuration

**Files:**
- Create: `src/config/nakama.ts`

**Step 1: Create config file**

```typescript
export const nakamaConfig = {
  serverKey: 'defaultkey',
  host: import.meta.env.VITE_NAKAMA_HOST || '136.243.136.206',
  port: import.meta.env.VITE_NAKAMA_PORT ? parseInt(import.meta.env.VITE_NAKAMA_PORT) : 7350,
  useSSL: import.meta.env.VITE_NAKAMA_USE_SSL === 'true',
};
```

**Step 2: Add environment variables to .env.example**

Add to `.env.example`:
```
# Nakama Server
VITE_NAKAMA_HOST=136.243.136.206
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_USE_SSL=false
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/config/nakama.ts .env.example
git commit -m "feat: add Nakama server configuration"
```

---

### Task 3: Create NakamaService

**Files:**
- Create: `src/services/nakama.ts`

**Step 1: Create service file**

```typescript
import { Client, Session } from '@heroiclabs/nakama-js';
import { nakamaConfig } from '../config/nakama';

const SESSION_KEY = 'nakama_session';

interface TelegramUserData {
  telegramId: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  languageCode?: string | null;
  isPremium?: boolean;
}

class NakamaService {
  private client: Client;
  private session: Session | null = null;

  constructor() {
    this.client = new Client(
      nakamaConfig.serverKey,
      nakamaConfig.host,
      nakamaConfig.port.toString(),
      nakamaConfig.useSSL
    );

    // Try to restore session from storage
    this.restoreSession();
  }

  private restoreSession(): void {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        this.session = Session.restore(parsed.token, parsed.refresh_token);

        // Check if session is expired
        if (this.session.isexpired(Date.now() / 1000)) {
          console.log('[Nakama] Stored session expired');
          this.session = null;
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch (error) {
      console.error('[Nakama] Failed to restore session:', error);
      localStorage.removeItem(SESSION_KEY);
    }
  }

  private saveSession(session: Session): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      token: session.token,
      refresh_token: session.refresh_token,
    }));
  }

  async authenticateWithTelegram(userData: TelegramUserData): Promise<Session> {
    const customId = `telegram_${userData.telegramId}`;
    const username = userData.username || `user_${userData.telegramId}`;

    console.log('[Nakama] Authenticating with Telegram ID:', userData.telegramId);

    try {
      // Authenticate with custom ID (Telegram ID)
      this.session = await this.client.authenticateCustom(
        customId,
        true, // create if doesn't exist
        username
      );

      console.log('[Nakama] Authenticated, user ID:', this.session.user_id);
      this.saveSession(this.session);

      // Update account with Telegram profile data
      await this.updateAccountFromTelegram(userData);

      return this.session;
    } catch (error) {
      console.error('[Nakama] Authentication failed:', error);
      throw error;
    }
  }

  private async updateAccountFromTelegram(userData: TelegramUserData): Promise<void> {
    if (!this.session) return;

    const displayName = [userData.firstName, userData.lastName]
      .filter(Boolean)
      .join(' ') || userData.username || `User ${userData.telegramId}`;

    try {
      await this.client.updateAccount(this.session, {
        displayName,
        avatarUrl: userData.photoUrl || undefined,
        langTag: userData.languageCode || undefined,
      });
      console.log('[Nakama] Account updated with Telegram data');
    } catch (error) {
      console.error('[Nakama] Failed to update account:', error);
      // Don't throw - account update is not critical
    }
  }

  async getAccount() {
    if (!this.session) {
      throw new Error('Not authenticated');
    }
    return this.client.getAccount(this.session);
  }

  async refreshSession(): Promise<Session | null> {
    if (!this.session) return null;

    try {
      this.session = await this.client.sessionRefresh(this.session);
      this.saveSession(this.session);
      return this.session;
    } catch (error) {
      console.error('[Nakama] Session refresh failed:', error);
      this.session = null;
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  getSession(): Session | null {
    return this.session;
  }

  getClient(): Client {
    return this.client;
  }

  isAuthenticated(): boolean {
    return this.session !== null && !this.session.isexpired(Date.now() / 1000);
  }

  logout(): void {
    if (this.session) {
      this.client.sessionLogout(this.session).catch(console.error);
    }
    this.session = null;
    localStorage.removeItem(SESSION_KEY);
  }
}

export const nakamaService = new NakamaService();
export type { TelegramUserData };
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/services/nakama.ts
git commit -m "feat: create NakamaService for server communication"
```

---

### Task 4: Create NakamaContext

**Files:**
- Create: `src/contexts/NakamaContext.tsx`

**Step 1: Create context file**

```typescript
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
  error: string | null;
  connect: (userData: TelegramUserData) => Promise<void>;
  disconnect: () => void;
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
    error,
    connect,
    disconnect,
  };

  return (
    <NakamaContext.Provider value={value}>
      {children}
    </NakamaContext.Provider>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/contexts/NakamaContext.tsx
git commit -m "feat: create NakamaContext for session management"
```

---

### Task 5: Integrate NakamaProvider into App

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add NakamaProvider import**

Add import at top:
```typescript
import { NakamaProvider } from './contexts/NakamaContext';
```

**Step 2: Wrap app with NakamaProvider**

Add `<NakamaProvider>` wrapper inside `<AuthProvider>`:
```tsx
<AuthProvider>
  <NakamaProvider>
    {/* existing content */}
  </NakamaProvider>
</AuthProvider>
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add NakamaProvider to app"
```

---

### Task 6: Connect to Nakama after Telegram auth

**Files:**
- Modify: `src/contexts/AuthContext.tsx`

**Step 1: Import useNakama (optional - using events instead)**

Instead of tight coupling, we'll connect Nakama from a separate effect in the app.

**Alternative approach - Modify App.tsx to auto-connect:**

Create a new component `src/components/NakamaConnector.tsx`:

```typescript
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNakama } from '../contexts/NakamaContext';

export function NakamaConnector() {
  const { user, isAuthenticated } = useAuth();
  const { connect, isConnected, isConnecting } = useNakama();

  useEffect(() => {
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
```

**Step 2: Add NakamaConnector to App.tsx**

Inside the NakamaProvider, add:
```tsx
<NakamaConnector />
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/NakamaConnector.tsx src/App.tsx
git commit -m "feat: auto-connect to Nakama after Telegram auth"
```

---

### Task 7: Test the integration

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Check browser console**

Expected logs:
```
[Auth] Login successful, user: <telegramId>
[NakamaConnector] User authenticated, connecting to Nakama...
[Nakama] Authenticating with Telegram ID: <telegramId>
[Nakama] Authenticated, user ID: <nakamaUserId>
[Nakama] Account updated with Telegram data
[NakamaContext] Connected successfully
```

**Step 3: Verify in Nakama console**

- Navigate to Nakama admin (http://136.243.136.206:7351)
- Check Users section for new user with Telegram display name

**Step 4: Push changes**

```bash
git push
```

---

## Summary

After implementation:

1. **User opens app in Telegram** → TelegramProvider initializes
2. **AuthContext authenticates** → Gets user from our backend
3. **NakamaConnector detects auth** → Calls `nakamaService.authenticateWithTelegram()`
4. **Nakama creates/updates user** → Using `telegram_<id>` as custom identifier
5. **Profile synced** → displayName, avatarUrl, langTag from Telegram data
6. **Session stored** → Persisted to localStorage for quick reconnection

The Nakama session can now be used for:
- Real-time multiplayer (WebSocket)
- Leaderboards
- Matchmaking
- Social features
- Storage
