# Splash Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a polished splash screen with centered logo and animated progress bar that displays while the main page loads.

**Architecture:** Create a standalone `SplashScreen` component using CSS Modules that displays the app logo centered with a fancy animated progress bar below it. The splash screen replaces the current "Loading..." text in `App.tsx` and uses the existing design tokens for consistent branding.

**Tech Stack:** React 18, CSS Modules, CSS Custom Properties (design tokens), CSS Keyframe Animations

---

## Task 1: Create SplashScreen Component Directory Structure

**Files:**
- Create: `src/components/SplashScreen/SplashScreen.tsx`
- Create: `src/components/SplashScreen/SplashScreen.module.css`
- Create: `src/components/SplashScreen/index.ts`

**Step 1: Create the component directory**

Run:
```bash
mkdir -p src/components/SplashScreen
```

**Step 2: Create the barrel export file**

Create `src/components/SplashScreen/index.ts`:
```typescript
export { SplashScreen } from './SplashScreen';
```

**Step 3: Commit directory structure**

```bash
git add src/components/SplashScreen/index.ts
git commit -m "chore: add SplashScreen component directory"
```

---

## Task 2: Create SplashScreen CSS Module with Animations

**Files:**
- Create: `src/components/SplashScreen/SplashScreen.module.css`

**Step 1: Create the stylesheet with all animations**

Create `src/components/SplashScreen/SplashScreen.module.css`:
```css
.container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-primary);
  z-index: 9999;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xl);
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.logoContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.logo {
  width: 96px;
  height: 96px;
  background: var(--gradient-primary-button);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-accent-strong);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: var(--shadow-accent);
    transform: scale(1);
  }
  50% {
    box-shadow: var(--shadow-accent-strong);
    transform: scale(1.02);
  }
}

.logoIcon {
  font-size: 56px;
  font-weight: 700;
  color: var(--color-text-primary);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.5px;
}

.progressContainer {
  width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
}

.progressTrack {
  width: 100%;
  height: 4px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
  position: relative;
}

.progressBar {
  height: 100%;
  background: var(--gradient-primary-button);
  border-radius: var(--radius-full);
  position: absolute;
  left: 0;
  top: 0;
  animation: progressAnimation 2s ease-in-out infinite;
  box-shadow: 0 0 10px rgba(123, 47, 255, 0.5);
}

@keyframes progressAnimation {
  0% {
    width: 0%;
    left: 0%;
  }
  50% {
    width: 60%;
    left: 20%;
  }
  100% {
    width: 0%;
    left: 100%;
  }
}

.loadingText {
  font-size: 14px;
  color: var(--color-text-secondary);
  animation: fadeInOut 2s ease-in-out infinite;
}

@keyframes fadeInOut {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

/* Shimmer effect on progress bar */
.progressBar::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}
```

**Step 2: Commit the stylesheet**

```bash
git add src/components/SplashScreen/SplashScreen.module.css
git commit -m "feat(splash): add splash screen styles with animations"
```

---

## Task 3: Create SplashScreen React Component

**Files:**
- Create: `src/components/SplashScreen/SplashScreen.tsx`

**Step 1: Create the component**

Create `src/components/SplashScreen/SplashScreen.tsx`:
```tsx
import styles from './SplashScreen.module.css';

export function SplashScreen() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.logoContainer}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>G</span>
          </div>
          <span className={styles.title}>Games</span>
        </div>
        <div className={styles.progressContainer}>
          <div className={styles.progressTrack}>
            <div className={styles.progressBar} />
          </div>
          <span className={styles.loadingText}>Loading...</span>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit the component**

```bash
git add src/components/SplashScreen/SplashScreen.tsx
git commit -m "feat(splash): add SplashScreen React component"
```

---

## Task 4: Export SplashScreen from Components Index

**Files:**
- Modify: `src/components/index.ts`

**Step 1: Add the export**

Add to `src/components/index.ts`:
```typescript
export { SplashScreen } from './SplashScreen';
```

The full file should look like:
```typescript
export { Header } from './Header';
export { GameCard, type Game } from './GameCard';
export { FeaturedCard } from './FeaturedCard';
export { ActionCard } from './ActionCard';
export { PlaceholderCard } from './PlaceholderCard';
export { Section, type SectionProps } from './Section';
export { GameGrid } from './GameGrid';
export { CoinBalance } from './CoinBalance';
export { BuyCoinsCard, type CoinPackage } from './BuyCoinsCard';
export { UnityGame } from './UnityGame';
export { SplashScreen } from './SplashScreen';
```

**Step 2: Commit the export**

```bash
git add src/components/index.ts
git commit -m "feat(splash): export SplashScreen from components index"
```

---

## Task 5: Integrate SplashScreen into App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Import and use SplashScreen**

Update `src/App.tsx` to import and use the SplashScreen:

```tsx
import { RouterProvider } from 'react-router-dom'
import { TelegramProvider, useTelegram } from './providers/TelegramProvider'
import { TonConnectProvider } from './providers/TonConnectProvider'
import { ConfigProvider } from './contexts/ConfigContext'
import { AuthProvider } from './contexts/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SplashScreen } from './components/SplashScreen'
import { router } from './router'

function AppContent() {
  const { isReady } = useTelegram()

  if (!isReady) {
    return <SplashScreen />
  }

  return <RouterProvider router={router} />
}

function App() {
  return (
    <ErrorBoundary>
      <TonConnectProvider>
        <ConfigProvider>
          <TelegramProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </TelegramProvider>
        </ConfigProvider>
      </TonConnectProvider>
    </ErrorBoundary>
  )
}

export default App
```

**Step 2: Commit the integration**

```bash
git add src/App.tsx
git commit -m "feat(splash): integrate SplashScreen into App loading state"
```

---

## Task 6: Test and Verify the Splash Screen

**Step 1: Start the development server**

Run:
```bash
npm run dev
```

**Step 2: Verify splash screen displays**

Expected behavior:
1. Open the app in browser
2. Splash screen appears with:
   - Centered purple "G" logo with gradient and shadow
   - "Games" title below the logo
   - Animated progress bar moving left to right infinitely
   - "Loading..." text with fade animation
   - Subtle pulse animation on the logo

**Step 3: Verify transition to main app**

Once Telegram SDK initializes (`isReady` becomes true):
- Splash screen should disappear
- Main app with RouterProvider should render

**Step 4: Test on mobile viewport**

Resize browser to mobile dimensions (375x667) and verify:
- Logo remains centered
- Progress bar is visible
- No horizontal scroll

---

## Task 7: Final Commit and Build Verification

**Step 1: Run the production build**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 2: Test production build locally (optional)**

Run:
```bash
npm run preview
```

Verify splash screen works in production build.

**Step 3: Final feature commit**

If any fixes were needed:
```bash
git add -A
git commit -m "feat: complete splash screen implementation

- Add SplashScreen component with logo and progress bar
- Implement smooth CSS animations (pulse, progress, shimmer)
- Integrate with App.tsx loading state
- Use design tokens for consistent branding"
```

---

## Summary

This implementation adds a polished splash screen that:
- Displays centered "G" logo matching the app branding
- Shows "Games" title text
- Features a fancy animated progress bar with shimmer effect
- Uses subtle pulse animation on the logo
- Leverages existing CSS design tokens for consistency
- Integrates cleanly with the existing TelegramProvider loading state
