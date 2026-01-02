import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  persistent: boolean; // If true, won't auto-dismiss
}

interface NetworkToastContextValue {
  toast: ToastState;
  showToast: (message: string, type: ToastType, persistent?: boolean) => void;
  hideToast: () => void;
}

const NetworkToastContext = createContext<NetworkToastContextValue | null>(null);

export function useNetworkToast() {
  const context = useContext(NetworkToastContext);
  if (!context) {
    throw new Error('useNetworkToast must be used within a NetworkToastProvider');
  }
  return context;
}

interface NetworkToastProviderProps {
  children: ReactNode;
}

export function NetworkToastProvider({ children }: NetworkToastProviderProps) {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
    persistent: false,
  });

  const showToast = useCallback((message: string, type: ToastType, persistent = false) => {
    setToast({ visible: true, message, type, persistent });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <NetworkToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
    </NetworkToastContext.Provider>
  );
}
