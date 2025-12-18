import { TelegramProvider, useTelegram } from './providers/TelegramProvider'
import { TonConnectProvider } from './providers/TonConnectProvider'
import { HomePage } from './pages/HomePage'

function AppContent() {
  const { isReady } = useTelegram()

  if (!isReady) {
    return <div>Loading...</div>
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
