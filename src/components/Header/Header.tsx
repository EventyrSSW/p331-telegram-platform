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
          aria-label="Store"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>

        <Link
          to="/leaderboard"
          className={`${styles.navLink} ${location.pathname === '/leaderboard' ? styles.navLinkActive : ''}`}
          aria-label="Leaderboard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 21V11H4C3.44772 11 3 11.4477 3 12V20C3 20.5523 3.44772 21 4 21H8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 21V5C14 4.44772 14.4477 4 15 4H19C19.5523 4 20 4.44772 20 5V20C20 20.5523 19.5523 21 19 21H14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 21V8C8 7.44772 8.44772 7 9 7H13C13.5523 7 14 7.44772 14 8V21H8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>
    </header>
  );
};
