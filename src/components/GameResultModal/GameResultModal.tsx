import { createPortal } from 'react-dom';
import styles from './GameResultModal.module.css';
import { haptic } from '../../providers/TelegramProvider';

export interface GameResultData {
  level: number;
  score: number;
  coins: number;
}

interface GameResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: GameResultData | null;
  onPlayAgain?: () => void;
}

export function GameResultModal({
  isOpen,
  onClose,
  result,
  onPlayAgain,
}: GameResultModalProps) {
  if (!isOpen || !result) return null;

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleClose = () => {
    haptic.light();
    onClose();
  };

  const handlePlayAgain = () => {
    haptic.medium();
    onPlayAgain?.();
  };

  const modalContent = (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={handleModalClick}>
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className={styles.content}>
          <div className={styles.trophy}>🏆</div>
          <h2 className={styles.title}>Level Complete!</h2>

          <div className={styles.stats}>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>Level</div>
              <div className={styles.statValue}>{result.level}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>Score</div>
              <div className={styles.statValue}>{result.score.toLocaleString()}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>Coins</div>
              <div className={styles.statValue}>+{result.coins}</div>
            </div>
          </div>

          <div className={styles.buttons}>
            {onPlayAgain && (
              <button
                className={styles.playAgainButton}
                onClick={handlePlayAgain}
                aria-label="Play game again"
              >
                Play Again
              </button>
            )}
            <button
              className={styles.backButton}
              onClick={handleClose}
              aria-label="Close modal and return to game details"
            >
              Back to Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
