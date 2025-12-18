import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { init, backButton, miniApp, themeParams } from '@tma.js/sdk'

interface TelegramContextValue {
  isReady: boolean
  isTelegram: boolean
  colorScheme: 'light' | 'dark'
}

const TelegramContext = createContext<TelegramContextValue | undefined>(undefined)

export function useTelegram() {
  const context = useContext(TelegramContext)
  if (!context) {
    throw new Error('useTelegram must be used within TelegramProvider')
  }
  return context
}

interface TelegramProviderProps {
  children: ReactNode
}

export function TelegramProvider({ children }: TelegramProviderProps) {
  const [isReady, setIsReady] = useState(false)
  const [isTelegram, setIsTelegram] = useState(false)
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    try {
      // Try to initialize the Telegram SDK
      init()

      // If we get here, we're in Telegram environment
      // Mount the miniApp component
      miniApp.mount()

      // Signal that the Mini App is ready
      miniApp.ready()

      // Mount the back button
      backButton.mount()

      // Mount theme params and get color scheme
      themeParams.mount()
      setColorScheme(themeParams.isDark() ? 'dark' : 'light')

      // Successfully initialized in Telegram
      setIsTelegram(true)
    } catch (error) {
      // Not in Telegram environment (e.g., regular browser)
      // This is expected and okay for development/testing
      console.log('Not running in Telegram environment, continuing in browser mode')
      setIsTelegram(false)
    } finally {
      // Always set ready to true, regardless of environment
      setIsReady(true)
    }
  }, [])

  const value: TelegramContextValue = {
    isReady,
    isTelegram,
    colorScheme,
  }

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  )
}
