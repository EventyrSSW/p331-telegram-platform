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
