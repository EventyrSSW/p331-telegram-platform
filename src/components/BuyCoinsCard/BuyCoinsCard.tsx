import styles from './BuyCoinsCard.module.css';

export interface CoinPackage {
  id: string;
  amount: number;
  price: number;
  bonus?: number;
}

interface BuyCoinsCardProps {
  package: CoinPackage;
  onBuy: (pkg: CoinPackage) => void;
}

export const BuyCoinsCard = ({ package: pkg, onBuy }: BuyCoinsCardProps) => {
  const handleClick = () => {
    onBuy(pkg);
  };

  return (
    <button className={styles.card} onClick={handleClick}>
      {pkg.bonus && (
        <div className={styles.badge}>+{pkg.bonus}% bonus</div>
      )}
      <div className={styles.amount}>{pkg.amount.toLocaleString()}</div>
      <div className={styles.label}>coins</div>
      <div className={styles.price}>{pkg.price} TON</div>
    </button>
  );
};
