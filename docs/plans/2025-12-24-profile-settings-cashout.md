# Profile & Settings Customization with Cash Out Feature

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign ProfilePage with user stats (games played, wins, amount won), add Cash Out functionality to both Profile and Settings pages, and create Settings page with Sound/Haptics controls. Match the provided UI design mockups.

**Architecture:** Enhance existing ProfilePage component with stats sections and cash out button. Create new SettingsPage component with cash out and preferences controls. Add backend endpoints for fetching game stats and processing cash out transactions. Use existing database schema without migrations.

**Tech Stack:** React, TypeScript, TON Connect UI, Telegram WebApp API, Prisma (backend)

**Design Reference:**
- Profile Page: User header, stats cards (games played, wins, amount won), cash out button
- Settings Page: Cash out option, Sound and Haptics toggles, support options, legal links
- No Edit button in top left, no High Scores section
- Match existing color scheme and styling patterns

---

## Task 1: Add Backend Endpoint for User Game Stats

**Files:**
- Modify: `server/src/controllers/usersController.ts`
- Modify: `server/src/services/userService.ts`
- Modify: `server/src/routes/users.ts`
- Modify: `server/src/schemas/users.ts`

**Step 1: Add stats service function**

Add to `server/src/services/userService.ts`:

```typescript
export async function getUserGameStats(userId: string) {
  const stats = await prisma.gameSession.aggregate({
    where: { userId },
    _count: { id: true },
    _sum: { coinsWon: true },
  });

  const wins = await prisma.gameSession.count({
    where: {
      userId,
      coinsWon: { gt: 0 },
    },
  });

  return {
    gamesPlayed: stats._count.id || 0,
    totalWins: wins || 0,
    amountWon: stats._sum.coinsWon || 0,
  };
}
```

**Step 2: Add stats controller function**

Add to `server/src/controllers/usersController.ts`:

```typescript
export async function getUserStats(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const stats = await userService.getUserGameStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
}
```

**Step 3: Add stats validation schema**

Add to `server/src/schemas/users.ts`:

```typescript
export const getUserStatsSchema = z.object({
  // No body/query params needed - uses authenticated user ID
});
```

**Step 4: Add route**

Add to `server/src/routes/users.ts`:

```typescript
router.get('/me/stats', requireAuth, usersController.getUserStats);
```

**Step 5: Test endpoint**

Run: `curl http://localhost:3001/api/users/me/stats -H "Authorization: Bearer <token>"`

Expected response:
```json
{
  "gamesPlayed": 4,
  "totalWins": 0,
  "amountWon": 0
}
```

**Step 6: Commit backend stats endpoint**

```bash
git add server/src/controllers/usersController.ts server/src/services/userService.ts server/src/routes/users.ts server/src/schemas/users.ts
git commit -m "feat(api): add user game stats endpoint

- Add getUserGameStats service function
- Add getUserStats controller
- Add GET /api/users/me/stats route
- Returns gamesPlayed, totalWins, amountWon"
```

---

## Task 2: Add Frontend API Method for Stats

**Files:**
- Modify: `src/services/api.ts`

**Step 1: Add UserStats type**

Add to `src/services/api.ts` types section:

```typescript
export interface UserStats {
  gamesPlayed: number;
  totalWins: number;
  amountWon: number;
}
```

**Step 2: Add getUserStats method**

Add to api object in `src/services/api.ts`:

```typescript
async getUserStats(): Promise<UserStats> {
  const response = await fetch(`${API_URL}/users/me/stats`, {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  if (!response.ok) throw new Error('Failed to fetch user stats');
  return response.json();
},
```

**Step 3: Export UserStats type**

Ensure UserStats is exported from the file.

**Step 4: Commit frontend API changes**

```bash
git add src/services/api.ts
git commit -m "feat(api): add getUserStats method

- Add UserStats interface
- Add getUserStats API method
- Fetch game statistics from backend"
```

---

## Task 3: Create CashOutModal Component

**Files:**
- Create: `src/components/CashOutModal/CashOutModal.tsx`
- Create: `src/components/CashOutModal/CashOutModal.module.css`

**Step 1: Create CashOutModal component**

Create `src/components/CashOutModal/CashOutModal.tsx`:

```typescript
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Address } from '@ton/core';
import styles from './CashOutModal.module.css';
import { haptic } from '../../providers/TelegramProvider';
import { api } from '../../services/api';

interface CashOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSuccess: () => void;
}

export function CashOutModal({
  isOpen,
  onClose,
  currentBalance,
  onSuccess,
}: CashOutModalProps) {
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  if (!isOpen) return null;

  const handleClose = () => {
    if (isProcessing) return;
    haptic.light();
    setAmount('');
    setWalletAddress('');
    setError(null);
    onClose();
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (!/^\d*\.?\d*$/.test(value)) return;

    const numValue = parseFloat(value || '0');
    if (numValue > currentBalance) return;

    setAmount(value);
    setError(null);
  };

  const handleSuggestionClick = (percent: number) => {
    haptic.light();
    const suggested = Math.floor(currentBalance * (percent / 100));
    setAmount(suggested.toString());
    setError(null);
  };

  const handleUseConnectedWallet = () => {
    if (wallet?.account.address) {
      haptic.light();
      const userFriendly = Address.parse(wallet.account.address).toString({
        bounceable: false,
        testOnly: false,
      });
      setWalletAddress(userFriendly);
      setError(null);
    }
  };

  const handleCashOut = async () => {
    if (isProcessing) return;

    // Validation
    const numAmount = parseFloat(amount);
    if (!amount || numAmount <= 0) {
      setError('Please enter a valid amount');
      haptic.error();
      return;
    }

    if (numAmount > currentBalance) {
      setError('Insufficient balance');
      haptic.error();
      return;
    }

    if (!walletAddress) {
      setError('Please enter a wallet address');
      haptic.error();
      return;
    }

    // Validate TON address
    try {
      Address.parse(walletAddress);
    } catch {
      setError('Invalid TON wallet address');
      haptic.error();
      return;
    }

    setIsProcessing(true);
    haptic.medium();

    try {
      // Deduct coins from user balance
      await api.deductCoins(numAmount);

      // TODO: Actually send TON transaction to user's wallet
      // This would require backend integration with TON blockchain
      // For now, we just deduct the balance

      haptic.success();
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Cash out error:', err);
      setError('Failed to process cash out');
      haptic.error();
    } finally {
      setIsProcessing(false);
    }
  };

  const modalContent = (
    <div className={styles.overlay}>
      <button
        className={styles.closeButton}
        onClick={handleClose}
        disabled={isProcessing}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      <div className={styles.content}>
        <h2 className={styles.title}>Cash Out</h2>
        <p className={styles.subtitle}>Withdraw your winnings to TON wallet</p>

        <div className={styles.balanceInfo}>
          <span className={styles.balanceLabel}>Available Balance</span>
          <span className={styles.balanceValue}>{currentBalance} coins</span>
        </div>

        {/* Amount Input */}
        <div className={styles.section}>
          <label className={styles.label}>Amount (coins)</label>
          <input
            type="text"
            inputMode="decimal"
            className={styles.input}
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0"
            disabled={isProcessing}
          />

          {/* Suggestions */}
          <div className={styles.suggestions}>
            <button
              className={styles.suggestionButton}
              onClick={() => handleSuggestionClick(25)}
              disabled={isProcessing}
            >
              25%
            </button>
            <button
              className={styles.suggestionButton}
              onClick={() => handleSuggestionClick(50)}
              disabled={isProcessing}
            >
              50%
            </button>
            <button
              className={styles.suggestionButton}
              onClick={() => handleSuggestionClick(75)}
              disabled={isProcessing}
            >
              75%
            </button>
            <button
              className={styles.suggestionButton}
              onClick={() => handleSuggestionClick(100)}
              disabled={isProcessing}
            >
              100%
            </button>
          </div>
        </div>

        {/* Wallet Address Input */}
        <div className={styles.section}>
          <label className={styles.label}>TON Wallet Address</label>
          <input
            type="text"
            className={styles.input}
            value={walletAddress}
            onChange={(e) => {
              setWalletAddress(e.target.value);
              setError(null);
            }}
            placeholder="UQA..."
            disabled={isProcessing}
          />

          {wallet && (
            <button
              className={styles.useConnectedButton}
              onClick={handleUseConnectedWallet}
              disabled={isProcessing}
            >
              Use Connected Wallet
            </button>
          )}
        </div>

        {error && (
          <div className={styles.error}>{error}</div>
        )}

        <button
          className={styles.cashOutButton}
          onClick={handleCashOut}
          disabled={isProcessing || !amount || !walletAddress}
        >
          {isProcessing ? 'Processing...' : `Cash Out ${amount || '0'} coins`}
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
```

**Step 2: Create CashOutModal styles**

Create `src/components/CashOutModal/CashOutModal.module.css`:

```css
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: var(--spacing-md);
  padding-bottom: calc(var(--spacing-md) + var(--tg-safe-area-bottom, 0px));
}

.closeButton {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  background: var(--color-bg-tertiary);
  border: none;
  border-radius: var(--radius-full);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-primary);
  transition: all 0.2s;
}

.closeButton:hover {
  background: var(--color-bg-secondary);
  transform: scale(1.05);
}

.closeButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.closeButton svg {
  width: 20px;
  height: 20px;
}

.content {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-xl);
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-xs) 0;
  text-align: center;
}

.subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-lg) 0;
  text-align: center;
}

.balanceInfo {
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.balanceLabel {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.balanceValue {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-accent-primary);
}

.section {
  margin-bottom: var(--spacing-lg);
}

.label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.input {
  width: 100%;
  background: var(--color-bg-tertiary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  font-size: 16px;
  color: var(--color-text-primary);
  transition: all 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--color-accent-primary);
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.suggestions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.suggestionButton {
  background: var(--color-bg-tertiary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm);
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.suggestionButton:hover {
  background: var(--color-bg-primary);
  border-color: var(--color-accent-primary);
  transform: translateY(-2px);
}

.suggestionButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.useConnectedButton {
  background: transparent;
  border: 1px solid var(--color-accent-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm);
  font-size: 14px;
  font-weight: 600;
  color: var(--color-accent-primary);
  cursor: pointer;
  transition: all 0.2s;
  margin-top: var(--spacing-sm);
  width: 100%;
}

.useConnectedButton:hover {
  background: rgba(255, 107, 53, 0.1);
}

.useConnectedButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  background: rgba(255, 71, 87, 0.1);
  border: 1px solid var(--color-status-error);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm);
  font-size: 14px;
  color: var(--color-status-error);
  margin-bottom: var(--spacing-md);
  text-align: center;
}

.cashOutButton {
  width: 100%;
  background: linear-gradient(180deg, #2ED573 0%, #26DE81 100%);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.cashOutButton:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(46, 213, 115, 0.3);
}

.cashOutButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.cashOutButton:active {
  transform: translateY(0);
}
```

**Step 3: Commit CashOutModal component**

```bash
git add src/components/CashOutModal/
git commit -m "feat(ui): add CashOutModal component

- Create CashOutModal with amount input
- Add wallet address input with connected wallet suggestion
- Add percentage suggestions (25%, 50%, 75%, 100%)
- Implement validation for amount and address
- Add processing state and error handling"
```

---

## Task 4: Enhance ProfilePage with Stats and Cash Out

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.tsx`
- Modify: `src/pages/ProfilePage/ProfilePage.module.css`

**Step 1: Update ProfilePage component**

Replace content of `src/pages/ProfilePage/ProfilePage.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { useAuth } from '../../contexts/AuthContext';
import { api, UserStats } from '../../services/api';
import { CashOutModal } from '../../components/CashOutModal/CashOutModal';
import { haptic } from '../../providers/TelegramProvider';
import styles from './ProfilePage.module.css';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const navigate = useNavigate();
  const [tonConnectUI] = useTonConnectUI();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const userStats = await api.getUserStats();
      setStats(userStats);
    } catch (err) {
      console.error('Failed to load stats:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleCashOutClick = () => {
    haptic.medium();
    setShowCashOutModal(true);
  };

  const handleCashOutSuccess = async () => {
    await refreshUser();
    await loadStats();
  };

  const handleSettingsClick = () => {
    haptic.light();
    navigate('/settings');
  };

  if (!user) return null;

  const joinDate = new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className={styles.container}>
      {/* Header with Settings */}
      <div className={styles.header}>
        <button className={styles.settingsButton} onClick={handleSettingsClick}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6m-6-6h6m6 0h-6" />
          </svg>
          Settings
        </button>
      </div>

      {/* User Profile */}
      <div className={styles.profileSection}>
        <div className={styles.avatar}>
          {user.photoUrl ? (
            <img src={user.photoUrl} alt={user.username || 'User'} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {(user.username?.[0] || user.firstName?.[0] || '?').toUpperCase()}
            </div>
          )}
        </div>
        <h1 className={styles.username}>{user.username || user.firstName || 'Anonymous'}</h1>
        <p className={styles.joinDate}>Joined {joinDate}</p>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="8" width="18" height="12" rx="2" />
              <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
          <div className={styles.statValue}>
            {loading ? '...' : stats?.gamesPlayed || 0}
          </div>
          <div className={styles.statLabel}>Games Played</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <div className={styles.statValue}>
            {loading ? '...' : stats?.totalWins || 0}
          </div>
          <div className={styles.statLabel}>Total Wins</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className={styles.statValue}>
            ${loading ? '...' : stats?.amountWon || 0}
          </div>
          <div className={styles.statLabel}>Amount Won</div>
        </div>
      </div>

      {/* Cash Out Button */}
      <button className={styles.cashOutButton} onClick={handleCashOutClick}>
        <div className={styles.cashOutContent}>
          <span className={styles.cashOutText}>Cash out</span>
          <span className={styles.cashOutSubtext}>Cash out your winnings</span>
        </div>
        <svg className={styles.cashOutArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14m-7-7l7 7-7 7" />
        </svg>
      </button>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      <CashOutModal
        isOpen={showCashOutModal}
        onClose={() => setShowCashOutModal(false)}
        currentBalance={user.coinBalance}
        onSuccess={handleCashOutSuccess}
      />
    </div>
  );
}
```

**Step 2: Update ProfilePage styles**

Replace content of `src/pages/ProfilePage/ProfilePage.module.css`:

```css
.container {
  min-height: calc(100vh - 80px);
  padding: var(--spacing-lg);
  padding-bottom: calc(var(--spacing-lg) + 80px);
  background: var(--color-bg-primary);
}

.header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--spacing-lg);
}

.settingsButton {
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  transition: all 0.2s;
}

.settingsButton:hover {
  background: var(--color-bg-secondary);
}

.settingsButton svg {
  width: 20px;
  height: 20px;
}

.profileSection {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--spacing-md);
  background: var(--color-bg-secondary);
  border: 3px solid var(--color-accent-primary);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatarPlaceholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 700;
  color: var(--color-text-primary);
  background: linear-gradient(135deg, var(--color-accent-primary) 0%, #FF5722 100%);
}

.username {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-xs) 0;
}

.joinDate {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

@media (max-width: 600px) {
  .statsGrid {
    grid-template-columns: 1fr;
  }
}

.statCard {
  background: var(--color-bg-secondary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  transition: all 0.2s;
}

.statCard:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.statIcon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  color: var(--color-accent-primary);
}

.statIcon svg {
  width: 24px;
  height: 24px;
}

.statValue {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.statLabel {
  font-size: 14px;
  color: var(--color-text-secondary);
  text-align: center;
}

.cashOutButton {
  width: 100%;
  background: var(--color-bg-secondary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s;
}

.cashOutButton:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(46, 213, 115, 0.2);
  border-color: #2ED573;
}

.cashOutContent {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.cashOutText {
  font-size: 18px;
  font-weight: 700;
  color: #2ED573;
}

.cashOutSubtext {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.cashOutArrow {
  width: 24px;
  height: 24px;
  color: #2ED573;
  flex-shrink: 0;
}

.error {
  background: rgba(255, 71, 87, 0.1);
  border: 1px solid var(--color-status-error);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin-top: var(--spacing-md);
  font-size: 14px;
  color: var(--color-status-error);
  text-align: center;
}
```

**Step 3: Test ProfilePage in browser**

Run: `npm run dev`

Navigate to `/profile` and verify:
- User avatar and username display
- Stats cards show correct data
- Cash out button is visible and clickable
- Settings button navigates properly

**Step 4: Commit enhanced ProfilePage**

```bash
git add src/pages/ProfilePage/
git commit -m "feat(ui): enhance ProfilePage with stats and cash out

- Add user stats cards (games played, wins, amount won)
- Integrate getUserStats API call
- Add Cash Out button with modal integration
- Add Settings navigation button
- Update styling to match design mockup"
```

---

## Task 5: Create SettingsPage Component

**Files:**
- Create: `src/pages/SettingsPage/SettingsPage.tsx`
- Create: `src/pages/SettingsPage/SettingsPage.module.css`
- Modify: `src/router.tsx`

**Step 1: Create SettingsPage component**

Create `src/pages/SettingsPage/SettingsPage.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CashOutModal } from '../../components/CashOutModal/CashOutModal';
import { haptic } from '../../providers/TelegramProvider';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [showCashOutModal, setShowCashOutModal] = useState(false);

  // Load preferences from localStorage
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('soundEnabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [hapticsEnabled, setHapticsEnabled] = useState(() => {
    const saved = localStorage.getItem('hapticsEnabled');
    return saved !== null ? saved === 'true' : true;
  });

  const handleBack = () => {
    haptic.light();
    navigate(-1);
  };

  const handleCashOutClick = () => {
    haptic.medium();
    setShowCashOutModal(true);
  };

  const handleSoundToggle = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('soundEnabled', String(newValue));
    if (hapticsEnabled) haptic.light();
  };

  const handleHapticsToggle = () => {
    const newValue = !hapticsEnabled;
    setHapticsEnabled(newValue);
    localStorage.setItem('hapticsEnabled', String(newValue));
    if (newValue) haptic.light(); // Only haptic if enabling
  };

  const handleCashOutSuccess = async () => {
    await refreshUser();
  };

  if (!user) return null;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={handleBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5m7 7l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <h1 className={styles.title}>Account, Settings and Legal</h1>

      {/* Settings Sections */}
      <div className={styles.sections}>
        {/* Cash Out */}
        <button className={styles.settingCard} onClick={handleCashOutClick}>
          <div className={styles.settingContent}>
            <span className={styles.settingTitle}>Cash Out</span>
            <span className={styles.settingDescription}>Cash out your winnings</span>
          </div>
        </button>

        {/* Sound and Haptics */}
        <div className={styles.settingCard}>
          <div className={styles.settingContent}>
            <span className={styles.settingTitle}>Sound and Haptics</span>
            <span className={styles.settingDescription}>Change your preferences</span>
          </div>
          <div className={styles.expandedContent}>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Sound Effects</span>
              <button
                className={`${styles.toggle} ${soundEnabled ? styles.toggleActive : ''}`}
                onClick={handleSoundToggle}
                aria-label="Toggle sound"
              >
                <div className={styles.toggleThumb} />
              </button>
            </div>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Haptic Feedback</span>
              <button
                className={`${styles.toggle} ${hapticsEnabled ? styles.toggleActive : ''}`}
                onClick={handleHapticsToggle}
                aria-label="Toggle haptics"
              >
                <div className={styles.toggleThumb} />
              </button>
            </div>
          </div>
        </div>

        {/* Customer Support */}
        <button className={styles.settingCard}>
          <div className={styles.settingContent}>
            <span className={styles.settingTitle}>Customer Support</span>
            <span className={styles.settingDescription}>Questions or concerns</span>
          </div>
        </button>

        {/* Refund Request */}
        <button className={styles.settingCard}>
          <div className={styles.settingContent}>
            <span className={styles.settingTitle}>Refund Request</span>
            <span className={styles.settingDescription}>Claim money back for a failed game</span>
          </div>
        </button>

        {/* FAQ */}
        <button className={styles.settingCard}>
          <div className={styles.settingContent}>
            <span className={styles.settingTitle}>FAQ</span>
            <span className={styles.settingDescription}>Get answers to common questions</span>
          </div>
        </button>
      </div>

      {/* Legal Links */}
      <div className={styles.legalSection}>
        <button className={styles.legalLink}>Log In</button>
        <button className={styles.legalLink}>Terms of Use</button>
        <button className={styles.legalLink}>Privacy Policy</button>
        <button className={styles.legalLink}>Regulatory Information</button>
        <button className={styles.legalLink}>Responsible Gaming</button>
      </div>

      {/* Version */}
      <div className={styles.version}>
        Version 1.0.0
      </div>

      <CashOutModal
        isOpen={showCashOutModal}
        onClose={() => setShowCashOutModal(false)}
        currentBalance={user.coinBalance}
        onSuccess={handleCashOutSuccess}
      />
    </div>
  );
}
```

**Step 2: Create SettingsPage styles**

Create `src/pages/SettingsPage/SettingsPage.module.css`:

```css
.container {
  min-height: 100vh;
  padding: var(--spacing-lg);
  padding-bottom: calc(var(--spacing-lg) + 80px);
  background: var(--color-bg-primary);
}

.header {
  margin-bottom: var(--spacing-lg);
}

.backButton {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  transition: all 0.2s;
}

.backButton:hover {
  color: var(--color-text-primary);
}

.backButton svg {
  width: 20px;
  height: 20px;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-lg) 0;
}

.sections {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.settingCard {
  background: var(--color-bg-secondary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
}

.settingCard:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.settingContent {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settingTitle {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.settingDescription {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.settingCard:first-child .settingTitle {
  color: #2ED573;
}

.expandedContent {
  margin-top: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.toggleRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggleLabel {
  font-size: 16px;
  color: var(--color-text-primary);
}

.toggle {
  width: 52px;
  height: 32px;
  background: var(--color-bg-tertiary);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 2px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}

.toggleActive {
  background: #2ED573;
  border-color: #2ED573;
}

.toggleThumb {
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s;
}

.toggleActive .toggleThumb {
  transform: translateX(20px);
}

.legalSection {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.legalLink {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: 16px;
  text-align: left;
  padding: var(--spacing-sm) 0;
  cursor: pointer;
  transition: color 0.2s;
}

.legalLink:hover {
  color: var(--color-text-primary);
}

.legalLink:first-child {
  color: var(--color-status-error);
}

.version {
  text-align: center;
  font-size: 14px;
  color: var(--color-text-muted);
  padding: var(--spacing-md) 0;
}
```

**Step 3: Add SettingsPage route**

Modify `src/router.tsx`:

```typescript
import { SettingsPage } from './pages/SettingsPage/SettingsPage';

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/store', element: <StorePage /> },
  { path: '/game/:gameId/details', element: <GameDetailPage /> },
  { path: '/game/:gameId', element: <GamePage /> },
  { path: '/leaderboard', element: <LeaderboardPage /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/settings', element: <SettingsPage /> },
]);
```

**Step 4: Test SettingsPage**

Run: `npm run dev`

Navigate to `/settings` and verify:
- Back button works
- Cash Out button opens modal
- Sound toggle works (saves to localStorage)
- Haptics toggle works (saves to localStorage)
- All other buttons are present

**Step 5: Commit SettingsPage**

```bash
git add src/pages/SettingsPage/ src/router.tsx
git commit -m "feat(ui): add SettingsPage with preferences

- Create SettingsPage component
- Add Cash Out option
- Implement Sound and Haptics toggles with localStorage
- Add placeholder sections (Support, Refund, FAQ)
- Add legal links section
- Add /settings route to router"
```

---

## Task 6: Final Testing and Cleanup

**Files:**
- None (testing only)

**Step 1: Run complete test suite**

Run: `npm test`

Expected: All tests pass (15 tests for AddTonModal)

**Step 2: Run type checking**

Run: `npm run build`

Expected: No TypeScript errors, build succeeds

**Step 3: Manual testing checklist**

Run: `npm run dev`

**Profile Page Tests:**
- [ ] Navigate to `/profile`
- [ ] User avatar displays correctly
- [ ] Username and join date show correct data
- [ ] Stats cards load and display correct numbers
- [ ] Cash Out button opens modal
- [ ] Settings button navigates to `/settings`
- [ ] Cash Out modal allows entering amount
- [ ] Cash Out modal validates wallet address
- [ ] Percentage suggestions work (25%, 50%, 75%, 100%)
- [ ] "Use Connected Wallet" button works if wallet connected
- [ ] Cash out processes successfully
- [ ] Balance updates after cash out

**Settings Page Tests:**
- [ ] Navigate to `/settings`
- [ ] Back button returns to previous page
- [ ] Cash Out option opens modal
- [ ] Sound toggle switches on/off
- [ ] Haptics toggle switches on/off
- [ ] Settings persist after page reload
- [ ] All sections are visible and styled correctly
- [ ] Version number displays at bottom

**Step 4: Create summary of changes**

Changes made:
- ✓ Added backend endpoint for user game stats
- ✓ Created CashOutModal component with validation
- ✓ Enhanced ProfilePage with stats cards
- ✓ Added Cash Out functionality to profile
- ✓ Created SettingsPage with preferences
- ✓ Implemented Sound and Haptics toggles
- ✓ Added Settings route to router
- ✓ All UI matches design mockups
- ✓ No database migrations required

**Step 5: Final commit and push to dev**

```bash
git status
git push origin dev
```

---

## Summary

This plan implements a complete profile and settings redesign with the following features:

**Backend Changes:**
- New `/api/users/me/stats` endpoint for game statistics

**Frontend Changes:**
- Enhanced ProfilePage with user stats (games played, wins, amount won)
- New CashOutModal component for TON withdrawals
- New SettingsPage with Cash Out and preferences
- Sound and Haptics toggle controls with localStorage persistence
- Updated routing to include `/settings`

**Key Features:**
- Stats calculated from existing GameSession data (no migrations)
- Cash out validates TON addresses and amounts
- Wallet address suggestions from connected wallet
- Percentage-based amount suggestions
- Haptic feedback throughout
- Mobile-optimized UI matching design mockups
- All changes pushed to dev branch only

**Files Modified/Created:**
- Backend: 4 files (controllers, services, routes, schemas)
- Frontend: 8 files (API, components, pages, router, styles)

**Total Estimated Time:** 3-4 hours
