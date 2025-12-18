import { ReactNode } from 'react';
import styles from './Section.module.css';

export interface SectionProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

export function Section({ title, children, action }: SectionProps) {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {action && <div className={styles.action}>{action}</div>}
      </header>
      {children}
    </section>
  );
}
