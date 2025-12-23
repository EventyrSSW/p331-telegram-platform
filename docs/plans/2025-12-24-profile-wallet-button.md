# Profile Page Wallet Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a full-width Connect/Disconnect wallet button to the Profile page Wallet section.

**Architecture:** Integrate TonConnect hooks into ProfilePage, similar to StorePage implementation. Show "Connect Wallet" button when no wallet is connected, and "Disconnect Wallet" button when connected.

**Tech Stack:** React, TonConnect UI React, @ton/core for address formatting

---

### Task 1: Add TonConnect hooks and wallet button to ProfilePage

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.tsx`

**Step 1: Update imports**

Add TonConnect imports at the top of the file:

```typescript
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Address } from '@ton/core';
import { useConfig } from '../../contexts/ConfigContext';
```

**Step 2: Add helper function and hooks**

Add the address formatting helper before the component, and add hooks inside the component:

```typescript
// Before component - add helper function
const toUserFriendlyAddress = (rawAddress: string, isTestnet: boolean): string => {
  try {
    return Address.parse(rawAddress).toString({
      bounceable: false,
      testOnly: isTestnet,
    });
  } catch {
    return rawAddress;
  }
};

// Inside component - add these hooks after existing useState
const [tonConnectUI] = useTonConnectUI();
const wallet = useTonWallet();
const { config } = useConfig();

const isTestnet = config?.ton.network === 'testnet';

// Compute user-friendly address
const userFriendlyAddress = wallet?.account.address
  ? toUserFriendlyAddress(wallet.account.address, isTestnet)
  : null;

const handleConnectWallet = () => {
  tonConnectUI.openModal();
};

const handleDisconnectWallet = () => {
  tonConnectUI.disconnect();
};
```

**Step 3: Update Wallet section JSX**

Replace the existing Wallet section (lines 92-111) with:

```tsx
<div className={styles.section}>
  <h2 className={styles.sectionTitle}>Wallet</h2>
  <div className={styles.infoCard}>
    {wallet ? (
      <>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Connected</span>
          <span className={styles.walletAddress}>
            {formatWalletAddress(userFriendlyAddress || wallet.account.address)}
          </span>
        </div>
        <button
          className={styles.disconnectButton}
          onClick={handleDisconnectWallet}
        >
          Disconnect Wallet
        </button>
      </>
    ) : user.walletAddress ? (
      <>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Saved Wallet</span>
          <span className={styles.walletAddress}>
            {formatWalletAddress(user.walletAddress)}
          </span>
        </div>
        <button
          className={styles.connectButton}
          onClick={handleConnectWallet}
        >
          Reconnect Wallet
        </button>
      </>
    ) : (
      <button
        className={styles.connectButton}
        onClick={handleConnectWallet}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 18V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V6M16 12H22M22 12L19 9M22 12L19 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Connect Wallet
      </button>
    )}
  </div>
</div>
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 5: Commit**

```bash
git add src/pages/ProfilePage/ProfilePage.tsx
git commit -m "feat(profile): add TonConnect wallet integration"
```

---

### Task 2: Add wallet button styles to ProfilePage CSS

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.module.css`

**Step 1: Add button styles**

Add the following styles at the end of the file:

```css
.connectButton {
  width: 100%;
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.connectButton:hover {
  transform: translateY(-1px);
}

.connectButton:active {
  transform: translateY(0);
}

.disconnectButton {
  width: 100%;
  margin-top: 16px;
  padding: 16px;
  background-color: transparent;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.disconnectButton:hover {
  border-color: #ef4444;
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
}

.disconnectButton:active {
  transform: scale(0.98);
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/pages/ProfilePage/ProfilePage.module.css
git commit -m "style(profile): add wallet button styles"
```

---

### Task 3: Test and verify

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Manual testing checklist**

1. Navigate to Profile page
2. If no wallet connected: Verify "Connect Wallet" button shows with full width
3. Click "Connect Wallet" → TonConnect modal should open
4. Connect a wallet → Button should change to "Disconnect Wallet"
5. Click "Disconnect Wallet" → Wallet should disconnect, button returns to "Connect Wallet"
6. If user has saved wallet but not connected: Verify "Reconnect Wallet" button shows

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(profile): complete wallet connect/disconnect functionality"
```
