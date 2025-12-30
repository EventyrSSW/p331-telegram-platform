import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { api, AppConfig } from '../services/api';

interface ConfigContextType {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const defaultConfig: AppConfig = {
  ton: {
    network: 'testnet',
    receiverAddress: '',
  },
  coinPackages: [],
};

const ConfigContext = createContext<ConfigContextType>({
  config: null,
  loading: true,
  error: null,
  refetch: async () => {},
});

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchInitiatedRef = useRef(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getConfig();
      setConfig(data);
    } catch (err) {
      console.error('Failed to load config:', err);
      setError('Failed to load configuration');
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Prevent double fetch in React StrictMode
    if (fetchInitiatedRef.current) return;
    fetchInitiatedRef.current = true;

    fetchConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, error, refetch: fetchConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
