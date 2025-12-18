import { TelegramProvider, useTelegram } from './providers/TelegramProvider'

function AppContent() {
  const { isReady, isTelegram, colorScheme } = useTelegram()

  if (!isReady) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>Telegram Gaming Platform</h1>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h2>Status</h2>
        <p>Environment: {isTelegram ? 'Telegram Mini App' : 'Browser (Development)'}</p>
        <p>Color Scheme: {colorScheme}</p>
        <p>Ready: {isReady ? 'Yes' : 'No'}</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <TelegramProvider>
      <AppContent />
    </TelegramProvider>
  )
}

export default App
