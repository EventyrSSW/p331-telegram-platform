import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
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

// Format seconds to mm:ss or just seconds if under 60s
function formatTime(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

  // Confetti celebration for winners
  useEffect(() => {
    if (!isOpen || entry.result !== 'won') return;

    const duration = 1000;
    const end = Date.now() + duration;

    // Gold/amber colors to match the payout theme
    const colors = ['#F59E0B', '#FBBF24', '#FCD34D', '#FEF3C7', '#FFFFFF'];

    // Initial big burst
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.5 },
      colors,
      zIndex: 1001,
    });

    // Quick side bursts
    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }

      // Left side burst
      confetti({
        particleCount: 20,
        angle: 60,
        spread: 45,
        origin: { x: 0, y: 0.5 },
        colors,
        zIndex: 1001,
      });

      // Right side burst
      confetti({
        particleCount: 20,
        angle: 120,
        spread: 45,
        origin: { x: 1, y: 0.5 },
        colors,
        zIndex: 1001,
      });
    }, 200);

    // Cleanup: clear interval and reset confetti when modal closes
    return () => {
      clearInterval(interval);
      confetti.reset();
    };
  }, [isOpen, entry.result]);

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

  // Calculate time spent: timerDuration - timeLeft (values are in seconds, possibly as strings)
  const timerDuration = entry.timerDuration != null ? Number(entry.timerDuration) : null;
  const myTimeLeft = entry.myTimeLeft != null ? Number(entry.myTimeLeft) : null;
  const opponentTimeLeft = entry.opponentTimeLeft != null ? Number(entry.opponentTimeLeft) : null;

  const myTimeSpent = timerDuration != null && myTimeLeft != null
    ? timerDuration - myTimeLeft
    : null;
  const opponentTimeSpent = timerDuration != null && opponentTimeLeft != null
    ? timerDuration - opponentTimeLeft
    : null;

  const hasTimeStats = myTimeSpent != null || opponentTimeSpent != null;

  // Debug: log the time values
  console.log('[MatchDetailModal] Time data:', {
    raw: { timerDuration: entry.timerDuration, myTimeLeft: entry.myTimeLeft, opponentTimeLeft: entry.opponentTimeLeft },
    parsed: { timerDuration, myTimeLeft, opponentTimeLeft },
    calculated: { myTimeSpent, opponentTimeSpent },
  });

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
            <div className={styles.payout}>+ {(payout / 100).toFixed(2)} TON</div>
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

        {hasTimeStats && timerDuration && (
          <div className={styles.statsSection}>
            <h3 className={styles.statsTitle}>Match Time</h3>

            <div className={styles.progressBlock}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>You</span>
                <span className={`${styles.progressTime} ${leftPlayer.isWinner ? styles.winnerStat : ''}`}>
                  {myTimeSpent != null ? formatTime(myTimeSpent) : '-'}
                </span>
              </div>
              <div className={styles.progressBarContainer}>
                <div
                  className={`${styles.progressBar} ${leftPlayer.isWinner ? styles.progressBarWinner : styles.progressBarLoser}`}
                  style={{ width: `${myTimeSpent != null ? (myTimeSpent / timerDuration) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className={styles.progressBlock}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>{rightPlayer.username}</span>
                <span className={`${styles.progressTime} ${rightPlayer.isWinner ? styles.winnerStat : ''}`}>
                  {opponentTimeSpent != null ? formatTime(opponentTimeSpent) : '-'}
                </span>
              </div>
              <div className={styles.progressBarContainer}>
                <div
                  className={`${styles.progressBar} ${rightPlayer.isWinner ? styles.progressBarWinner : styles.progressBarLoser}`}
                  style={{ width: `${opponentTimeSpent != null ? (opponentTimeSpent / timerDuration) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <span className={styles.footerText}>Tap anywhere to continue</span>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
