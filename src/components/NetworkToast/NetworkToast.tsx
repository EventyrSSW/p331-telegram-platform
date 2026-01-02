import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNetworkToast, ToastType } from '../../contexts/NetworkToastContext';
import styles from './NetworkToast.module.css';

const AUTO_DISMISS_MS = 4000;

function ToastIcon({ type }: { type: ToastType }) {
  switch (type) {
    case 'success':
      return (
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'warning':
      return (
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'error':
      return (
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6m0-6l6 6" />
        </svg>
      );
    case 'info':
    default:
      return <div className={styles.spinner} />;
  }
}

export function NetworkToast() {
  const { toast, hideToast } = useNetworkToast();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Set auto-dismiss timeout if toast is visible and not persistent
    if (toast.visible && !toast.persistent) {
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, AUTO_DISMISS_MS);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [toast.visible, toast.persistent, hideToast]);

  const toastElement = (
    <div className={styles.toastContainer}>
      <div className={`${styles.toast} ${styles[toast.type]} ${toast.visible ? styles.visible : ''}`}>
        <ToastIcon type={toast.type} />
        <span className={styles.message}>{toast.message}</span>
      </div>
    </div>
  );

  return createPortal(toastElement, document.body);
}
