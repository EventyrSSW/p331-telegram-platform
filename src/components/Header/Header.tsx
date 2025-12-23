import { Link, useLocation } from 'react-router-dom';
import styles from './Header.module.css';

export const Header = () => {
  const location = useLocation();

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        <div className={styles.logoIcon}>G</div>
        <span className={styles.logoText}>Games</span>
      </Link>

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
