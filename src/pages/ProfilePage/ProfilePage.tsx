import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { useAuth } from '../../contexts/AuthContext';
import { api, UserStats } from '../../services/api';
import { CashOutModal } from '../../components/CashOutModal/CashOutModal';
import { haptic } from '../../providers/TelegramProvider';
import styles from './ProfilePage.module.css';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  // TON Connect UI hook - reserved for future wallet integration features
  const [_tonConnectUI] = useTonConnectUI();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const userStats = await api.getUserStats();
      setStats(userStats);
    } catch (err) {
      console.error('Failed to load stats:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleCashOutClick = () => {
    haptic.medium();
    setShowCashOutModal(true);
  };

  const handleCashOutSuccess = async () => {
    await refreshUser();
    await loadStats();
  };

  const handleSettingsClick = () => {
    haptic.light();
    navigate('/settings');
  };

  if (!user) return null;

  // Use current date as fallback since createdAt is not in User interface yet
  const joinDate = new Date(Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className={styles.container}>
      {/* Header with Settings */}
      <div className={styles.header}>
        <button className={styles.settingsButton} onClick={handleSettingsClick}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6m-6-6h6m6 0h-6" />
          </svg>
          Settings
        </button>
      </div>

      {/* User Profile */}
      <div className={styles.profileSection}>
        <div className={styles.avatar}>
          {user.photoUrl ? (
            <img src={user.photoUrl} alt={user.username || 'User'} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {(user.username?.[0] || user.firstName?.[0] || '?').toUpperCase()}
            </div>
          )}
        </div>
        <h1 className={styles.username}>{user.username || user.firstName || 'Anonymous'}</h1>
        <p className={styles.joinDate}>Joined {joinDate}</p>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="8" width="18" height="12" rx="2" />
              <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
          <div className={styles.statValue}>
            {loading ? '...' : stats?.gamesPlayed || 0}
          </div>
          <div className={styles.statLabel}>Games Played</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <div className={styles.statValue}>
            {loading ? '...' : stats?.totalWins || 0}
          </div>
          <div className={styles.statLabel}>Total Wins</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className={styles.statValue}>
            ${loading ? '...' : stats?.amountWon || 0}
          </div>
          <div className={styles.statLabel}>Amount Won</div>
        </div>
      </div>

      {/* Cash Out Button */}
      <button className={styles.cashOutButton} onClick={handleCashOutClick}>
        <span className={styles.cashOutText}>Cash out</span>
        <svg className={styles.cashOutArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14m-7-7l7 7-7 7" />
        </svg>
      </button>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      <CashOutModal
        isOpen={showCashOutModal}
        onClose={() => setShowCashOutModal(false)}
        currentBalance={user.coinBalance}
        onSuccess={handleCashOutSuccess}
      />
    </div>
  );
}
