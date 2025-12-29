import { Link, useLocation } from 'react-router-dom';
import TrophyIcon from '../../assets/icons/trophy.svg?react';
import GamepadIcon from '../../assets/icons/gamepad.svg?react';
import UserIcon from '../../assets/icons/user.svg?react';
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
          <TrophyIcon />
        </div>
        <span className={styles.navLabel}>Results</span>
      </Link>

      {/* Play Tab (Center - Primary Action) */}
      <Link
        to="/"
        className={`${styles.navItem} ${styles.playButton} ${isActive('/') ? styles.navItemActive : ''}`}
      >
        <div className={styles.navIcon}>
          <GamepadIcon />
        </div>
        <span className={styles.navLabel}>Play</span>
      </Link>

      {/* Profile Tab */}
      <Link
        to="/profile"
        className={`${styles.navItem} ${isActive('/profile') ? styles.navItemActive : ''}`}
      >
        <div className={styles.navIcon}>
          <UserIcon />
        </div>
        <span className={styles.navLabel}>Profile</span>
      </Link>
    </nav>
  );
};
