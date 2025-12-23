import { Link, useLocation } from 'react-router-dom';
import styles from './Header.module.css';

export const Header = () => {
  const location = useLocation();

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <Link
          to="/profile"
          className={`${styles.profileLink} ${location.pathname === '/profile' ? styles.profileLinkActive : ''}`}
          aria-label="Profile"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M5 20C5 16.134 8.13401 13 12 13C15.866 13 19 16.134 19 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </Link>

        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}>G</div>
          <span className={styles.logoText}>Games</span>
        </Link>
      </div>

      <div className={styles.actions}>
        <Link
          to="/store"
          className={`${styles.navLink} ${location.pathname === '/store' ? styles.navLinkActive : ''}`}
        >
          Store
        </Link>

        <Link
          to="/leaderboard"
          className={`${styles.navLink} ${location.pathname === '/leaderboard' ? styles.navLinkActive : ''}`}
        >
          Leaderboard
        </Link>
      </div>
    </header>
  );
};
