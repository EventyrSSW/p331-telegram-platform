import { useEffect, useState } from 'react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Address } from '@ton/core';
import { Header, BottomNavBar } from '../../components';
import { api, User } from '../../services/api';
import { useConfig } from '../../contexts/ConfigContext';
import styles from './ProfilePage.module.css';

// Before component - add helper function
const toUserFriendlyAddress = (rawAddress: string, isTestnet: boolean): string => {
  try {
    return Address.parse(rawAddress).toString({
      bounceable: false,
      testOnly: isTestnet,
    });
  } catch {
    return rawAddress;
  }
};

export const ProfilePage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inside component - add these hooks after existing useState
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const { config } = useConfig();

  const isTestnet = config?.ton.network === 'testnet';

  // Compute user-friendly address
  const userFriendlyAddress = wallet?.account.address
    ? toUserFriendlyAddress(wallet.account.address, isTestnet)
    : null;

  const handleConnectWallet = () => {
    tonConnectUI.openModal();
  };

  const handleDisconnectWallet = () => {
    tonConnectUI.disconnect();
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.getProfile();
        setUser(response.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const formatWalletAddress = (address: string): string => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getDisplayName = (): string => {
    if (!user) return '';
    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : user.username || 'Anonymous';
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.loading}>Loading profile...</div>
        </main>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.error}>{error || 'Profile not found'}</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="Profile" className={styles.avatarImage} />
            ) : (
              <span className={styles.avatarPlaceholder}>
                {(user.firstName?.[0] || user.username?.[0] || '?').toUpperCase()}
              </span>
            )}
          </div>
          <h1 className={styles.displayName}>{getDisplayName()}</h1>
          {user.username && (
            <span className={styles.username}>@{user.username}</span>
          )}
          {user.isPremium && (
            <span className={styles.premiumBadge}>Premium</span>
          )}
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Account Info</h2>
          <div className={styles.infoCard}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Balance</span>
              <span className={styles.infoValue}>{user.coinBalance.toLocaleString()} coins</span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Wallet</h2>
          <div className={styles.infoCard}>
            {wallet ? (
              <>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Connected</span>
                  <span className={styles.walletAddress}>
                    {formatWalletAddress(userFriendlyAddress || wallet.account.address)}
                  </span>
                </div>
                <button
                  className={styles.disconnectButton}
                  onClick={handleDisconnectWallet}
                >
                  Disconnect Wallet
                </button>
              </>
            ) : user.walletAddress ? (
              <>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Saved Wallet</span>
                  <span className={styles.walletAddress}>
                    {formatWalletAddress(user.walletAddress)}
                  </span>
                </div>
                <button
                  className={styles.connectButton}
                  onClick={handleConnectWallet}
                >
                  Reconnect Wallet
                </button>
              </>
            ) : (
              <button
                className={styles.connectButton}
                onClick={handleConnectWallet}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 18V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V6M16 12H22M22 12L19 9M22 12L19 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </main>
      <BottomNavBar />
    </div>
  );
};
