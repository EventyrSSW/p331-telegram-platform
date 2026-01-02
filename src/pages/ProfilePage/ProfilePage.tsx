import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useAuth } from '../../contexts/AuthContext';
import { nakamaService, UserProfile } from '../../services/nakama';
import { Header, BottomNavBar } from '../../components';
import { haptic } from '../../providers/TelegramProvider';
import styles from './ProfilePage.module.css';
import GamepadIcon from '../../assets/icons/Group (6).svg?react';
import MedalIcon from '../../assets/icons/Icon (statistic).svg?react';
import TonCoinIcon from '../../assets/icons/toncoin-ton-logo 1.svg?react';
import SettingsIcon from '../../assets/icons/Icon (general).svg?react';
import ArrowRightIcon from '../../assets/icons/arrow-right.svg?react';
import UserIcon from '../../assets/icons/user.svg?react';
import { MOCK_USER, shouldUseMockData } from '../../utils/mockData';

export function ProfilePage() {
  const { user } = useAuth();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const fetchInitiatedRef = useRef(false);

  // Use mock data for local development without Telegram context
  const useMockData = shouldUseMockData();
  const displayUser = useMockData ? MOCK_USER : user;
  const isWalletConnected = !!wallet;

  useEffect(() => {
    // Prevent double fetch in React StrictMode
    if (fetchInitiatedRef.current) return;
    fetchInitiatedRef.current = true;

    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!nakamaService.isAuthenticated()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const userProfile = await nakamaService.getUserProfile();
      setProfile(userProfile);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Use profile data from Nakama if available, fallback to auth context
  const displayName = profile?.displayName || profile?.username || displayUser?.username || displayUser?.firstName || 'Anonymous';
  const avatarUrl = profile?.avatarUrl || displayUser?.photoUrl;
  const gamesPlayed = profile?.stats?.gamesPlayed ?? 0;
  const totalWins = profile?.stats?.wins ?? 0;
  const totalAmountWon = profile?.stats?.totalAmountWon ?? 0;

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

  const handleCopyAddress = async () => {
    if (wallet?.account?.address) {
      haptic.light();
      await navigator.clipboard.writeText(wallet.account.address);
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
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              <UserIcon className={styles.avatarIcon} />
            </div>
          )}
        </div>
        <h1 className={styles.username}>{displayName}</h1>
        <p className={styles.joinDate}>
          {loading
            ? '...'
            : profile?.createTime
              ? `Joined ${new Date(profile.createTime * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
              : ''}
        </p>
      </div>

      {/* Stats Cards - always show with 0 values if no data */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.iconContainer}>
            <GamepadIcon className={styles.statIcon} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>
              {loading ? '...' : gamesPlayed}
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
              {loading ? '...' : totalWins}
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
              {loading ? '...' : `$${(totalAmountWon / 100).toFixed(2)}`}
            </div>
            <div className={styles.statLabel}>Amount won</div>
          </div>
        </div>
      </div>

      {/* Cash Out Button - Primary Action */}
      <button className={styles.cashOutButton} onClick={handleCashOutClick}>
        <span className={styles.cashOutText}>CASH OUT YOUR WINNINGS</span>
        <ArrowRightIcon className={styles.cashOutArrow} />
      </button>

      {/* Wallet Section - Compact Row */}
      {isWalletConnected && wallet?.account?.address ? (
        <div className={styles.walletRow}>
          <div className={styles.walletInfo}>
            <span className={styles.walletIcon}>🔗</span>
            <span className={styles.walletAddress}>
              {wallet.account.address.slice(0, 6)}...{wallet.account.address.slice(-4)}
            </span>
            <button className={styles.copyButton} onClick={handleCopyAddress} aria-label="Copy address">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>
          <button className={styles.disconnectButton} onClick={handleDisconnectWallet}>
            Disconnect
          </button>
        </div>
      ) : (
        <button className={styles.connectWalletButton} onClick={handleConnectWallet}>
          <span className={styles.connectWalletText}>CONNECT WALLET</span>
          <ArrowRightIcon className={styles.connectWalletArrow} />
        </button>
      )}

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      <BottomNavBar />
    </div>
  );
}
