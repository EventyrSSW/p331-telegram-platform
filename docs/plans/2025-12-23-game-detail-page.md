# Game Detail Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a new GameDetailPage that shows game information before launching the actual game.

**Architecture:** Add new route `/game/:gameId/details` for GameDetailPage with header, main image (30% viewport), game name overlay, screenshot carousel (3.5 visible), reviews/rating section, and Play CTA button. Play button navigates to existing `/game/:gameId` which loads Unity.

**Tech Stack:** React, TypeScript, CSS Modules, existing design system variables, react-router-dom

---

## Task 1: Create GameDetailPage Component Structure

**Files:**
- Create: `src/pages/GameDetailPage/GameDetailPage.tsx`
- Create: `src/pages/GameDetailPage/GameDetailPage.module.css`
- Create: `src/pages/GameDetailPage/index.ts`

**Step 1: Create directory and index file**

Create `src/pages/GameDetailPage/index.ts`:
```typescript
export { GameDetailPage } from './GameDetailPage';
```

**Step 2: Create CSS module with page structure**

Create `src/pages/GameDetailPage/GameDetailPage.module.css`:
```css
.page {
  min-height: 100vh;
  background-color: var(--color-bg-page);
  overflow-x: hidden;
  max-width: 100vw;
}

.main {
  padding-bottom: 100px;
}

/* Hero Section - 30% of viewport height */
.heroSection {
  position: relative;
  width: 100%;
  height: 30vh;
  min-height: 200px;
  max-height: 300px;
  overflow: hidden;
}

.heroImage {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.heroOverlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--spacing-md);
  background: var(--overlay-gradient);
}

.gameTitle {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

/* Screenshot Carousel */
.screenshotsSection {
  padding: var(--spacing-md);
}

.sectionTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-sm) 0;
}

.screenshotCarousel {
  display: flex;
  gap: var(--spacing-sm);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding-right: 25%;
}

.screenshotCarousel::-webkit-scrollbar {
  display: none;
}

.screenshotItem {
  flex: 0 0 30%;
  scroll-snap-align: start;
  border-radius: var(--radius-md);
  overflow: hidden;
  aspect-ratio: 16 / 9;
}

.screenshotImage {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Reviews Section */
.reviewsSection {
  padding: var(--spacing-md);
}

.reviewsCard {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.ratingContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xxs);
}

.ratingValue {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.starsContainer {
  display: flex;
  gap: 2px;
}

.star {
  color: var(--color-accent-gold);
  width: 16px;
  height: 16px;
}

.starEmpty {
  color: var(--color-text-muted);
}

.reviewsInfo {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xxs);
}

.reviewCount {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.reviewLabel {
  font-size: 12px;
  color: var(--color-text-muted);
}

/* CTA Section */
.ctaSection {
  padding: var(--spacing-md);
  padding-top: var(--spacing-lg);
}

.playButton {
  width: 100%;
  background: var(--gradient-cta-button);
  color: var(--color-text-primary);
  border: none;
  border-radius: var(--radius-button);
  padding: 16px 32px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-cta);
  transition: all var(--transition-normal);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.playButton:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-cta-hover);
}

.playButton:active {
  transform: scale(0.98);
}

/* Loading and Error states */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  color: var(--color-text-secondary);
}

.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  text-align: center;
}

.error p {
  color: var(--color-text-secondary);
}

.backButton {
  background: var(--color-accent-orange);
  color: var(--color-text-primary);
  border: none;
  border-radius: var(--radius-button);
  padding: 12px 24px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}
```

**Step 3: Create the component**

Create `src/pages/GameDetailPage/GameDetailPage.tsx`:
```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Header, BottomNavBar } from '../../components';
import { api, Game } from '../../services/api';
import { haptic } from '../../providers/TelegramProvider';
import styles from './GameDetailPage.module.css';

export const GameDetailPage = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGame = async () => {
      if (!gameId) {
        setError('Game ID not provided');
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.getGame(gameId);
        setGame(response.game);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGame();
  }, [gameId]);

  const handlePlayClick = () => {
    haptic.medium();
    navigate(`/game/${gameId}`);
  };

  const getScreenshots = (): string[] => {
    if (!game) return [];
    const screens = [game.screen1Url, game.screen2Url, game.screen3Url, game.screen4Url];
    return screens.filter((url): url is string => !!url);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <svg key={i} className={styles.star} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <svg key={i} className={styles.star} viewBox="0 0 24 24" fill="currentColor">
            <defs>
              <linearGradient id="halfStar">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="var(--color-text-muted)" />
              </linearGradient>
            </defs>
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#halfStar)" />
          </svg>
        );
      } else {
        stars.push(
          <svg key={i} className={`${styles.star} ${styles.starEmpty}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        );
      }
    }
    return stars;
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.loading}>Loading game...</div>
        </main>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.error}>
            <p>{error || 'Game not found'}</p>
            <button className={styles.backButton} onClick={() => navigate('/')}>
              Back to Home
            </button>
          </div>
        </main>
      </div>
    );
  }

  const screenshots = getScreenshots();
  const heroImage = game.mainUrl || game.thumbnail;

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        {/* Hero Section - 30% viewport with game title overlay */}
        <section className={styles.heroSection}>
          <img
            src={heroImage}
            alt={game.title}
            className={styles.heroImage}
          />
          <div className={styles.heroOverlay}>
            <h1 className={styles.gameTitle}>{game.title}</h1>
          </div>
        </section>

        {/* Screenshot Carousel - 3 visible + 4th half visible */}
        {screenshots.length > 0 && (
          <section className={styles.screenshotsSection}>
            <h2 className={styles.sectionTitle}>Screenshots</h2>
            <div className={styles.screenshotCarousel}>
              {screenshots.map((url, index) => (
                <div key={index} className={styles.screenshotItem}>
                  <img
                    src={url}
                    alt={`${game.title} screenshot ${index + 1}`}
                    className={styles.screenshotImage}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reviews and Rating Section */}
        <section className={styles.reviewsSection}>
          <h2 className={styles.sectionTitle}>Reviews</h2>
          <div className={styles.reviewsCard}>
            <div className={styles.ratingContainer}>
              <span className={styles.ratingValue}>
                {game.rating?.toFixed(1) || '0.0'}
              </span>
              <div className={styles.starsContainer}>
                {renderStars(game.rating || 0)}
              </div>
            </div>
            <div className={styles.reviewsInfo}>
              <span className={styles.reviewCount}>
                {(game.reviewCount || 0).toLocaleString()} reviews
              </span>
              <span className={styles.reviewLabel}>
                Based on player ratings
              </span>
            </div>
          </div>
        </section>

        {/* Play CTA Button */}
        <section className={styles.ctaSection}>
          <button className={styles.playButton} onClick={handlePlayClick}>
            Play Now
          </button>
        </section>
      </main>

      <BottomNavBar />
    </div>
  );
};
```

**Step 4: Verify the files were created**

Run: `ls -la src/pages/GameDetailPage/`

Expected: 3 files (index.ts, GameDetailPage.tsx, GameDetailPage.module.css)

**Step 5: Commit**

```bash
git add src/pages/GameDetailPage/
git commit -m "feat: add GameDetailPage component with hero, screenshots, reviews"
```

---

## Task 2: Update Router to Add GameDetailPage Route

**Files:**
- Modify: `src/router.tsx`

**Step 1: Add GameDetailPage import and route**

Modify `src/router.tsx` to add the new route BEFORE the existing `/game/:gameId`:
```typescript
import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { StorePage } from './pages/StorePage';
import { GamePage } from './pages/GamePage';
import { GameDetailPage } from './pages/GameDetailPage';
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
    path: '/game/:gameId/details',
    element: <GameDetailPage />,
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

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`

Expected: No errors

**Step 3: Commit**

```bash
git add src/router.tsx
git commit -m "feat: add /game/:gameId/details route for GameDetailPage"
```

---

## Task 3: Update HomePage Navigation to GameDetailPage

**Files:**
- Modify: `src/pages/HomePage/HomePage.tsx`

**Step 1: Update navigation to go to details page**

Change the `handleGameClick` function to navigate to `/game/${game.slug}/details` instead of `/game/${game.slug}`:

In `src/pages/HomePage/HomePage.tsx`, change:
```typescript
const handleGameClick = (game: Game) => {
  navigate(`/game/${game.slug}/details`);
};
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`

Expected: No errors

**Step 3: Commit**

```bash
git add src/pages/HomePage/HomePage.tsx
git commit -m "feat: navigate to GameDetailPage on game card click"
```

---

## Task 4: Test Full Flow

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Manual testing checklist**

Test in browser:
- [ ] Navigate to home page (/)
- [ ] Click on any game card
- [ ] Verify URL is /game/:slug/details
- [ ] Verify GameDetailPage shows with:
  - [ ] Header (same as other pages)
  - [ ] Hero image (30% viewport height)
  - [ ] Game title overlay on hero
  - [ ] Screenshot carousel (3 visible + 4th half)
  - [ ] Reviews section with rating and count
  - [ ] Play Now CTA button
- [ ] Click Play Now button
- [ ] Verify URL changes to /game/:slug
- [ ] Verify Unity game loads
- [ ] Verify haptic feedback on Play click

**Step 3: Run build**

Run: `npm run build`

Expected: Build succeeds

**Step 4: Final commit if any fixes needed**

```bash
git add .
git commit -m "feat: complete game detail page implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Create GameDetailPage component | 3 new files |
| 2 | Update router | 1 modified |
| 3 | Update HomePage navigation | 1 modified |
| 4 | Test full flow | verification |

**Flow:**
- Home → click game → `/game/:slug/details` (GameDetailPage) → click Play → `/game/:slug` (existing GamePage with Unity)

**Total new files:** 3
**Total modified files:** 2
