# Wallet Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Save connected TON wallet address to the backend database so it persists across sessions and displays when user returns.

**Architecture:** When user connects wallet via TonConnect, call a new `/api/users/me/link-wallet` endpoint to save the address. The User object already has `walletAddress` field - we just need to wire up the frontend to save it and display the saved address on return.

**Tech Stack:** Express.js, Prisma, TonConnect, React

---

## Task 1: Add link-wallet endpoint to users controller

**Files:**
- Modify: `server/src/controllers/usersController.ts`
- Modify: `server/src/schemas/users.ts`

**Step 1: Add Zod schema for wallet linking**

In `server/src/schemas/users.ts`, add:

```typescript
export const linkWalletSchema = z.object({
  walletAddress: z.string().min(1, 'Wallet address is required'),
});
```

**Step 2: Add linkWallet controller method**

In `server/src/controllers/usersController.ts`, add:

```typescript
async linkWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const telegramUser = req.telegramUser!;
    const bodyParse = linkWalletSchema.safeParse(req.body);

    if (!bodyParse.success) {
      return res.status(400).json({ error: bodyParse.error.issues[0].message });
    }

    const { walletAddress } = bodyParse.data;

    const user = await userService.linkWallet(telegramUser.id, walletAddress);

    res.json({
      telegramId: telegramUser.id,
      walletAddress: user.walletAddress,
    });
  } catch (error) {
    next(error);
  }
},
```

**Step 3: Import the schema at top of controller**

Add `linkWalletSchema` to the imports from `../schemas/users`.

**Step 4: Verify compilation**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform/server && npx tsc --noEmit`

Expected: No errors

**Step 5: Commit**

```bash
git add src/controllers/usersController.ts src/schemas/users.ts
git commit -m "feat: add linkWallet controller endpoint"
```

---

## Task 2: Add route for link-wallet

**Files:**
- Modify: `server/src/routes/users.ts`

**Step 1: Add the route**

Add after existing routes:

```typescript
router.post('/me/link-wallet', usersController.linkWallet);
```

**Step 2: Verify compilation**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform/server && npx tsc --noEmit`

Expected: No errors

**Step 3: Commit**

```bash
git add src/routes/users.ts
git commit -m "feat: add link-wallet route"
```

---

## Task 3: Add linkWallet method to frontend API

**Files:**
- Modify: `src/services/api.ts`

**Step 1: Add the API method**

Add after `deductCoins` method:

```typescript
async linkWallet(walletAddress: string): Promise<{ telegramId: number; walletAddress: string }> {
  return this.fetch<{ telegramId: number; walletAddress: string }>('/users/me/link-wallet', {
    method: 'POST',
    body: JSON.stringify({ walletAddress }),
  });
}
```

**Step 2: Verify compilation**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform && npx tsc --noEmit`

Expected: No errors

**Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: add linkWallet API method"
```

---

## Task 4: Add updateWallet to AuthContext

**Files:**
- Modify: `src/contexts/AuthContext.tsx`

**Step 1: Add updateWallet method to interface**

Update `AuthContextValue` interface:

```typescript
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
```

**Step 2: Implement updateWallet in provider**

Add after `refreshUser`:

```typescript
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
```

**Step 3: Add updateWallet to value object**

Update the `value` object:

```typescript
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
```

**Step 4: Verify compilation**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform && npx tsc --noEmit`

Expected: No errors

**Step 5: Commit**

```bash
git add src/contexts/AuthContext.tsx
git commit -m "feat: add updateWallet to AuthContext"
```

---

## Task 5: Update SettingsPage to save and display wallet

**Files:**
- Modify: `src/pages/SettingsPage/SettingsPage.tsx`

**Step 1: Get updateWallet from useAuth**

Update the destructuring:

```typescript
const { user, isLoading, refreshUser, updateWallet } = useAuth();
```

**Step 2: Add useEffect to sync wallet on connect**

Add after the hooks:

```typescript
// Sync wallet address to backend when connected
useEffect(() => {
  const syncWallet = async () => {
    if (wallet && user && wallet.account.address !== user.walletAddress) {
      try {
        await updateWallet(wallet.account.address);
      } catch (err) {
        console.error('Failed to sync wallet:', err);
      }
    }
  };
  syncWallet();
}, [wallet, user, updateWallet]);
```

**Step 3: Display saved wallet address when not connected**

Update the wallet display logic in the JSX - show saved wallet even if TonConnect not currently connected:

Replace the wallet section:

```typescript
<Section title="TON Wallet">
  {wallet ? (
    <div className={styles.walletConnected}>
      <div className={styles.walletInfo}>
        <div>
          <div className={styles.walletLabel}>Connected Wallet</div>
          <div className={styles.walletAddress}>
            {truncateAddress(wallet.account.address)}
          </div>
        </div>
        <button
          className={styles.disconnectButton}
          onClick={handleDisconnectWallet}
        >
          Disconnect
        </button>
      </div>
    </div>
  ) : user?.walletAddress ? (
    <div className={styles.walletConnected}>
      <div className={styles.walletInfo}>
        <div>
          <div className={styles.walletLabel}>Saved Wallet</div>
          <div className={styles.walletAddress}>
            {truncateAddress(user.walletAddress)}
          </div>
        </div>
        <button
          className={styles.connectButton}
          onClick={handleConnectWallet}
        >
          Reconnect
        </button>
      </div>
    </div>
  ) : (
    <button className={styles.connectButton} onClick={handleConnectWallet}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 18V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V6M16 12H22M22 12L19 9M22 12L19 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span>Connect TON Wallet</span>
    </button>
  )}
</Section>
```

**Step 4: Verify compilation**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform && npx tsc --noEmit`

Expected: No errors

**Step 5: Commit**

```bash
git add src/pages/SettingsPage/SettingsPage.tsx
git commit -m "feat: save wallet on connect and display saved wallet"
```

---

## Task 6: Build and push

**Step 1: Build server**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform/server && npm run build`

Expected: Build succeeds

**Step 2: Build frontend**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform && npm run build`

Expected: Build succeeds

**Step 3: Push all changes**

```bash
git push origin main
```

---

## Task 7: Deploy

**On Hetzner server:**

```bash
cd /opt/p331-telegram-platform
bash deploy.sh
```

**Test in Telegram:**
1. Open Mini App
2. Connect wallet
3. Close and reopen app
4. Wallet should show as "Saved Wallet" with address displayed
5. Click "Reconnect" to connect again

---

## Summary

After implementation:
- Wallet address saved to DB when user connects
- Saved wallet displayed when user returns (even if TonConnect session expired)
- "Reconnect" button shown for saved wallets
- User object includes `walletAddress` for use anywhere in app
