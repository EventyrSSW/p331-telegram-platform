import { ReactNode } from 'react';
import styles from './PlaceholderCard.module.css';

interface PlaceholderCardProps {
  icon?: ReactNode;
}

export function PlaceholderCard({ icon }: PlaceholderCardProps) {
  return (
    <div className={styles.card}>
      {icon && <div className={styles.icon}>{icon}</div>}
    </div>
  );
}
