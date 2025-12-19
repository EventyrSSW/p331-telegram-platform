import { useConfig } from '../../contexts/ConfigContext';
import styles from './NetworkBadge.module.css';

export function NetworkBadge() {
  const { config } = useConfig();

  if (!config) return null;

  const isTestnet = config.ton.network === 'testnet';

  return (
    <div className={`${styles.badge} ${isTestnet ? styles.testnet : styles.mainnet}`}>
      {isTestnet ? '🧪 Testnet' : '🔵 Mainnet'}
    </div>
  );
}
