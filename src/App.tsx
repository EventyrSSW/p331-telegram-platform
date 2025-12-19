import { RouterProvider } from 'react-router-dom'
import { TelegramProvider, useTelegram } from './providers/TelegramProvider'
import { TonConnectProvider } from './providers/TonConnectProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { router } from './router'

function AppContent() {
  const { isReady } = useTelegram()

  if (!isReady) {
    return <div>Loading...</div>
  }

  return <RouterProvider router={router} />
}

function App() {
  return (
    <ErrorBoundary>
      <TonConnectProvider>
        <TelegramProvider>
          <AppContent />
        </TelegramProvider>
      </TonConnectProvider>
    </ErrorBoundary>
  )
}

export default App
