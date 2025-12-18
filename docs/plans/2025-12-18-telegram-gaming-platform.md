# Telegram Gaming Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Telegram Mini App gaming platform with dark-themed UI, game catalog, and TON wallet integration for in-game currency.

**Architecture:** React SPA served as Telegram Mini App. Custom Node.js/Express backend for game data, user accounts, and coin balance management. TON Connect for wallet integration. Unity games embedded via iframe/WebGL.

**Tech Stack:** React 18 + Vite + TypeScript, Express.js backend, TON Connect SDK, @tma.js/sdk for Telegram integration, CSS Modules with design system variables.

---

## Phase 1: Project Foundation

### Task 1: Initialize React + Vite Project

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`

**Step 1: Initialize project with Vite**

Run:
```bash
npm create vite@latest . -- --template react-ts
```

Expected: Project scaffolded with React + TypeScript template

**Step 2: Install core dependencies**

Run:
```bash
npm install
npm install @tma.js/sdk @tma.js/sdk-react @tonconnect/ui-react
```

Expected: Dependencies installed successfully

**Step 3: Verify dev server starts**

Run:
```bash
npm run dev
```

Expected: Server running on http://localhost:5173

**Step 4: Commit**

```bash
git add .
git commit -m "feat: initialize React + Vite + TypeScript project"
```

---

### Task 2: Set Up Design System CSS Variables

**Files:**
- Create: `src/styles/variables.css`
- Create: `src/styles/reset.css`
- Create: `src/styles/global.css`
- Modify: `src/main.tsx`

**Step 1: Create CSS variables from design.json**

Create `src/styles/variables.css`:
```css
:root {
  /* Background Colors */
  --color-bg-primary: #1A1A2E;
  --color-bg-secondary: #16162A;
  --color-bg-card: #252547;
  --color-bg-elevated: #2D2D50;

  /* Accent Colors */
  --color-accent-primary: #7B2FFF;
  --color-accent-light: #9747FF;
  --color-accent-dark: #6023CC;

  /* Text Colors */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #B8B8D0;
  --color-text-muted: #6B6B8A;

  /* Border Colors */
  --color-border-subtle: #3D3D60;
  --color-border-medium: #4A4A70;
  --color-border-accent: #7B2FFF;

  /* Status Colors */
  --color-status-notification: #FF4757;
  --color-status-success: #2ED573;
  --color-status-warning: #FFA502;

  /* Spacing */
  --spacing-xxs: 4px;
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-xxl: 48px;

  /* Border Radius */
  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-accent: 0 4px 20px rgba(123, 47, 255, 0.3);
  --shadow-accent-strong: 0 8px 32px rgba(123, 47, 255, 0.5);

  /* Gradients */
  --gradient-primary-button: linear-gradient(135deg, #7B2FFF 0%, #9747FF 100%);
  --gradient-accent-card: linear-gradient(145deg, #6023CC 0%, #7B2FFF 50%, #9747FF 100%);
  --gradient-card-overlay: linear-gradient(180deg, transparent 0%, rgba(26, 26, 46, 0.95) 100%);

  /* Typography */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;
  --transition-slow: 0.3s ease;
}
```

**Step 2: Create CSS reset**

Create `src/styles/reset.css`:
```css
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  min-height: 100vh;
  line-height: 1.5;
}

img,
picture,
video,
canvas,
svg {
  display: block;
  max-width: 100%;
}

input,
button,
textarea,
select {
  font: inherit;
}

button {
  cursor: pointer;
  border: none;
  background: none;
}

a {
  text-decoration: none;
  color: inherit;
}

ul,
ol {
  list-style: none;
}
```

**Step 3: Create global styles**

Create `src/styles/global.css`:
```css
@import './reset.css';
@import './variables.css';

html,
body {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-primary);
  font-size: 14px;
}

#root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
```

**Step 4: Import global styles in main.tsx**

Modify `src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**Step 5: Verify styles applied**

Run:
```bash
npm run dev
```

Expected: Page has dark purple background (#1A1A2E)

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add design system CSS variables and global styles"
```

---

### Task 3: Set Up Telegram Mini App SDK

**Files:**
- Create: `src/providers/TelegramProvider.tsx`
- Modify: `src/App.tsx`

**Step 1: Create Telegram SDK provider**

Create `src/providers/TelegramProvider.tsx`:
```tsx
import { useEffect, useState, createContext, useContext, ReactNode } from 'react'
import { init, backButton, miniApp, themeParams } from '@tma.js/sdk'

interface TelegramContextValue {
  isReady: boolean
  isTelegram: boolean
  colorScheme: 'dark' | 'light'
}

const TelegramContext = createContext<TelegramContextValue>({
  isReady: false,
  isTelegram: false,
  colorScheme: 'dark',
})

export function useTelegram() {
  return useContext(TelegramContext)
}

interface TelegramProviderProps {
  children: ReactNode
}

export function TelegramProvider({ children }: TelegramProviderProps) {
  const [isReady, setIsReady] = useState(false)
  const [isTelegram, setIsTelegram] = useState(false)
  const [colorScheme, setColorScheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    try {
      init()

      if (miniApp.mount.isAvailable()) {
        miniApp.mount()
        miniApp.ready()
      }

      if (backButton.mount.isAvailable()) {
        backButton.mount()
      }

      if (themeParams.mount.isAvailable()) {
        themeParams.mount()
        setColorScheme(miniApp.isDark() ? 'dark' : 'light')
      }

      setIsTelegram(true)
      setIsReady(true)
    } catch {
      // Not in Telegram environment
      setIsTelegram(false)
      setIsReady(true)
    }
  }, [])

  return (
    <TelegramContext.Provider value={{ isReady, isTelegram, colorScheme }}>
      {children}
    </TelegramContext.Provider>
  )
}
```

**Step 2: Update App.tsx to use provider**

Modify `src/App.tsx`:
```tsx
import { TelegramProvider, useTelegram } from './providers/TelegramProvider'

function AppContent() {
  const { isReady, isTelegram } = useTelegram()

  if (!isReady) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <p>Telegram Mini App: {isTelegram ? 'Yes' : 'No (Web Browser)'}</p>
    </div>
  )
}

function App() {
  return (
    <TelegramProvider>
      <AppContent />
    </TelegramProvider>
  )
}

export default App
```

**Step 3: Verify app loads without errors**

Run:
```bash
npm run dev
```

Expected: Page shows "Telegram Mini App: No (Web Browser)"

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add Telegram Mini App SDK integration"
```

---

### Task 4: Set Up TON Connect Provider

**Files:**
- Create: `src/providers/TonConnectProvider.tsx`
- Modify: `src/App.tsx`

**Step 1: Create TON Connect manifest**

Create `public/tonconnect-manifest.json`:
```json
{
  "url": "https://your-app-url.com",
  "name": "Gaming Platform",
  "iconUrl": "https://your-app-url.com/icon.png"
}
```

**Step 2: Create TON Connect provider wrapper**

Create `src/providers/TonConnectProvider.tsx`:
```tsx
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import { ReactNode } from 'react'

interface TonConnectProviderProps {
  children: ReactNode
}

export function TonConnectProvider({ children }: TonConnectProviderProps) {
  const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`

  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      {children}
    </TonConnectUIProvider>
  )
}
```

**Step 3: Update App.tsx with TON Connect provider**

Modify `src/App.tsx`:
```tsx
import { TelegramProvider, useTelegram } from './providers/TelegramProvider'
import { TonConnectProvider } from './providers/TonConnectProvider'

function AppContent() {
  const { isReady, isTelegram } = useTelegram()

  if (!isReady) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <p>Telegram Mini App: {isTelegram ? 'Yes' : 'No (Web Browser)'}</p>
      <p>TON Connect Ready</p>
    </div>
  )
}

function App() {
  return (
    <TonConnectProvider>
      <TelegramProvider>
        <AppContent />
      </TelegramProvider>
    </TonConnectProvider>
  )
}

export default App
```

**Step 4: Verify no console errors**

Run:
```bash
npm run dev
```

Expected: App loads, console shows no errors related to TON Connect

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add TON Connect provider for wallet integration"
```

---

## Phase 2: Core UI Components

### Task 5: Create Header Component

**Files:**
- Create: `src/components/Header/Header.tsx`
- Create: `src/components/Header/Header.module.css`
- Create: `src/components/Header/index.ts`

**Step 1: Create Header component**

Create `src/components/Header/Header.tsx`:
```tsx
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react'
import styles from './Header.module.css'

export function Header() {
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()

  const handleWalletClick = () => {
    if (wallet) {
      tonConnectUI.disconnect()
    } else {
      tonConnectUI.openModal()
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>G</div>
        <span className={styles.logoText}>Games</span>
      </div>

      <div className={styles.actions}>
        <button className={styles.iconButton} aria-label="Search">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        <button className={styles.iconButton} aria-label="Notifications">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className={styles.badge}>3</span>
        </button>

        <button className={styles.walletButton} onClick={handleWalletClick}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
            <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/>
          </svg>
          {wallet ? 'Connected' : 'Connect'}
        </button>
      </div>
    </header>
  )
}
```

**Step 2: Create Header styles**

Create `src/components/Header/Header.module.css`:
```css
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 var(--spacing-md);
  background-color: var(--color-bg-secondary);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.logoIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: var(--color-accent-primary);
  border-radius: var(--radius-sm);
  font-weight: 700;
  font-size: 18px;
}

.logoText {
  font-weight: 700;
  font-size: 18px;
  color: var(--color-text-primary);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.iconButton {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-text-primary);
  border-radius: 50%;
  transition: background-color var(--transition-fast);
}

.iconButton:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background-color: var(--color-status-notification);
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}

.walletButton {
  display: flex;
  align-items: center;
  gap: var(--spacing-xxs);
  padding: var(--spacing-xs) var(--spacing-md);
  background-color: var(--color-accent-primary);
  border-radius: var(--radius-xl);
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
  transition: background-color var(--transition-fast);
}

.walletButton:hover {
  background-color: var(--color-accent-light);
}
```

**Step 3: Create barrel export**

Create `src/components/Header/index.ts`:
```ts
export { Header } from './Header'
```

**Step 4: Add Header to App**

Modify `src/App.tsx`:
```tsx
import { TelegramProvider, useTelegram } from './providers/TelegramProvider'
import { TonConnectProvider } from './providers/TonConnectProvider'
import { Header } from './components/Header'

function AppContent() {
  const { isReady } = useTelegram()

  if (!isReady) {
    return <div>Loading...</div>
  }

  return (
    <>
      <Header />
      <main>
        <p>Content goes here</p>
      </main>
    </>
  )
}

function App() {
  return (
    <TonConnectProvider>
      <TelegramProvider>
        <AppContent />
      </TelegramProvider>
    </TonConnectProvider>
  )
}

export default App
```

**Step 5: Verify Header renders correctly**

Run:
```bash
npm run dev
```

Expected: Dark header with logo, icons, and Connect button visible

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add Header component with TON Connect wallet button"
```

---

### Task 6: Create GameCard Component

**Files:**
- Create: `src/components/GameCard/GameCard.tsx`
- Create: `src/components/GameCard/GameCard.module.css`
- Create: `src/components/GameCard/index.ts`

**Step 1: Create GameCard component**

Create `src/components/GameCard/GameCard.tsx`:
```tsx
import styles from './GameCard.module.css'

export interface Game {
  id: string
  title: string
  thumbnail: string
  category: string
}

interface GameCardProps {
  game: Game
  onClick?: (game: Game) => void
}

export function GameCard({ game, onClick }: GameCardProps) {
  return (
    <button
      className={styles.card}
      onClick={() => onClick?.(game)}
      aria-label={`Play ${game.title}`}
    >
      <div className={styles.thumbnailWrapper}>
        <img
          src={game.thumbnail}
          alt={game.title}
          className={styles.thumbnail}
          loading="lazy"
        />
      </div>
      <span className={styles.title}>{game.title}</span>
    </button>
  )
}
```

**Step 2: Create GameCard styles**

Create `src/components/GameCard/GameCard.module.css`:
```css
.card {
  display: flex;
  flex-direction: column;
  background-color: transparent;
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
}

.card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: var(--shadow-lg);
}

.card:active {
  transform: scale(0.98);
}

.thumbnailWrapper {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-card);
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.title {
  padding: var(--spacing-xs) 0 0 0;
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

**Step 3: Create barrel export**

Create `src/components/GameCard/index.ts`:
```ts
export { GameCard } from './GameCard'
export type { Game } from './GameCard'
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add GameCard component"
```

---

### Task 7: Create FeaturedCard Component

**Files:**
- Create: `src/components/FeaturedCard/FeaturedCard.tsx`
- Create: `src/components/FeaturedCard/FeaturedCard.module.css`
- Create: `src/components/FeaturedCard/index.ts`

**Step 1: Create FeaturedCard component**

Create `src/components/FeaturedCard/FeaturedCard.tsx`:
```tsx
import styles from './FeaturedCard.module.css'
import type { Game } from '../GameCard'

interface FeaturedCardProps {
  game: Game
  onPlay?: (game: Game) => void
}

export function FeaturedCard({ game, onPlay }: FeaturedCardProps) {
  return (
    <div className={styles.card}>
      <img
        src={game.thumbnail}
        alt={game.title}
        className={styles.image}
      />
      <div className={styles.overlay}>
        <div className={styles.info}>
          <span className={styles.category}>{game.category}</span>
          <h3 className={styles.title}>{game.title}</h3>
        </div>
        <button
          className={styles.playButton}
          onClick={() => onPlay?.(game)}
        >
          Play
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Create FeaturedCard styles**

Create `src/components/FeaturedCard/FeaturedCard.module.css`:
```css
.card {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: var(--radius-xl);
  overflow: hidden;
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
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: var(--spacing-lg);
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.8) 100%);
}

.info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xxs);
}

.category {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
}

.title {
  color: var(--color-text-primary);
  font-size: 18px;
  font-weight: 700;
}

.playButton {
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-accent-primary);
  border-radius: var(--radius-full);
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: 600;
  transition: background-color var(--transition-fast), transform var(--transition-fast);
}

.playButton:hover {
  background-color: var(--color-accent-light);
  transform: translateY(-1px);
  box-shadow: var(--shadow-accent);
}

.playButton:active {
  transform: translateY(0);
}
```

**Step 3: Create barrel export**

Create `src/components/FeaturedCard/index.ts`:
```ts
export { FeaturedCard } from './FeaturedCard'
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add FeaturedCard component for hero games"
```

---

### Task 8: Create ActionCard Component (Surprise Me)

**Files:**
- Create: `src/components/ActionCard/ActionCard.tsx`
- Create: `src/components/ActionCard/ActionCard.module.css`
- Create: `src/components/ActionCard/index.ts`

**Step 1: Create ActionCard component**

Create `src/components/ActionCard/ActionCard.tsx`:
```tsx
import { ReactNode } from 'react'
import styles from './ActionCard.module.css'

interface ActionCardProps {
  icon: ReactNode
  label: string
  onClick?: () => void
}

export function ActionCard({ icon, label, onClick }: ActionCardProps) {
  return (
    <button className={styles.card} onClick={onClick}>
      <div className={styles.icon}>{icon}</div>
      <span className={styles.label}>{label}</span>
    </button>
  )
}
```

**Step 2: Create ActionCard styles**

Create `src/components/ActionCard/ActionCard.module.css`:
```css
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  min-width: 120px;
  min-height: 100px;
  padding: var(--spacing-lg);
  background: var(--gradient-primary-button);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-accent);
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-accent-strong);
}

.card:active {
  transform: scale(0.98);
}

.icon {
  color: var(--color-text-primary);
}

.icon svg {
  width: 28px;
  height: 28px;
}

.label {
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}
```

**Step 3: Create barrel export**

Create `src/components/ActionCard/index.ts`:
```ts
export { ActionCard } from './ActionCard'
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add ActionCard component with gradient background"
```

---

### Task 9: Create PlaceholderCard Component

**Files:**
- Create: `src/components/PlaceholderCard/PlaceholderCard.tsx`
- Create: `src/components/PlaceholderCard/PlaceholderCard.module.css`
- Create: `src/components/PlaceholderCard/index.ts`

**Step 1: Create PlaceholderCard component**

Create `src/components/PlaceholderCard/PlaceholderCard.tsx`:
```tsx
import { ReactNode } from 'react'
import styles from './PlaceholderCard.module.css'

interface PlaceholderCardProps {
  icon?: ReactNode
}

export function PlaceholderCard({ icon }: PlaceholderCardProps) {
  return (
    <div className={styles.card}>
      {icon && <div className={styles.icon}>{icon}</div>}
    </div>
  )
}
```

**Step 2: Create PlaceholderCard styles**

Create `src/components/PlaceholderCard/PlaceholderCard.module.css`:
```css
.card {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  min-height: 100px;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.card:hover {
  background-color: var(--color-bg-elevated);
  border-color: var(--color-border-medium);
}

.icon {
  color: var(--color-text-muted);
  opacity: 0.6;
}

.icon svg {
  width: 32px;
  height: 32px;
}
```

**Step 3: Create barrel export**

Create `src/components/PlaceholderCard/index.ts`:
```ts
export { PlaceholderCard } from './PlaceholderCard'
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add PlaceholderCard component for empty states"
```

---

### Task 10: Create Section Component

**Files:**
- Create: `src/components/Section/Section.tsx`
- Create: `src/components/Section/Section.module.css`
- Create: `src/components/Section/index.ts`

**Step 1: Create Section component**

Create `src/components/Section/Section.tsx`:
```tsx
import { ReactNode } from 'react'
import styles from './Section.module.css'

interface SectionProps {
  title: string
  children: ReactNode
  action?: ReactNode
}

export function Section({ title, children, action }: SectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {action && <div className={styles.action}>{action}</div>}
      </div>
      <div className={styles.content}>{children}</div>
    </section>
  )
}
```

**Step 2: Create Section styles**

Create `src/components/Section/Section.module.css`:
```css
.section {
  padding: var(--spacing-lg) var(--spacing-md);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.title {
  color: var(--color-text-primary);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.action {
  color: var(--color-text-secondary);
  font-size: 14px;
}
```

**Step 3: Create barrel export**

Create `src/components/Section/index.ts`:
```ts
export { Section } from './Section'
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add Section component for content grouping"
```

---

### Task 11: Create GameGrid Component

**Files:**
- Create: `src/components/GameGrid/GameGrid.tsx`
- Create: `src/components/GameGrid/GameGrid.module.css`
- Create: `src/components/GameGrid/index.ts`

**Step 1: Create GameGrid component**

Create `src/components/GameGrid/GameGrid.tsx`:
```tsx
import { GameCard, Game } from '../GameCard'
import styles from './GameGrid.module.css'

interface GameGridProps {
  games: Game[]
  onGameClick?: (game: Game) => void
}

export function GameGrid({ games, onGameClick }: GameGridProps) {
  return (
    <div className={styles.grid}>
      {games.map((game) => (
        <GameCard key={game.id} game={game} onClick={onGameClick} />
      ))}
    </div>
  )
}
```

**Step 2: Create GameGrid styles**

Create `src/components/GameGrid/GameGrid.module.css`:
```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
}

@media (min-width: 480px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(5, 1fr);
  }
}
```

**Step 3: Create barrel export**

Create `src/components/GameGrid/index.ts`:
```ts
export { GameGrid } from './GameGrid'
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add GameGrid component for responsive game layout"
```

---

### Task 12: Create Components Barrel Export

**Files:**
- Create: `src/components/index.ts`

**Step 1: Create barrel export for all components**

Create `src/components/index.ts`:
```ts
export { Header } from './Header'
export { GameCard } from './GameCard'
export type { Game } from './GameCard'
export { FeaturedCard } from './FeaturedCard'
export { ActionCard } from './ActionCard'
export { PlaceholderCard } from './PlaceholderCard'
export { Section } from './Section'
export { GameGrid } from './GameGrid'
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add barrel export for components"
```

---

## Phase 3: Home Page

### Task 13: Create Mock Game Data

**Files:**
- Create: `src/data/games.ts`

**Step 1: Create mock game data**

Create `src/data/games.ts`:
```ts
import type { Game } from '../components'

export const featuredGame: Game = {
  id: 'featured-1',
  title: 'Epic Quest',
  thumbnail: 'https://picsum.photos/seed/epic/800/500',
  category: 'Adventure',
}

export const popularGames: Game[] = [
  {
    id: 'game-1',
    title: 'Space Runner',
    thumbnail: 'https://picsum.photos/seed/space/200/200',
    category: 'Action',
  },
  {
    id: 'game-2',
    title: 'Puzzle Master',
    thumbnail: 'https://picsum.photos/seed/puzzle/200/200',
    category: 'Puzzle',
  },
  {
    id: 'game-3',
    title: 'Racing Pro',
    thumbnail: 'https://picsum.photos/seed/racing/200/200',
    category: 'Racing',
  },
  {
    id: 'game-4',
    title: 'Castle Defense',
    thumbnail: 'https://picsum.photos/seed/castle/200/200',
    category: 'Strategy',
  },
  {
    id: 'game-5',
    title: 'Jump Hero',
    thumbnail: 'https://picsum.photos/seed/jump/200/200',
    category: 'Arcade',
  },
  {
    id: 'game-6',
    title: 'Match 3 Gems',
    thumbnail: 'https://picsum.photos/seed/gems/200/200',
    category: 'Puzzle',
  },
]

export const newGames: Game[] = [
  {
    id: 'new-1',
    title: 'Cyber Warriors',
    thumbnail: 'https://picsum.photos/seed/cyber/200/200',
    category: 'Action',
  },
  {
    id: 'new-2',
    title: 'Farm Story',
    thumbnail: 'https://picsum.photos/seed/farm/200/200',
    category: 'Simulation',
  },
  {
    id: 'new-3',
    title: 'Word Quest',
    thumbnail: 'https://picsum.photos/seed/word/200/200',
    category: 'Word',
  },
]
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add mock game data"
```

---

### Task 14: Create HomePage Component

**Files:**
- Create: `src/pages/HomePage/HomePage.tsx`
- Create: `src/pages/HomePage/HomePage.module.css`
- Create: `src/pages/HomePage/index.ts`

**Step 1: Create HomePage component**

Create `src/pages/HomePage/HomePage.tsx`:
```tsx
import {
  Header,
  FeaturedCard,
  ActionCard,
  PlaceholderCard,
  Section,
  GameGrid,
  Game,
} from '../../components'
import { featuredGame, popularGames, newGames } from '../../data/games'
import styles from './HomePage.module.css'

export function HomePage() {
  const handleGameClick = (game: Game) => {
    console.log('Play game:', game.id)
  }

  const handleSurpriseMe = () => {
    const allGames = [...popularGames, ...newGames]
    const randomGame = allGames[Math.floor(Math.random() * allGames.length)]
    handleGameClick(randomGame)
  }

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        {/* Quick Actions */}
        <section className={styles.quickActions}>
          <div className={styles.actionsScroll}>
            <ActionCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              }
              label="Surprise me!"
              onClick={handleSurpriseMe}
            />
            <PlaceholderCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              }
            />
            <PlaceholderCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              }
            />
          </div>
        </section>

        {/* Featured Game */}
        <Section title="Featured">
          <FeaturedCard game={featuredGame} onPlay={handleGameClick} />
        </Section>

        {/* Popular Games */}
        <Section title="Popular Games">
          <GameGrid games={popularGames} onGameClick={handleGameClick} />
        </Section>

        {/* New Games */}
        <Section title="New Games">
          <GameGrid games={newGames} onGameClick={handleGameClick} />
        </Section>
      </main>
    </div>
  )
}
```

**Step 2: Create HomePage styles**

Create `src/pages/HomePage/HomePage.module.css`:
```css
.page {
  min-height: 100vh;
  background-color: var(--color-bg-primary);
}

.main {
  padding-bottom: var(--spacing-xxl);
}

.quickActions {
  padding: var(--spacing-lg) 0;
}

.actionsScroll {
  display: flex;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-md);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.actionsScroll::-webkit-scrollbar {
  display: none;
}

.actionsScroll > * {
  flex-shrink: 0;
  scroll-snap-align: start;
}
```

**Step 3: Create barrel export**

Create `src/pages/HomePage/index.ts`:
```ts
export { HomePage } from './HomePage'
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add HomePage with all sections"
```

---

### Task 15: Update App to Use HomePage

**Files:**
- Modify: `src/App.tsx`

**Step 1: Update App.tsx**

Modify `src/App.tsx`:
```tsx
import { TelegramProvider, useTelegram } from './providers/TelegramProvider'
import { TonConnectProvider } from './providers/TonConnectProvider'
import { HomePage } from './pages/HomePage'

function AppContent() {
  const { isReady } = useTelegram()

  if (!isReady) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: 'var(--color-text-secondary)',
      }}>
        Loading...
      </div>
    )
  }

  return <HomePage />
}

function App() {
  return (
    <TonConnectProvider>
      <TelegramProvider>
        <AppContent />
      </TelegramProvider>
    </TonConnectProvider>
  )
}

export default App
```

**Step 2: Verify complete home page renders**

Run:
```bash
npm run dev
```

Expected: Full home page with header, quick actions, featured card, and game grids

**Step 3: Commit**

```bash
git add .
git commit -m "feat: integrate HomePage into App"
```

---

## Phase 4: Settings & Wallet Page

### Task 16: Create CoinBalance Component

**Files:**
- Create: `src/components/CoinBalance/CoinBalance.tsx`
- Create: `src/components/CoinBalance/CoinBalance.module.css`
- Create: `src/components/CoinBalance/index.ts`

**Step 1: Create CoinBalance component**

Create `src/components/CoinBalance/CoinBalance.tsx`:
```tsx
import styles from './CoinBalance.module.css'

interface CoinBalanceProps {
  balance: number
  symbol?: string
}

export function CoinBalance({ balance, symbol = 'TON' }: CoinBalanceProps) {
  const formattedBalance = balance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <div className={styles.container}>
      <div className={styles.icon}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
        </svg>
      </div>
      <div className={styles.details}>
        <span className={styles.label}>Your Balance</span>
        <span className={styles.balance}>
          {formattedBalance} <span className={styles.symbol}>{symbol}</span>
        </span>
      </div>
    </div>
  )
}
```

**Step 2: Create CoinBalance styles**

Create `src/components/CoinBalance/CoinBalance.module.css`:
```css
.container {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background-color: var(--color-bg-card);
  border-radius: var(--radius-lg);
}

.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background-color: var(--color-accent-primary);
  border-radius: 50%;
  color: var(--color-text-primary);
}

.icon svg {
  width: 28px;
  height: 28px;
}

.details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xxs);
}

.label {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
}

.balance {
  color: var(--color-text-primary);
  font-size: 24px;
  font-weight: 700;
}

.symbol {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-secondary);
}
```

**Step 3: Create barrel export**

Create `src/components/CoinBalance/index.ts`:
```ts
export { CoinBalance } from './CoinBalance'
```

**Step 4: Update components barrel**

Modify `src/components/index.ts` to add:
```ts
export { CoinBalance } from './CoinBalance'
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add CoinBalance component"
```

---

### Task 17: Create BuyCoinsCard Component

**Files:**
- Create: `src/components/BuyCoinsCard/BuyCoinsCard.tsx`
- Create: `src/components/BuyCoinsCard/BuyCoinsCard.module.css`
- Create: `src/components/BuyCoinsCard/index.ts`

**Step 1: Create BuyCoinsCard component**

Create `src/components/BuyCoinsCard/BuyCoinsCard.tsx`:
```tsx
import styles from './BuyCoinsCard.module.css'

interface CoinPackage {
  id: string
  amount: number
  price: number
  bonus?: number
}

interface BuyCoinsCardProps {
  package: CoinPackage
  onBuy: (pkg: CoinPackage) => void
}

export function BuyCoinsCard({ package: pkg, onBuy }: BuyCoinsCardProps) {
  return (
    <button className={styles.card} onClick={() => onBuy(pkg)}>
      {pkg.bonus && <span className={styles.badge}>+{pkg.bonus}% bonus</span>}
      <div className={styles.amount}>{pkg.amount.toLocaleString()}</div>
      <div className={styles.label}>coins</div>
      <div className={styles.price}>{pkg.price} TON</div>
    </button>
  )
}

export type { CoinPackage }
```

**Step 2: Create BuyCoinsCard styles**

Create `src/components/BuyCoinsCard/BuyCoinsCard.module.css`:
```css
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  transition: all var(--transition-normal);
}

.card:hover {
  background-color: var(--color-bg-elevated);
  border-color: var(--color-accent-primary);
  transform: translateY(-2px);
}

.badge {
  position: absolute;
  top: -8px;
  right: -8px;
  padding: var(--spacing-xxs) var(--spacing-xs);
  background-color: var(--color-status-success);
  border-radius: var(--radius-full);
  color: var(--color-text-primary);
  font-size: 10px;
  font-weight: 700;
}

.amount {
  color: var(--color-text-primary);
  font-size: 28px;
  font-weight: 700;
}

.label {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
}

.price {
  padding: var(--spacing-xs) var(--spacing-md);
  background-color: var(--color-accent-primary);
  border-radius: var(--radius-full);
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
}
```

**Step 3: Create barrel export**

Create `src/components/BuyCoinsCard/index.ts`:
```ts
export { BuyCoinsCard } from './BuyCoinsCard'
export type { CoinPackage } from './BuyCoinsCard'
```

**Step 4: Update components barrel**

Modify `src/components/index.ts` to add:
```ts
export { BuyCoinsCard } from './BuyCoinsCard'
export type { CoinPackage } from './BuyCoinsCard'
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add BuyCoinsCard component"
```

---

### Task 18: Create SettingsPage Component

**Files:**
- Create: `src/pages/SettingsPage/SettingsPage.tsx`
- Create: `src/pages/SettingsPage/SettingsPage.module.css`
- Create: `src/pages/SettingsPage/index.ts`

**Step 1: Create SettingsPage component**

Create `src/pages/SettingsPage/SettingsPage.tsx`:
```tsx
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react'
import { Header, Section, CoinBalance, BuyCoinsCard, CoinPackage } from '../../components'
import styles from './SettingsPage.module.css'

const coinPackages: CoinPackage[] = [
  { id: 'pack-1', amount: 100, price: 1 },
  { id: 'pack-2', amount: 500, price: 4, bonus: 25 },
  { id: 'pack-3', amount: 1000, price: 7, bonus: 40 },
  { id: 'pack-4', amount: 5000, price: 30, bonus: 65 },
]

export function SettingsPage() {
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()
  const userBalance = 250.50 // TODO: Get from backend

  const handleConnectWallet = () => {
    tonConnectUI.openModal()
  }

  const handleDisconnectWallet = () => {
    tonConnectUI.disconnect()
  }

  const handleBuyCoins = (pkg: CoinPackage) => {
    if (!wallet) {
      tonConnectUI.openModal()
      return
    }
    // TODO: Implement TON transaction
    console.log('Buy coins package:', pkg.id)
  }

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        {/* Wallet Section */}
        <Section title="Wallet">
          {wallet ? (
            <div className={styles.walletConnected}>
              <div className={styles.walletInfo}>
                <div className={styles.walletAddress}>
                  {wallet.account.address.slice(0, 6)}...{wallet.account.address.slice(-4)}
                </div>
                <button
                  className={styles.disconnectButton}
                  onClick={handleDisconnectWallet}
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <button className={styles.connectButton} onClick={handleConnectWallet}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/>
              </svg>
              Connect TON Wallet
            </button>
          )}
        </Section>

        {/* Balance Section */}
        <Section title="Game Coins">
          <CoinBalance balance={userBalance} symbol="coins" />
        </Section>

        {/* Buy Coins Section */}
        <Section title="Buy Coins">
          <div className={styles.packagesGrid}>
            {coinPackages.map((pkg) => (
              <BuyCoinsCard key={pkg.id} package={pkg} onBuy={handleBuyCoins} />
            ))}
          </div>
        </Section>
      </main>
    </div>
  )
}
```

**Step 2: Create SettingsPage styles**

Create `src/pages/SettingsPage/SettingsPage.module.css`:
```css
.page {
  min-height: 100vh;
  background-color: var(--color-bg-primary);
}

.main {
  padding-bottom: var(--spacing-xxl);
}

.walletConnected {
  padding: var(--spacing-md);
  background-color: var(--color-bg-card);
  border-radius: var(--radius-lg);
}

.walletInfo {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.walletAddress {
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-mono);
}

.disconnectButton {
  padding: var(--spacing-xs) var(--spacing-md);
  background-color: transparent;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.disconnectButton:hover {
  border-color: var(--color-status-notification);
  color: var(--color-status-notification);
}

.connectButton {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  width: 100%;
  padding: var(--spacing-md);
  background-color: var(--color-accent-primary);
  border-radius: var(--radius-lg);
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: 600;
  transition: background-color var(--transition-fast);
}

.connectButton:hover {
  background-color: var(--color-accent-light);
}

.packagesGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}
```

**Step 3: Create barrel export**

Create `src/pages/SettingsPage/index.ts`:
```ts
export { SettingsPage } from './SettingsPage'
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add SettingsPage with wallet and coin purchase"
```

---

## Phase 5: Routing & Navigation

### Task 19: Set Up React Router

**Files:**
- Modify: `package.json` (install dependency)
- Create: `src/router.tsx`
- Modify: `src/App.tsx`

**Step 1: Install React Router**

Run:
```bash
npm install react-router-dom
```

**Step 2: Create router configuration**

Create `src/router.tsx`:
```tsx
import { createBrowserRouter } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { SettingsPage } from './pages/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/settings',
    element: <SettingsPage />,
  },
])
```

**Step 3: Update App.tsx to use router**

Modify `src/App.tsx`:
```tsx
import { RouterProvider } from 'react-router-dom'
import { TelegramProvider, useTelegram } from './providers/TelegramProvider'
import { TonConnectProvider } from './providers/TonConnectProvider'
import { router } from './router'

function AppContent() {
  const { isReady } = useTelegram()

  if (!isReady) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: 'var(--color-text-secondary)',
      }}>
        Loading...
      </div>
    )
  }

  return <RouterProvider router={router} />
}

function App() {
  return (
    <TonConnectProvider>
      <TelegramProvider>
        <AppContent />
      </TelegramProvider>
    </TonConnectProvider>
  )
}

export default App
```

**Step 4: Verify routing works**

Run:
```bash
npm run dev
```

Expected: Navigate to http://localhost:5173/settings shows Settings page

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add React Router with home and settings routes"
```

---

### Task 20: Update Header with Navigation

**Files:**
- Modify: `src/components/Header/Header.tsx`
- Modify: `src/components/Header/Header.module.css`

**Step 1: Update Header with navigation links**

Modify `src/components/Header/Header.tsx`:
```tsx
import { Link, useLocation } from 'react-router-dom'
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react'
import styles from './Header.module.css'

export function Header() {
  const location = useLocation()
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()

  const handleWalletClick = () => {
    if (wallet) {
      tonConnectUI.disconnect()
    } else {
      tonConnectUI.openModal()
    }
  }

  const isHome = location.pathname === '/'
  const isSettings = location.pathname === '/settings'

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        <div className={styles.logoIcon}>G</div>
        <span className={styles.logoText}>Games</span>
      </Link>

      <div className={styles.actions}>
        <Link
          to="/"
          className={`${styles.navLink} ${isHome ? styles.navLinkActive : ''}`}
          aria-label="Home"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
        </Link>

        <Link
          to="/settings"
          className={`${styles.navLink} ${isSettings ? styles.navLinkActive : ''}`}
          aria-label="Settings"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </Link>

        <button className={styles.walletButton} onClick={handleWalletClick}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
            <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/>
          </svg>
          {wallet ? 'Connected' : 'Connect'}
        </button>
      </div>
    </header>
  )
}
```

**Step 2: Update Header styles with nav link states**

Add to `src/components/Header/Header.module.css`:
```css
.navLink {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-text-secondary);
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.navLink:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--color-text-primary);
}

.navLinkActive {
  color: var(--color-accent-primary);
}
```

**Step 3: Verify navigation works**

Run:
```bash
npm run dev
```

Expected: Click Home/Settings icons to navigate between pages

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add navigation links to Header"
```

---

## Phase 6: Backend API Setup

### Task 21: Initialize Backend Project

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts`

**Step 1: Create server directory and initialize**

Run:
```bash
mkdir -p server/src
cd server
npm init -y
npm install express cors dotenv
npm install -D typescript @types/node @types/express @types/cors ts-node nodemon
cd ..
```

**Step 2: Create server tsconfig.json**

Create `server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create Express server**

Create `server/src/index.ts`:
```ts
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

**Step 4: Add scripts to server package.json**

Modify `server/package.json` scripts:
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

**Step 5: Verify server starts**

Run:
```bash
cd server && npm run dev
```

Expected: "Server running on port 3001"

**Step 6: Commit**

```bash
git add .
git commit -m "feat: initialize Express backend server"
```

---

### Task 22: Add Games API Endpoint

**Files:**
- Create: `server/src/routes/games.ts`
- Create: `server/src/data/games.ts`
- Modify: `server/src/index.ts`

**Step 1: Create games data**

Create `server/src/data/games.ts`:
```ts
export interface Game {
  id: string
  title: string
  thumbnail: string
  category: string
  description?: string
  featured?: boolean
}

export const games: Game[] = [
  {
    id: 'featured-1',
    title: 'Epic Quest',
    thumbnail: 'https://picsum.photos/seed/epic/800/500',
    category: 'Adventure',
    description: 'Embark on an epic adventure through mystical lands',
    featured: true,
  },
  {
    id: 'game-1',
    title: 'Space Runner',
    thumbnail: 'https://picsum.photos/seed/space/200/200',
    category: 'Action',
    description: 'Run through space and collect stars',
  },
  {
    id: 'game-2',
    title: 'Puzzle Master',
    thumbnail: 'https://picsum.photos/seed/puzzle/200/200',
    category: 'Puzzle',
    description: 'Solve challenging puzzles',
  },
  {
    id: 'game-3',
    title: 'Racing Pro',
    thumbnail: 'https://picsum.photos/seed/racing/200/200',
    category: 'Racing',
    description: 'High-speed racing action',
  },
  {
    id: 'game-4',
    title: 'Castle Defense',
    thumbnail: 'https://picsum.photos/seed/castle/200/200',
    category: 'Strategy',
    description: 'Defend your castle from invaders',
  },
  {
    id: 'game-5',
    title: 'Jump Hero',
    thumbnail: 'https://picsum.photos/seed/jump/200/200',
    category: 'Arcade',
    description: 'Jump your way to victory',
  },
  {
    id: 'game-6',
    title: 'Match 3 Gems',
    thumbnail: 'https://picsum.photos/seed/gems/200/200',
    category: 'Puzzle',
    description: 'Match colorful gems',
  },
  {
    id: 'new-1',
    title: 'Cyber Warriors',
    thumbnail: 'https://picsum.photos/seed/cyber/200/200',
    category: 'Action',
    description: 'Fight in the cyber arena',
  },
  {
    id: 'new-2',
    title: 'Farm Story',
    thumbnail: 'https://picsum.photos/seed/farm/200/200',
    category: 'Simulation',
    description: 'Build and manage your farm',
  },
  {
    id: 'new-3',
    title: 'Word Quest',
    thumbnail: 'https://picsum.photos/seed/word/200/200',
    category: 'Word',
    description: 'Challenge your vocabulary',
  },
]
```

**Step 2: Create games routes**

Create `server/src/routes/games.ts`:
```ts
import { Router } from 'express'
import { games } from '../data/games'

const router = Router()

// Get all games
router.get('/', (req, res) => {
  res.json({ games })
})

// Get featured game
router.get('/featured', (req, res) => {
  const featured = games.find(g => g.featured)
  if (!featured) {
    return res.status(404).json({ error: 'No featured game found' })
  }
  res.json({ game: featured })
})

// Get game by ID
router.get('/:id', (req, res) => {
  const game = games.find(g => g.id === req.params.id)
  if (!game) {
    return res.status(404).json({ error: 'Game not found' })
  }
  res.json({ game })
})

export default router
```

**Step 3: Add games routes to server**

Modify `server/src/index.ts`:
```ts
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import gamesRouter from './routes/games'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/games', gamesRouter)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

**Step 4: Verify endpoint works**

Run:
```bash
curl http://localhost:3001/api/games
```

Expected: JSON response with games array

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add games API endpoints"
```

---

### Task 23: Add User Coins API Endpoint

**Files:**
- Create: `server/src/routes/users.ts`
- Modify: `server/src/index.ts`

**Step 1: Create users routes**

Create `server/src/routes/users.ts`:
```ts
import { Router } from 'express'

const router = Router()

// In-memory user balances (replace with database later)
const userBalances: Record<string, number> = {}

// Get user balance
router.get('/:walletAddress/balance', (req, res) => {
  const { walletAddress } = req.params
  const balance = userBalances[walletAddress] ?? 0
  res.json({ walletAddress, balance })
})

// Add coins to user balance (after TON payment verified)
router.post('/:walletAddress/add-coins', (req, res) => {
  const { walletAddress } = req.params
  const { amount } = req.body

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' })
  }

  const currentBalance = userBalances[walletAddress] ?? 0
  userBalances[walletAddress] = currentBalance + amount

  res.json({
    walletAddress,
    balance: userBalances[walletAddress],
    added: amount,
  })
})

// Deduct coins from user balance (for in-game purchases)
router.post('/:walletAddress/deduct-coins', (req, res) => {
  const { walletAddress } = req.params
  const { amount } = req.body

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' })
  }

  const currentBalance = userBalances[walletAddress] ?? 0
  if (currentBalance < amount) {
    return res.status(400).json({ error: 'Insufficient balance' })
  }

  userBalances[walletAddress] = currentBalance - amount

  res.json({
    walletAddress,
    balance: userBalances[walletAddress],
    deducted: amount,
  })
})

export default router
```

**Step 2: Add users routes to server**

Modify `server/src/index.ts`:
```ts
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import gamesRouter from './routes/games'
import usersRouter from './routes/users'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/games', gamesRouter)
app.use('/api/users', usersRouter)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

**Step 3: Verify user endpoints work**

Run:
```bash
curl -X POST http://localhost:3001/api/users/test-wallet/add-coins \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'

curl http://localhost:3001/api/users/test-wallet/balance
```

Expected: Balance of 100 returned

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add user balance API endpoints"
```

---

## Phase 7: Frontend-Backend Integration

### Task 24: Create API Service

**Files:**
- Create: `src/services/api.ts`

**Step 1: Create API service**

Create `src/services/api.ts`:
```ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface Game {
  id: string
  title: string
  thumbnail: string
  category: string
  description?: string
  featured?: boolean
}

export interface UserBalance {
  walletAddress: string
  balance: number
}

class ApiService {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || 'Request failed')
    }

    return response.json()
  }

  // Games
  async getGames(): Promise<{ games: Game[] }> {
    return this.fetch('/games')
  }

  async getFeaturedGame(): Promise<{ game: Game }> {
    return this.fetch('/games/featured')
  }

  async getGame(id: string): Promise<{ game: Game }> {
    return this.fetch(`/games/${id}`)
  }

  // User Balance
  async getUserBalance(walletAddress: string): Promise<UserBalance> {
    return this.fetch(`/users/${walletAddress}/balance`)
  }

  async addCoins(walletAddress: string, amount: number): Promise<UserBalance & { added: number }> {
    return this.fetch(`/users/${walletAddress}/add-coins`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    })
  }

  async deductCoins(walletAddress: string, amount: number): Promise<UserBalance & { deducted: number }> {
    return this.fetch(`/users/${walletAddress}/deduct-coins`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    })
  }
}

export const api = new ApiService()
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add API service for frontend-backend communication"
```

---

### Task 25: Create useGames Hook

**Files:**
- Create: `src/hooks/useGames.ts`

**Step 1: Create useGames hook**

Create `src/hooks/useGames.ts`:
```ts
import { useState, useEffect } from 'react'
import { api, Game } from '../services/api'

interface UseGamesResult {
  games: Game[]
  featuredGame: Game | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useGames(): UseGamesResult {
  const [games, setGames] = useState<Game[]>([])
  const [featuredGame, setFeaturedGame] = useState<Game | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGames = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [gamesResponse, featuredResponse] = await Promise.all([
        api.getGames(),
        api.getFeaturedGame(),
      ])

      setGames(gamesResponse.games.filter(g => !g.featured))
      setFeaturedGame(featuredResponse.game)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load games')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGames()
  }, [])

  return {
    games,
    featuredGame,
    isLoading,
    error,
    refetch: fetchGames,
  }
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add useGames hook for data fetching"
```

---

### Task 26: Create useUserBalance Hook

**Files:**
- Create: `src/hooks/useUserBalance.ts`

**Step 1: Create useUserBalance hook**

Create `src/hooks/useUserBalance.ts`:
```ts
import { useState, useEffect, useCallback } from 'react'
import { useTonWallet } from '@tonconnect/ui-react'
import { api } from '../services/api'

interface UseUserBalanceResult {
  balance: number
  isLoading: boolean
  error: string | null
  addCoins: (amount: number) => Promise<void>
  deductCoins: (amount: number) => Promise<void>
  refetch: () => void
}

export function useUserBalance(): UseUserBalanceResult {
  const wallet = useTonWallet()
  const [balance, setBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const walletAddress = wallet?.account.address

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance(0)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await api.getUserBalance(walletAddress)
      setBalance(response.balance)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balance')
    } finally {
      setIsLoading(false)
    }
  }, [walletAddress])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  const addCoins = async (amount: number) => {
    if (!walletAddress) throw new Error('Wallet not connected')

    const response = await api.addCoins(walletAddress, amount)
    setBalance(response.balance)
  }

  const deductCoins = async (amount: number) => {
    if (!walletAddress) throw new Error('Wallet not connected')

    const response = await api.deductCoins(walletAddress, amount)
    setBalance(response.balance)
  }

  return {
    balance,
    isLoading,
    error,
    addCoins,
    deductCoins,
    refetch: fetchBalance,
  }
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add useUserBalance hook for coin management"
```

---

### Task 27: Update HomePage to Use API

**Files:**
- Modify: `src/pages/HomePage/HomePage.tsx`

**Step 1: Update HomePage to use hooks**

Modify `src/pages/HomePage/HomePage.tsx`:
```tsx
import {
  Header,
  FeaturedCard,
  ActionCard,
  PlaceholderCard,
  Section,
  GameGrid,
  Game,
} from '../../components'
import { useGames } from '../../hooks/useGames'
import styles from './HomePage.module.css'

export function HomePage() {
  const { games, featuredGame, isLoading, error } = useGames()

  const handleGameClick = (game: Game) => {
    console.log('Play game:', game.id)
    // TODO: Navigate to game page
  }

  const handleSurpriseMe = () => {
    if (games.length > 0) {
      const randomGame = games[Math.floor(Math.random() * games.length)]
      handleGameClick(randomGame)
    }
  }

  if (error) {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.error}>
          <p>Failed to load games: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        {/* Quick Actions */}
        <section className={styles.quickActions}>
          <div className={styles.actionsScroll}>
            <ActionCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              }
              label="Surprise me!"
              onClick={handleSurpriseMe}
            />
            <PlaceholderCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              }
            />
            <PlaceholderCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              }
            />
          </div>
        </section>

        {/* Featured Game */}
        {featuredGame && (
          <Section title="Featured">
            <FeaturedCard game={featuredGame} onPlay={handleGameClick} />
          </Section>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className={styles.loading}>Loading games...</div>
        )}

        {/* Popular Games */}
        {!isLoading && games.length > 0 && (
          <Section title="All Games">
            <GameGrid games={games} onGameClick={handleGameClick} />
          </Section>
        )}
      </main>
    </div>
  )
}
```

**Step 2: Add error and loading styles**

Add to `src/pages/HomePage/HomePage.module.css`:
```css
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  min-height: 50vh;
  color: var(--color-text-secondary);
}

.error button {
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-accent-primary);
  border-radius: var(--radius-full);
  color: var(--color-text-primary);
  font-weight: 600;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--color-text-secondary);
}
```

**Step 3: Verify data loads from API**

Run both servers:
```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
npm run dev
```

Expected: HomePage displays games from API

**Step 4: Commit**

```bash
git add .
git commit -m "feat: integrate HomePage with games API"
```

---

### Task 28: Update SettingsPage to Use API

**Files:**
- Modify: `src/pages/SettingsPage/SettingsPage.tsx`

**Step 1: Update SettingsPage to use hooks**

Modify `src/pages/SettingsPage/SettingsPage.tsx`:
```tsx
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react'
import { Header, Section, CoinBalance, BuyCoinsCard, CoinPackage } from '../../components'
import { useUserBalance } from '../../hooks/useUserBalance'
import styles from './SettingsPage.module.css'

const coinPackages: CoinPackage[] = [
  { id: 'pack-1', amount: 100, price: 1 },
  { id: 'pack-2', amount: 500, price: 4, bonus: 25 },
  { id: 'pack-3', amount: 1000, price: 7, bonus: 40 },
  { id: 'pack-4', amount: 5000, price: 30, bonus: 65 },
]

export function SettingsPage() {
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()
  const { balance, isLoading, addCoins } = useUserBalance()

  const handleConnectWallet = () => {
    tonConnectUI.openModal()
  }

  const handleDisconnectWallet = () => {
    tonConnectUI.disconnect()
  }

  const handleBuyCoins = async (pkg: CoinPackage) => {
    if (!wallet) {
      tonConnectUI.openModal()
      return
    }

    // TODO: Implement actual TON transaction
    // For now, simulate purchase
    try {
      const totalCoins = pkg.bonus
        ? pkg.amount + Math.floor(pkg.amount * pkg.bonus / 100)
        : pkg.amount
      await addCoins(totalCoins)
      alert(`Successfully purchased ${totalCoins} coins!`)
    } catch (error) {
      alert('Failed to purchase coins')
    }
  }

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        {/* Wallet Section */}
        <Section title="Wallet">
          {wallet ? (
            <div className={styles.walletConnected}>
              <div className={styles.walletInfo}>
                <div className={styles.walletAddress}>
                  {wallet.account.address.slice(0, 6)}...{wallet.account.address.slice(-4)}
                </div>
                <button
                  className={styles.disconnectButton}
                  onClick={handleDisconnectWallet}
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <button className={styles.connectButton} onClick={handleConnectWallet}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/>
              </svg>
              Connect TON Wallet
            </button>
          )}
        </Section>

        {/* Balance Section */}
        <Section title="Game Coins">
          {isLoading ? (
            <div className={styles.balanceLoading}>Loading balance...</div>
          ) : (
            <CoinBalance balance={balance} symbol="coins" />
          )}
        </Section>

        {/* Buy Coins Section */}
        <Section title="Buy Coins">
          <div className={styles.packagesGrid}>
            {coinPackages.map((pkg) => (
              <BuyCoinsCard key={pkg.id} package={pkg} onBuy={handleBuyCoins} />
            ))}
          </div>
        </Section>
      </main>
    </div>
  )
}
```

**Step 2: Add loading state style**

Add to `src/pages/SettingsPage/SettingsPage.module.css`:
```css
.balanceLoading {
  padding: var(--spacing-lg);
  background-color: var(--color-bg-card);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  text-align: center;
}
```

**Step 3: Verify balance updates from API**

Run both servers and test:
1. Connect wallet
2. Buy coins
3. Balance updates

**Step 4: Commit**

```bash
git add .
git commit -m "feat: integrate SettingsPage with user balance API"
```

---

## Phase 8: Final Polish

### Task 29: Add Environment Configuration

**Files:**
- Create: `.env.example`
- Create: `server/.env.example`
- Modify: `vite.config.ts`

**Step 1: Create frontend env example**

Create `.env.example`:
```
VITE_API_URL=http://localhost:3001/api
```

**Step 2: Create backend env example**

Create `server/.env.example`:
```
PORT=3001
NODE_ENV=development
```

**Step 3: Update vite config for proxy**

Modify `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add environment configuration"
```

---

### Task 30: Add Root Package Scripts

**Files:**
- Modify: `package.json`

**Step 1: Add convenience scripts to root package.json**

Add to root `package.json` scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "dev:server": "cd server && npm run dev",
    "dev:all": "concurrently \"npm run dev\" \"npm run dev:server\"",
    "build": "tsc -b && vite build",
    "build:server": "cd server && npm run build",
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```

**Step 2: Install concurrently**

Run:
```bash
npm install -D concurrently
```

**Step 3: Verify both start together**

Run:
```bash
npm run dev:all
```

Expected: Both frontend and backend start concurrently

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add convenience scripts for development"
```

---

### Task 31: Final Verification

**Step 1: Run full application**

```bash
npm run dev:all
```

**Step 2: Test checklist**

- [ ] Home page loads with games from API
- [ ] Featured game displays correctly
- [ ] Game grid shows responsive layout
- [ ] Navigation between Home and Settings works
- [ ] TON Connect modal opens when clicking Connect
- [ ] Settings page shows wallet status
- [ ] Coin balance displays (0 for new users)
- [ ] Buy coins updates balance (simulated)
- [ ] All styles match design.json specifications

**Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete initial platform implementation"
```

---

## Summary

This plan implements a Telegram Gaming Platform with:

1. **Frontend (React + Vite + TypeScript)**
   - Design system from design.json
   - Telegram Mini App SDK integration
   - TON Connect wallet integration
   - Home page with game catalog
   - Settings page with wallet/coins management
   - Responsive design

2. **Backend (Express + TypeScript)**
   - Games API (list, featured, by ID)
   - User balance API (get, add, deduct coins)
   - Ready for database integration

3. **Key Features**
   - Dark theme with purple accents
   - Card-based game layout
   - Wallet connection via TON Connect
   - In-game currency system

**Next Steps (not in this plan):**
- Unity WebGL game embedding
- Real TON transaction handling
- Database persistence (PostgreSQL/MongoDB)
- User authentication via Telegram
- Game play tracking and achievements
