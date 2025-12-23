# Main Screen Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the main screen with a Store icon in header, bottom sticky wallet bar, category filtering for games, and featured games carousel at the top.

**Architecture:**
1. Rename SettingsPage to StorePage and update route from /settings to /store
2. Replace settings gear icon with Store bag icon in Header linking to /store
3. Create CategoryFilter component for horizontal scrollable category tags (mock data)
4. Create BottomWalletBar sticky component showing balance + connect wallet button (redirects to /store)
5. Create FeaturedCarousel component for games with `featured=true`
6. Update useGames hook to return featuredGames array
7. Update HomePage with new layout: carousel, categories, filtered games grid

**Tech Stack:** React 18, TypeScript, CSS Modules, React Router, TON Connect UI React

---

## Task 1: Create StorePage (Copy and Rename from SettingsPage)

**Files:**
- Create: `src/pages/StorePage/StorePage.tsx`
- Create: `src/pages/StorePage/StorePage.module.css`
- Create: `src/pages/StorePage/index.ts`

**Step 1: Create StorePage barrel export**

Create `src/pages/StorePage/index.ts`:
```typescript
export { StorePage } from './StorePage';
```

**Step 2: Create StorePage CSS (copy from SettingsPage)**

Create `src/pages/StorePage/StorePage.module.css`:
```css
.page {
  min-height: 100vh;
  background-color: var(--color-bg-primary);
}

.main {
  padding: 16px;
  padding-bottom: 48px;
}

.walletConnected {
  padding: 16px;
  background-color: var(--color-bg-card);
  border-radius: 16px;
}

.walletInfo {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.walletLabel {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.walletAddress {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 500;
}

.disconnectButton {
  padding: 8px 16px;
  background-color: transparent;
  border: 1px solid var(--color-border-subtle);
  border-radius: 9999px;
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.disconnectButton:hover {
  border-color: #ef4444;
  color: #ef4444;
}

.connectButton {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 16px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 0.2s ease;
}

.connectButton:hover {
  transform: translateY(-1px);
}

.connectButton:active {
  transform: translateY(0);
}

.packagesGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.balanceLoading {
  padding: 24px;
  background-color: var(--color-bg-card);
  border-radius: 16px;
  color: var(--color-text-secondary);
  text-align: center;
}
```

**Step 3: Create StorePage component (copy from SettingsPage with renamed class)**

Create `src/pages/StorePage/StorePage.tsx`:
```tsx
import { useState, useEffect, useMemo } from 'react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Address } from '@ton/core';
import { Header, Section, CoinBalance, BuyCoinsCard, CoinPackage } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';
import { api } from '../../services/api';
import styles from './StorePage.module.css';

// Convert raw TON address to user-friendly format
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

export const StorePage = () => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const { user, isLoading, refreshUser, updateWallet } = useAuth();
  const { config, loading: configLoading } = useConfig();
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Convert wallet address to user-friendly format
  const isTestnet = config?.ton.network === 'testnet';
  const userFriendlyAddress = useMemo(() => {
    if (!wallet?.account.address) return null;
    return toUserFriendlyAddress(wallet.account.address, isTestnet);
  }, [wallet?.account.address, isTestnet]);

  // Sync wallet address to backend when connected
  useEffect(() => {
    const syncWallet = async () => {
      if (userFriendlyAddress && user && userFriendlyAddress !== user.walletAddress) {
        try {
          await updateWallet(userFriendlyAddress);
        } catch (err) {
          console.error('Failed to sync wallet:', err);
        }
      }
    };
    syncWallet();
  }, [userFriendlyAddress, user, updateWallet]);

  const handleConnectWallet = () => {
    tonConnectUI.openModal();
  };

  const handleDisconnectWallet = () => {
    tonConnectUI.disconnect();
  };

  const handleBuyCoins = async (pkg: CoinPackage) => {
    if (!wallet || !config?.ton.receiverAddress) {
      if (!config?.ton.receiverAddress) {
        alert('Payment not configured. Please try again later.');
        return;
      }
      tonConnectUI.openModal();
      return;
    }

    if (isPurchasing) return;

    setIsPurchasing(true);

    try {
      // Calculate total coins including bonus
      const totalCoins = pkg.amount + (pkg.bonus || 0);

      // Convert TON price to nanoTON (1 TON = 10^9 nanoTON)
      const amountInNanoTon = (pkg.price * 1_000_000_000).toString();

      // Parse and normalize receiver address for TonConnect
      let receiverAddress: string;
      try {
        // TonConnect expects user-friendly bounceable format
        const parsed = Address.parse(config.ton.receiverAddress);
        receiverAddress = parsed.toString({ bounceable: true, testOnly: isTestnet });
      } catch (e) {
        console.error('Failed to parse receiver address:', config.ton.receiverAddress, e);
        alert('Invalid payment address configuration. Please contact support.');
        return;
      }

      // Create transaction request
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes from now
        messages: [
          {
            address: receiverAddress,
            amount: amountInNanoTon,
          },
        ],
      };

      // Send transaction - this will open wallet for user confirmation
      const result = await tonConnectUI.sendTransaction(transaction);

      // Transaction successful - add coins to user balance
      await api.addCoins(totalCoins, {
        transactionHash: result.boc,
        tonAmount: amountInNanoTon,
      });

      // Refresh user data to get updated balance
      await refreshUser();

      alert(`Successfully purchased ${totalCoins} coins!`);
    } catch (error) {
      console.error('Failed to purchase coins:', error);

      if (error instanceof Error && error.message.includes('cancelled')) {
        alert('Transaction cancelled.');
      } else {
        alert('Failed to purchase coins. Please try again.');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <Section title="TON Wallet">
          {wallet ? (
            <div className={styles.walletConnected}>
              <div className={styles.walletInfo}>
                <div>
                  <div className={styles.walletLabel}>Connected Wallet</div>
                  <div className={styles.walletAddress}>
                    {truncateAddress(userFriendlyAddress || wallet.account.address)}
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

        <Section title="Game Coins">
          {isLoading ? (
            <div className={styles.balanceLoading}>Loading balance...</div>
          ) : (
            <CoinBalance balance={user?.coinBalance ?? 0} symbol="COINS" />
          )}
        </Section>

        <Section title="Buy Coins">
          {configLoading ? (
            <div className={styles.balanceLoading}>Loading packages...</div>
          ) : !config?.coinPackages || config.coinPackages.length === 0 ? (
            <div className={styles.balanceLoading}>No packages available</div>
          ) : (
            <div className={styles.packagesGrid}>
              {config.coinPackages.map((pkg) => (
                <BuyCoinsCard
                  key={pkg.id}
                  package={{
                    id: pkg.id,
                    amount: pkg.coins,
                    price: pkg.price,
                    bonus: pkg.bonus,
                  }}
                  onBuy={handleBuyCoins}
                />
              ))}
            </div>
          )}
        </Section>
      </main>
    </div>
  );
};
```

**Step 4: Commit**

```bash
git add src/pages/StorePage/
git commit -m "feat(pages): create StorePage component (copy from SettingsPage)"
```

---

## Task 2: Update Router and Delete SettingsPage

**Files:**
- Modify: `src/router.tsx`
- Delete: `src/pages/SettingsPage/` directory

**Step 1: Update router to use StorePage and /store route**

Modify `src/router.tsx`:
```typescript
import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { StorePage } from './pages/StorePage';
import { GamePage } from './pages/GamePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/store',
    element: <StorePage />,
  },
  {
    path: '/game/:gameId',
    element: <GamePage />,
  },
]);
```

**Step 2: Delete SettingsPage directory**

```bash
rm -rf src/pages/SettingsPage
```

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor(router): rename /settings to /store and remove SettingsPage"
```

---

## Task 3: Update Header with Store Icon

**Files:**
- Modify: `src/components/Header/Header.tsx`

**Step 1: Replace settings icon with store bag icon**

Modify `src/components/Header/Header.tsx`:
```tsx
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Header.module.css';

export const Header = () => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const location = useLocation();

  const handleWalletAction = () => {
    if (wallet) {
      tonConnectUI.disconnect();
    } else {
      tonConnectUI.openModal();
    }
  };

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        <div className={styles.logoIcon}>G</div>
        <span className={styles.logoText}>Games</span>
      </Link>

      <div className={styles.actions}>
        <Link
          to="/"
          className={`${styles.navLink} ${location.pathname === '/' ? styles.navLinkActive : ''}`}
          aria-label="Home"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>

        <Link
          to="/store"
          className={`${styles.navLink} ${location.pathname === '/store' ? styles.navLinkActive : ''}`}
          aria-label="Store"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>

        <button
          className={styles.walletButton}
          onClick={handleWalletAction}
          aria-label={wallet ? "Disconnect wallet" : "Connect wallet"}
        >
          {wallet ? 'Connected' : 'Connect'}
        </button>
      </div>
    </header>
  );
};
```

**Step 2: Commit**

```bash
git add src/components/Header/Header.tsx
git commit -m "feat(header): replace settings icon with store bag icon"
```

---

## Task 4: Create CategoryFilter Component

**Files:**
- Create: `src/components/CategoryFilter/CategoryFilter.tsx`
- Create: `src/components/CategoryFilter/CategoryFilter.module.css`
- Create: `src/components/CategoryFilter/index.ts`
- Modify: `src/components/index.ts`

**Step 1: Create CategoryFilter barrel export**

Create `src/components/CategoryFilter/index.ts`:
```typescript
export { CategoryFilter } from './CategoryFilter';
```

**Step 2: Create CategoryFilter CSS**

Create `src/components/CategoryFilter/CategoryFilter.module.css`:
```css
.container {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px 0;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.container::-webkit-scrollbar {
  display: none;
}

.category {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: var(--color-bg-secondary);
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 72px;
  flex-shrink: 0;
}

.category:hover {
  background: var(--color-bg-tertiary);
}

.categoryActive {
  background: var(--color-bg-tertiary);
  border-color: var(--color-accent-primary);
}

.categoryIcon {
  font-size: 24px;
  line-height: 1;
}

.categoryLabel {
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.categoryActive .categoryLabel {
  color: var(--color-text-primary);
}
```

**Step 3: Create CategoryFilter component**

Create `src/components/CategoryFilter/CategoryFilter.tsx`:
```tsx
import styles from './CategoryFilter.module.css';

// Mock categories - can be fetched from API later
const MOCK_CATEGORIES = [
  { id: 'all', label: 'All', icon: '🎮' },
  { id: 'puzzle', label: 'Puzzle', icon: '🧩' },
  { id: 'cards', label: 'Cards', icon: '🃏' },
  { id: 'board', label: 'Board', icon: '♟️' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'arcade', label: 'Arcade', icon: '👾' },
  { id: 'casino', label: 'Casino', icon: '🎰' },
];

interface CategoryFilterProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export const CategoryFilter = ({ selectedCategory, onCategoryChange }: CategoryFilterProps) => {
  const handleCategoryClick = (categoryId: string) => {
    if (categoryId === 'all') {
      onCategoryChange(null);
    } else {
      onCategoryChange(categoryId === selectedCategory ? null : categoryId);
    }
  };

  return (
    <div className={styles.container}>
      {MOCK_CATEGORIES.map((category) => (
        <button
          key={category.id}
          className={`${styles.category} ${
            (category.id === 'all' && !selectedCategory) || category.id === selectedCategory
              ? styles.categoryActive
              : ''
          }`}
          onClick={() => handleCategoryClick(category.id)}
        >
          <span className={styles.categoryIcon}>{category.icon}</span>
          <span className={styles.categoryLabel}>{category.label}</span>
        </button>
      ))}
    </div>
  );
};
```

**Step 4: Export from components index**

Add to `src/components/index.ts`:
```typescript
export { CategoryFilter } from './CategoryFilter';
```

**Step 5: Commit**

```bash
git add src/components/CategoryFilter/ src/components/index.ts
git commit -m "feat(components): add CategoryFilter with mock categories"
```

---

## Task 5: Create BottomWalletBar Component

**Files:**
- Create: `src/components/BottomWalletBar/BottomWalletBar.tsx`
- Create: `src/components/BottomWalletBar/BottomWalletBar.module.css`
- Create: `src/components/BottomWalletBar/index.ts`
- Modify: `src/components/index.ts`

**Step 1: Create BottomWalletBar barrel export**

Create `src/components/BottomWalletBar/index.ts`:
```typescript
export { BottomWalletBar } from './BottomWalletBar';
```

**Step 2: Create BottomWalletBar CSS**

Create `src/components/BottomWalletBar/BottomWalletBar.module.css`:
```css
.container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border-subtle);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
}

.balanceSection {
  display: flex;
  align-items: center;
  gap: 12px;
}

.coinIcon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
}

.balanceInfo {
  display: flex;
  flex-direction: column;
}

.balanceLabel {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.balanceAmount {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.connectButton {
  background: var(--gradient-primary-button);
  color: var(--color-text-primary);
  border: none;
  border-radius: 9999px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.connectButton:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-accent);
}

.connectButton:active {
  transform: translateY(0);
}
```

**Step 3: Create BottomWalletBar component**

Create `src/components/BottomWalletBar/BottomWalletBar.tsx`:
```tsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './BottomWalletBar.module.css';

export const BottomWalletBar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleConnectClick = () => {
    navigate('/store');
  };

  const formatBalance = (amount: number) => {
    return amount.toLocaleString();
  };

  return (
    <div className={styles.container}>
      <div className={styles.balanceSection}>
        <div className={styles.coinIcon}>💰</div>
        <div className={styles.balanceInfo}>
          <span className={styles.balanceLabel}>Balance</span>
          <span className={styles.balanceAmount}>{formatBalance(user?.coinBalance ?? 0)}</span>
        </div>
      </div>
      <button className={styles.connectButton} onClick={handleConnectClick}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 18V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V6M16 12H22M22 12L19 9M22 12L19 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Connect Wallet
      </button>
    </div>
  );
};
```

**Step 4: Export from components index**

Add to `src/components/index.ts`:
```typescript
export { BottomWalletBar } from './BottomWalletBar';
```

**Step 5: Commit**

```bash
git add src/components/BottomWalletBar/ src/components/index.ts
git commit -m "feat(components): add BottomWalletBar sticky component"
```

---

## Task 6: Create FeaturedCarousel Component

**Files:**
- Create: `src/components/FeaturedCarousel/FeaturedCarousel.tsx`
- Create: `src/components/FeaturedCarousel/FeaturedCarousel.module.css`
- Create: `src/components/FeaturedCarousel/index.ts`
- Modify: `src/components/index.ts`

**Step 1: Create FeaturedCarousel barrel export**

Create `src/components/FeaturedCarousel/index.ts`:
```typescript
export { FeaturedCarousel } from './FeaturedCarousel';
```

**Step 2: Create FeaturedCarousel CSS**

Create `src/components/FeaturedCarousel/FeaturedCarousel.module.css`:
```css
.container {
  position: relative;
}

.carousel {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding: 4px 0;
}

.carousel::-webkit-scrollbar {
  display: none;
}

.slide {
  flex: 0 0 100%;
  scroll-snap-align: start;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  aspect-ratio: 16 / 9;
  cursor: pointer;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px 16px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.5) 50%, transparent 100%);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category {
  font-size: 12px;
  color: var(--color-accent-light);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.description {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.playButton {
  background: var(--gradient-primary-button);
  color: var(--color-text-primary);
  border: none;
  border-radius: 9999px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-start;
  margin-top: 4px;
}

.playButton:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-accent);
}

.indicators {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
}

.indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-bg-tertiary);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.indicatorActive {
  background: var(--color-accent-primary);
  width: 24px;
  border-radius: 9999px;
}
```

**Step 3: Create FeaturedCarousel component**

Create `src/components/FeaturedCarousel/FeaturedCarousel.tsx`:
```tsx
import { useState, useRef, useEffect } from 'react';
import { Game } from '../GameCard';
import styles from './FeaturedCarousel.module.css';

interface FeaturedCarouselProps {
  games: Game[];
  onGameClick: (game: Game) => void;
}

export const FeaturedCarousel = ({ games, onGameClick }: FeaturedCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const slideWidth = carousel.clientWidth;
      const newIndex = Math.round(scrollLeft / slideWidth);
      setActiveIndex(newIndex);
    };

    carousel.addEventListener('scroll', handleScroll);
    return () => carousel.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToIndex = (index: number) => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const slideWidth = carousel.clientWidth;
    carousel.scrollTo({
      left: slideWidth * index,
      behavior: 'smooth',
    });
  };

  if (games.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.carousel} ref={carouselRef}>
        {games.map((game) => (
          <div
            key={game.id}
            className={styles.slide}
            onClick={() => onGameClick(game)}
          >
            <img
              src={game.thumbnail}
              alt={game.title}
              className={styles.image}
            />
            <div className={styles.overlay}>
              <span className={styles.category}>{game.category}</span>
              <h3 className={styles.title}>{game.title}</h3>
              {game.description && (
                <p className={styles.description}>{game.description}</p>
              )}
              <button
                className={styles.playButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onGameClick(game);
                }}
              >
                Play Now
              </button>
            </div>
          </div>
        ))}
      </div>
      {games.length > 1 && (
        <div className={styles.indicators}>
          {games.map((_, index) => (
            <button
              key={index}
              className={`${styles.indicator} ${index === activeIndex ? styles.indicatorActive : ''}`}
              onClick={() => scrollToIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

**Step 4: Export from components index**

Add to `src/components/index.ts`:
```typescript
export { FeaturedCarousel } from './FeaturedCarousel';
```

**Step 5: Commit**

```bash
git add src/components/FeaturedCarousel/ src/components/index.ts
git commit -m "feat(components): add FeaturedCarousel with scroll indicators"
```

---

## Task 7: Update useGames Hook to Return Featured Games Array

**Files:**
- Modify: `src/hooks/useGames.ts`

**Step 1: Update useGames to filter featured games from list**

Modify `src/hooks/useGames.ts`:
```typescript
import { useState, useEffect } from 'react';
import { api, Game } from '../services/api';

export interface UseGamesResult {
  games: Game[];
  featuredGames: Game[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useGames(): UseGamesResult {
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const gamesResponse = await api.getGames();
      setAllGames(gamesResponse.games);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch games');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  // Filter featured games (games with featured=true)
  const featuredGames = allGames.filter((game) => game.featured === true);

  // Regular games exclude featured ones to avoid duplication
  const games = allGames.filter((game) => game.featured !== true);

  return {
    games,
    featuredGames,
    isLoading,
    error,
    refetch: fetchGames,
  };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useGames.ts
git commit -m "refactor(hooks): update useGames to return featuredGames array"
```

---

## Task 8: Update HomePage with New Layout

**Files:**
- Modify: `src/pages/HomePage/HomePage.tsx`
- Modify: `src/pages/HomePage/HomePage.module.css`

**Step 1: Update HomePage component**

Modify `src/pages/HomePage/HomePage.tsx`:
```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTonWallet } from '@tonconnect/ui-react';
import {
  Header,
  FeaturedCarousel,
  CategoryFilter,
  GameGrid,
  Section,
  BottomWalletBar,
  Game,
} from '../../components';
import { useGames } from '../../hooks/useGames';
import styles from './HomePage.module.css';

export const HomePage = () => {
  const { games, featuredGames, isLoading, error, refetch } = useGames();
  const navigate = useNavigate();
  const wallet = useTonWallet();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleGameClick = (game: Game) => {
    navigate(`/game/${game.slug}`);
  };

  if (error) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.error}>
            <p>Error: {error}</p>
            <button onClick={refetch}>Retry</button>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.loading}>Loading games...</div>
        </main>
      </div>
    );
  }

  // Filter games by selected category
  const filteredGames = selectedCategory
    ? games.filter((game) => game.category.toLowerCase() === selectedCategory.toLowerCase())
    : games;

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        {/* Featured Games Carousel */}
        {featuredGames.length > 0 && (
          <section className={styles.featuredSection}>
            <FeaturedCarousel games={featuredGames} onGameClick={handleGameClick} />
          </section>
        )}

        {/* Category Filter */}
        <section className={styles.categoriesSection}>
          <CategoryFilter
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </section>

        {/* Games Grid */}
        <Section
          title={selectedCategory ? `${selectedCategory} Games` : 'Most Popular Games'}
        >
          <GameGrid games={filteredGames} onGameClick={handleGameClick} />
        </Section>
      </main>

      {/* Bottom Wallet Bar - only shows when wallet not connected */}
      {!wallet && <BottomWalletBar />}
    </div>
  );
};
```

**Step 2: Update HomePage CSS**

Modify `src/pages/HomePage/HomePage.module.css`:
```css
.page {
  min-height: 100vh;
  background-color: var(--color-bg-primary);
}

.main {
  padding: 16px;
  padding-bottom: 80px; /* Space for bottom wallet bar */
}

.featuredSection {
  margin-bottom: 24px;
}

.categoriesSection {
  margin-bottom: 24px;
}

.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: 16px;
}

.error button {
  background-color: var(--color-purple);
  color: var(--color-text-primary);
  border: none;
  border-radius: 9999px;
  padding: 12px 24px;
  cursor: pointer;
  font-size: 16px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--color-text-secondary);
}
```

**Step 3: Commit**

```bash
git add src/pages/HomePage/
git commit -m "feat(home): redesign HomePage with carousel, categories, and wallet bar"
```

---

## Task 9: Build Verification

**Step 1: Run TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 2: Run production build**

```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit build info file updates if any**

```bash
git add -A
git commit -m "chore: update build artifacts" || echo "No changes to commit"
```

---

## Summary

This implementation plan redesigns the main screen with:

1. **StorePage** - Renamed from SettingsPage, accessible via /store route
2. **Header Store Icon** - Shopping bag icon replacing settings gear, links to /store
3. **CategoryFilter** - Horizontal scrollable category tags (mock data: All, Puzzle, Cards, Board, Sports, Arcade, Casino)
4. **BottomWalletBar** - Sticky bottom bar showing balance + "Connect Wallet" button that redirects to /store (only visible when wallet not connected)
5. **FeaturedCarousel** - Full-width carousel for games with `featured=true`, includes slide indicators
6. **Updated useGames** - Returns `featuredGames` array and `games` array separately
7. **Updated HomePage** - New layout with carousel at top, categories, and filtered game grid

The design follows the Skillz reference screenshot with categories, featured carousel, and game grid layout.
