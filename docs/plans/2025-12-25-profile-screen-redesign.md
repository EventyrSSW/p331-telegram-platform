# Profile Screen Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Profile Screen to match the new design specifications with improved layout, statistics cards, and visual elements.

**Architecture:** Update ProfilePage component and CSS to match the new design system with proper header integration (showing rank, gems, cash badges), improved stats cards with icons, larger profile avatar, and prominent "Cash out Your Winnings" button. No git commits per user instructions.

**Tech Stack:** React, TypeScript, CSS Modules, SVG Icons

---

## Design Specifications

### Color Palette
- Background: `#050505` (main) / `#171717` (cards)
- Text Primary: `#FFFFFF`
- Text Secondary: `#9F9F9F`
- Accent Orange: `#FF4D00`
- Accent Green: `#86CE11`
- Accent Blue: `#0098EA`
- Card Background: `rgba(23.42, 23.42, 23.42, 0.70)`
- Border: `#3D3D3D`

### Component Sizes
- Avatar: 124px × 124px (circular)
- Stat Cards: 114px × 111px each (3 columns)
- Stat Icon Container: 40px × 40px circular background
- Settings Button: Small secondary with icon
- Cash Out Button: Full width, 44px height, orange primary

---

### Task 1: Create Icon Assets Directory

**Files:**
- Create: `src/assets/icons/star.svg`
- Create: `src/assets/icons/gem.svg`
- Create: `src/assets/icons/cash.svg`
- Create: `src/assets/icons/gamepad.svg`
- Create: `src/assets/icons/medal.svg`
- Create: `src/assets/icons/dollar.svg`
- Create: `src/assets/icons/settings.svg`
- Create: `src/assets/icons/arrow-right.svg`
- Create: `src/assets/icons/trophy.svg`
- Create: `src/assets/icons/user.svg`

**Step 1: Create icons directory**

Run: `mkdir -p src/assets/icons`
Expected: Directory created

**Step 2: Create star.svg (for rank/rating)**

Create `src/assets/icons/star.svg`:

```svg
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 1.66667L12.575 6.88333L18.3333 7.725L14.1667 11.7833L15.15 17.5167L10 14.8083L4.85 17.5167L5.83333 11.7833L1.66667 7.725L7.425 6.88333L10 1.66667Z" fill="currentColor"/>
</svg>
```

**Step 3: Create gem.svg (for crystals/gems)**

Create `src/assets/icons/gem.svg`:

```svg
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 1.66667L2.5 7.5L10 18.3333L17.5 7.5L10 1.66667Z" fill="currentColor"/>
  <path d="M10 1.66667L5.83333 7.5H14.1667L10 1.66667Z" fill="currentColor" opacity="0.7"/>
</svg>
```

**Step 4: Create cash.svg (for TON balance)**

Create `src/assets/icons/cash.svg`:

```svg
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="10" cy="10" r="8.33333" fill="currentColor"/>
  <path d="M10 5.83333V14.1667M13.3333 7.5C13.3333 6.57953 11.841 5.83333 10 5.83333C8.15893 5.83333 6.66667 6.57953 6.66667 7.5C6.66667 8.42047 8.15893 9.16667 10 9.16667C11.841 9.16667 13.3333 9.91287 13.3333 10.8333C13.3333 11.7538 11.841 12.5 10 12.5C8.15893 12.5 6.66667 11.7538 6.66667 10.8333" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
</svg>
```

**Step 5: Create gamepad.svg (for games played)**

Create `src/assets/icons/gamepad.svg`:

```svg
<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M7.5 11.25H12.5M10 8.75V13.75M20 11.25H20.625M17.5 13.75H18.125M5 15C5 18.75 7.5 22.5 12.5 22.5C15 22.5 16.25 20 17.5 20C18.75 20 20 22.5 22.5 22.5C27.5 22.5 30 18.75 30 15V12.5C30 9.73858 27.7614 7.5 25 7.5H10C7.23858 7.5 5 9.73858 5 12.5V15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

**Step 6: Create medal.svg (for total wins)**

Create `src/assets/icons/medal.svg`:

```svg
<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="15" cy="17.5" r="7.5" fill="currentColor"/>
  <path d="M8.75 2.5L11.25 10L15 17.5L11.25 10L7.5 2.5H8.75Z" fill="currentColor"/>
  <path d="M21.25 2.5L18.75 10L15 17.5L18.75 10L22.5 2.5H21.25Z" fill="currentColor"/>
</svg>
```

**Step 7: Create dollar.svg (for amount won)**

Create `src/assets/icons/dollar.svg`:

```svg
<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="15" cy="15" r="13.75" fill="currentColor"/>
  <path d="M15 5V25M20 8.75C20 7.23122 17.7614 6.25 15 6.25C12.2386 6.25 10 7.23122 10 8.75C10 10.2688 12.2386 11.25 15 11.25C17.7614 11.25 20 12.2312 20 13.75C20 15.2688 17.7614 16.25 15 16.25C12.2386 16.25 10 15.2688 10 13.75" stroke="#252525" stroke-width="2" stroke-linecap="round"/>
</svg>
```

**Step 8: Create settings.svg**

Create `src/assets/icons/settings.svg`:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
  <path d="M12 3V7M12 17V21M21 12H17M7 12H3M18.364 5.636L15.536 8.464M8.464 15.536L5.636 18.364M18.364 18.364L15.536 15.536M8.464 8.464L5.636 5.636" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>
```

**Step 9: Create arrow-right.svg**

Create `src/assets/icons/arrow-right.svg`:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

**Step 10: Create trophy.svg (for leaderboard)**

Create `src/assets/icons/trophy.svg`:

```svg
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8 8V4H24V8M8 8H4V12C4 14.2091 5.79086 16 8 16M8 8V16M24 8H28V12C28 14.2091 26.2091 16 24 16M24 8V16M8 16C8 20.4183 11.5817 24 16 24M24 16C24 20.4183 20.4183 24 16 24M16 24V28M12 28H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

**Step 11: Create user.svg (for profile nav)**

Create `src/assets/icons/user.svg`:

```svg
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="10.6667" r="5.33333" stroke="currentColor" stroke-width="2.5"/>
  <path d="M6.66667 26.6667C6.66667 21.5122 10.8455 17.3333 16 17.3333C21.1545 17.3333 25.3333 21.5122 25.3333 26.6667" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
</svg>
```

---

### Task 2: Update ProfilePage Component Structure

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.tsx`

**Step 1: Update imports and add icon imports**

Replace the import section at the top of `src/pages/ProfilePage/ProfilePage.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { useAuth } from '../../contexts/AuthContext';
import { api, UserStats } from '../../services/api';
import { CashOutModal } from '../../components/CashOutModal/CashOutModal';
import { haptic } from '../../providers/TelegramProvider';
import styles from './ProfilePage.module.css';

// Import SVG icons
import StarIcon from '../../assets/icons/star.svg?react';
import GemIcon from '../../assets/icons/gem.svg?react';
import CashIcon from '../../assets/icons/cash.svg?react';
import GamepadIcon from '../../assets/icons/gamepad.svg?react';
import MedalIcon from '../../assets/icons/medal.svg?react';
import DollarIcon from '../../assets/icons/dollar.svg?react';
import SettingsIcon from '../../assets/icons/settings.svg?react';
import ArrowRightIcon from '../../assets/icons/arrow-right.svg?react';
```

**Step 2: Update the header section with resource badges**

Replace the header section (lines 78-87) with:

```typescript
      {/* Top Header with Resources */}
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

      {/* Settings Button */}
      <div className={styles.settingsRow}>
        <button className={styles.settingsButton} onClick={handleSettingsClick}>
          <SettingsIcon className={styles.settingsIcon} />
          <span>SETTINGS</span>
        </button>
      </div>
```

**Step 3: Update profile section with larger avatar**

Replace the profile section (lines 90-102) with:

```typescript
      {/* User Profile */}
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

**Step 4: Update stats cards with new icons and styling**

Replace the stats grid section (lines 104-142) with:

```typescript
      {/* Stats Cards */}
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

**Step 5: Update Cash Out button with new styling**

Replace the cash out button section (lines 144-150) with:

```typescript
      {/* Cash Out Button */}
      <button className={styles.cashOutButton} onClick={handleCashOutClick}>
        <span className={styles.cashOutText}>CASH OUT YOUR WINNINGS</span>
        <ArrowRightIcon className={styles.cashOutArrow} />
      </button>
```

---

### Task 3: Update ProfilePage Styles

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.module.css`

**Step 1: Replace the entire CSS file**

Replace the entire content of `src/pages/ProfilePage/ProfilePage.module.css`:

```css
/* Container */
.container {
  min-height: 100vh;
  background: #050505;
  padding: 0;
  padding-bottom: 88px; /* Space for bottom nav */
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

/* Top Header with Resources */
.topHeader {
  width: 100%;
  max-width: 390px;
  padding: 20px 14px 14px 29px;
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 10px;
  position: relative;
  background: rgba(23.42, 23.42, 23.42, 0.50);
}

.resourceBadge {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 10px 4px 20px;
  background: rgba(23.42, 23.42, 23.42, 0.70);
  border-radius: 40px;
  border-bottom: 1px solid #3D3D3D;
  min-width: 109px;
}

.resourceBadge:first-child {
  padding-left: 20px;
}

.resourceAvatar,
.resourceAvatarPlaceholder {
  position: absolute;
  left: -15px;
  top: -1px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
}

.resourceAvatar {
  object-fit: cover;
}

.resourceAvatarPlaceholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent-primary, #FF4D00);
  color: white;
  font-size: 12px;
  font-weight: 700;
}

.resourceIcon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.resourceValue {
  flex: 1;
  color: white;
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  letter-spacing: 0.28px;
  text-align: center;
}

/* Settings Row */
.settingsRow {
  width: 100%;
  max-width: 390px;
  padding: 0 14px;
  display: flex;
  justify-content: flex-end;
}

.settingsButton {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.20);
  border: none;
  border-radius: 50px;
  color: white;
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.28px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.settingsButton:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 0.15);
}

.settingsIcon {
  width: 24px;
  height: 24px;
}

/* Profile Section */
.profileSection {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.avatarLarge {
  width: 124px;
  height: 124px;
  border-radius: 50%;
  overflow: hidden;
  background: #252525;
}

.avatarLarge img {
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
  background: var(--color-accent-primary, #FF4D00);
  color: white;
  font-size: 48px;
  font-weight: 700;
}

.username {
  color: white;
  font-size: 20px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  letter-spacing: 0.40px;
  margin: 0;
}

.joinDate {
  color: #9F9F9F;
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  font-weight: 400;
  letter-spacing: 0.28px;
  margin: 0;
}

/* Stats Grid */
.statsGrid {
  width: 100%;
  max-width: 390px;
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

.statIconContainer {
  width: 40px;
  height: 40px;
  background: #252525;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.statIcon {
  width: 30px;
  height: 30px;
}

/* Color overrides for specific stat icons */
.statsGrid .statCard:nth-child(1) .statIcon {
  color: #86CE11;
}

.statsGrid .statCard:nth-child(2) .statIcon {
  color: #FF4D00;
}

.statsGrid .statCard:nth-child(3) .statIcon {
  color: #0098EA;
}

.statValue {
  color: white;
  font-size: 20px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  letter-spacing: 0.40px;
  margin: 0;
}

.statLabel {
  color: #9F9F9F;
  font-size: 12px;
  font-family: 'Roboto', sans-serif;
  font-weight: 400;
  letter-spacing: 0.24px;
  text-align: center;
  line-height: 1.2;
}

/* Cash Out Button */
.cashOutButton {
  width: 362px;
  max-width: calc(100% - 28px);
  padding: 10px 20px;
  background: #FF4D00;
  border: none;
  border-radius: 50px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cashOutButton:active {
  transform: scale(0.98);
  background: #E64400;
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

/* Error */
.error {
  text-align: center;
  color: #ff4757;
  padding: 16px;
  margin: 16px;
  background: rgba(255, 71, 87, 0.1);
  border-radius: 10px;
  font-size: 14px;
  max-width: 362px;
}
```

---

### Task 4: Configure Vite for SVG React Components

**Files:**
- Modify: `vite.config.ts`
- Create: `src/vite-env.d.ts` (if needed)

**Step 1: Check if vite-plugin-svgr is installed**

Run: `npm list vite-plugin-svgr`
Expected: Check if package is listed

**Step 2: Install vite-plugin-svgr if needed**

Run: `npm install --save-dev vite-plugin-svgr`
Expected: Package installed successfully

**Step 3: Update vite.config.ts to support SVG as React components**

Add to the plugins array in `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [
    react(),
    svgr({
      include: '**/*.svg?react',
    }),
  ],
  // ... rest of config
});
```

**Step 4: Update TypeScript declarations for SVG imports**

Check if `src/vite-env.d.ts` exists and contains:

```typescript
/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />
```

If the file doesn't exist, create it with the above content.

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

---

### Task 5: Update Bottom Navigation Bar Icons

**Files:**
- Modify: `src/components/BottomNavBar/BottomNavBar.tsx`
- Modify: `src/components/BottomNavBar/BottomNavBar.module.css`

**Step 1: Import new icon components**

Add to the imports in `src/components/BottomNavBar/BottomNavBar.tsx`:

```typescript
import TrophyIcon from '../../assets/icons/trophy.svg?react';
import GamepadIcon from '../../assets/icons/gamepad.svg?react';
import UserIcon from '../../assets/icons/user.svg?react';
```

**Step 2: Update Results tab icon**

Replace the Results tab SVG (around line 22-25) with:

```typescript
        <div className={styles.navIcon}>
          <TrophyIcon />
        </div>
```

**Step 3: Update Play tab icon**

Replace the Play tab SVG (around line 36-38) with:

```typescript
        <div className={styles.navIcon}>
          <GamepadIcon />
        </div>
```

**Step 4: Update Profile tab icon**

Replace the Profile tab SVG (around line 49-52) with:

```typescript
        <div className={styles.navIcon}>
          <UserIcon />
        </div>
```

**Step 5: Update BottomNavBar styles for better icon display**

Update the `.navIcon` style in `src/components/BottomNavBar/BottomNavBar.module.css`:

```css
.navIcon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.navIcon svg {
  width: 100%;
  height: 100%;
  color: #9F9F9F;
  transition: color 0.2s ease;
}

.navItemActive .navIcon svg {
  color: white;
}
```

---

### Task 6: Test the Updated Profile Screen

**Step 1: Start the development server**

Run: `npm run dev`
Expected: Server starts on port 5173

**Step 2: Navigate to Profile page**

Open: `http://localhost:5173/profile`
Expected: Profile screen displays with new design

**Step 3: Verify all visual elements**

Checklist:
- [ ] Top header shows avatar badge, gems, and cash
- [ ] Settings button appears in top right
- [ ] Large avatar (124px) displays correctly
- [ ] Username and join date are visible
- [ ] Three stat cards display with proper icons and colors
- [ ] "Cash Out Your Winnings" button is orange and full-width
- [ ] Bottom navigation shows updated icons

**Step 4: Test responsive behavior**

Test on different viewport sizes:
- Mobile: 375px width
- Tablet: 768px width

Expected: Layout adapts properly

**Step 5: Test interactions**

Actions to test:
- [ ] Click Settings button → navigates to /settings
- [ ] Click Cash Out button → opens CashOutModal
- [ ] Verify haptic feedback works (if in Telegram)
- [ ] Bottom nav icons highlight correctly on active page

---

### Task 7: Update Header Component for Consistency

**Files:**
- Modify: `src/components/Header/Header.tsx`
- Modify: `src/components/Header/Header.module.css`

**Step 1: Import new icon components to Header**

Add to the imports in `src/components/Header/Header.tsx`:

```typescript
import StarIcon from '../../assets/icons/star.svg?react';
import GemIcon from '../../assets/icons/gem.svg?react';
import CashIcon from '../../assets/icons/cash.svg?react';
```

**Step 2: Update rank section icon**

Replace the rank icon SVG (around line 108-110) with:

```typescript
        <div className={styles.rankIcon}>
          <StarIcon />
        </div>
```

**Step 3: Update crystal/gems section icon**

Replace the crystal icon SVG (around line 118-123) with:

```typescript
        <div className={styles.crystalIcon}>
          <GemIcon />
        </div>
```

**Step 4: Update TON balance icon**

Replace the TON icon SVG (around line 134-137) with:

```typescript
        <div className={styles.tonIcon}>
          <CashIcon />
        </div>
```

**Step 5: Update Header icon styling for consistency**

Update icon styles in `src/components/Header/Header.module.css`:

```css
.rankIcon,
.crystalIcon,
.tonIcon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.rankIcon svg {
  width: 20px;
  height: 20px;
  color: #FFD700;
}

.crystalIcon svg {
  width: 20px;
  height: 20px;
  color: #FF10F0;
}

.tonIcon svg {
  width: 20px;
  height: 20px;
  color: #0098EA;
}
```

---

## Summary

This plan updates the Profile Screen to match the new design specifications:

1. **Icon Assets**: Created SVG icon library for consistent visuals
2. **Profile Layout**: Redesigned with larger avatar, improved spacing
3. **Resource Header**: Added top badges showing rank, gems, and cash
4. **Stats Cards**: Updated with circular icon containers and proper colors
5. **Cash Out Button**: Made prominent with orange primary styling
6. **Navigation Icons**: Updated bottom nav with new icon set
7. **Header Consistency**: Unified icon usage across components

**Key Design Elements:**
- Dark theme (#050505 background)
- Circular elements (avatar, icon containers)
- Orange accent (#FF4D00) for primary actions
- Color-coded stats (green, orange, blue)
- Consistent 10-20px spacing
- Roboto font family throughout

**No Git Operations:** Per user instructions, no commits are made during implementation.
