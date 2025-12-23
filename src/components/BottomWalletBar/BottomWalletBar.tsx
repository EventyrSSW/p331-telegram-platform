import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './BottomWalletBar.module.css';

export const BottomWalletBar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleConnectClick = () => {
    navigate('/store');
  };

  const formatBalance = (amount: number) => {
    return amount.toLocaleString();
  };

  return (
    <div className={styles.container}>
      <div className={styles.balanceSection}>
        <div className={styles.coinIcon}>💰</div>
        <div className={styles.balanceInfo}>
          <span className={styles.balanceLabel}>Balance</span>
          <span className={styles.balanceAmount}>{formatBalance(user?.coinBalance ?? 0)}</span>
        </div>
      </div>
      <button className={styles.connectButton} onClick={handleConnectClick}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 18V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V6M16 12H22M22 12L19 9M22 12L19 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Connect Wallet
      </button>
    </div>
  );
};
