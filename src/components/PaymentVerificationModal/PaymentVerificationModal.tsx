import { createPortal } from 'react-dom';
import styles from './PaymentVerificationModal.module.css';
import { haptic } from '../../providers/TelegramProvider';

export type PaymentStatus =
  | 'sending'      // Transaction being sent to wallet
  | 'verifying'    // Waiting for blockchain confirmation
  | 'success'      // Payment verified successfully
  | 'error';       // Payment failed

export interface PaymentVerificationModalProps {
  isOpen: boolean;
  status: PaymentStatus;
  amount: number;                    // TON amount
  currentAttempt: number;            // Current verification attempt (1-10)
  maxAttempts: number;               // Total attempts (10)
  remainingSeconds: number;          // Countdown from 50 to 0
  errorMessage?: string;             // Error description if status === 'error'
  onClose: () => void;               // Close modal (only on success/error)
  onRetry?: () => void;              // Retry payment (on error)
}

export function PaymentVerificationModal({
  isOpen,
  status,
  amount,
  currentAttempt,
  maxAttempts,
  remainingSeconds,
  errorMessage,
  onClose,
  onRetry,
}: PaymentVerificationModalProps) {
  if (!isOpen) return null;

  // Only allow close on terminal states
  const canClose = status === 'success' || status === 'error';

  const handleClose = () => {
    if (!canClose) return;
    haptic.light();
    onClose();
  };

  const getStatusTitle = (): string => {
    switch (status) {
      case 'sending':
        return 'Sending Transaction...';
      case 'verifying':
        return 'Verifying Payment';
      case 'success':
        return 'Payment Successful!';
      case 'error':
        return 'Payment Failed';
      default:
        return 'Processing...';
    }
  };

  const getStatusDescription = (): string => {
    switch (status) {
      case 'sending':
        return 'Please confirm in your wallet';
      case 'verifying':
        return 'Checking blockchain confirmation...';
      case 'success':
        return `${amount} TON has been added to your balance`;
      case 'error':
        return errorMessage || 'Something went wrong';
      default:
        return '';
    }
  };

  const modalContent = (
    <div className={styles.overlay}>
      <div className={styles.content}>
        {/* Animated indicator */}
        <div className={`${styles.indicator} ${styles[status]}`}>
          {status === 'sending' && (
            <div className={styles.walletIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
              </svg>
            </div>
          )}
          {status === 'verifying' && (
            <div className={styles.blockchainIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>
              </svg>
            </div>
          )}
          {status === 'success' && (
            <div className={styles.successIcon}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
          )}
          {status === 'error' && (
            <div className={styles.errorIcon}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className={styles.title}>{getStatusTitle()}</h2>

        {/* Description */}
        <p className={styles.description}>{getStatusDescription()}</p>

        {/* Progress blocks for verifying state */}
        {status === 'verifying' && (
          <>
            <div className={styles.progressBlocks}>
              {Array.from({ length: maxAttempts }, (_, i) => (
                <div
                  key={i}
                  className={`${styles.block} ${i < currentAttempt ? styles.blockActive : ''} ${i === currentAttempt - 1 ? styles.blockCurrent : ''}`}
                />
              ))}
            </div>

            {/* Countdown timer */}
            <div className={styles.countdown}>
              <span className={styles.countdownValue}>{remainingSeconds}</span>
              <span className={styles.countdownLabel}>seconds remaining</span>
            </div>

            {/* Attempt info */}
            <p className={styles.attemptInfo}>
              Attempt {currentAttempt} of {maxAttempts}
            </p>
          </>
        )}

        {/* Amount display */}
        <div className={styles.amountBadge}>
          <span className={styles.amountValue}>{amount}</span>
          <span className={styles.amountUnit}>TON</span>
        </div>

        {/* Action buttons */}
        {status === 'success' && (
          <button className={styles.successButton} onClick={handleClose}>
            Done
          </button>
        )}

        {status === 'error' && (
          <div className={styles.errorActions}>
            {onRetry && (
              <button className={styles.retryButton} onClick={onRetry}>
                Try Again
              </button>
            )}
            <button className={styles.closeButton} onClick={handleClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
