import { Link, useLocation } from 'react-router-dom';
import styles from './BottomNavBar.module.css';

export const BottomNavBar = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={styles.container}>
      {/* Result Tab */}
      <Link
        to="/leaderboard"
        className={`${styles.navItem} ${isActive('/leaderboard') ? styles.navItemActive : ''}`}
      >
        <div className={styles.navIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 21V11M16 21V7M12 21V15M4 21H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 7L12 3L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className={styles.navLabel}>Result</span>
      </Link>

      {/* Play Tab (Center - Primary Action) */}
      <Link
        to="/"
        className={`${styles.navItem} ${styles.playButton}`}
      >
        <div className={styles.navIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 3L19 12L5 21V3Z" fill="currentColor"/>
          </svg>
        </div>
        <span className={styles.navLabel}>Play</span>
      </Link>

      {/* Profile Tab */}
      <Link
        to="/profile"
        className={`${styles.navItem} ${isActive('/profile') ? styles.navItemActive : ''}`}
      >
        <div className={styles.navIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M5 20C5 16.134 8.13401 13 12 13C15.866 13 19 16.134 19 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <span className={styles.navLabel}>Profile</span>
      </Link>
    </nav>
  );
};
