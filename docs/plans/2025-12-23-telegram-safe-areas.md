# Telegram Safe Areas Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Use Telegram WebApp's `safeAreaInset` and `contentSafeAreaInset` APIs to properly position UI elements so they don't overlap with system icons (notch, status bar) or Telegram's own UI (header).

**Architecture:** Create a SafeAreaProvider that reads Telegram's safe area insets and exposes them as CSS custom properties. Update the TelegramProvider to include safe area data. Apply these CSS variables to the Header (top inset) and BottomNavBar (bottom inset) components. Use `safeAreaInset` for system UI (notch/status bar) and `contentSafeAreaInset` for Telegram's header.

**Tech Stack:** React Context, CSS Custom Properties, Telegram WebApp API, TypeScript

---

### Task 1: Update TelegramProvider Types and Safe Area Data

**Files:**
- Modify: `src/providers/TelegramProvider.tsx`

**Step 1: Update the WebApp interface and add safe area types**

In `src/providers/TelegramProvider.tsx`, update the interfaces:

```tsx
interface SafeAreaInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface WebApp {
  ready: () => void
  expand: () => void
  close: () => void
  colorScheme: 'dark' | 'light'
  themeParams: Record<string, string>
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
    }
  }
  onEvent: (event: string, callback: () => void) => void
  offEvent: (event: string, callback: () => void) => void
  MainButton: {
    text: string
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
  }
  BackButton: {
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
  }
  safeAreaInset?: SafeAreaInset
  contentSafeAreaInset?: SafeAreaInset
}

interface TelegramContextValue {
  isReady: boolean
  isTelegram: boolean
  colorScheme: 'dark' | 'light'
  webApp: WebApp | null
  safeAreaInset: SafeAreaInset
  contentSafeAreaInset: SafeAreaInset
}
```

**Step 2: Update the context default and state**

```tsx
const defaultInset: SafeAreaInset = { top: 0, bottom: 0, left: 0, right: 0 };

const TelegramContext = createContext<TelegramContextValue>({
  isReady: false,
  isTelegram: false,
  colorScheme: 'dark',
  webApp: null,
  safeAreaInset: defaultInset,
  contentSafeAreaInset: defaultInset,
})
```

**Step 3: Add state and update useEffect to read safe areas**

```tsx
export function TelegramProvider({ children }: TelegramProviderProps) {
  const [isReady, setIsReady] = useState(false)
  const [isTelegram, setIsTelegram] = useState(false)
  const [colorScheme, setColorScheme] = useState<'dark' | 'light'>('dark')
  const [webApp, setWebApp] = useState<WebApp | null>(null)
  const [safeAreaInset, setSafeAreaInset] = useState<SafeAreaInset>(defaultInset)
  const [contentSafeAreaInset, setContentSafeAreaInset] = useState<SafeAreaInset>(defaultInset)

  useEffect(() => {
    const initTelegram = () => {
      const tg = window.Telegram?.WebApp

      if (tg) {
        tg.ready()
        tg.expand()

        setWebApp(tg)
        setIsTelegram(true)
        setColorScheme(tg.colorScheme || 'dark')

        // Read safe area insets
        if (tg.safeAreaInset) {
          setSafeAreaInset(tg.safeAreaInset)
        }
        if (tg.contentSafeAreaInset) {
          setContentSafeAreaInset(tg.contentSafeAreaInset)
        }

        tg.onEvent('themeChanged', () => {
          setColorScheme(tg.colorScheme || 'dark')
        })

        // Listen for viewport changes which may update safe areas
        tg.onEvent('viewportChanged', () => {
          if (tg.safeAreaInset) {
            setSafeAreaInset(tg.safeAreaInset)
          }
          if (tg.contentSafeAreaInset) {
            setContentSafeAreaInset(tg.contentSafeAreaInset)
          }
        })
      } else {
        setIsTelegram(false)
      }

      setIsReady(true)
    }

    if (document.readyState === 'complete') {
      initTelegram()
    } else {
      window.addEventListener('load', initTelegram)
      return () => window.removeEventListener('load', initTelegram)
    }
  }, [])

  // Apply safe area CSS variables to document
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--tg-safe-area-top', `${safeAreaInset.top}px`)
    root.style.setProperty('--tg-safe-area-bottom', `${safeAreaInset.bottom}px`)
    root.style.setProperty('--tg-safe-area-left', `${safeAreaInset.left}px`)
    root.style.setProperty('--tg-safe-area-right', `${safeAreaInset.right}px`)
    root.style.setProperty('--tg-content-safe-area-top', `${contentSafeAreaInset.top}px`)
    root.style.setProperty('--tg-content-safe-area-bottom', `${contentSafeAreaInset.bottom}px`)
  }, [safeAreaInset, contentSafeAreaInset])

  return (
    <TelegramContext.Provider value={{
      isReady,
      isTelegram,
      colorScheme,
      webApp,
      safeAreaInset,
      contentSafeAreaInset,
    }}>
      {children}
    </TelegramContext.Provider>
  )
}
```

**Step 4: Update the global Window type declaration**

Add to the existing `declare global` block:

```tsx
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void
        expand: () => void
        close: () => void
        colorScheme: 'dark' | 'light'
        themeParams: Record<string, string>
        initData: string
        initDataUnsafe: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
          }
        }
        onEvent: (event: string, callback: () => void) => void
        offEvent: (event: string, callback: () => void) => void
        MainButton: {
          text: string
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
        }
        BackButton: {
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
        }
        safeAreaInset?: {
          top: number
          bottom: number
          left: number
          right: number
        }
        contentSafeAreaInset?: {
          top: number
          bottom: number
          left: number
          right: number
        }
      }
    }
  }
}
```

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/providers/TelegramProvider.tsx
git commit -m "feat: add Telegram safe area insets to TelegramProvider"
```

---

### Task 2: Update Header CSS to Use Safe Area Top Inset

**Files:**
- Modify: `src/components/Header/Header.module.css`

**Step 1: Update header to include top safe area padding**

In `src/components/Header/Header.module.css`, update the `.header` class:

```css
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: calc(56px + var(--tg-content-safe-area-top, 0px));
  padding: var(--tg-content-safe-area-top, 0px) 16px 0 16px;
  background: var(--color-bg-secondary);
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
git commit -m "style(header): add Telegram content safe area top padding"
```

---

### Task 3: Update BottomNavBar CSS to Use Safe Area Bottom Inset

**Files:**
- Modify: `src/components/BottomNavBar/BottomNavBar.module.css`

**Step 1: Update container to use Telegram safe area**

In `src/components/BottomNavBar/BottomNavBar.module.css`, update the `.container` class:

```css
.container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border-subtle);
  padding: 8px 0;
  padding-bottom: calc(8px + var(--tg-safe-area-bottom, env(safe-area-inset-bottom, 0px)));
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
}
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/BottomNavBar/BottomNavBar.module.css
git commit -m "style(nav): use Telegram safe area bottom inset"
```

---

### Task 4: Add CSS Variable Fallbacks in Variables File

**Files:**
- Modify: `src/styles/variables.css`

**Step 1: Add safe area CSS variable defaults**

Add at the end of `src/styles/variables.css`:

```css
  /* Telegram Safe Areas - set dynamically by TelegramProvider */
  --tg-safe-area-top: 0px;
  --tg-safe-area-bottom: 0px;
  --tg-safe-area-left: 0px;
  --tg-safe-area-right: 0px;
  --tg-content-safe-area-top: 0px;
  --tg-content-safe-area-bottom: 0px;
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/styles/variables.css
git commit -m "style: add Telegram safe area CSS variable defaults"
```

---

### Task 5: Final Verification

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Verification checklist**

- [ ] CSS variables `--tg-safe-area-*` and `--tg-content-safe-area-*` are defined
- [ ] TelegramProvider reads `safeAreaInset` and `contentSafeAreaInset` from Telegram WebApp
- [ ] Header uses `--tg-content-safe-area-top` for top padding
- [ ] BottomNavBar uses `--tg-safe-area-bottom` for bottom padding
- [ ] Fallback values work when not in Telegram context

**Step 3: Commit any final changes**

```bash
git add -A
git commit -m "feat: complete Telegram safe areas implementation"
```

---

## Summary

This implementation:

1. **TelegramProvider** reads safe area insets from Telegram WebApp API:
   - `safeAreaInset` - System UI (notch, status bar, home indicator)
   - `contentSafeAreaInset` - Telegram's own UI (header)

2. **CSS Variables** are set dynamically:
   - `--tg-safe-area-top/bottom/left/right` - System safe areas
   - `--tg-content-safe-area-top/bottom` - Telegram header safe area

3. **Header** uses `--tg-content-safe-area-top` to avoid Telegram's header

4. **BottomNavBar** uses `--tg-safe-area-bottom` to avoid home indicator/system gestures

**Visual effect:**
- On iPhone with notch: Header will have extra top padding, bottom nav will have extra bottom padding
- On regular devices: No extra padding (0px fallback)
- When Telegram header is visible: Content safe area top will push header down
