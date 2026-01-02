import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNetworkToast, ToastType } from '../../contexts/NetworkToastContext';
import styles from './NetworkToast.module.css';

const AUTO_DISMISS_MS = 4000;
const SWIPE_THRESHOLD = 50; // pixels to swipe down to dismiss

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
  const toastRef = useRef<HTMLDivElement>(null);

  // Swipe state
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartY = useRef(0);

  // Auto-dismiss timer
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

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

  // Reset swipe state when toast changes
  useEffect(() => {
    if (toast.visible) {
      setIsSwiping(false);
      setIsDismissing(false);
      setSwipeOffset(0);
    }
  }, [toast.visible, toast.message]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    // Only allow swiping down (positive diff)
    if (diff > 0) {
      setSwipeOffset(diff);
    }
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return;

    if (swipeOffset > SWIPE_THRESHOLD) {
      // Dismiss the toast
      setIsDismissing(true);
      setSwipeOffset(100); // Animate out
      setTimeout(() => {
        hideToast();
        setIsDismissing(false);
        setSwipeOffset(0);
      }, 200);
    } else {
      // Snap back
      setSwipeOffset(0);
    }

    setIsSwiping(false);
  }, [isSwiping, swipeOffset, hideToast]);

  // Calculate transform and opacity based on swipe
  const getToastStyle = () => {
    if (!toast.visible && !isDismissing) {
      return {};
    }

    if (swipeOffset > 0) {
      const opacity = Math.max(0, 1 - swipeOffset / 100);
      return {
        transform: `translateY(${swipeOffset}px)`,
        opacity,
      };
    }

    return {};
  };

  const toastClasses = [
    styles.toast,
    styles[toast.type],
    toast.visible && !isDismissing ? styles.visible : '',
    isSwiping ? styles.swiping : '',
    isDismissing ? styles.dismissing : '',
  ].filter(Boolean).join(' ');

  const toastElement = (
    <div className={styles.toastContainer}>
      <div
        ref={toastRef}
        className={toastClasses}
        style={getToastStyle()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <ToastIcon type={toast.type} />
        <span className={styles.message}>{toast.message}</span>
        <div className={styles.swipeHint} />
      </div>
    </div>
  );

  return createPortal(toastElement, document.body);
}
