# Profile Page Complete Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Completely redesign ProfilePage and CashOutModal to match the Figma design specifications with new layout, styling, and components

**Architecture:** Replace the existing ProfilePage layout with a new design featuring a top header with resource badges (rank/avatar, gems, cash), bottom navigation bar, settings button, centered profile avatar, stats cards in a horizontal grid, and a redesigned CashOutModal with simplified layout

**Tech Stack:** React, TypeScript, CSS Modules, existing SVG icons

---

## Current State Analysis

**Existing Components:**
- `src/pages/ProfilePage/ProfilePage.tsx` - Current profile page implementation
- `src/pages/ProfilePage/ProfilePage.module.css` - Current styles
- `src/components/CashOutModal/CashOutModal.tsx` - Current modal
- `src/components/CashOutModal/CashOutModal.module.css` - Current modal styles
- `src/components/BottomNavBar/BottomNavBar.tsx` - Navigation bar (may need updates)

**Available Icons:**
- arrow-left.svg, arrow-right.svg
- cash.svg, dollar.svg
- gamepad.svg, gem.svg
- medal.svg, settings.svg
- star.svg, trophy.svg, user.svg

---

### Task 1: Redesign ProfilePage Top Header with Resource Badges

**Goal:** Create a new top header with semi-transparent background showing avatar+rank badge, gems badge, and cash badge

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.tsx` (lines 76-87)
- Modify: `src/pages/ProfilePage/ProfilePage.module.css` (add new styles)

**Step 1: Update ProfilePage JSX for top header**

Replace the existing header section (lines 78-87) with the new resource badges design:

```typescript
<div className={styles.topHeader}>
  {/* User Avatar Badge + Rank */}
  <div className={styles.resourceBadge}>
    {user.photoUrl ? (
      <img src={user.photoUrl} alt="" className={styles.resourceAvatar} />
    ) : (
      <div className={styles.resourceAvatarPlaceholder}>
        {(user.username?.[0] || user.firstName?.[0] || '?').toUpperCase()}
      </div>
    )}
    <StarIcon className={styles.resourceIcon} />
    <span className={styles.resourceValue}>42</span>
  </div>

  {/* Gems Badge */}
  <div className={styles.resourceBadge}>
    <GemIcon className={styles.resourceIcon} />
    <span className={styles.resourceValue}>50</span>
  </div>

  {/* Cash Badge */}
  <div className={styles.resourceBadge}>
    <CashIcon className={styles.resourceIcon} />
    <span className={styles.resourceValue}>$0</span>
  </div>
</div>
```

**Step 2: Add SVG icon imports**

Add at the top of ProfilePage.tsx after existing imports:

```typescript
import StarIcon from '../../assets/icons/star.svg?react';
import GemIcon from '../../assets/icons/gem.svg?react';
import CashIcon from '../../assets/icons/cash.svg?react';
import GamepadIcon from '../../assets/icons/gamepad.svg?react';
import MedalIcon from '../../assets/icons/medal.svg?react';
import DollarIcon from '../../assets/icons/dollar.svg?react';
import SettingsIcon from '../../assets/icons/settings.svg?react';
import ArrowRightIcon from '../../assets/icons/arrow-right.svg?react';
```

**Step 3: Add CSS for top header**

Add to ProfilePage.module.css:

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
}

.topHeader::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 62px;
  background: rgba(23, 23, 23, 0.5);
  z-index: -1;
}

.resourceBadge {
  position: relative;
  padding: 4px 10px 4px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2px;
  min-width: 109px;
}

.resourceBadge::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 28px;
  background: rgba(23, 23, 23, 0.7);
  border-radius: 40px;
  border-bottom: 1px solid #3D3D3D;
  z-index: -1;
}

.resourceBadge:first-child {
  padding-left: 20px;
}

.resourceBadge:first-child .resourceAvatar,
.resourceBadge:first-child .resourceAvatarPlaceholder {
  position: absolute;
  left: -15px;
  top: -1px;
  width: 30px;
  height: 30px;
  border-radius: 9999px;
}

.resourceAvatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}

.resourceAvatarPlaceholder {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #252525;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  font-weight: 700;
}

.resourceIcon {
  width: 20px;
  height: 20px;
  color: white;
}

.resourceValue {
  flex: 1;
  text-align: center;
  color: white;
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  letter-spacing: 0.28px;
}
```

**Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`

Expected: No errors

**Step 5: Commit**

```bash
git add src/pages/ProfilePage/ProfilePage.tsx src/pages/ProfilePage/ProfilePage.module.css
git commit -m "feat: redesign ProfilePage top header with resource badges

- Add top header with semi-transparent background
- Display avatar+rank badge with star icon
- Display gems badge with gem icon
- Display cash badge with cash icon
- Add proper styling with backdrop blur and rounded badges"
```

---

### Task 2: Move Settings Button and Update Profile Section Layout

**Goal:** Move settings button to right side below header and update profile section with larger centered avatar

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.tsx` (lines 78-100)
- Modify: `src/pages/ProfilePage/ProfilePage.module.css`

**Step 1: Update settings button placement**

After the topHeader, add settings button section:

```typescript
<div className={styles.settingsRow}>
  <button className={styles.settingsButton} onClick={handleSettingsClick}>
    <SettingsIcon className={styles.settingsIcon} />
    <span>SETTINGS</span>
  </button>
</div>
```

**Step 2: Update profile section structure**

Replace the existing profileSection (lines 90-102) with:

```typescript
<div className={styles.profileSection}>
  <div className={styles.avatarLarge}>
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
```

**Step 3: Add CSS for settings row and updated profile section**

Add to ProfilePage.module.css:

```css
.settingsRow {
  width: 100%;
  padding: 0 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.settingsButton {
  padding: 6px 12px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  color: white;
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.28px;
}

.settingsButton::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 36px;
  background: white;
  opacity: 0.2;
  border-radius: 50px;
  z-index: -1;
}

.settingsIcon {
  width: 24px;
  height: 24px;
  color: white;
}

.profileSection {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.avatarLarge {
  width: 124px;
  height: 124px;
  border-radius: 50%;
  overflow: hidden;
}

.avatarLarge img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatarLarge .avatarPlaceholder {
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
  color: white;
  font-size: 20px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  letter-spacing: 0.4px;
  margin: 0;
  text-align: center;
}

.joinDate {
  color: #9F9F9F;
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  font-weight: 400;
  letter-spacing: 0.28px;
  margin: 0;
  text-align: center;
}
```

**Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`

Expected: No errors

**Step 5: Commit**

```bash
git add src/pages/ProfilePage/ProfilePage.tsx src/pages/ProfilePage/ProfilePage.module.css
git commit -m "feat: move settings button and update profile section

- Move settings button to right-aligned row below header
- Increase avatar size to 124px (large)
- Center profile section with name and join date
- Update styling to match Figma design"
```

---

### Task 3: Redesign Stats Cards with New Layout

**Goal:** Replace stats grid with horizontal 3-card layout using new design with icon circles and improved typography

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.tsx` (stats grid section)
- Modify: `src/pages/ProfilePage/ProfilePage.module.css`

**Step 1: Update stats grid JSX**

Replace the statsGrid section with:

```typescript
<div className={styles.statsGrid}>
  {/* Games Played */}
  <div className={styles.statCard}>
    <div className={styles.statIconContainer}>
      <GamepadIcon className={styles.statIcon} />
    </div>
    <div className={styles.statValue}>
      {loading ? '...' : stats?.gamesPlayed || 25}
    </div>
    <div className={styles.statLabel}>Games played</div>
  </div>

  {/* Total Wins */}
  <div className={styles.statCard}>
    <div className={styles.statIconContainer}>
      <MedalIcon className={styles.statIcon} />
    </div>
    <div className={styles.statValue}>
      {loading ? '...' : stats?.totalWins || 20}
    </div>
    <div className={styles.statLabel}>Total wins</div>
  </div>

  {/* Amount Won */}
  <div className={styles.statCard}>
    <div className={styles.statIconContainer}>
      <DollarIcon className={styles.statIcon} />
    </div>
    <div className={styles.statValue}>
      ${loading ? '...' : stats?.amountWon || 12}
    </div>
    <div className={styles.statLabel}>Amount won</div>
  </div>
</div>
```

**Step 2: Add CSS for new stats cards**

Add to ProfilePage.module.css:

```css
.statsGrid {
  width: 100%;
  padding: 0 14px;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 10px;
}

.statCard {
  width: 114px;
  padding: 10px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.statCard::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 111px;
  background: #171717;
  border-radius: 10px;
  z-index: -1;
}

.statIconContainer {
  width: 40px;
  height: 40px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #252525;
  border-radius: 999px;
}

.statIcon {
  width: 30px;
  height: 30px;
}

.statCard:nth-child(1) .statIcon {
  color: #86CE11;
}

.statCard:nth-child(2) .statIcon {
  color: #FF4D00;
}

.statCard:nth-child(3) .statIcon {
  color: #0098EA;
}

.statValue {
  color: white;
  font-size: 20px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-align: center;
}

.statLabel {
  color: #9F9F9F;
  font-size: 12px;
  font-family: 'Roboto', sans-serif;
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
git commit -m "feat: redesign stats cards with new layout

- Change to horizontal 3-card layout
- Add circular icon containers with colored icons
- Update typography (20px values, 12px labels)
- Use #171717 card background with rounded corners
- Apply icon colors: green (gamepad), orange (medal), blue (dollar)"
```

---

### Task 4: Update Cash Out Button Styling

**Goal:** Update the cash out button to match new design with uppercase text and arrow icon

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.tsx` (cash out button)
- Modify: `src/pages/ProfilePage/ProfilePage.module.css`

**Step 1: Update cash out button JSX**

Replace the cashOutButton with:

```typescript
<button className={styles.cashOutButton} onClick={handleCashOutClick}>
  <span className={styles.cashOutText}>CASH OUT YOUR WINNINGS</span>
  <ArrowRightIcon className={styles.cashOutArrow} />
</button>
```

**Step 2: Update cash out button CSS**

Update in ProfilePage.module.css:

```css
.cashOutButton {
  width: 362px;
  max-width: calc(100% - 28px);
  height: 44px;
  padding: 10px 20px;
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #FF4D00;
  border-radius: 50px;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}

.cashOutButton:hover {
  opacity: 0.9;
}

.cashOutButton:active {
  opacity: 0.8;
}

.cashOutText {
  color: white;
  font-size: 16px;
  font-family: 'Roboto', sans-serif;
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
git commit -m "feat: update cash out button styling

- Change text to uppercase 'CASH OUT YOUR WINNINGS'
- Add arrow-right icon on the right side
- Set button width to 362px with max-width constraint
- Improve button height to 44px
- Add hover and active states"
```

---

### Task 5: Update Page Container and Background

**Goal:** Update the main container styling to match the new dark design

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.module.css`

**Step 1: Update container CSS**

Update the .container class in ProfilePage.module.css:

```css
.container {
  width: 100%;
  min-height: 100vh;
  position: relative;
  background: #050505;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding-bottom: 100px; /* Space for bottom nav */
}
```

**Step 2: Verify the page layout**

Run: `npm run dev`

Open: http://localhost:5173/profile

Expected:
- Dark background (#050505)
- Proper spacing between sections (20px gap)
- Bottom padding for navigation bar

**Step 3: Commit**

```bash
git add src/pages/ProfilePage/ProfilePage.module.css
git commit -m "feat: update page container and background

- Set background to #050505 (darker)
- Add flex column layout with 20px gap
- Add bottom padding for navigation bar
- Ensure proper overflow handling"
```

---

### Task 6: Redesign CashOutModal Layout

**Goal:** Completely redesign the CashOutModal with simplified layout, back button, and updated styling

**Files:**
- Modify: `src/components/CashOutModal/CashOutModal.tsx`
- Modify: `src/components/CashOutModal/CashOutModal.module.css`

**Step 1: Update CashOutModal component structure**

Replace the modal content in CashOutModal.tsx with:

```typescript
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Address } from '@ton/core';
import styles from './CashOutModal.module.css';
import { haptic } from '../../providers/TelegramProvider';
import { api } from '../../services/api';
import CashIcon from '../../assets/icons/cash.svg?react';
import ArrowLeftIcon from '../../assets/icons/arrow-left.svg?react';
import ArrowRightIcon from '../../assets/icons/arrow-right.svg?react';

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
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isProcessing) return;
    haptic.light();
    setWalletAddress('');
    setError('');
    onClose();
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWalletAddress(e.target.value);
    setError('');
  };

  const validateAddress = (address: string): boolean => {
    try {
      Address.parse(address);
      return true;
    } catch {
      return false;
    }
  };

  const handleCashOut = async () => {
    if (isProcessing) return;

    // Validation
    if (!walletAddress.trim()) {
      setError('Please enter a TON wallet address');
      return;
    }

    if (!validateAddress(walletAddress)) {
      setError('Invalid TON wallet address');
      return;
    }

    if (currentBalance < 6) {
      setError('Minimum withdraw amount is $6');
      return;
    }

    setIsProcessing(true);
    haptic.medium();

    try {
      await api.cashOut(walletAddress);
      haptic.success();
      onSuccess();
      handleClose();
    } catch (err) {
      haptic.error();
      const message = err instanceof Error ? err.message : 'Cash out failed';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const modalContent = (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Back Button */}
        <div className={styles.backButtonRow}>
          <button className={styles.backButton} onClick={handleClose}>
            <ArrowLeftIcon className={styles.backIcon} />
            <span>BACK</span>
          </button>
        </div>

        <div className={styles.content}>
          {/* Current Balance */}
          <div className={styles.balanceSection}>
            <div className={styles.balanceDisplay}>
              <CashIcon className={styles.balanceCashIcon} />
              <div className={styles.balanceValue}>{currentBalance}</div>
            </div>
            <div className={styles.balanceLabel}>Current balance</div>
          </div>

          {/* Cash Out Info */}
          <div className={styles.infoSection}>
            <div className={styles.infoTitle}>Cash Out</div>
            <div className={styles.infoText}>Only winnings can be withdraw</div>
            <div className={styles.infoText}>Bonus cash is forfeited upon withdraw</div>
            <div className={styles.infoText}>$6 minimum withdraw</div>
          </div>

          {/* Wallet Address Input */}
          <div className={styles.inputSection}>
            <label className={styles.inputLabel}>Enter TON wallet address</label>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                className={styles.input}
                placeholder="Some numbers & letters..."
                value={walletAddress}
                onChange={handleAddressChange}
                disabled={isProcessing}
              />
            </div>
            {error && <div className={styles.error}>{error}</div>}
          </div>

          {/* Cash Out Button */}
          <div className={styles.buttonSection}>
            <button
              className={styles.cashOutButton}
              onClick={handleCashOut}
              disabled={isProcessing}
            >
              <span className={styles.cashOutText}>
                {isProcessing ? 'PROCESSING...' : 'CASH OUT'}
              </span>
              <ArrowRightIcon className={styles.cashOutArrow} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`

Expected: No errors

**Step 3: Commit**

```bash
git add src/components/CashOutModal/CashOutModal.tsx
git commit -m "feat: redesign CashOutModal structure

- Add back button with arrow-left icon at top
- Simplify to single current balance display
- Remove amount input and percentage buttons
- Add info section with withdraw rules
- Update cash out button with arrow icon
- Import new icon components"
```

---

### Task 7: Style CashOutModal

**Goal:** Apply complete styling to the redesigned CashOutModal

**Files:**
- Modify: `src/components/CashOutModal/CashOutModal.module.css`

**Step 1: Replace CashOutModal CSS**

Replace the entire CashOutModal.module.css with:

```css
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal {
  width: 100%;
  max-width: 390px;
  height: 100vh;
  padding: 20px 0 50px;
  background: #171717;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.backButtonRow {
  width: 100%;
  padding: 0 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.backButton {
  padding: 6px 12px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  color: white;
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.28px;
}

.backButton::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 36px;
  background: white;
  opacity: 0.2;
  border-radius: 50px;
  z-index: -1;
}

.backIcon {
  width: 24px;
  height: 24px;
  color: white;
}

.content {
  width: 300px;
  margin: 0 auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.balanceSection {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.balanceDisplay {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
}

.balanceCashIcon {
  width: 40px;
  height: 40px;
  color: #0098EA;
}

.balanceValue {
  color: white;
  font-size: 30px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  letter-spacing: 0.6px;
}

.balanceLabel {
  color: #0098EA;
  font-size: 18px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  letter-spacing: 0.36px;
  text-align: center;
}

.infoSection {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.infoTitle {
  color: white;
  font-size: 18px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  letter-spacing: 0.36px;
}

.infoText {
  color: #9F9F9F;
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  font-weight: 400;
  letter-spacing: 0.28px;
}

.inputSection {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.inputLabel {
  color: #9F9F9F;
  font-size: 12px;
  font-family: 'Roboto', sans-serif;
  font-weight: 400;
  letter-spacing: 0.24px;
}

.inputWrapper {
  width: 100%;
  padding: 6px;
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #252525;
  border-radius: 4px;
}

.input {
  width: 100%;
  height: 28px;
  background: transparent;
  border: none;
  outline: none;
  color: white;
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  font-weight: 400;
  letter-spacing: 0.28px;
}

.input::placeholder {
  color: #3D3D3D;
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  color: #FF4D00;
  font-size: 12px;
  font-family: 'Roboto', sans-serif;
  font-weight: 400;
  letter-spacing: 0.24px;
  margin-top: 4px;
}

.buttonSection {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.cashOutButton {
  width: 100%;
  height: 44px;
  padding: 10px 20px;
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #FF4D00;
  border-radius: 50px;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}

.cashOutButton:hover:not(:disabled) {
  opacity: 0.9;
}

.cashOutButton:active:not(:disabled) {
  opacity: 0.8;
}

.cashOutButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cashOutText {
  color: white;
  font-size: 16px;
  font-family: 'Roboto', sans-serif;
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

**Step 2: Test the modal**

Run: `npm run dev`

Test:
1. Click "CASH OUT YOUR WINNINGS" button
2. Verify modal opens with correct styling
3. Test back button closes modal
4. Test wallet input field
5. Test cash out button states

Expected:
- Dark background with semi-transparent overlay
- Modal slides up from bottom
- All elements match Figma design
- Proper spacing and typography

**Step 3: Commit**

```bash
git add src/components/CashOutModal/CashOutModal.module.css
git commit -m "feat: style CashOutModal with new design

- Add dark theme (#171717 background)
- Style back button with semi-transparent white background
- Display current balance with large cash icon
- Add info section with gray text
- Style wallet input with #252525 background
- Style cash out button with #FF4D00 background
- Add slide-up animation
- Add proper spacing (40px gaps)"
```

---

### Task 8: Update Main Container Layout

**Goal:** Ensure the ProfilePage container properly displays all sections with correct spacing

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.tsx` (main return statement)

**Step 1: Verify complete JSX structure**

Ensure the return statement has this structure:

```typescript
return (
  <div className={styles.container}>
    {/* Top Header with Resource Badges */}
    <div className={styles.topHeader}>
      {/* Resource badges code from Task 1 */}
    </div>

    {/* Settings Button Row */}
    <div className={styles.settingsRow}>
      {/* Settings button code from Task 2 */}
    </div>

    {/* Profile Section */}
    <div className={styles.profileSection}>
      {/* Profile section code from Task 2 */}
    </div>

    {/* Stats Grid */}
    <div className={styles.statsGrid}>
      {/* Stats cards code from Task 3 */}
    </div>

    {/* Cash Out Button */}
    <button className={styles.cashOutButton} onClick={handleCashOutClick}>
      {/* Cash out button code from Task 4 */}
    </button>

    {error && (
      <div className={styles.error}>{error}</div>
    )}

    {/* Cash Out Modal */}
    <CashOutModal
      isOpen={showCashOutModal}
      onClose={() => setShowCashOutModal(false)}
      currentBalance={user.coinBalance}
      onSuccess={handleCashOutSuccess}
    />

    {/* Bottom Navigation Bar */}
    <BottomNavBar />
  </div>
);
```

**Step 2: Import BottomNavBar**

Ensure BottomNavBar is imported at the top:

```typescript
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
```

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`

Expected: No errors

**Step 4: Run development server and test**

Run: `npm run dev`

Test the complete ProfilePage:
1. Top header displays correctly
2. Settings button is positioned on the right
3. Profile avatar and info are centered
4. Stats cards are in horizontal layout
5. Cash out button is styled correctly
6. Modal opens and functions properly
7. Bottom navigation bar is visible

Expected: All sections display correctly with proper spacing

**Step 5: Commit**

```bash
git add src/pages/ProfilePage/ProfilePage.tsx
git commit -m "feat: finalize ProfilePage layout structure

- Ensure all sections are in correct order
- Verify proper component imports
- Add BottomNavBar at bottom
- Maintain error display section
- Complete integration of all redesigned components"
```

---

### Task 9: Run Tests and Final Verification

**Goal:** Ensure all tests pass and the implementation is complete

**Files:**
- None (testing only)

**Step 1: Run TypeScript compilation**

Run: `npx tsc --noEmit`

Expected: No errors

**Step 2: Run test suite**

Run: `npm test`

Expected: All tests pass

**Step 3: Build for production**

Run: `npm run build`

Expected: Build succeeds without errors

**Step 4: Manual testing checklist**

Test in browser:
- [ ] Top header displays with 3 resource badges
- [ ] Avatar badge shows on the left with star icon
- [ ] Settings button is positioned correctly
- [ ] Profile avatar is large and centered (124px)
- [ ] Stats cards display in horizontal layout with colored icons
- [ ] Cash out button has correct styling and arrow icon
- [ ] Clicking cash out opens the modal
- [ ] Modal has back button that closes it
- [ ] Modal displays current balance
- [ ] Wallet input field works correctly
- [ ] Cash out button in modal functions
- [ ] Modal styling matches Figma design
- [ ] Page background is #050505
- [ ] All spacing matches design (20px gaps)
- [ ] Bottom navigation bar is visible

**Step 5: No commit needed**

This is testing only - no code changes.

---

## Testing Checklist

- [ ] ProfilePage displays with new top header
- [ ] Resource badges show avatar, rank, gems, and cash
- [ ] Settings button positioned correctly on right
- [ ] Profile section shows large centered avatar
- [ ] Stats cards display in 3-column horizontal grid
- [ ] Stats cards have colored circular icon backgrounds
- [ ] Cash out button has correct styling and arrow
- [ ] CashOutModal opens when button clicked
- [ ] Modal has back button that works
- [ ] Modal shows current balance with cash icon
- [ ] Modal displays cash out rules
- [ ] Wallet input field accepts text
- [ ] Cash out button in modal functions correctly
- [ ] All typography matches Figma (Roboto font)
- [ ] All colors match design specifications
- [ ] All spacing is consistent (20px gaps between sections)
- [ ] Page background is #050505
- [ ] All icons are properly sized and colored
- [ ] TypeScript compiles without errors
- [ ] All existing tests pass

---

## Notes for Implementation

**Color Palette:**
- Background: #050505 (page), #171717 (cards/modal)
- Semi-transparent overlay: rgba(23, 23, 23, 0.5)
- Badges background: rgba(23, 23, 23, 0.7)
- Button backgrounds: #FF4D00 (primary), white 20% opacity (secondary)
- Text colors: white, #9F9F9F (gray), #0098EA (blue accent)
- Border: #3D3D3D

**Typography:**
- Font family: 'Roboto', sans-serif
- Sizes: 30px (large numbers), 20px (values), 18px (titles), 16px (buttons), 14px (normal), 12px (labels)
- Weights: 700 (bold), 400 (regular)
- Letter spacing: 0.6px (30px), 0.4px (20px), 0.36px (18px), 0.32px (16px), 0.28px (14px), 0.24px (12px)

**Icon Colors:**
- Gamepad (Games Played): #86CE11 (green)
- Medal (Total Wins): #FF4D00 (orange)
- Dollar (Amount Won): #0098EA (blue)
- Cash icon: #0098EA (blue)

**Spacing:**
- Main gap between sections: 20px
- Internal component gaps: 10px, 4px
- Padding: 14px (horizontal), 10px-20px (various)

**Border Radius:**
- Pills/badges: 40px-50px (full round)
- Cards: 10px
- Small elements: 4px
- Circles: 999px or 9999px (full circle)

**Sizes:**
- Resource badges: 109px width, 28px height
- Top header: 62px height
- Settings button: 36px height
- Avatar (large): 124px
- Avatar (small badge): 30px
- Icon containers: 40px
- Icons: 20px-30px
- Stat cards: 114px width, 111px height
- Cash out button: 362px width, 44px height
- Modal content width: 300px

**Backdrop Blur:**
- Top header: blur(4px)

**This design prioritizes:**
- Clean, modern dark theme
- Clear visual hierarchy with icons and typography
- Consistent spacing and sizing
- Smooth interactions with proper button states
- Mobile-first responsive design (390px base width)
