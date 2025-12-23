# Profile Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a profile page where users can view their profile data (photo, username, name, wallet) with a profile icon in the header for navigation.

**Architecture:** Add new `/users/me/profile` backend endpoint returning full user profile, create ProfilePage component displaying user data, add profile icon link to Header component on the left side.

**Tech Stack:** React, TypeScript, Express, Prisma, CSS Modules

---

### Task 1: Add Profile Endpoint to Backend

**Files:**
- Modify: `server/src/services/userService.ts`
- Modify: `server/src/controllers/usersController.ts`
- Modify: `server/src/routes/users.ts`

**Step 1: Add getProfile method to userService**

Add to `server/src/services/userService.ts` after the `getBalance` method (around line 67):

```typescript
  /**
   * Get full user profile by Telegram ID
   */
  async getProfile(telegramId: number) {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        isPremium: true,
        walletAddress: true,
        coinBalance: true,
        createdAt: true,
      },
    });
    return user;
  }
```

**Step 2: Add getProfile controller method**

Add to `server/src/controllers/usersController.ts` after the `getBalance` method (around line 31):

```typescript
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser!;

      // Ensure user exists in database
      await userService.findOrCreateByTelegramId(telegramUser.id, {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      });

      const user = await userService.getProfile(telegramUser.id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Convert BigInt to string for JSON serialization
      res.json({
        user: {
          ...user,
          telegramId: user.telegramId.toString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
```

**Step 3: Add route for profile endpoint**

Add to `server/src/routes/users.ts` after line 7:

```typescript
router.get('/me/profile', usersController.getProfile);
```

**Step 4: Verify server compiles**

Run: `cd server && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add server/src/services/userService.ts server/src/controllers/usersController.ts server/src/routes/users.ts
git commit -m "feat(api): add GET /users/me/profile endpoint"
```

---

### Task 2: Add Profile API Method to Frontend

**Files:**
- Modify: `src/services/api.ts`

**Step 1: Add getProfile method to ApiService**

Add after the `getMe` method (around line 134):

```typescript
  async getProfile(): Promise<{ user: User }> {
    return this.fetch<{ user: User }>('/users/me/profile');
  }
```

**Step 2: Verify frontend compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m "feat(api): add getProfile method to frontend API service"
```

---

### Task 3: Create ProfilePage Component

**Files:**
- Create: `src/pages/ProfilePage/ProfilePage.tsx`
- Create: `src/pages/ProfilePage/ProfilePage.module.css`
- Create: `src/pages/ProfilePage/index.ts`

**Step 1: Create ProfilePage component**

Create `src/pages/ProfilePage/ProfilePage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Header } from '../../components';
import { api, User } from '../../services/api';
import styles from './ProfilePage.module.css';

export const ProfilePage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.getProfile();
        setUser(response.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const formatWalletAddress = (address: string): string => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getDisplayName = (): string => {
    if (!user) return '';
    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : user.username || 'Anonymous';
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.loading}>Loading profile...</div>
        </main>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.error}>{error || 'Profile not found'}</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="Profile" className={styles.avatarImage} />
            ) : (
              <span className={styles.avatarPlaceholder}>
                {(user.firstName?.[0] || user.username?.[0] || '?').toUpperCase()}
              </span>
            )}
          </div>
          <h1 className={styles.displayName}>{getDisplayName()}</h1>
          {user.username && (
            <span className={styles.username}>@{user.username}</span>
          )}
          {user.isPremium && (
            <span className={styles.premiumBadge}>Premium</span>
          )}
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Account Info</h2>
          <div className={styles.infoCard}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Balance</span>
              <span className={styles.infoValue}>{user.coinBalance.toLocaleString()} coins</span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Wallet</h2>
          <div className={styles.infoCard}>
            {user.walletAddress ? (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Connected</span>
                <span className={styles.walletAddress}>
                  {formatWalletAddress(user.walletAddress)}
                </span>
              </div>
            ) : (
              <div className={styles.noWallet}>
                <span>No wallet connected</span>
                <p className={styles.noWalletHint}>
                  Connect your wallet in the Store to purchase coins
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
```

**Step 2: Create ProfilePage styles**

Create `src/pages/ProfilePage/ProfilePage.module.css`:

```css
.page {
  min-height: 100vh;
  background-color: var(--color-bg-primary);
}

.main {
  padding: 24px 16px;
}

.loading,
.error {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 40px 16px;
}

.error {
  color: #ff4757;
}

.profileHeader {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
}

.avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--color-accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  overflow: hidden;
}

.avatarImage {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatarPlaceholder {
  font-size: 36px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.displayName {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
}

.username {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.premiumBadge {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: var(--radius-full);
}

.section {
  margin-bottom: 24px;
}

.sectionTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px 0;
}

.infoCard {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
  padding: 16px;
}

.infoRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.infoLabel {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.infoValue {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-accent-primary);
}

.walletAddress {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  font-family: monospace;
  background: var(--color-bg-tertiary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.noWallet {
  text-align: center;
  color: var(--color-text-secondary);
}

.noWallet span {
  font-size: 14px;
}

.noWalletHint {
  font-size: 12px;
  margin: 8px 0 0 0;
  opacity: 0.7;
}
```

**Step 3: Create index export**

Create `src/pages/ProfilePage/index.ts`:

```typescript
export { ProfilePage } from './ProfilePage';
```

**Step 4: Verify component compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/pages/ProfilePage/
git commit -m "feat(ui): add ProfilePage component"
```

---

### Task 4: Add Profile Route

**Files:**
- Modify: `src/router.tsx`

**Step 1: Import and add ProfilePage route**

Update `src/router.tsx`:

```tsx
import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { StorePage } from './pages/StorePage';
import { GamePage } from './pages/GamePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';

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
  {
    path: '/leaderboard',
    element: <LeaderboardPage />,
  },
  {
    path: '/profile',
    element: <ProfilePage />,
  },
]);
```

**Step 2: Verify routes compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/router.tsx
git commit -m "feat(router): add /profile route"
```

---

### Task 5: Add Profile Icon to Header

**Files:**
- Modify: `src/components/Header/Header.tsx`
- Modify: `src/components/Header/Header.module.css`

**Step 1: Update Header component with profile icon**

Update `src/components/Header/Header.tsx`:

```tsx
import { Link, useLocation } from 'react-router-dom';
import styles from './Header.module.css';

export const Header = () => {
  const location = useLocation();

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <Link
          to="/profile"
          className={`${styles.profileLink} ${location.pathname === '/profile' ? styles.profileLinkActive : ''}`}
          aria-label="Profile"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M5 20C5 16.134 8.13401 13 12 13C15.866 13 19 16.134 19 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </Link>

        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}>G</div>
          <span className={styles.logoText}>Games</span>
        </Link>
      </div>

      <div className={styles.actions}>
        <Link
          to="/store"
          className={`${styles.navLink} ${location.pathname === '/store' ? styles.navLinkActive : ''}`}
        >
          Store
        </Link>

        <Link
          to="/leaderboard"
          className={`${styles.navLink} ${location.pathname === '/leaderboard' ? styles.navLinkActive : ''}`}
        >
          Leaderboard
        </Link>
      </div>
    </header>
  );
};
```

**Step 2: Add styles for profile link and left section**

Add to `src/components/Header/Header.module.css` after line 11 (after `.header`):

```css
.leftSection {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profileLink {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-primary);
  opacity: 0.8;
  transition: all 0.2s ease;
  text-decoration: none;
}

.profileLink:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

.profileLinkActive {
  opacity: 1;
  color: var(--color-accent-primary);
}
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/Header/Header.tsx src/components/Header/Header.module.css
git commit -m "feat(header): add profile icon link to left side"
```

---

### Task 6: Test and Push

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds

**Step 2: Start dev server and test manually**

Run: `npm run dev`

Test checklist:
- Profile icon appears in header (top left, before logo)
- Clicking profile icon navigates to /profile
- Profile page shows user photo, name, username
- Profile page shows wallet section (connected or not connected)
- Profile icon highlights when on /profile page

**Step 3: Push changes**

```bash
git push
```

Expected: All commits pushed to remote
