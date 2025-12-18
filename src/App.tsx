import { RouterProvider } from 'react-router-dom'
import { TelegramProvider, useTelegram } from './providers/TelegramProvider'
import { TonConnectProvider } from './providers/TonConnectProvider'
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
    <TonConnectProvider>
      <TelegramProvider>
        <AppContent />
      </TelegramProvider>
    </TonConnectProvider>
  )
}

export default App
