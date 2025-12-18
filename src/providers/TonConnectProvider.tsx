import { ReactNode } from 'react'
import { TonConnectUIProvider } from '@tonconnect/ui-react'

interface TonConnectProviderProps {
  children: ReactNode
}

export function TonConnectProvider({ children }: TonConnectProviderProps) {
  const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`

  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      {children}
    </TonConnectUIProvider>
  )
}
