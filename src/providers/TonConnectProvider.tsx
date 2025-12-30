import { ReactNode } from 'react'
import { TonConnectUIProvider, THEME } from '@tonconnect/ui-react'

interface TonConnectProviderProps {
  children: ReactNode
}

export function TonConnectProvider({ children }: TonConnectProviderProps) {
  const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`

  return (
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      uiPreferences={{
        theme: THEME.DARK,
      }}
      actionsConfiguration={{
        modals: 'all',
        notifications: 'all',
      }}
    >
      {children}
    </TonConnectUIProvider>
  )
}
