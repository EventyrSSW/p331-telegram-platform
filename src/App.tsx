import { RouterProvider } from 'react-router-dom'
import { TelegramProvider, useTelegram } from './providers/TelegramProvider'
import { TonConnectProvider } from './providers/TonConnectProvider'
import { LaunchDarklyProvider } from './providers/LaunchDarklyProvider'
import { ConfigProvider } from './contexts/ConfigContext'
import { AuthProvider } from './contexts/AuthContext'
import { ModalProvider } from './contexts/ModalContext'
import { NakamaProvider } from './contexts/NakamaContext'
import { GamesProvider } from './contexts/GamesContext'
import { NetworkToastProvider } from './contexts/NetworkToastContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SplashScreen } from './components/SplashScreen'
import { NakamaConnector } from './components/NakamaConnector'
import { NetworkToast } from './components/NetworkToast'
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
                <LaunchDarklyProvider>
                  <ModalProvider>
                    <NetworkToastProvider>
                      <NakamaProvider>
                        <NakamaConnector />
                        <NetworkToast />
                        <AppContent />
                      </NakamaProvider>
                    </NetworkToastProvider>
                  </ModalProvider>
                </LaunchDarklyProvider>
              </AuthProvider>
            </TelegramProvider>
          </GamesProvider>
        </ConfigProvider>
      </TonConnectProvider>
    </ErrorBoundary>
  )
}

export default App
