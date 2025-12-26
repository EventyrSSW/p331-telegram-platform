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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 10V18H8V10H5Z"/>
            <path d="M16 10V18H19V10H16Z"/>
            <path d="M8 5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V18H8V5Z"/>
            <path d="M3 18H21V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V18Z"/>
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 4C6 2.89543 6.89543 2 8 2H16C17.1046 2 18 2.89543 18 3V5C19.6569 5 21 6.34315 21 8V15C21 16.6569 19.6569 18 18 18H17V20C17 21.1046 16.1046 22 15 22H9C7.89543 22 7 21.1046 7 20V18H6C4.34315 18 3 16.6569 3 15V8C3 6.34315 4.34315 5 6 5V4ZM8 4V5H16V4H8ZM9 18V20H15V18H9ZM7 9C7.55228 9 8 8.55228 8 8C8 7.44772 7.55228 7 7 7C6.44772 7 6 7.44772 6 8C6 8.55228 6.44772 9 7 9ZM10 8C10 8.55228 9.55228 9 9 9C8.44772 9 8 8.55228 8 8C8 7.44772 8.44772 7 9 7C9.55228 7 10 7.44772 10 8ZM17 10C17.5523 10 18 9.55228 18 9C18 8.44772 17.5523 8 17 8C16.4477 8 16 8.44772 16 9C16 9.55228 16.4477 10 17 10ZM16 12C16 12.5523 16.4477 13 17 13C17.5523 13 18 12.5523 18 12C18 11.4477 17.5523 11 17 11C16.4477 11 16 11.4477 16 12Z"/>
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6ZM7.5 17.5C7.5 15.0147 9.51472 13 12 13C14.4853 13 16.5 15.0147 16.5 17.5V18.5C16.5 19.0523 16.0523 19.5 15.5 19.5H8.5C7.94772 19.5 7.5 19.0523 7.5 18.5V17.5Z"/>
          </svg>
        </div>
        <span className={styles.navLabel}>Profile</span>
      </Link>
    </nav>
  );
};
