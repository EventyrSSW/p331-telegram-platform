import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './MatchDetailModal.module.css';
import { haptic } from '../../providers/TelegramProvider';
import type { MatchHistoryEntry } from '../../services/nakama';
import { useCountUp } from '../../hooks/useCountUp';

interface CurrentUser {
  username: string;
  avatarUrl?: string;
}

interface MatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: MatchHistoryEntry;
  currentUser: CurrentUser;
}

function AnimatedScore({ score, delay = 0 }: { score: number; delay?: number }) {
  const animatedScore = useCountUp({
    start: 0,
    end: score,
    duration: 1500,
    delay,
  });

  return <>{animatedScore.toLocaleString()}</>;
}

export function MatchDetailModal({
  isOpen,
  onClose,
  entry,
  currentUser,
}: MatchDetailModalProps) {
  const [animationStarted, setAnimationStarted] = useState(false);

  // Stable close handler
  const handleClose = useCallback(() => {
    haptic.light();
    setAnimationStarted(false);
    onClose();
  }, [onClose]);


  // Start animation when modal opens
  useEffect(() => {
    if (isOpen) {
      setAnimationStarted(true);
    } else {
      setAnimationStarted(false);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const isWinner = entry.result === 'won';
  const payout = entry.payout ?? 0;

  // Current user always on left, opponent always on right
  const myScore = entry.myScore ?? 0;
  const opponentScore = entry.opponentScore ?? 0;

  const leftPlayer = {
    username: currentUser.username,
    avatarUrl: currentUser.avatarUrl,
    score: myScore,
    isMe: true,
    isWinner: isWinner,
  };

  const rightPlayer = {
    username: entry.opponentName ?? 'Opponent',
    avatarUrl: entry.opponentAvatar,
    score: opponentScore,
    isMe: false,
    isWinner: !isWinner,
  };

  const modalContent = (
    <div
      className={styles.overlay}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Match Result"
    >
      <div className={styles.content}>
        {isWinner && (
          <div className={styles.header}>
            <h1 className={styles.title}>You win!</h1>
            <div className={styles.payout}>+{(payout / 100).toFixed(2)} TON</div>
          </div>
        )}

        {!isWinner && (
          <div className={styles.header}>
            <h1 className={styles.title}>Results</h1>
          </div>
        )}

        <div className={styles.playersSection}>
          <div className={`${styles.player} ${leftPlayer.isWinner ? styles.winner : styles.loser}`}>
            <div className={styles.avatarContainer}>
              {leftPlayer.avatarUrl ? (
                <img
                  src={leftPlayer.avatarUrl}
                  alt={leftPlayer.username}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {(leftPlayer.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className={styles.username}>{leftPlayer.isMe ? 'You' : leftPlayer.username}</span>
            <span className={styles.score}>{animationStarted ? <AnimatedScore score={leftPlayer.score} delay={300} /> : '0'}</span>
          </div>

          <div className={`${styles.player} ${rightPlayer.isWinner ? styles.winner : styles.loser}`}>
            <div className={styles.avatarContainer}>
              {rightPlayer.avatarUrl ? (
                <img
                  src={rightPlayer.avatarUrl}
                  alt={rightPlayer.username}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {(rightPlayer.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className={styles.username}>{rightPlayer.isMe ? 'You' : rightPlayer.username}</span>
            <span className={styles.score}>{animationStarted ? <AnimatedScore score={rightPlayer.score} delay={300} /> : '0'}</span>
          </div>
        </div>

        <div className={styles.footer}>
          <span className={styles.footerText}>Tap anywhere to continue</span>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
