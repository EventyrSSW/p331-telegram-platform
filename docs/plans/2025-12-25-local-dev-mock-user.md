# Local Development Mock User Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable ProfilePage UI to be viewed on local development server by creating a mock user when not authenticated via Telegram

**Architecture:** Add environment variable flag to enable local dev mode, create mock user data when Telegram context is unavailable, update ProfilePage to show UI with mock data instead of "Not authenticated" message

**Tech Stack:** React, TypeScript, Vite environment variables

---

## Context

Currently, when running the app locally outside of Telegram, the ProfilePage shows:
```
Not authenticated (Telegram context required)
Please open this app in Telegram to see your profile
```

This prevents developers from viewing and testing the ProfilePage UI during local development. We need to add a development mode that creates a mock user so the UI can be displayed and tested.

The AuthContext already handles missing Telegram context gracefully (lines 49-54), but ProfilePage has a guard that shows the error message when `!user` (lines 64-78).

---

## Task 1: Add Environment Variable for Dev Mode

**Files:**
- Modify: `.env.example`
- Create/Modify: `.env.local` (developer's local file)

**Step 1: Add VITE_DEV_MODE to .env.example**

Add to `.env.example`:

```bash
# Development mode - enables mock user when not in Telegram context
VITE_DEV_MODE=false
```

**Step 2: Create/update .env.local for development**

Create or update `.env.local` with:

```bash
VITE_API_URL=http://localhost:3001/api
VITE_APP_URL=http://localhost:5173
VITE_DEV_MODE=true
```

**Step 3: Verify .env.local is in .gitignore**

Run: `cat .gitignore | grep .env.local`
Expected: `.env.local` should be listed

If not listed, add it:
```bash
echo ".env.local" >> .gitignore
```

---

## Task 2: Create Mock User Data Utility

**Files:**
- Create: `src/utils/mockUser.ts`

**Step 1: Create mock user utility file**

Create `src/utils/mockUser.ts`:

```typescript
import { User } from '../services/api';

/**
 * Creates a mock user for local development
 * Only used when VITE_DEV_MODE=true and not in Telegram context
 */
export function createMockUser(): User {
  return {
    id: 'mock-user-123',
    telegramId: 123456789,
    username: 'devuser',
    firstName: 'Dev',
    lastName: 'User',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=devuser',
    coinBalance: 100,
    isPremium: false,
    walletAddress: null,
    languageCode: 'en',
  };
}

/**
 * Check if dev mode is enabled
 */
export function isDevMode(): boolean {
  return import.meta.env.VITE_DEV_MODE === 'true';
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 3: Update AuthContext to Use Mock User in Dev Mode

**Files:**
- Modify: `src/contexts/AuthContext.tsx`

**Step 1: Import mock user utility**

Add import at top of file (after line 9):

```typescript
import { createMockUser, isDevMode } from '../utils/mockUser';
```

**Step 2: Update login function to set mock user**

Replace the "Not in Telegram context" section (lines 49-54) with:

```typescript
      if (!initData) {
        // Not in Telegram context
        if (isDevMode()) {
          // Development mode - use mock user
          console.warn('[Auth] Dev mode enabled, using mock user');
          const mockUser = createMockUser();
          setUser(mockUser);
          // Store mock token so refreshUser doesn't fail
          api.setToken('mock-dev-token');
        } else {
          console.warn('[Auth] Not in Telegram context, skipping auth');
        }
        setIsLoading(false);
        return;
      }
```

**Step 3: Update refreshUser to handle mock token**

Modify the refreshUser function (around line 75-90) to handle mock token:

```typescript
  const refreshUser = useCallback(async () => {
    const token = api.getToken();
    console.log('[Auth] refreshUser called, token exists:', !!token);
    if (!token) return;

    // Skip API call for mock token in dev mode
    if (token === 'mock-dev-token' && isDevMode()) {
      console.log('[Auth] Mock token detected, keeping mock user');
      return;
    }

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
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 4: Update ProfilePage to Remove Dev Mode Guard

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.tsx`

**Context:** The ProfilePage currently shows "Not authenticated" message when `!user`. With our changes, there will be a mock user in dev mode, so this guard is no longer needed. However, we should keep it for production (when not in dev mode).

**Step 1: Import isDevMode utility**

Add import at top of file (after other imports):

```typescript
import { isDevMode } from '../../utils/mockUser';
```

**Step 2: Update the dev mode fallback check**

Replace the development mode fallback section (lines 64-79) with:

```typescript
  // Only show "not authenticated" if truly not authenticated
  // (not in dev mode with mock user)
  if (!user && !isDevMode()) {
    return (
      <div className={styles.container}>
        <div className={styles.profileSection}>
          <div className={styles.avatar}>
            <div className={styles.avatarPlaceholder}>?</div>
          </div>
          <h1 className={styles.username}>Not Authenticated</h1>
          <p className={styles.joinDate}>Telegram context required</p>
        </div>
        <div className={styles.error}>
          Please open this app in Telegram to see your profile
        </div>
      </div>
    );
  }

  // If we reach here in dev mode without user, something is wrong
  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          Failed to initialize user. Check console for errors.
        </div>
      </div>
    );
  }
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 5: Test the Implementation

**Context:** Verify that the ProfilePage UI is now visible in local development

**Step 1: Ensure .env.local has dev mode enabled**

Run: `cat .env.local`
Expected: Should contain `VITE_DEV_MODE=true`

**Step 2: Start the development server**

Run: `npm run dev`
Expected: Server starts on http://localhost:5173

**Step 3: Navigate to profile page**

- Open browser to http://localhost:5173
- Click on "Profile" tab in bottom navigation
- Expected results:
  - ✓ ProfilePage displays full UI (not error message)
  - ✓ Mock avatar with "D" placeholder (from "Dev User")
  - ✓ Username shows "devuser"
  - ✓ Join date shows current month/year
  - ✓ Stats display with mock data or fallback values
  - ✓ "CASH OUT YOUR WINNINGS" button visible
  - ✓ Bottom navigation present
  - ✓ No console errors

**Step 4: Test with dev mode disabled**

Edit `.env.local` and change:
```bash
VITE_DEV_MODE=false
```

Restart dev server:
```bash
# Kill server (Ctrl+C)
npm run dev
```

Navigate to profile page:
- Expected: "Not authenticated" message shows (original behavior)

**Step 5: Re-enable dev mode**

Edit `.env.local`:
```bash
VITE_DEV_MODE=true
```

Restart server and verify profile UI shows again.

**Step 6: Test Header shows mock user data**

- Check header badges show values (rank #42, coins 100, TON $0)
- Expected: All badges display correctly

**Step 7: Test navigation between pages**

- Navigate from Profile → Play → Results → Profile
- Expected: Mock user persists, no re-authentication required

---

## Task 6: Add Developer Documentation

**Files:**
- Modify: `README.md` or create `docs/LOCAL_DEVELOPMENT.md`

**Step 1: Add dev mode documentation**

Add section to README.md or create `docs/LOCAL_DEVELOPMENT.md`:

```markdown
## Local Development Mode

When developing outside of the Telegram environment, you can enable a mock user to view and test the UI.

### Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Enable dev mode in `.env.local`:
   ```env
   VITE_DEV_MODE=true
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

### Mock User Data

In dev mode, a mock user is automatically created with:
- **Username:** devuser
- **Name:** Dev User
- **Coin Balance:** 100
- **Telegram ID:** 123456789
- **Avatar:** Randomly generated

The mock user allows you to:
- View and test the Profile page UI
- Test components that require authentication
- Develop features without Telegram context

### Disabling Dev Mode

To test the production behavior (authentication required):

1. Set `VITE_DEV_MODE=false` in `.env.local`
2. Restart the dev server
3. App will now require Telegram authentication

**Note:** Dev mode only works in development. Production builds always require real Telegram authentication regardless of the env variable.
```

**Step 2: Verify documentation is clear**

Read through the documentation to ensure:
- ✓ Setup steps are clear
- ✓ Mock user data is documented
- ✓ How to disable is explained
- ✓ Security note about production included

---

## Execution Complete

After Task 6, the implementation is complete. Developers can now:

✅ View ProfilePage UI in local development
✅ Test UI components without Telegram
✅ Toggle dev mode on/off as needed
✅ Use mock user data for development

### Environment Variable Summary

```bash
# .env.local (for development)
VITE_DEV_MODE=true

# .env.example (template)
VITE_DEV_MODE=false
```

### Files Changed

1. `.env.example` - Added VITE_DEV_MODE variable
2. `.env.local` - Created with dev mode enabled
3. `src/utils/mockUser.ts` - New utility for mock user
4. `src/contexts/AuthContext.tsx` - Uses mock user in dev mode
5. `src/pages/ProfilePage/ProfilePage.tsx` - Updated guard logic
6. `README.md` or `docs/LOCAL_DEVELOPMENT.md` - Added documentation

### Security Notes

- Mock user only works when `VITE_DEV_MODE=true`
- `.env.local` is git-ignored (not committed)
- Production builds ignore dev mode
- Mock token (`mock-dev-token`) doesn't grant real API access
