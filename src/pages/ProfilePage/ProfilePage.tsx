import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useAuth } from '../../contexts/AuthContext';
import { api, UserStats } from '../../services/api';
import { Header, BottomNavBar } from '../../components';
import { haptic } from '../../providers/TelegramProvider';
import styles from './ProfilePage.module.css';
import GamepadIcon from '../../assets/icons/Group (6).svg?react';
import MedalIcon from '../../assets/icons/Icon (statistic).svg?react';
import TonCoinIcon from '../../assets/icons/toncoin-ton-logo 1.svg?react';
import SettingsIcon from '../../assets/icons/Icon (general).svg?react';
import ArrowRightIcon from '../../assets/icons/arrow-right.svg?react';
import { MOCK_USER, MOCK_STATS, shouldUseMockData } from '../../utils/mockData';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Use mock data for local development without Telegram context
  const useMockData = shouldUseMockData();
  const displayUser = useMockData ? MOCK_USER : user;
  const displayStats = useMockData ? MOCK_STATS : stats;
  const isWalletConnected = !!wallet;

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
    navigate('/cashout');
  };

  const handleSettingsClick = () => {
    haptic.light();
    navigate('/settings');
  };

  const handleConnectWallet = () => {
    haptic.medium();
    tonConnectUI.openModal();
  };

  const handleDisconnectWallet = async () => {
    haptic.medium();
    if (wallet) {
      await tonConnectUI.disconnect();
    }
  };

  // Development mode fallback when not in Telegram - use mock data
  if (!user && !useMockData) {
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

  return (
    <div className={styles.container}>
      <Header />

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
            <GamepadIcon className={styles.statIcon} />
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
            <MedalIcon className={styles.statIcon} />
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
            <TonCoinIcon className={styles.statIcon} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>
              ${loading ? '...' : displayStats?.amountWon || 0}
            </div>
            <div className={styles.statLabel}>Amount won</div>
          </div>
        </div>
      </div>

      {/* Connect/Disconnect Wallet Button */}
      <button
        className={styles.connectWalletButton}
        onClick={isWalletConnected ? handleDisconnectWallet : handleConnectWallet}
      >
        <span className={styles.connectWalletText}>
          {isWalletConnected ? 'DISCONNECT WALLET' : 'CONNECT WALLET'}
        </span>
        <ArrowRightIcon className={styles.connectWalletArrow} />
      </button>

      {/* Wallet Address Display - shown BELOW button when connected */}
      {isWalletConnected && wallet?.account?.address && (
        <div className={styles.walletAddressCard}>
          <div className={styles.walletAddressLabel}>Connected Wallet</div>
          <div className={styles.walletAddress}>
            {wallet.account.address.slice(0, 8)}...{wallet.account.address.slice(-6)}
          </div>
        </div>
      )}

      {/* Cash Out Button */}
      <button className={styles.cashOutButton} onClick={handleCashOutClick}>
        <span className={styles.cashOutText}>CASH OUT YOUR WINNINGS</span>
        <ArrowRightIcon className={styles.cashOutArrow} />
      </button>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      <BottomNavBar />
    </div>
  );
}
