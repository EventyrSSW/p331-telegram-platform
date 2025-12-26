import { createPortal } from 'react-dom';
import styles from './MatchResultModal.module.css';
import { haptic } from '../../providers/TelegramProvider';

interface MatchPlayer {
  username: string;
  score: number | null;
  isMe: boolean;
  isWinner: boolean;
}

interface MatchResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'waiting' | 'playing' | 'submitted' | 'completed';
  matchType: 'PVP' | 'PVH' | null;
  players: MatchPlayer[];
  myScore: number | null;
  payout: number | null;
  isWinner: boolean;
  onPlayAgain?: () => void;
}

export function MatchResultModal({
  isOpen,
  onClose,
  status,
  matchType,
  players,
  myScore: _myScore,
  payout,
  isWinner,
  onPlayAgain,
}: MatchResultModalProps) {
  // myScore is available via _myScore if needed for future display enhancements
  void _myScore;
  if (!isOpen) return null;

  const handleClose = () => {
    haptic.light();
    onClose();
  };

  const handlePlayAgain = () => {
    haptic.medium();
    onPlayAgain?.();
  };

  const isLoading = status === 'submitted' || status === 'playing';
  const showResult = status === 'completed';

  const modalContent = (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={handleClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className={styles.content}>
          {isLoading && (
            <>
              <div className={styles.spinner} />
              <h2 className={styles.title}>
                {status === 'submitted' ? 'Waiting for opponent...' : 'Match in progress...'}
              </h2>
              <p className={styles.subtitle}>
                {matchType === 'PVH' ? 'Playing against House' : 'PvP Match'}
              </p>
            </>
          )}

          {showResult && (
            <>
              <div className={styles.resultIcon}>
                {isWinner ? '🏆' : '😔'}
              </div>
              <h2 className={styles.title}>
                {isWinner ? 'You Won!' : 'You Lost'}
              </h2>
              {payout !== null && payout > 0 && (
                <div className={styles.payout}>+{payout} coins</div>
              )}
            </>
          )}

          <div className={styles.playerList}>
            {players.map((player, idx) => (
              <div
                key={idx}
                className={`${styles.playerRow} ${player.isMe ? styles.playerMe : ''} ${player.isWinner ? styles.playerWinner : ''}`}
              >
                <span className={styles.playerName}>
                  {player.isMe ? 'You' : player.username}
                </span>
                <span className={styles.playerScore}>
                  {player.score !== null ? player.score.toLocaleString() : (
                    <span className={styles.pendingDots}>...</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {showResult && (
            <div className={styles.buttons}>
              {onPlayAgain && (
                <button className={styles.playAgainButton} onClick={handlePlayAgain}>
                  Play Again
                </button>
              )}
              <button className={styles.backButton} onClick={handleClose}>
                Back to Games
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
