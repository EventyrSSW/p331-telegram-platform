import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Header.module.css';

export const Header = () => {
  const { user } = useAuth();

  const formatBalance = (balance: number): string => {
    if (balance >= 1000000) {
      return `${(balance / 1000000).toFixed(1)}M`;
    }
    if (balance >= 1000) {
      return `${(balance / 1000).toFixed(1)}K`;
    }
    return balance.toLocaleString();
  };

  // Mock rank for now - will be replaced with actual rank from API
  const userRank = 42;

  return (
    <header className={styles.header}>
      {/* Rank Section - Links to Leaderboard */}
      <Link to="/leaderboard" className={styles.rankSection}>
        <div className={styles.rankIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
          </svg>
        </div>
        <span className={styles.rankValue}>#{userRank}</span>
      </Link>

      {/* Balance Section - Links to Store */}
      <Link to="/store" className={styles.balanceSection}>
        <div className={styles.tonIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
            <path d="M12 6L8 12H11V18L16 12H13L12 6Z" fill="currentColor"/>
          </svg>
        </div>
        <span className={styles.balanceValue}>{formatBalance(user?.coinBalance ?? 0)}</span>
        <div className={styles.addIcon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
      </Link>
    </header>
  );
};
