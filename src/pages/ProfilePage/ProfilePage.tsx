import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { useAuth } from '../../contexts/AuthContext';
import { api, UserStats } from '../../services/api';
import { CashOutModal } from '../../components/CashOutModal/CashOutModal';
import { haptic } from '../../providers/TelegramProvider';
import styles from './ProfilePage.module.css';
import StarIcon from '../../assets/icons/star.svg?react';
import GemIcon from '../../assets/icons/gem.svg?react';
import CashIcon from '../../assets/icons/cash.svg?react';
import GamepadIcon from '../../assets/icons/gamepad.svg?react';
import MedalIcon from '../../assets/icons/medal.svg?react';
import DollarIcon from '../../assets/icons/dollar.svg?react';
import SettingsIcon from '../../assets/icons/settings.svg?react';
import ArrowRightIcon from '../../assets/icons/arrow-right.svg?react';
import { MOCK_USER, MOCK_STATS, MOCK_RANK, MOCK_GEMS, shouldUseMockData } from '../../utils/mockData';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  // TON Connect UI hook - reserved for future wallet integration features
  const [_tonConnectUI] = useTonConnectUI();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const navigate = useNavigate();

  // Use mock data for local development without Telegram context
  const useMockData = shouldUseMockData();
  const displayUser = useMockData ? MOCK_USER : user;
  const displayStats = useMockData ? MOCK_STATS : stats;

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

  // Development mode fallback when not in Telegram
  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.profileSection}>
          <div className={styles.avatar}>
            <div className={styles.avatarPlaceholder}>DEV</div>
          </div>
          <h1 className={styles.username}>Development Mode</h1>
          <p className={styles.joinDate}>Not authenticated (Telegram context required)</p>
        </div>
        <div className={styles.error}>
          Please open this app in Telegram to see your profile
        </div>
      </div>
    );
  }

  // Use current date as fallback since createdAt is not in User interface yet
  const joinDate = new Date(Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className={styles.container}>
      {/* Top Header with Resource Badges */}
      <div className={styles.topHeader}>
        {/* Rank Badge with Avatar */}
        <div className={styles.resourceBadge}>
          <div className={styles.badgeAvatar}>
            {displayUser?.photoUrl ? (
              <img src={displayUser.photoUrl} alt="avatar" />
            ) : (
              <div className={styles.badgePlaceholder}>
                {(displayUser?.username?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </div>
          <StarIcon className={styles.badgeIcon} />
          <span className={styles.badgeValue}>{MOCK_RANK}</span>
        </div>

        {/* Gems Badge */}
        <div className={styles.resourceBadge}>
          <GemIcon className={styles.badgeIcon} />
          <span className={styles.badgeValue}>{MOCK_GEMS}</span>
        </div>

        {/* Cash Badge */}
        <div className={styles.resourceBadge}>
          <CashIcon className={styles.badgeIcon} />
          <span className={styles.badgeValue}>${displayUser?.coinBalance || 0}</span>
        </div>
      </div>

      {/* Settings Button Row */}
      <div className={styles.settingsRow}>
        <button className={styles.settingsButton} onClick={handleSettingsClick}>
          <SettingsIcon className={styles.settingsIcon} />
          <span>SETTINGS</span>
        </button>
      </div>

      {/* User Profile */}
      <div className={styles.profileSection}>
        <div className={styles.avatar}>
          {displayUser?.photoUrl ? (
            <img src={displayUser.photoUrl} alt={displayUser.username || 'User'} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {(displayUser?.username?.[0] || displayUser?.firstName?.[0] || '?').toUpperCase()}
            </div>
          )}
        </div>
        <h1 className={styles.username}>
          {displayUser?.username || displayUser?.firstName || 'Anonymous'}
        </h1>
        <p className={styles.joinDate}>Joined Dec 2025</p>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.iconContainer}>
            <GamepadIcon className={styles.statIcon} style={{ color: '#86CE11' }} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>
              {loading ? '...' : displayStats?.gamesPlayed || 0}
            </div>
            <div className={styles.statLabel}>Games played</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconContainer}>
            <MedalIcon className={styles.statIcon} style={{ color: '#FF4D00' }} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>
              {loading ? '...' : displayStats?.totalWins || 0}
            </div>
            <div className={styles.statLabel}>Total wins</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconContainer}>
            <DollarIcon className={styles.statIcon} style={{ color: '#0098EA' }} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>
              ${loading ? '...' : displayStats?.amountWon || 0}
            </div>
            <div className={styles.statLabel}>Amount won</div>
          </div>
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
