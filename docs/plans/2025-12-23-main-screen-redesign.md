# Main Screen Design System Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the main/play screen to match the gaming-platform-main-screen-design-system.json specification with pure black backgrounds, orange CTAs, 20px border-radius cards, ribbon badges, and new color palette.

**Architecture:** Update CSS variables to new design system colors, then update each component (GameCard, GameGrid, FeaturedCarousel, CategoryFilter, Section, HomePage) to match new styling. Add ribbon badge support for featured/new games. Keep existing React component structure.

**Tech Stack:** React, CSS Modules, CSS Custom Properties

---

### Task 1: Update CSS Variables to New Design System

**Files:**
- Modify: `src/styles/variables.css`
- Modify: `src/styles/global.css`

**Step 1: Replace color variables with new design system**

In `src/styles/variables.css`, replace the entire content:

```css
:root {
  /* Background Colors - Design System */
  --color-bg-page: #000000;
  --color-bg-hero: #0D1117;
  --color-bg-card: #1A1A1A;
  --color-bg-card-title: #000000;

  /* Legacy aliases for compatibility */
  --color-bg-primary: #000000;
  --color-bg-secondary: #0D1117;
  --color-bg-tertiary: #1A1A1A;
  --color-bg-elevated: #252525;

  /* Accent Colors - Design System */
  --color-accent-orange: #FF6B35;
  --color-accent-orange-hover: #FF8555;
  --color-accent-orange-active: #E55A25;
  --color-accent-cyan: #00E5A0;
  --color-accent-cyan-light: #4DFFC3;
  --color-accent-neon: #00BFFF;
  --color-accent-gold: #FFD700;

  /* Legacy aliases */
  --color-accent-primary: #FF6B35;
  --color-accent-light: #FF8555;
  --color-accent-dark: #E55A25;

  /* Promotional Colors */
  --color-promo-green-start: #1A3D2E;
  --color-promo-green-end: #0F2922;
  --color-promo-label: #4ADE80;

  /* Badge Colors */
  --color-badge-featured: #FF4757;
  --color-badge-new: #3B82F6;
  --color-badge-hot: #F59E0B;

  /* Text Colors */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #B0B8C4;
  --color-text-muted: #6B7280;
  --color-text-label: #9CA3AF;
  --color-text-on-accent: #FFFFFF;

  /* Border Colors */
  --color-border-subtle: rgba(255, 255, 255, 0.08);
  --color-border-medium: rgba(255, 255, 255, 0.12);
  --color-border-accent: #FF6B35;

  /* Status Colors */
  --color-status-notification: #FF4757;
  --color-status-success: #2ED573;
  --color-status-warning: #FFA502;

  /* Overlay Colors */
  --overlay-dark: rgba(0, 0, 0, 0.6);
  --overlay-gradient: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.8) 100%);
  --overlay-card: linear-gradient(180deg, transparent 50%, rgba(0, 0, 0, 0.7) 100%);

  /* Spacing */
  --spacing-xxs: 4px;
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-md: 16px;
  --spacing-lg: 20px;
  --spacing-xl: 24px;
  --spacing-xxl: 48px;

  /* Border Radius - Design System */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-xxl: 24px;
  --radius-button: 32px;
  --radius-full: 9999px;

  /* Shadows - Design System */
  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.4);
  --shadow-card-hover: 0 8px 32px rgba(0, 0, 0, 0.6);
  --shadow-cta: 0 4px 20px rgba(255, 107, 53, 0.4);
  --shadow-cta-hover: 0 6px 28px rgba(255, 107, 53, 0.5);
  --shadow-neon: 0 0 30px rgba(0, 191, 255, 0.5);
  --shadow-badge-featured: 0 2px 8px rgba(255, 71, 87, 0.4);
  --shadow-badge-new: 0 2px 8px rgba(59, 130, 246, 0.4);

  /* Legacy shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-accent: 0 4px 20px rgba(255, 107, 53, 0.3);
  --shadow-accent-strong: 0 8px 32px rgba(255, 107, 53, 0.5);

  /* Gradients - Design System */
  --gradient-cta-button: linear-gradient(180deg, #FF7A45 0%, #FF5722 100%);
  --gradient-promo-card: linear-gradient(135deg, #1A3D2E 0%, #0F2922 60%, #0A1F18 100%);
  --gradient-hero-vignette: radial-gradient(ellipse at 50% 40%, transparent 20%, rgba(0, 0, 0, 0.85) 70%);

  /* Legacy gradient aliases */
  --gradient-primary-button: linear-gradient(180deg, #FF7A45 0%, #FF5722 100%);
  --gradient-accent-card: linear-gradient(145deg, #1A3D2E 0%, #0F2922 50%, #0A1F18 100%);
  --gradient-card-overlay: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.8) 100%);
  --gradient-header-fade: linear-gradient(180deg, #0D1117 0%, transparent 100%);

  /* Typography */
  --font-family-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-display: 'Orbitron', 'Press Start 2P', monospace;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Transitions - Design System */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;
  --transition-slow: 0.3s ease;
  --transition-bounce: 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  --transition-spring: 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Telegram Safe Areas - set dynamically by TelegramProvider */
  --tg-safe-area-top: 0px;
  --tg-safe-area-bottom: 0px;
  --tg-safe-area-left: 0px;
  --tg-safe-area-right: 0px;
  --tg-content-safe-area-top: 0px;
  --tg-content-safe-area-bottom: 0px;
  --tg-header-safe-area: 0px;
}
```

**Step 2: Update global.css background**

In `src/styles/global.css`, update to:

```css
@import './reset.css';
@import './variables.css';

html,
body {
  background-color: var(--color-bg-page);
  color: var(--color-text-primary);
  font-family: var(--font-family-primary);
  overflow-x: hidden;
}

#root {
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
  background-color: var(--color-bg-page);
}
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/styles/variables.css src/styles/global.css
git commit -m "style: update CSS variables to new design system"
```

---

### Task 2: Update GameCard Component with New Design

**Files:**
- Modify: `src/components/GameCard/GameCard.tsx`
- Modify: `src/components/GameCard/GameCard.module.css`

**Step 1: Update GameCard.tsx to support badges**

Replace `src/components/GameCard/GameCard.tsx`:

```tsx
import React from 'react';
import styles from './GameCard.module.css';

export interface Game {
  id: string;
  slug: string;
  title: string;
  thumbnail: string;
  category: string;
  featured?: boolean;
  topPromoted?: boolean;
}

interface GameCardProps {
  game: Game;
  onClick?: (game: Game) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  const handleClick = () => {
    onClick?.(game);
  };

  return (
    <button className={styles.card} onClick={handleClick}>
      {/* Ribbon Badge */}
      {game.featured && (
        <div className={styles.ribbonContainer}>
          <div className={`${styles.ribbon} ${styles.ribbonFeatured}`}>
            Featured
          </div>
        </div>
      )}
      {game.topPromoted && !game.featured && (
        <div className={styles.ribbonContainer}>
          <div className={`${styles.ribbon} ${styles.ribbonHot}`}>
            Hot
          </div>
        </div>
      )}

      <div className={styles.thumbnailWrapper}>
        <img
          src={game.thumbnail}
          alt={game.title}
          className={styles.thumbnail}
        />
      </div>
      <div className={styles.titleArea}>
        <span className={styles.title}>{game.title}</span>
      </div>
    </button>
  );
};
```

**Step 2: Update GameCard.module.css with new styles**

Replace `src/components/GameCard/GameCard.module.css`:

```css
.card {
  background-color: var(--color-bg-card);
  border: none;
  border-radius: var(--radius-xl);
  cursor: pointer;
  padding: 0;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  position: relative;
  box-shadow: var(--shadow-card);
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
}

.card:hover {
  transform: scale(1.02);
  box-shadow: var(--shadow-card-hover);
}

.card:active {
  transform: scale(0.98);
}

/* Ribbon Badge Container */
.ribbonContainer {
  position: absolute;
  top: 0;
  left: 0;
  width: 80px;
  height: 80px;
  overflow: hidden;
  z-index: 10;
  pointer-events: none;
}

.ribbon {
  position: absolute;
  top: 16px;
  left: -24px;
  width: 100px;
  transform: rotate(-45deg);
  padding: 4px 0;
  text-align: center;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-primary);
}

.ribbonFeatured {
  background: var(--color-badge-featured);
  box-shadow: var(--shadow-badge-featured);
}

.ribbonHot {
  background: var(--color-badge-hot);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
}

.thumbnailWrapper {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  width: 100%;
  position: relative;
  background-color: var(--color-bg-card);
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
}

.titleArea {
  background: var(--color-bg-card-title);
  padding: 12px 8px;
  text-align: center;
}

.title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/GameCard/GameCard.tsx src/components/GameCard/GameCard.module.css
git commit -m "style(GameCard): apply new design system with ribbon badges"
```

---

### Task 3: Update GameGrid Component

**Files:**
- Modify: `src/components/GameGrid/GameGrid.module.css`

**Step 1: Update GameGrid styles for 2-column layout**

Replace `src/components/GameGrid/GameGrid.module.css`:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
  width: 100%;
  overflow: hidden;
  padding: 0;
}

@media (min-width: 480px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/GameGrid/GameGrid.module.css
git commit -m "style(GameGrid): update to 2-column mobile layout"
```

---

### Task 4: Update FeaturedCarousel with New Design

**Files:**
- Modify: `src/components/FeaturedCarousel/FeaturedCarousel.module.css`

**Step 1: Update FeaturedCarousel styles**

Replace `src/components/FeaturedCarousel/FeaturedCarousel.module.css`:

```css
.container {
  position: relative;
}

.carousel {
  display: flex;
  gap: var(--spacing-md);
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
  border-radius: var(--radius-xl);
  overflow: hidden;
  position: relative;
  aspect-ratio: 16 / 9;
  cursor: pointer;
  box-shadow: var(--shadow-card);
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
}

.slide:hover {
  transform: scale(1.01);
  box-shadow: var(--shadow-card-hover);
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
  padding: 40px 20px 20px;
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.8) 100%);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category {
  font-size: 11px;
  color: var(--color-text-label);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
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
  background: var(--color-accent-orange);
  color: var(--color-text-primary);
  border: none;
  border-radius: var(--radius-button);
  padding: 14px 48px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-normal);
  align-self: flex-start;
  margin-top: 8px;
  box-shadow: var(--shadow-cta);
  letter-spacing: 0.02em;
}

.playButton:hover {
  background: var(--color-accent-orange-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-cta-hover);
}

.playButton:active {
  background: var(--color-accent-orange-active);
  transform: translateY(0);
  box-shadow: var(--shadow-cta);
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
  transition: all var(--transition-normal);
  padding: 0;
}

.indicatorActive {
  background: var(--color-accent-orange);
  width: 24px;
  border-radius: var(--radius-full);
}
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/FeaturedCarousel/FeaturedCarousel.module.css
git commit -m "style(FeaturedCarousel): apply orange CTA and new design system"
```

---

### Task 5: Update CategoryFilter with New Design

**Files:**
- Modify: `src/components/CategoryFilter/CategoryFilter.module.css`

**Step 1: Update CategoryFilter styles**

Replace `src/components/CategoryFilter/CategoryFilter.module.css`:

```css
.container {
  display: flex;
  gap: var(--spacing-sm);
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
  background: var(--color-bg-card);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-normal);
  min-width: 72px;
  flex-shrink: 0;
}

.category:hover {
  background: var(--color-bg-elevated);
  border-color: var(--color-border-subtle);
}

.categoryActive {
  background: var(--color-bg-elevated);
  border-color: var(--color-accent-orange);
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

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/CategoryFilter/CategoryFilter.module.css
git commit -m "style(CategoryFilter): apply new design system colors"
```

---

### Task 6: Update Section Component with New Design

**Files:**
- Modify: `src/components/Section/Section.module.css`

**Step 1: Update Section styles**

Replace `src/components/Section/Section.module.css`:

```css
.section {
  padding: var(--spacing-lg) 0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.title {
  color: var(--color-text-primary);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  margin: 0;
}

.action {
  color: var(--color-text-secondary);
  font-size: 14px;
}
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/Section/Section.module.css
git commit -m "style(Section): update padding and typography"
```

---

### Task 7: Update HomePage Layout

**Files:**
- Modify: `src/pages/HomePage/HomePage.module.css`

**Step 1: Update HomePage styles**

Replace `src/pages/HomePage/HomePage.module.css`:

```css
.page {
  min-height: 100vh;
  background-color: var(--color-bg-page);
  overflow-x: hidden;
  max-width: 100vw;
}

.main {
  padding: var(--spacing-sm);
  padding-bottom: 100px; /* Space for bottom nav bar */
  overflow-x: hidden;
}

.featuredSection {
  margin-bottom: var(--spacing-lg);
}

.categoriesSection {
  margin-bottom: var(--spacing-lg);
}

.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: var(--spacing-md);
}

.error button {
  background: var(--color-accent-orange);
  color: var(--color-text-primary);
  border: none;
  border-radius: var(--radius-button);
  padding: 14px 32px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 700;
  box-shadow: var(--shadow-cta);
  transition: all var(--transition-normal);
}

.error button:hover {
  background: var(--color-accent-orange-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-cta-hover);
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--color-text-secondary);
}
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/pages/HomePage/HomePage.module.css
git commit -m "style(HomePage): apply pure black background and new layout"
```

---

### Task 8: Update Header Background for New Design

**Files:**
- Modify: `src/components/Header/Header.module.css`

**Step 1: Update Header background color**

In `src/components/Header/Header.module.css`, change the `.header` class background from `var(--color-bg-secondary)` to `var(--color-bg-hero)`:

```css
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: calc(56px + var(--tg-header-safe-area, 0px));
  padding: var(--tg-header-safe-area, 0px) 16px 0 16px;
  background: var(--color-bg-hero);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/Header/Header.module.css
git commit -m "style(Header): update to hero background color"
```

---

### Task 9: Update BottomNavBar for New Design

**Files:**
- Modify: `src/components/BottomNavBar/BottomNavBar.module.css`

**Step 1: Update BottomNavBar background**

In `src/components/BottomNavBar/BottomNavBar.module.css`, change the `.container` class background from `var(--color-bg-secondary)` to `var(--color-bg-hero)`:

Find and replace `background: var(--color-bg-secondary);` with `background: var(--color-bg-hero);`

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/BottomNavBar/BottomNavBar.module.css
git commit -m "style(BottomNavBar): update to hero background color"
```

---

### Task 10: Final Verification and Cleanup

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Visual verification checklist**

- [ ] Page background is pure black (#000000)
- [ ] Game cards have 20px border-radius
- [ ] Game card titles are in black area below thumbnail
- [ ] Featured games show red "Featured" ribbon badge
- [ ] Hot games show orange "Hot" ribbon badge
- [ ] Play Now button is orange (#FF6B35)
- [ ] Orange button has glow shadow
- [ ] 2-column grid on mobile
- [ ] Category filter uses new card colors
- [ ] Header and bottom nav use hero color (#0D1117)

**Step 3: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "style: complete main screen design system update"
```

---

## Summary

This implementation updates the main screen to match the gaming-platform-main-screen-design-system.json:

1. **CSS Variables** - New color palette with pure black background, orange accents, design system spacing and shadows
2. **GameCard** - 20px border-radius, black title area, ribbon badges for featured/hot games
3. **GameGrid** - 2-column mobile layout, 12px gaps showing black background
4. **FeaturedCarousel** - Orange "Play Now" CTA button with glow shadow
5. **CategoryFilter** - Updated card colors and orange active border
6. **Section** - Updated typography and spacing
7. **HomePage** - Pure black background, updated padding
8. **Header/BottomNavBar** - Hero background color (#0D1117)

**Key design rules followed:**
- Orange (#FF6B35) only for CTA buttons
- Pure black (#000000) for page background
- 20px border-radius for all cards
- Ribbon badges for corner overlays
- Title below thumbnail (not overlapping)
