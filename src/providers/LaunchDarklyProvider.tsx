import { createContext, useContext, useEffect, useRef, ReactNode, useState } from 'react';
import { LDProvider, useLDClient } from 'launchdarkly-react-client-sdk';
import Observability, { LDObserve } from '@launchdarkly/observability';
import SessionReplay, { LDRecord } from '@launchdarkly/session-replay';
import { useAuth } from '../contexts/AuthContext';

// LaunchDarkly Client-Side ID - get this from your LD dashboard
const LD_CLIENT_SIDE_ID = import.meta.env.VITE_LAUNCHDARKLY_CLIENT_ID || '';

// Check if LD is configured
const isLDEnabled = !!LD_CLIENT_SIDE_ID;

// Get Telegram platform safely
function getTelegramPlatform(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window.Telegram?.WebApp as any)?.platform || 'web';
  } catch {
    return 'web';
  }
}

interface LaunchDarklyContextValue {
  isEnabled: boolean;
  isObservabilityStarted: boolean;
}

const LaunchDarklyContext = createContext<LaunchDarklyContextValue>({
  isEnabled: false,
  isObservabilityStarted: false,
});

export function useLaunchDarkly() {
  return useContext(LaunchDarklyContext);
}

// Component that syncs auth state with LaunchDarkly (must be inside LDProvider)
function LaunchDarklySync({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const ldClient = useLDClient();
  const [isObservabilityStarted, setIsObservabilityStarted] = useState(false);
  const prevUserId = useRef<string | null>(null);

  // Update LD context when user changes
  useEffect(() => {
    if (!ldClient || !isAuthenticated || !user) return;

    const userId = user.telegramId?.toString() || user.id;

    // Skip if user hasn't changed
    if (prevUserId.current === userId) return;
    prevUserId.current = userId;

    console.log('[LaunchDarkly] Identifying user:', {
      telegramId: user.telegramId,
      username: user.username,
    });

    // Update LD context with user info
    ldClient.identify({
      kind: 'user',
      key: userId,
      name: user.username || user.firstName || `User ${user.telegramId}`,
      email: undefined, // TG users don't have email
      custom: {
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        platform: getTelegramPlatform(),
        appVersion: import.meta.env.VITE_APP_VERSION || '0.0.0',
      },
    });

    // Start observability after user is identified
    if (!isObservabilityStarted) {
      console.log('[LaunchDarkly] Starting observability and session replay...');
      try {
        LDObserve.start();
        LDRecord.start({ forceNew: true, silent: false });
        setIsObservabilityStarted(true);
        console.log('[LaunchDarkly] Observability started successfully');
      } catch (error) {
        console.error('[LaunchDarkly] Failed to start observability:', error);
      }
    }
  }, [ldClient, user, isAuthenticated, isObservabilityStarted]);

  const contextValue: LaunchDarklyContextValue = {
    isEnabled: isLDEnabled,
    isObservabilityStarted,
  };

  return (
    <LaunchDarklyContext.Provider value={contextValue}>
      {children}
    </LaunchDarklyContext.Provider>
  );
}

// Plugin instances (created once)
const observabilityPlugin = new Observability({
  manualStart: true,
  tracingOrigins: true,
  networkRecording: {
    enabled: true,
    recordHeadersAndBody: true,
  },
});

const sessionReplayPlugin = new SessionReplay({
  manualStart: true,
  privacySetting: 'strict', // Obfuscate sensitive data in replays
});

export function LaunchDarklyProvider({ children }: { children: ReactNode }) {
  if (!isLDEnabled) {
    // Not configured - just render children without LD
    return <>{children}</>;
  }

  return (
    <LDProvider
      clientSideID={LD_CLIENT_SIDE_ID}
      context={{
        kind: 'user',
        key: 'anonymous',
        anonymous: true,
      }}
      options={{
        plugins: [observabilityPlugin, sessionReplayPlugin],
      }}
    >
      <LaunchDarklySync>{children}</LaunchDarklySync>
    </LDProvider>
  );
}
