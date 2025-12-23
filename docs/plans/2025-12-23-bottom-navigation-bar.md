# Bottom Navigation Bar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a static bottom navigation bar with three tabs (Result, Play, Profile) that acts like a mobile app tab controller.

**Architecture:** Create a new `BottomNavBar` component that renders fixed at the bottom of the screen with three tab items. Each tab has an icon above its label. The component uses React Router's `useLocation` to highlight the active tab and `useNavigate` for navigation. Replace `BottomWalletBar` usage with the new `BottomNavBar` across all pages.

**Tech Stack:** React, React Router, CSS Modules, TypeScript

---

### Task 1: Create BottomNavBar Component Structure

**Files:**
- Create: `src/components/BottomNavBar/BottomNavBar.tsx`
- Create: `src/components/BottomNavBar/BottomNavBar.module.css`
- Create: `src/components/BottomNavBar/index.ts`

**Step 1: Create the component directory and index file**

Create `src/components/BottomNavBar/index.ts`:
```typescript
export { BottomNavBar } from './BottomNavBar';
```

**Step 2: Create the CSS module**

Create `src/components/BottomNavBar/BottomNavBar.module.css`:
```css
.container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border-subtle);
  padding: 8px 0;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
}

.navItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-decoration: none;
  transition: all var(--transition-fast);
  border-radius: var(--radius-md);
  min-width: 64px;
}

.navItem:hover {
  background: rgba(255, 255, 255, 0.05);
}

.navItem:active {
  transform: scale(0.95);
}

.navIcon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  transition: color var(--transition-fast);
}

.navLabel {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-muted);
  transition: color var(--transition-fast);
}

.navItemActive .navIcon {
  color: var(--color-accent-primary);
}

.navItemActive .navLabel {
  color: var(--color-accent-primary);
}

/* Special styling for the center Play button */
.playButton {
  background: var(--gradient-primary-button);
  border-radius: var(--radius-full);
  padding: 12px 24px;
  box-shadow: var(--shadow-accent);
}

.playButton .navIcon {
  color: var(--color-text-primary);
}

.playButton .navLabel {
  color: var(--color-text-primary);
}

.playButton:hover {
  background: var(--gradient-primary-button);
  transform: translateY(-2px);
  box-shadow: var(--shadow-accent-strong);
}

.playButton:active {
  transform: scale(0.95) translateY(0);
}
```

**Step 3: Create the component**

Create `src/components/BottomNavBar/BottomNavBar.tsx`:
```tsx
import { Link, useLocation } from 'react-router-dom';
import styles from './BottomNavBar.module.css';

export const BottomNavBar = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={styles.container}>
      {/* Result Tab */}
      <Link
        to="/leaderboard"
        className={`${styles.navItem} ${isActive('/leaderboard') ? styles.navItemActive : ''}`}
      >
        <div className={styles.navIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 21V11M16 21V7M12 21V15M4 21H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 7L12 3L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className={styles.navLabel}>Result</span>
      </Link>

      {/* Play Tab (Center - Primary Action) */}
      <Link
        to="/"
        className={`${styles.navItem} ${styles.playButton}`}
      >
        <div className={styles.navIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 3L19 12L5 21V3Z" fill="currentColor"/>
          </svg>
        </div>
        <span className={styles.navLabel}>Play</span>
      </Link>

      {/* Profile Tab */}
      <Link
        to="/profile"
        className={`${styles.navItem} ${isActive('/profile') ? styles.navItemActive : ''}`}
      >
        <div className={styles.navIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M5 20C5 16.134 8.13401 13 12 13C15.866 13 19 16.134 19 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <span className={styles.navLabel}>Profile</span>
      </Link>
    </nav>
  );
};
```

**Step 4: Verify file creation**

Run: `ls -la src/components/BottomNavBar/`
Expected: Three files listed (index.ts, BottomNavBar.tsx, BottomNavBar.module.css)

**Step 5: Commit**

```bash
git add src/components/BottomNavBar/
git commit -m "feat(nav): create BottomNavBar component with Result, Play, Profile tabs"
```

---

### Task 2: Export BottomNavBar from Components Index

**Files:**
- Modify: `src/components/index.ts`

**Step 1: Add export for BottomNavBar**

Add this line to `src/components/index.ts`:
```typescript
export { BottomNavBar } from './BottomNavBar';
```

**Step 2: Verify export works**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/index.ts
git commit -m "feat(nav): export BottomNavBar from components index"
```

---

### Task 3: Update HomePage to Use BottomNavBar

**Files:**
- Modify: `src/pages/HomePage/HomePage.tsx`

**Step 1: Replace BottomWalletBar with BottomNavBar**

In `src/pages/HomePage/HomePage.tsx`:

Replace import:
```typescript
// Old
import {
  Header,
  FeaturedCarousel,
  CategoryFilter,
  GameGrid,
  Section,
  BottomWalletBar,
  Game,
} from '../../components';

// New
import {
  Header,
  FeaturedCarousel,
  CategoryFilter,
  GameGrid,
  Section,
  BottomNavBar,
  Game,
} from '../../components';
```

Replace component usage at the bottom of the return statement:
```tsx
// Old
{!wallet && <BottomWalletBar />}

// New
<BottomNavBar />
```

Remove the unused `useTonWallet` import and `wallet` variable if no longer needed elsewhere.

**Step 2: Verify the build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/pages/HomePage/HomePage.tsx
git commit -m "feat(nav): replace BottomWalletBar with BottomNavBar on HomePage"
```

---

### Task 4: Add BottomNavBar to LeaderboardPage

**Files:**
- Modify: `src/pages/LeaderboardPage/LeaderboardPage.tsx`
- Modify: `src/pages/LeaderboardPage/LeaderboardPage.module.css`

**Step 1: Import and add BottomNavBar**

In `src/pages/LeaderboardPage/LeaderboardPage.tsx`:

Update import:
```typescript
import { Header, BottomNavBar } from '../../components';
```

Add `<BottomNavBar />` before the closing `</div>` of the page:
```tsx
export const LeaderboardPage = () => {
  // ... existing code ...

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        {/* ... existing content ... */}
      </main>
      <BottomNavBar />
    </div>
  );
};
```

**Step 2: Add bottom padding to main content**

In `src/pages/LeaderboardPage/LeaderboardPage.module.css`, update the `.main` class to add bottom padding:
```css
.main {
  padding: 16px;
  padding-bottom: 100px; /* Space for bottom nav bar */
}
```

**Step 3: Verify the build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/pages/LeaderboardPage/
git commit -m "feat(nav): add BottomNavBar to LeaderboardPage"
```

---

### Task 5: Add BottomNavBar to ProfilePage

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.tsx`
- Modify: `src/pages/ProfilePage/ProfilePage.module.css`

**Step 1: Import and add BottomNavBar**

In `src/pages/ProfilePage/ProfilePage.tsx`:

Update import:
```typescript
import { Header, BottomNavBar } from '../../components';
```

Add `<BottomNavBar />` before the closing `</div>` of the page:
```tsx
return (
  <div className={styles.page}>
    <Header />
    <main className={styles.main}>
      {/* ... existing content ... */}
    </main>
    <BottomNavBar />
  </div>
);
```

**Step 2: Ensure bottom padding exists**

In `src/pages/ProfilePage/ProfilePage.module.css`, verify or add bottom padding to `.main`:
```css
.main {
  /* existing styles */
  padding-bottom: 100px; /* Space for bottom nav bar */
}
```

**Step 3: Verify the build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/pages/ProfilePage/
git commit -m "feat(nav): add BottomNavBar to ProfilePage"
```

---

### Task 6: Add BottomNavBar to StorePage

**Files:**
- Modify: `src/pages/StorePage/StorePage.tsx`
- Modify: `src/pages/StorePage/StorePage.module.css`

**Step 1: Import and add BottomNavBar**

In `src/pages/StorePage/StorePage.tsx`:

Add to imports:
```typescript
import { BottomNavBar } from '../../components';
```

Add `<BottomNavBar />` before the closing tag of the page container.

**Step 2: Ensure bottom padding exists**

In `src/pages/StorePage/StorePage.module.css`, verify or add bottom padding to the main content area to prevent content from being hidden behind the nav bar.

**Step 3: Verify the build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/pages/StorePage/
git commit -m "feat(nav): add BottomNavBar to StorePage"
```

---

### Task 7: Final Verification and Cleanup

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Visual verification**

Run: `npm run dev`
Expected:
- Bottom nav bar visible on all pages (Home, Leaderboard, Profile, Store)
- "Result" tab navigates to `/leaderboard`
- "Play" tab (center, styled as button) navigates to `/` (home)
- "Profile" tab navigates to `/profile`
- Active tab is highlighted with accent color
- Play button has gradient background and doesn't show active state highlight

**Step 3: Commit all changes**

```bash
git add -A
git commit -m "feat(nav): complete bottom navigation bar implementation"
```

---

## Summary

This plan creates a mobile app-style bottom navigation bar with:
- **Result** tab (left) - Links to `/leaderboard`, shows chart/results icon
- **Play** tab (center) - Links to `/` (home), styled as primary action button with gradient
- **Profile** tab (right) - Links to `/profile`, shows user icon

The navigation bar:
- Is fixed at the bottom of the screen
- Highlights the active route
- Has consistent styling with the app's design system
- Includes safe area inset padding for notched devices
- Is added to all main pages (Home, Leaderboard, Profile, Store)
