import { useEffect, useState } from 'react';
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

  // Start animation when modal opens
  if (isOpen && !animationStarted) {
    setAnimationStarted(true);
  }

  if (!isOpen) return null;

  const handleClose = () => {
    haptic.light();
    setAnimationStarted(false);
    onClose();
  };

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
  }, [isOpen]);

  const isWinner = entry.result === 'won';
  const payout = entry.payout ?? 0;

  // Determine winner and loser data
  const myScore = entry.myScore ?? 0;
  const opponentScore = entry.opponentScore ?? 0;

  const winner = isWinner
    ? {
        username: currentUser.username,
        avatarUrl: currentUser.avatarUrl,
        score: myScore,
        isMe: true,
      }
    : {
        username: entry.opponentName ?? 'Opponent',
        avatarUrl: entry.opponentAvatar,
        score: opponentScore,
        isMe: false,
      };

  const loser = isWinner
    ? {
        username: entry.opponentName ?? 'Opponent',
        avatarUrl: entry.opponentAvatar,
        score: opponentScore,
        isMe: false,
      }
    : {
        username: currentUser.username,
        avatarUrl: currentUser.avatarUrl,
        score: myScore,
        isMe: true,
      };

  const modalContent = (
    <div
      className={styles.overlay}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Match Result"
    >
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        {isWinner && (
          <div className={styles.header}>
            <h1 className={styles.title}>You win!</h1>
            <div className={styles.payout}>+{(payout / 100).toFixed(2)} TON</div>
          </div>
        )}

        {!isWinner && (
          <div className={styles.header}>
            <h1 className={styles.title}>You lost</h1>
          </div>
        )}

        <div className={styles.playersSection}>
          <div className={`${styles.player} ${styles.winner}`}>
            <div className={styles.avatarContainer}>
              {winner.avatarUrl ? (
                <img
                  src={winner.avatarUrl}
                  alt={winner.username}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {(winner.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className={styles.username}>{winner.isMe ? 'You' : winner.username}</span>
            <span className={styles.score}>{animationStarted ? <AnimatedScore score={winner.score} delay={300} /> : '0'}</span>
          </div>

          <div className={`${styles.player} ${styles.loser}`}>
            <div className={styles.avatarContainer}>
              {loser.avatarUrl ? (
                <img
                  src={loser.avatarUrl}
                  alt={loser.username}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {(loser.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className={styles.username}>{loser.isMe ? 'You' : loser.username}</span>
            <span className={styles.score}>{animationStarted ? <AnimatedScore score={loser.score} delay={300} /> : '0'}</span>
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
