# Header Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the logo in the header with user's rank (clickable to leaderboard) and TON balance with a "+" button (clickable to store).

**Architecture:** Modify the existing Header component to display two clickable sections: (1) Rank section on the left showing trophy icon + rank value, linking to /leaderboard; (2) Balance section showing TON icon + coin balance + "+" icon, linking to /store. Remove the logo and navigation links (Store, Leaderboard) since they're now accessible via the header sections and bottom nav bar.

**Tech Stack:** React, React Router, TypeScript, CSS Modules, AuthContext for user data

---

### Task 1: Update Header Component Structure

**Files:**
- Modify: `src/components/Header/Header.tsx`

**Step 1: Update imports and add useAuth hook**

Replace the entire `src/components/Header/Header.tsx` with:

```tsx
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Header.module.css';

export const Header = () => {
  const { user } = useAuth();

  const formatBalance = (balance: number): string => {
    if (balance >= 1000000) {
      return `${(balance / 1000000).toFixed(1)}M`;
    }
    if (balance >= 1000) {
      return `${(balance / 1000).toFixed(1)}K`;
    }
    return balance.toLocaleString();
  };

  // Mock rank for now - will be replaced with actual rank from API
  const userRank = 42;

  return (
    <header className={styles.header}>
      {/* Rank Section - Links to Leaderboard */}
      <Link to="/leaderboard" className={styles.rankSection}>
        <div className={styles.rankIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
          </svg>
        </div>
        <span className={styles.rankValue}>#{userRank}</span>
      </Link>

      {/* Balance Section - Links to Store */}
      <Link to="/store" className={styles.balanceSection}>
        <div className={styles.tonIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
            <path d="M12 6L8 12H11V18L16 12H13L12 6Z" fill="currentColor"/>
          </svg>
        </div>
        <span className={styles.balanceValue}>{formatBalance(user?.coinBalance ?? 0)}</span>
        <div className={styles.addIcon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
      </Link>
    </header>
  );
};
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/Header/Header.tsx
git commit -m "feat(header): replace logo with rank and balance sections"
```

---

### Task 2: Update Header CSS Styles

**Files:**
- Modify: `src/components/Header/Header.module.css`

**Step 1: Replace CSS with new styles**

Replace the entire `src/components/Header/Header.module.css` with:

```css
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 56px;
  padding: 0 16px;
  background: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* Rank Section - Left side */
.rankSection {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.rankSection:hover {
  background: var(--color-bg-elevated);
  transform: translateY(-1px);
}

.rankSection:active {
  transform: translateY(0);
}

.rankIcon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFD700;
}

.rankValue {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

/* Balance Section - Right side */
.balanceSection {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.balanceSection:hover {
  background: var(--color-bg-elevated);
  transform: translateY(-1px);
}

.balanceSection:active {
  transform: translateY(0);
}

.tonIcon {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0088CC;
}

.balanceValue {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  min-width: 40px;
}

.addIcon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent-primary);
  border-radius: 50%;
  color: var(--color-text-primary);
  margin-left: 4px;
}
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/Header/Header.module.css
git commit -m "style(header): update styles for rank and balance sections"
```

---

### Task 3: Final Verification

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Visual verification checklist**

Run: `npm run dev`

Verify:
- [ ] Header shows rank section on left with star/trophy icon and "#42"
- [ ] Header shows balance section on right with TON icon, balance, and "+" icon
- [ ] Clicking rank section navigates to /leaderboard
- [ ] Clicking balance section navigates to /store
- [ ] Both sections have hover effects (slight lift)
- [ ] Balance displays formatted (K for thousands, M for millions)
- [ ] Header height is reduced (56px instead of 64px)

**Step 3: Commit final changes if any adjustments needed**

```bash
git add -A
git commit -m "feat(header): complete header redesign with rank and balance"
```

---

## Summary

This plan transforms the header from:
```
[ G Games ]                    [ Store | Leaderboard | Profile ]
```

To:
```
[ ⭐ #42 ]                                    [ 💎 1,234 + ]
```

Where:
- **Left section (Rank)**: Trophy/star icon + user's rank → Links to /leaderboard
- **Right section (Balance)**: TON icon + formatted balance + "+" button → Links to /store
- Navigation links removed (already available via BottomNavBar)
- Profile icon removed (already available via BottomNavBar)

**Note:** The rank value is currently mocked as `42`. A future task should add a rank API endpoint to fetch the user's actual leaderboard position.
