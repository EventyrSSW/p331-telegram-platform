import { RouterProvider } from 'react-router-dom'
import { TelegramProvider, useTelegram } from './providers/TelegramProvider'
import { TonConnectProvider } from './providers/TonConnectProvider'
import { ConfigProvider } from './contexts/ConfigContext'
import { AuthProvider } from './contexts/AuthContext'
import { ModalProvider } from './contexts/ModalContext'
import { NakamaProvider } from './contexts/NakamaContext'
import { GamesProvider } from './contexts/GamesContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SplashScreen } from './components/SplashScreen'
import { NakamaConnector } from './components/NakamaConnector'
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
          <GamesProvider>
            <TelegramProvider>
              <AuthProvider>
                <ModalProvider>
                  <NakamaProvider>
                    <NakamaConnector />
                    <AppContent />
                  </NakamaProvider>
                </ModalProvider>
              </AuthProvider>
            </TelegramProvider>
          </GamesProvider>
        </ConfigProvider>
      </TonConnectProvider>
    </ErrorBoundary>
  )
}

export default App
