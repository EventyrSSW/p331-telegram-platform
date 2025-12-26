# Profile & Cash Out UI Complete Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete redesign of Profile Page, Cash Out Modal, Top Header, and Bottom Navigation to match Figma dark theme design with mock data support for local development.

**Architecture:** Transform existing ProfilePage and CashOutModal components to match new dark theme (#050505 background) with resource badges in top header, redesigned stats cards, simplified cash out flow, and updated bottom navigation. Add mock user data support for local development without Telegram context.

**Tech Stack:** React, TypeScript, CSS Modules, SVG icons with ?react imports, existing routing and state management

---

## Task 1: Create Mock User Data Utility

**Files:**
- Create: `src/utils/mockData.ts`

**Step 1: Create mock user data utility file**

Create `src/utils/mockData.ts` with mock user and stats:

```typescript
import { User, UserStats } from '../services/api';

export const MOCK_USER: User = {
  id: 'mock-user-local-dev',
  telegramId: 123456789,
  username: 'perretbenkert',
  firstName: 'Peter',
  lastName: 'Benkert',
  languageCode: 'en',
  photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=perretbenkert',
  isPremium: false,
  coinBalance: 20,
  walletAddress: null,
};

export const MOCK_STATS: UserStats = {
  gamesPlayed: 25,
  totalWins: 20,
  amountWon: 12,
};

export const MOCK_RANK = 42;
export const MOCK_GEMS = 50;

/**
 * Check if we're running in local development mode without Telegram context
 */
export function shouldUseMockData(): boolean {
  // Check if Telegram WebApp is available
  const hasTelegramContext = Boolean(window.Telegram?.WebApp?.initData);

  // Use mock data only if NO Telegram context AND in development mode
  return !hasTelegramContext && import.meta.env.DEV;
}
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/utils/mockData.ts
git commit -m "feat: add mock user data utility for local development

- Create mock user, stats, and resource values
- Add shouldUseMockData() helper to detect local dev mode
- Support ProfilePage development without Telegram context

🤖 Generated with [Claude Code](https://claude.com/claude.code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Redesign Profile Page - Top Header with Resource Badges

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.tsx` (add imports, top header JSX)
- Modify: `src/pages/ProfilePage/ProfilePage.module.css` (add top header styles)

**Step 1: Add icon imports and mock data to ProfilePage**

Add to top of `src/pages/ProfilePage/ProfilePage.tsx` after existing imports:

```typescript
import StarIcon from '../../assets/icons/star.svg?react';
import GemIcon from '../../assets/icons/gem.svg?react';
import CashIcon from '../../assets/icons/cash.svg?react';
import GamepadIcon from '../../assets/icons/gamepad.svg?react';
import MedalIcon from '../../assets/icons/medal.svg?react';
import DollarIcon from '../../assets/icons/dollar.svg?react';
import SettingsIcon from '../../assets/icons/settings.svg?react';
import ArrowRightIcon from '../../assets/icons/arrow-right.svg?react';
import { MOCK_USER, MOCK_STATS, MOCK_RANK, MOCK_GEMS, shouldUseMockData } from '../../utils/mockData';
```

**Step 2: Update ProfilePage component to use mock data**

In ProfilePage component, after existing state declarations, add:

```typescript
// Use mock data for local development without Telegram context
const useMockData = shouldUseMockData();
const displayUser = useMockData ? MOCK_USER : user;
const displayStats = useMockData ? MOCK_STATS : stats;
```

**Step 3: Add top header JSX**

Replace the current return statement's opening `<div className={styles.container}>` section with:

```tsx
return (
  <div className={styles.container}>
    {/* Top Header with Resource Badges */}
    <div className={styles.topHeader}>
      {/* Rank Badge with Avatar */}
      <div className={styles.resourceBadge}>
        <div className={styles.badgeAvatar}>
          {displayUser?.photoUrl ? (
            <img src={displayUser.photoUrl} alt="avatar" />
          ) : (
            <div className={styles.badgePlaceholder}>
              {(displayUser?.username?.[0] || 'U').toUpperCase()}
            </div>
          )}
        </div>
        <StarIcon className={styles.badgeIcon} />
        <span className={styles.badgeValue}>{MOCK_RANK}</span>
      </div>

      {/* Gems Badge */}
      <div className={styles.resourceBadge}>
        <GemIcon className={styles.badgeIcon} />
        <span className={styles.badgeValue}>{MOCK_GEMS}</span>
      </div>

      {/* Cash Badge */}
      <div className={styles.resourceBadge}>
        <CashIcon className={styles.badgeIcon} />
        <span className={styles.badgeValue}>${displayUser?.coinBalance || 0}</span>
      </div>
    </div>

    {/* Rest of existing content... */}
```

**Step 4: Add top header CSS styles**

Add to `src/pages/ProfilePage/ProfilePage.module.css` at the top:

```css
.topHeader {
  width: 100%;
  padding: 20px 14px 14px 29px;
  position: relative;
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 10px;
  background: rgba(23, 23, 23, 0.50);
}

.resourceBadge {
  width: 109px;
  height: 28px;
  padding: 4px 10px;
  position: relative;
  background: rgba(23, 23, 23, 0.70);
  border-radius: 40px;
  border-bottom: 1px solid #3D3D3D;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2px;
}

.badgeIcon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: white;
}

.badgeValue {
  flex: 1;
  text-align: center;
  color: white;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.28px;
}

.badgeAvatar {
  position: absolute;
  left: -15px;
  top: -1px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  overflow: hidden;
}

.badgeAvatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.badgePlaceholder {
  width: 100%;
  height: 100%;
  background: rgba(23, 23, 23, 0.70);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: 700;
}
```

**Step 5: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/pages/ProfilePage/ProfilePage.tsx src/pages/ProfilePage/ProfilePage.module.css
git commit -m "feat: add top header with resource badges to ProfilePage

- Import StarIcon, GemIcon, CashIcon SVG components
- Add mock data support for local development
- Display rank badge with avatar overlay
- Add gems and cash badges with semi-transparent dark backgrounds
- Apply backdrop blur effect

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Redesign Profile Section - Settings Button & User Info

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.tsx` (settings button, profile section)
- Modify: `src/pages/ProfilePage/ProfilePage.module.css` (settings and profile styles)

**Step 1: Update settings button section**

Replace the current settings button in ProfilePage.tsx with:

```tsx
{/* Settings Button Row */}
<div className={styles.settingsRow}>
  <button className={styles.settingsButton} onClick={handleSettingsClick}>
    <SettingsIcon className={styles.settingsIcon} />
    <span>SETTINGS</span>
  </button>
</div>
```

**Step 2: Update profile section with larger avatar**

Update the profile section:

```tsx
{/* User Profile */}
<div className={styles.profileSection}>
  <div className={styles.avatar}>
    {displayUser?.photoUrl ? (
      <img src={displayUser.photoUrl} alt={displayUser.username || 'User'} />
    ) : (
      <div className={styles.avatarPlaceholder}>
        {(displayUser?.username?.[0] || displayUser?.firstName?.[0] || '?').toUpperCase()}
      </div>
    )}
  </div>
  <h1 className={styles.username}>
    {displayUser?.username || displayUser?.firstName || 'Anonymous'}
  </h1>
  <p className={styles.joinDate}>Joined Dec 2025</p>
</div>
```

**Step 3: Update settings and profile CSS**

Add to ProfilePage.module.css:

```css
.settingsRow {
  width: 100%;
  padding: 0 14px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.settingsButton {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.20);
  border: none;
  border-radius: 50px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: white;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.28px;
  transition: background 0.2s ease;
}

.settingsButton:hover {
  background: rgba(255, 255, 255, 0.30);
}

.settingsIcon {
  width: 24px;
  height: 24px;
}

.profileSection {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 124px;
  height: 124px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatarPlaceholder {
  width: 100%;
  height: 100%;
  background: #252525;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 40px;
  font-weight: 700;
}

.username {
  margin: 0;
  color: white;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.40px;
  text-align: center;
}

.joinDate {
  margin: 0;
  color: #9F9F9F;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.28px;
  text-align: center;
}
```

**Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/pages/ProfilePage/ProfilePage.tsx src/pages/ProfilePage/ProfilePage.module.css
git commit -m "feat: redesign settings button and profile section

- Move settings button to right-aligned row with SettingsIcon
- Increase avatar size to 124px
- Center profile section with username and join date
- Update typography (20px username, 14px join date)
- Apply dark theme styling

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Redesign Stats Cards with Colored Icons

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.tsx` (stats cards section)
- Modify: `src/pages/ProfilePage/ProfilePage.module.css` (stats styles)

**Step 1: Update stats cards JSX**

Replace the stats grid section in ProfilePage.tsx:

```tsx
{/* Stats Cards */}
<div className={styles.statsGrid}>
  <div className={styles.statCard}>
    <div className={styles.iconContainer}>
      <GamepadIcon className={styles.statIcon} style={{ color: '#86CE11' }} />
    </div>
    <div className={styles.statInfo}>
      <div className={styles.statValue}>
        {loading ? '...' : displayStats?.gamesPlayed || 0}
      </div>
      <div className={styles.statLabel}>Games played</div>
    </div>
  </div>

  <div className={styles.statCard}>
    <div className={styles.iconContainer}>
      <MedalIcon className={styles.statIcon} style={{ color: '#FF4D00' }} />
    </div>
    <div className={styles.statInfo}>
      <div className={styles.statValue}>
        {loading ? '...' : displayStats?.totalWins || 0}
      </div>
      <div className={styles.statLabel}>Total wins</div>
    </div>
  </div>

  <div className={styles.statCard}>
    <div className={styles.iconContainer}>
      <DollarIcon className={styles.statIcon} style={{ color: '#0098EA' }} />
    </div>
    <div className={styles.statInfo}>
      <div className={styles.statValue}>
        ${loading ? '...' : displayStats?.amountWon || 0}
      </div>
      <div className={styles.statLabel}>Amount won</div>
    </div>
  </div>
</div>
```

**Step 2: Update stats cards CSS**

Add to ProfilePage.module.css:

```css
.statsGrid {
  align-self: stretch;
  padding: 0 14px;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 10px;
}

.statCard {
  width: 114px;
  padding: 10px;
  background: #171717;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  position: relative;
}

.iconContainer {
  width: 40px;
  height: 40px;
  background: #252525;
  border-radius: 999px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.statIcon {
  width: 30px;
  height: 30px;
}

.statInfo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.statValue {
  color: white;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.40px;
  text-align: center;
}

.statLabel {
  color: #9F9F9F;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.24px;
  text-align: center;
}
```

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/pages/ProfilePage/ProfilePage.tsx src/pages/ProfilePage/ProfilePage.module.css
git commit -m "feat: redesign stats cards with colored circular icons

- Replace vertical grid with horizontal 3-card layout
- Add circular icon containers (40px) with #252525 background
- Use colored icons: green gamepad, orange medal, blue dollar
- Update card styling (114px width, #171717 background)
- Update typography (20px values, 12px labels)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Update Cash Out Button Styling

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.tsx` (cash out button)
- Modify: `src/pages/ProfilePage/ProfilePage.module.css` (button styles)

**Step 1: Update cash out button JSX**

Replace the cash out button in ProfilePage.tsx:

```tsx
{/* Cash Out Button */}
<button className={styles.cashOutButton} onClick={handleCashOutClick}>
  <span className={styles.cashOutText}>Cash out Your Winnings</span>
  <ArrowRightIcon className={styles.cashOutArrow} />
</button>
```

**Step 2: Update cash out button CSS**

Add to ProfilePage.module.css:

```css
.cashOutButton {
  /* Box model */
  width: 362px;
  max-width: calc(100% - 28px);
  height: 44px;
  padding: 10px 20px;
  border: none;
  border-radius: 50px;

  /* Display */
  display: flex;
  justify-content: space-between;
  align-items: center;

  /* Visual */
  background: #FF4D00;
  cursor: pointer;

  /* Animation */
  transition: background 0.2s ease;
}

.cashOutButton:hover {
  background: #E54500;
}

.cashOutButton:active {
  transform: scale(0.98);
}

.cashOutButton:focus-visible {
  outline: 2px solid #FF4D00;
  outline-offset: 2px;
}

.cashOutText {
  color: white;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.32px;
}

.cashOutArrow {
  width: 24px;
  height: 24px;
  color: white;
}
```

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/pages/ProfilePage/ProfilePage.tsx src/pages/ProfilePage/ProfilePage.module.css
git commit -m "feat: update cash out button with uppercase text and arrow

- Change text to 'CASH OUT YOUR WINNINGS' (uppercase)
- Add ArrowRightIcon (24x24) on right side
- Update button dimensions (362x44px with max-width)
- Set background to #FF4D00 (orange)
- Add hover, active, and focus-visible states

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Update Page Container Background

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.module.css` (container styles)

**Step 1: Update container CSS**

Update the `.container` style in ProfilePage.module.css:

```css
.container {
  width: 100%;
  height: 100%;
  background: #050505;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  gap: 20px;
  padding-bottom: 80px; /* Space for bottom nav */
}
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/pages/ProfilePage/ProfilePage.module.css
git commit -m "feat: update profile page container with dark background

- Set background to #050505 (very dark theme)
- Add flex column layout with 20px gap between sections
- Set overflow hidden
- Add bottom padding for navigation bar

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Redesign Cash Out Modal Layout

**Files:**
- Modify: `src/components/CashOutModal/CashOutModal.tsx` (modal structure)
- Create: `src/assets/icons/arrow-left.svg` (if not exists)

**Step 1: Update CashOutModal component structure**

Replace the modal content in CashOutModal.tsx with simplified structure:

```tsx
import ArrowLeftIcon from '../../assets/icons/arrow-left.svg?react';
import CashIcon from '../../assets/icons/cash.svg?react';
import ArrowRightIcon from '../../assets/icons/arrow-right.svg?react';

// In the modalContent variable:
const modalContent = (
  <div className={styles.overlay}>
    {/* Back Button */}
    <div className={styles.backButtonRow}>
      <button className={styles.backButton} onClick={handleClose} disabled={isProcessing}>
        <ArrowLeftIcon className={styles.backIcon} />
        <span>BACK</span>
      </button>
    </div>

    <div className={styles.content}>
      {/* Balance Display */}
      <div className={styles.balanceSection}>
        <div className={styles.balanceDisplay}>
          <CashIcon className={styles.cashIcon} />
          <span className={styles.balanceAmount}>{currentBalance}</span>
        </div>
        <p className={styles.balanceLabel}>Current balance</p>
      </div>

      {/* Info Section */}
      <div className={styles.infoSection}>
        <h2 className={styles.infoTitle}>Cash Out</h2>
        <p className={styles.infoText}>Only winnings can be withdraw</p>
        <p className={styles.infoText}>Bonus cash is forfeited upon withdraw</p>
        <p className={styles.infoText}>$6 minimum withdraw</p>
      </div>

      {/* Wallet Input */}
      <div className={styles.inputSection}>
        <label className={styles.inputLabel}>Enter TON wallet address</label>
        <input
          type="text"
          className={styles.walletInput}
          value={walletAddress}
          onChange={handleAddressChange}
          placeholder="Some numbers & letters..."
          disabled={isProcessing}
        />
      </div>

      {/* Cash Out Button */}
      <div className={styles.bottomSection}>
        <button
          className={styles.cashOutButton}
          onClick={handleCashOut}
          disabled={isButtonDisabled}
        >
          <span>Cash Out</span>
          <ArrowRightIcon className={styles.arrowIcon} />
        </button>
      </div>

      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}
    </div>
  </div>
);
```

**Step 2: Update handleCashOut to use simple validation**

Update the validation in handleCashOut:

```typescript
const handleCashOut = async () => {
  if (isProcessing) return;

  // Simple validation - just check if wallet address is not empty
  if (!walletAddress.trim()) {
    setError('Please enter a wallet address');
    return;
  }

  if (!validateAddress(walletAddress)) {
    setError('Invalid TON wallet address');
    return;
  }

  // Minimum withdraw validation
  if (currentBalance < 6) {
    setError('Minimum withdraw is $6');
    return;
  }

  setIsProcessing(true);
  haptic.medium();

  try {
    // Deduct all balance (simplified - no amount selection)
    await api.deductCoins(currentBalance);

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
```

**Step 3: Remove unused state (amount and percentage)**

Remove from state declarations:
```typescript
// Remove these lines:
// const [amount, setAmount] = useState('');
// const handlePercentageClick = ...
// const handleAmountChange = ...
```

**Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/components/CashOutModal/CashOutModal.tsx
git commit -m "feat: redesign cash out modal with simplified layout

- Add back button with ArrowLeftIcon
- Simplify to single balance display (remove amount input)
- Add info section with withdraw rules
- Remove percentage buttons
- Update button with ArrowRightIcon
- Simplify validation logic

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Style Cash Out Modal with Dark Theme

**Files:**
- Modify: `src/components/CashOutModal/CashOutModal.module.css` (complete modal styles)

**Step 1: Replace CashOutModal CSS with new dark theme styles**

Replace the entire contents of CashOutModal.module.css:

```css
.overlay {
  width: 100%;
  height: 100%;
  padding-top: 20px;
  padding-bottom: 50px;
  background: #171717;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.backButtonRow {
  align-self: stretch;
  padding-left: 14px;
  padding-right: 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.backButton {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.20);
  border: none;
  border-radius: 50px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: white;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.28px;
  transition: background 0.2s ease;
}

.backButton:hover {
  background: rgba(255, 255, 255, 0.30);
}

.backButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.backIcon {
  width: 24px;
  height: 24px;
}

.content {
  width: 300px;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.balanceSection {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.balanceDisplay {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cashIcon {
  width: 40px;
  height: 40px;
  color: #0098EA;
}

.balanceAmount {
  color: white;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0.60px;
}

.balanceLabel {
  margin: 0;
  color: #0098EA;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.36px;
  text-align: center;
}

.infoSection {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.infoTitle {
  margin: 0;
  color: white;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.36px;
}

.infoText {
  margin: 0;
  color: #9F9F9F;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.28px;
}

.inputSection {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.inputLabel {
  color: #9F9F9F;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.24px;
}

.walletInput {
  align-self: stretch;
  padding: 6px;
  background: #252525;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.28px;
  outline: none;
  height: 28px;
}

.walletInput::placeholder {
  color: #3D3D3D;
}

.walletInput:focus {
  outline: 1px solid #0098EA;
}

.bottomSection {
  align-self: stretch;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.cashOutButton {
  width: 300px;
  height: 44px;
  padding: 10px 20px;
  background: #FF4D00;
  border: none;
  border-radius: 50px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  color: white;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.32px;
  transition: background 0.2s ease;
}

.cashOutButton:hover {
  background: #E54500;
}

.cashOutButton:active {
  transform: scale(0.98);
}

.cashOutButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.arrowIcon {
  width: 24px;
  height: 24px;
}

.errorMessage {
  padding: 12px;
  background: rgba(255, 77, 0, 0.2);
  border: 1px solid #FF4D00;
  border-radius: 8px;
  color: #FF4D00;
  font-size: 14px;
  text-align: center;
}
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/CashOutModal/CashOutModal.module.css
git commit -m "feat: apply dark theme styling to cash out modal

- Set #171717 background with full height layout
- Style back button with semi-transparent white background
- Design balance display with large cash icon and text
- Style info section with white title and gray text
- Design wallet input with #252525 background
- Style cash out button with #FF4D00 orange background
- Add hover, active, and disabled states

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Update Bottom Navigation Bar Styling

**Files:**
- Modify: `src/components/BottomNavBar/BottomNavBar.module.css` (navigation styles)

**Step 1: Update BottomNavBar CSS to match design**

Replace the styles in BottomNavBar.module.css with dark theme:

```css
.container {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 68px;
  padding: 10px 14px;
  background: rgba(23, 23, 23, 0.80);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0;
  z-index: 1000;
}

.navItem {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2px;
  text-decoration: none;
  color: #9F9F9F;
  transition: color 0.2s ease;
  padding: 8px;
}

.navItem:hover {
  color: #CCCCCC;
}

.navItemActive {
  color: white;
}

.navIcon {
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.navIcon svg {
  width: 24px;
  height: 24px;
}

.navLabel {
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.24px;
  text-align: center;
}

.playButton {
  /* Center play button styling - same as other nav items */
}
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/BottomNavBar/BottomNavBar.module.css
git commit -m "feat: update bottom navigation bar with dark theme

- Set semi-transparent dark background (rgba(23, 23, 23, 0.80))
- Add backdrop filter blur effect
- Update navigation item colors (#9F9F9F default, white active)
- Improve spacing and typography (12px labels)
- Update hover states

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Test and Verify Complete UI Redesign

**Files:**
- No file changes

**Step 1: Run TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Start development server**

Run: `npm run dev`
Expected: Server starts on http://localhost:5173

**Step 3: Manual testing checklist**

Test the following in browser:

- [ ] Profile page loads with dark #050505 background
- [ ] Top header displays with resource badges (rank, gems, cash)
- [ ] Avatar appears in rank badge with correct positioning
- [ ] Mock data displays correctly without Telegram context
- [ ] Settings button is right-aligned and functional
- [ ] Profile section shows 124px avatar centered
- [ ] Stats cards display horizontally with colored icons (green, orange, blue)
- [ ] Cash out button displays with uppercase text and arrow icon
- [ ] Cash out modal opens with simplified layout
- [ ] Modal shows back button, balance, info section, and wallet input
- [ ] Modal has #171717 dark background
- [ ] Bottom navigation has semi-transparent dark background
- [ ] Navigation items highlight correctly on different pages
- [ ] All hover and active states work properly
- [ ] Mobile responsive layout works (test at 390px width)

**Step 4: Test with Telegram context (if available)**

If testing in Telegram Mini App:
- [ ] Real user data displays instead of mock data
- [ ] All functionality works with real authentication

**Step 5: Verify no console errors**

Check browser console:
Expected: No errors or warnings

**Step 6: Final commit (if any fixes needed)**

If any issues were found and fixed:
```bash
git add .
git commit -m "fix: address issues found during testing

[Describe any fixes made]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Summary

**Files Created:**
- `src/utils/mockData.ts` - Mock user data utility for local development

**Files Modified:**
- `src/pages/ProfilePage/ProfilePage.tsx` - Complete UI redesign with top header, stats cards, cash out button
- `src/pages/ProfilePage/ProfilePage.module.css` - Dark theme styling for profile page
- `src/components/CashOutModal/CashOutModal.tsx` - Simplified modal layout
- `src/components/CashOutModal/CashOutModal.module.css` - Dark theme modal styling
- `src/components/BottomNavBar/BottomNavBar.module.css` - Dark theme navigation styling

**Key Features:**
- Dark theme with #050505 and #171717 backgrounds
- Top header with resource badges (rank, gems, cash)
- Mock data support for local development without Telegram
- Redesigned stats cards with colored circular icons
- Simplified cash out modal with improved UX
- Updated bottom navigation with semi-transparent dark background
- Responsive design matching Figma specifications

**Design Colors:**
- Background: #050505 (very dark), #171717 (dark cards)
- Semi-transparent: rgba(23, 23, 23, 0.50), rgba(23, 23, 23, 0.70), rgba(23, 23, 23, 0.80)
- Text: white primary, #9F9F9F secondary, #3D3D3D tertiary
- Accent: #FF4D00 (orange buttons), #0098EA (blue cash), #86CE11 (green gamepad), #FF4D00 (orange medal)
- Borders: #3D3D3D

**Testing Notes:**
- Test in local development mode (should show mock data)
- Test in Telegram Mini App (should show real user data)
- Verify all interactive elements (buttons, navigation)
- Check responsive layout at 390px width
- Ensure no TypeScript or console errors
