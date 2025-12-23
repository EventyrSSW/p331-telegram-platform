import { useEffect, useState } from 'react';
import { Header, BottomNavBar } from '../../components';
import { api, User } from '../../services/api';
import styles from './ProfilePage.module.css';

export const ProfilePage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            {user.walletAddress ? (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Connected</span>
                <span className={styles.walletAddress}>
                  {formatWalletAddress(user.walletAddress)}
                </span>
              </div>
            ) : (
              <div className={styles.noWallet}>
                <span>No wallet connected</span>
                <p className={styles.noWalletHint}>
                  Connect your wallet in the Store to purchase coins
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <BottomNavBar />
    </div>
  );
};
