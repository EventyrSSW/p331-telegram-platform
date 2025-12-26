# Fix Loading State in Dev Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the infinite loading state that occurs when using dev mode with mock user

**Architecture:** The issue is in AuthContext's useEffect. When a mock token exists and `refreshUser()` returns early (due to mock token check), the loading state is never set to false. Fix by ensuring loading state is always resolved.

**Tech Stack:** React, TypeScript, Vite environment variables

---

## Root Cause

In `src/contexts/AuthContext.tsx:122-138`, the auto-login useEffect flow:

1. Finds mock token in storage
2. Calls `refreshUser()`
3. `refreshUser()` detects mock token and returns early (line 91-94)
4. Promise resolves but `setIsLoading(false)` on line 132 is never executed
5. App stays in loading state forever

## Solution

Ensure `setIsLoading(false)` is called in all paths, including when mock token is detected.

---

### Task 1: Fix refreshUser to Set Loading State

**Files:**
- Modify: `src/contexts/AuthContext.tsx:85-106`

**Step 1: Review current refreshUser implementation**

Current code returns early for mock token without setting loading state:

```typescript
const refreshUser = useCallback(async () => {
  const token = api.getToken();
  console.log('[Auth] refreshUser called, token exists:', !!token);
  if (!token) return;

  // Skip API call for mock token in dev mode
  if (token === 'mock-dev-token' && isDevMode()) {
    console.log('[Auth] Mock token detected, keeping mock user');
    return;  // ← Problem: returns without resolving loading state
  }

  try {
    // ... API call
  } catch (err) {
    // ... error handling
  }
}, [logout]);
```

**Step 2: Update useEffect to handle all cases**

The better fix is in the useEffect that calls refreshUser. Modify lines 122-138:

```typescript
// Auto-login on mount
useEffect(() => {
  const token = api.getToken();
  console.log('[Auth] useEffect mount, token exists:', !!token);

  if (token) {
    // Check if it's a mock token in dev mode
    if (token === 'mock-dev-token' && isDevMode()) {
      console.log('[Auth] Mock token detected, user already set');
      setIsLoading(false);
      return;
    }

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
```

**Step 3: Test the fix**

Run: `npm run dev`

Navigate to: http://localhost:5174/

Expected:
- No infinite loading state
- ProfilePage renders with mock user
- Console shows: `[Auth] Mock token detected, user already set`

**Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`

Expected: No errors

**Step 5: Run tests**

Run: `npm test`

Expected: All tests pass

**Step 6: Commit**

```bash
git add src/contexts/AuthContext.tsx
git commit -m "fix: resolve loading state when using mock token in dev mode

- Check for mock token in useEffect before calling refreshUser
- Set loading to false immediately when mock token detected
- Prevents infinite loading state in dev mode

Fixes issue where ProfilePage showed 'Loading...' forever in dev mode"
```

---

### Task 2: Add Defensive Logging

**Files:**
- Modify: `src/contexts/AuthContext.tsx:42-78`

**Step 1: Add loading state log to login function**

Update the login function to log when loading state changes:

At line 76 (the finally block), update:

```typescript
} finally {
  console.log('[Auth] Login complete, setting isLoading=false');
  setIsLoading(false);
}
```

No change needed - logging already exists.

**Step 2: Verify logging works**

Run: `npm run dev`

Open browser console

Expected logs:
```
[Auth] useEffect mount, token exists: true
[Auth] Mock token detected, user already set
```

**Step 3: Commit**

No changes needed - logging already adequate.

---

### Task 3: Test All Auth Flows

**Files:**
- None (manual testing)

**Step 1: Test dev mode with no existing token**

```bash
# Clear localStorage
# In browser console:
localStorage.clear()
# Reload page
```

Expected:
- Mock user created
- No loading state
- ProfilePage renders

**Step 2: Test dev mode with existing mock token**

```bash
# Reload page (token should exist from Step 1)
```

Expected:
- Mock user loaded from existing token
- No loading state
- ProfilePage renders

**Step 3: Test production mode (Telegram required)**

Update `.env.local`:
```bash
VITE_DEV_MODE=false
```

Restart dev server

Expected:
- Shows "Not authenticated" error
- No infinite loading

**Step 4: Restore dev mode**

Update `.env.local`:
```bash
VITE_DEV_MODE=true
```

Restart dev server

Expected:
- Mock user works again

**Step 5: Document testing**

No commit needed - testing only.

---

### Task 4: Update Documentation

**Files:**
- Modify: `docs/DEVELOPMENT.md:81-95`

**Step 1: Add troubleshooting entry for loading state**

Add to the Troubleshooting section:

```markdown
### Stuck on "Loading..." screen

If the page shows "Loading..." indefinitely:

1. Open browser console (F12)
2. Look for auth logs with `[Auth]` prefix
3. Check what's happening in the auth flow

Common causes:
- Old mock token in localStorage (clear with `localStorage.clear()`)
- Dev server needs restart after changing `VITE_DEV_MODE`
- Browser cache issue (hard refresh with Cmd+Shift+R / Ctrl+Shift+R)
```

**Step 2: Verify markdown formatting**

Visual check - ensure markdown is properly formatted.

**Step 3: Commit**

```bash
git add docs/DEVELOPMENT.md
git commit -m "docs: add troubleshooting for loading state in dev mode"
```

---

## Testing Checklist

- [ ] Dev mode with no token → mock user created, no loading
- [ ] Dev mode with mock token → user loaded, no loading
- [ ] Production mode → shows auth error, no loading
- [ ] All existing tests pass
- [ ] TypeScript compiles without errors

---

## Notes for Implementation

- The root cause is the early return in the useEffect logic
- The fix moves the mock token check before calling `refreshUser()`
- This ensures `setIsLoading(false)` is always called
- The mock user is already set by the `login()` call, so we just need to stop loading
