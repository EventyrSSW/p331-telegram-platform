import { useEffect, useState, createContext, useContext, ReactNode } from 'react'

interface SafeAreaInset {
  top: number
  bottom: number
  left: number
  right: number
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
  safeAreaInset?: SafeAreaInset
  contentSafeAreaInset?: SafeAreaInset
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
}

interface TelegramContextValue {
  isReady: boolean
  isTelegram: boolean
  colorScheme: 'dark' | 'light'
  webApp: WebApp | null
  safeAreaInset: SafeAreaInset
  contentSafeAreaInset: SafeAreaInset
}

const defaultInset: SafeAreaInset = { top: 0, bottom: 0, left: 0, right: 0 }

const TelegramContext = createContext<TelegramContextValue>({
  isReady: false,
  isTelegram: false,
  colorScheme: 'dark',
  webApp: null,
  safeAreaInset: defaultInset,
  contentSafeAreaInset: defaultInset,
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
  const [webApp, setWebApp] = useState<WebApp | null>(null)
  const [safeAreaInset, setSafeAreaInset] = useState<SafeAreaInset>(defaultInset)
  const [contentSafeAreaInset, setContentSafeAreaInset] = useState<SafeAreaInset>(defaultInset)

  useEffect(() => {
    const initTelegram = () => {
      const tg = window.Telegram?.WebApp

      if (tg) {
        tg.ready()
        tg.expand()

        // Lock to portrait orientation (optional - may not be supported)
        try {
          tg.lockOrientation?.()
        } catch {
          // Method not supported in this Telegram version
        }

        // Disable swipe-to-close gesture (optional - may not be supported)
        try {
          tg.disableVerticalSwipes?.()
        } catch {
          // Method not supported in this Telegram version
        }

        // Request fullscreen mode (optional - may not be supported)
        try {
          tg.requestFullscreen?.()
        } catch {
          // Method not supported in this Telegram version
        }

        setWebApp(tg)
        setIsTelegram(true)
        setColorScheme(tg.colorScheme || 'dark')

        if (tg.safeAreaInset) {
          setSafeAreaInset(tg.safeAreaInset)
        }
        if (tg.contentSafeAreaInset) {
          setContentSafeAreaInset(tg.contentSafeAreaInset)
        }

        tg.onEvent('themeChanged', () => {
          setColorScheme(tg.colorScheme || 'dark')
        })

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

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--tg-safe-area-top', `${safeAreaInset.top}px`)
    root.style.setProperty('--tg-safe-area-bottom', `${safeAreaInset.bottom}px`)
    root.style.setProperty('--tg-safe-area-left', `${safeAreaInset.left}px`)
    root.style.setProperty('--tg-safe-area-right', `${safeAreaInset.right}px`)
    root.style.setProperty('--tg-content-safe-area-top', `${contentSafeAreaInset.top}px`)
    root.style.setProperty('--tg-content-safe-area-bottom', `${contentSafeAreaInset.bottom}px`)
    // Combined top safe area: system (notch) + Telegram UI (close/share icons in fullscreen)
    const combinedTop = safeAreaInset.top + contentSafeAreaInset.top
    root.style.setProperty('--tg-header-safe-area', `${combinedTop}px`)
  }, [safeAreaInset, contentSafeAreaInset])

  return (
    <TelegramContext.Provider value={{ isReady, isTelegram, colorScheme, webApp, safeAreaInset, contentSafeAreaInset }}>
      {children}
    </TelegramContext.Provider>
  )
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void
        expand: () => void
        close: () => void
        lockOrientation?: () => void
        unlockOrientation?: () => void
        disableVerticalSwipes?: () => void
        enableVerticalSwipes?: () => void
        requestFullscreen?: () => void
        exitFullscreen?: () => void
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
        safeAreaInset?: SafeAreaInset
        contentSafeAreaInset?: SafeAreaInset
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
      }
    }
  }
}
