import React from 'react';
import styles from './ActionCard.module.css';

interface ActionCardProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({ icon, label, onClick }) => {
  return (
    <button className={styles.actionCard} onClick={onClick}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.label}>{label}</div>
    </button>
  );
};
