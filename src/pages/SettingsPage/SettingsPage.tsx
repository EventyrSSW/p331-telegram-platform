import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CashOutModal } from '../../components/CashOutModal/CashOutModal';
import { haptic } from '../../providers/TelegramProvider';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [showCashOutModal, setShowCashOutModal] = useState(false);

  // Load preferences from localStorage
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('soundEnabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [hapticsEnabled, setHapticsEnabled] = useState(() => {
    const saved = localStorage.getItem('hapticsEnabled');
    return saved !== null ? saved === 'true' : true;
  });

  const handleBack = () => {
    haptic.light();
    navigate(-1);
  };

  const handleCashOutClick = () => {
    haptic.medium();
    setShowCashOutModal(true);
  };

  const handleSoundToggle = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('soundEnabled', String(newValue));
    if (hapticsEnabled) haptic.light();
  };

  const handleHapticsToggle = () => {
    const newValue = !hapticsEnabled;
    setHapticsEnabled(newValue);
    localStorage.setItem('hapticsEnabled', String(newValue));
    if (newValue) haptic.light(); // Only haptic if enabling
  };

  const handleCashOutSuccess = async () => {
    await refreshUser();
  };

  if (!user) return null;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={handleBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5m7 7l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <h1 className={styles.title}>Account, Settings and Legal</h1>

      {/* Settings Sections */}
      <div className={styles.sections}>
        {/* Cash Out */}
        <button className={styles.settingCard} onClick={handleCashOutClick}>
          <div className={styles.settingContent}>
            <span className={styles.settingTitle}>Cash Out</span>
            <span className={styles.settingDescription}>Cash out your winnings</span>
          </div>
        </button>

        {/* Sound and Haptics */}
        <div className={styles.settingCard}>
          <div className={styles.settingContent}>
            <span className={styles.settingTitle}>Sound and Haptics</span>
            <span className={styles.settingDescription}>Change your preferences</span>
          </div>
          <div className={styles.expandedContent}>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Sound Effects</span>
              <button
                className={`${styles.toggle} ${soundEnabled ? styles.toggleActive : ''}`}
                onClick={handleSoundToggle}
                aria-label="Toggle sound"
              >
                <div className={styles.toggleThumb} />
              </button>
            </div>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Haptic Feedback</span>
              <button
                className={`${styles.toggle} ${hapticsEnabled ? styles.toggleActive : ''}`}
                onClick={handleHapticsToggle}
                aria-label="Toggle haptics"
              >
                <div className={styles.toggleThumb} />
              </button>
            </div>
          </div>
        </div>

        {/* Customer Support */}
        <button className={styles.settingCard}>
          <div className={styles.settingContent}>
            <span className={styles.settingTitle}>Customer Support</span>
            <span className={styles.settingDescription}>Questions or concerns</span>
          </div>
        </button>

        {/* Refund Request */}
        <button className={styles.settingCard}>
          <div className={styles.settingContent}>
            <span className={styles.settingTitle}>Refund Request</span>
            <span className={styles.settingDescription}>Claim money back for a failed game</span>
          </div>
        </button>

        {/* FAQ */}
        <button className={styles.settingCard}>
          <div className={styles.settingContent}>
            <span className={styles.settingTitle}>FAQ</span>
            <span className={styles.settingDescription}>Get answers to common questions</span>
          </div>
        </button>
      </div>

      {/* Legal Links */}
      <div className={styles.legalSection}>
        <button className={styles.legalLink}>Log In</button>
        <button className={styles.legalLink}>Terms of Use</button>
        <button className={styles.legalLink}>Privacy Policy</button>
        <button className={styles.legalLink}>Regulatory Information</button>
        <button className={styles.legalLink}>Responsible Gaming</button>
      </div>

      {/* Version */}
      <div className={styles.version}>
        Version 1.0.0
      </div>

      <CashOutModal
        isOpen={showCashOutModal}
        onClose={() => setShowCashOutModal(false)}
        currentBalance={user.coinBalance}
        onSuccess={handleCashOutSuccess}
      />
    </div>
  );
}
