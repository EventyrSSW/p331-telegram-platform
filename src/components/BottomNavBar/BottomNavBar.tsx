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
          <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 13H10V24H6V13Z"/>
            <path d="M22 13H26V24H22V13Z"/>
            <path d="M10 6C10 4.89543 10.8954 4 12 4H20C21.1046 4 22 4.89543 22 6V24H10V6Z"/>
            <path d="M4 24H28V27C28 27.5523 27.5523 28 27 28H5C4.44772 28 4 27.5523 4 27V24Z"/>
          </svg>
        </div>
        <span className={styles.navLabel}>Results</span>
      </Link>

      {/* Play Tab (Center - Primary Action) */}
      <Link
        to="/"
        className={`${styles.navItem} ${styles.playButton} ${isActive('/') ? styles.navItemActive : ''}`}
      >
        <div className={styles.navIcon}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5.33333C8 3.86057 8.86057 2.66667 10 2.66667H22C23.1394 2.66667 24 3.86057 24 5.33333V6.66667C26.2091 6.66667 28 8.45753 28 10.6667V20C28 22.2091 26.2091 24 24 24H22.6667V26.6667C22.6667 28.1394 21.806 29.3333 20.6667 29.3333H11.3333C10.194 29.3333 9.33333 28.1394 9.33333 26.6667V24H8C5.79086 24 4 22.2091 4 20V10.6667C4 8.45753 5.79086 6.66667 8 6.66667V5.33333ZM10.6667 5.33333V6.66667H21.3333V5.33333H10.6667ZM12 24V26.6667H20V24H12ZM9.33333 12C9.33333 12.7364 8.73638 13.3333 8 13.3333C7.26362 13.3333 6.66667 12.7364 6.66667 12C6.66667 11.2636 7.26362 10.6667 8 10.6667C8.73638 10.6667 9.33333 11.2636 9.33333 12ZM12 13.3333C12.7364 13.3333 13.3333 12.7364 13.3333 12C13.3333 11.2636 12.7364 10.6667 12 10.6667C11.2636 10.6667 10.6667 11.2636 10.6667 12C10.6667 12.7364 11.2636 13.3333 12 13.3333ZM25.3333 14.6667C25.3333 15.403 24.7364 16 24 16C23.2636 16 22.6667 15.403 22.6667 14.6667C22.6667 13.9303 23.2636 13.3333 24 13.3333C24.7364 13.3333 25.3333 13.9303 25.3333 14.6667ZM24 20C24.7364 20 25.3333 19.403 25.3333 18.6667C25.3333 17.9303 24.7364 17.3333 24 17.3333C23.2636 17.3333 22.6667 17.9303 22.6667 18.6667C22.6667 19.403 23.2636 20 24 20Z"/>
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
          <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14"/>
            <circle cx="16" cy="13" r="5" fill="#171717"/>
            <path d="M8 26.9C8 22.5 11.6 19 16 19C20.4 19 24 22.5 24 26.9V28C24 28 24 29 23 29H9C8 29 8 28 8 28V26.9Z" fill="#171717"/>
          </svg>
        </div>
        <span className={styles.navLabel}>Profile</span>
      </Link>
    </nav>
  );
};
