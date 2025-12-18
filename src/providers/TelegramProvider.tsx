import { useEffect, useState, createContext, useContext, ReactNode } from 'react'

interface WebApp {
  ready: () => void
  expand: () => void
  close: () => void
  colorScheme: 'dark' | 'light'
  themeParams: Record<string, string>
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
}

interface TelegramContextValue {
  isReady: boolean
  isTelegram: boolean
  colorScheme: 'dark' | 'light'
  webApp: WebApp | null
}

const TelegramContext = createContext<TelegramContextValue>({
  isReady: false,
  isTelegram: false,
  colorScheme: 'dark',
  webApp: null,
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

  useEffect(() => {
    const initTelegram = () => {
      const tg = window.Telegram?.WebApp

      if (tg) {
        tg.ready()
        tg.expand()

        setWebApp(tg)
        setIsTelegram(true)
        setColorScheme(tg.colorScheme || 'dark')

        tg.onEvent('themeChanged', () => {
          setColorScheme(tg.colorScheme || 'dark')
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

  return (
    <TelegramContext.Provider value={{ isReady, isTelegram, colorScheme, webApp }}>
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
        colorScheme: 'dark' | 'light'
        themeParams: Record<string, string>
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
      }
    }
  }
}
