import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './SearchOpponentModal.module.css';
import { haptic } from '../../providers/TelegramProvider';

interface SearchOpponentModalProps {
  isOpen: boolean;
  onCancel: () => void;
  status: 'searching' | 'found' | 'starting';
  opponentName?: string;
  matchType?: 'PVP' | 'PVH' | null;
  betAmount: number;
  onOpponentFound?: () => void;
}

export function SearchOpponentModal({
  isOpen,
  onCancel,
  status,
  opponentName,
  matchType,
  betAmount,
  onOpponentFound,
}: SearchOpponentModalProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showFoundAnimation, setShowFoundAnimation] = useState(false);

  // Timer effect
  useEffect(() => {
    if (isOpen && status === 'searching') {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, status]);

  // Handle opponent found animation
  useEffect(() => {
    if (status === 'found') {
      haptic.success();
      setShowFoundAnimation(true);

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Auto-dismiss after animation
      const timeout = setTimeout(() => {
        onOpponentFound?.();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [status, onOpponentFound]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setElapsedSeconds(0);
      setShowFoundAnimation(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCancel = () => {
    haptic.light();
    onCancel();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusMessage = (): string => {
    switch (status) {
      case 'searching':
        return 'Searching for opponent...';
      case 'found':
        return matchType === 'PVH' ? 'Playing against House!' : 'Opponent found!';
      case 'starting':
        return 'Starting game...';
      default:
        return 'Preparing match...';
    }
  };

  const modalContent = (
    <div className={styles.overlay}>
      <div className={styles.content}>
        {/* Animated search indicator */}
        <div className={`${styles.searchIndicator} ${showFoundAnimation ? styles.found : ''}`}>
          {status === 'searching' ? (
            <div className={styles.radarContainer}>
              <div className={styles.radarPulse} />
              <div className={styles.radarPulse} style={{ animationDelay: '0.5s' }} />
              <div className={styles.radarPulse} style={{ animationDelay: '1s' }} />
              <div className={styles.radarCenter}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            </div>
          ) : (
            <div className={styles.foundIcon}>
              {matchType === 'PVH' ? '🏠' : '👥'}
            </div>
          )}
        </div>

        {/* Status message */}
        <h2 className={styles.title}>{getStatusMessage()}</h2>

        {/* Opponent name when found */}
        {status === 'found' && opponentName && (
          <div className={styles.opponentName}>
            vs {opponentName}
          </div>
        )}

        {/* Timer */}
        {status === 'searching' && (
          <div className={styles.timer}>
            {formatTime(elapsedSeconds)}
          </div>
        )}

        {/* Bet amount display */}
        <div className={styles.betInfo}>
          <span className={styles.betLabel}>Entry:</span>
          <span className={styles.betAmount}>{(betAmount / 100).toFixed(2)} TON</span>
        </div>

        {/* Search tips */}
        {status === 'searching' && elapsedSeconds > 10 && (
          <p className={styles.tip}>
            No opponents yet. You'll play against House if no one joins in {30 - elapsedSeconds}s
          </p>
        )}

        {/* Cancel button */}
        {status === 'searching' && (
          <button className={styles.cancelButton} onClick={handleCancel}>
            Cancel
          </button>
        )}

        {/* Starting game indicator */}
        {status === 'starting' && (
          <div className={styles.startingIndicator}>
            <div className={styles.loadingDots}>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
