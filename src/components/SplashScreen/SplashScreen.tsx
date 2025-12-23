import styles from './SplashScreen.module.css';

export function SplashScreen() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.logoContainer}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>G</span>
          </div>
          <span className={styles.title}>Games</span>
        </div>
        <div className={styles.progressContainer}>
          <div className={styles.progressTrack}>
            <div className={styles.progressBar} />
          </div>
          <span className={styles.loadingText}>Loading...</span>
        </div>
      </div>
    </div>
  );
}
