import { useState, useEffect } from 'react';
import { haptic } from '../../providers/TelegramProvider';
import ClockIcon from '../../assets/icons/clock.svg?react';
import bonusImage2x from '../../assets/images/d321f4534ce7a69afd6e3121648f26052532820d.png';
import styles from './WelcomeBonusBanner.module.css';

interface WelcomeBonusBannerProps {
  variant?: 'green' | 'blue';
  onDepositClick?: () => void;
}

export const WelcomeBonusBanner: React.FC<WelcomeBonusBannerProps> = ({
  variant = 'green',
  onDepositClick,
}) => {
  // Calculate time remaining (mock implementation - 3 hours from now)
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Mock: 2 hours 56 minutes
      const hours = 2;
      const minutes = 56;
      setTimeLeft(`${hours}h ${minutes}m left`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handleDepositClick = () => {
    haptic.light();
    onDepositClick?.();
  };

  return (
    <div className={`${styles.banner} ${styles[variant]}`}>
      <div className={styles.content}>
        <div className={styles.textSection}>
          <div className={styles.label}>Welcome Bonus</div>
          <div className={styles.title}>Double Your Deposit</div>
        </div>

        <button className={styles.depositButton} onClick={handleDepositClick}>
          DEPOSIT NOW
        </button>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.multiplierImage}>
          <img src={bonusImage2x} alt="2X Bonus" className={styles.bonusImage} />
        </div>
        <div className={styles.timer}>
          <ClockIcon className={styles.clockIcon} />
          <span className={styles.timerText}>{timeLeft}</span>
        </div>
      </div>
    </div>
  );
};
