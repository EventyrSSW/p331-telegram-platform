import styles from './CoinBalance.module.css';

interface CoinBalanceProps {
  balance: number;
  symbol?: string;
}

export const CoinBalance = ({ balance, symbol = 'TON' }: CoinBalanceProps) => {
  const formattedBalance = balance.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        <svg
          className={styles.icon}
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 6V18M8 12H16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div>
        <div className={styles.label}>Your Balance</div>
        <div className={styles.balance}>
          {formattedBalance} <span className={styles.symbol}>{symbol}</span>
        </div>
      </div>
    </div>
  );
};
