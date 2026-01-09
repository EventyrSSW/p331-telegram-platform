import { MatchHistoryEntry, MatchHistoryStatus } from '../../services/nakama';
import { Game } from '../GameCard';
import { haptic } from '../../providers/TelegramProvider';
import TonCoinIcon from '../../assets/icons/toncoin-ton-logo 1.svg?react';
import styles from './ResultCard.module.css';

interface ResultCardProps {
  entry: MatchHistoryEntry;
  game: Game | null;
  onContinue?: () => void;
  onCancel?: () => void;
  onClick?: () => void;
}

const STATUS_CONFIG: Record<MatchHistoryStatus, { label: string; showPrice: boolean }> = {
  waiting: { label: 'Waiting for opponent...', showPrice: true },
  ready: { label: 'Match starting...', showPrice: true },
  playing: { label: 'Game in progress', showPrice: true },
  submitted: { label: 'Waiting for results...', showPrice: false },
  completed: { label: '', showPrice: false },
  cancelled: { label: 'Cancelled - Refunded', showPrice: false },
};

export const ResultCard: React.FC<ResultCardProps> = ({
  entry,
  game,
  onContinue,
  onCancel,
  onClick,
}) => {
  const isPending = !['completed', 'cancelled'].includes(entry.status);
  const isCompleted = entry.status === 'completed';
  const config = STATUS_CONFIG[entry.status];
  const isClickable = isCompleted && onClick;

  const handleContinue = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic.medium();
    onContinue?.();
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic.medium();
    onCancel?.();
  };

  const handleCardClick = () => {
    if (isCompleted && onClick) {
      haptic.light();
      onClick();
    }
  };

  // Determine what to show on the right side
  const renderRightContent = () => {
    if (entry.status === 'playing' && onContinue) {
      return (
        <button className={styles.continueButton} onClick={handleContinue}>
          Continue
        </button>
      );
    }

    if (entry.status === 'waiting' && onCancel) {
      return (
        <button className={styles.cancelButton} onClick={handleCancel}>
          Cancel
        </button>
      );
    }

    if (isCompleted && entry.result) {
      const isWon = entry.result === 'won';
      const amount = isWon ? entry.payout : entry.betAmount;
      const amountTon = ((amount ?? 0) / 100).toFixed(2);
      return (
        <div className={`${styles.result} ${isWon ? styles.won : styles.lost}`}>
          {isWon ? '+' : '-'}{amountTon}
        </div>
      );
    }

    return null;
  };

  // Determine subtitle
  const renderSubtitle = () => {
    if (isCompleted) {
      const opponent = entry.opponentName || (entry.matchType === 'PVH' ? 'House' : 'Player');
      return <span className={styles.opponent}>vs {opponent}</span>;
    }

    if (config.showPrice) {
      return (
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Price</span>
          <TonCoinIcon className={styles.coinIcon} />
          <span className={styles.priceValue}>{(entry.betAmount / 100).toFixed(2)}</span>
        </div>
      );
    }

    if (entry.status === 'submitted' && entry.myScore !== null) {
      return <span className={styles.scoreText}>Score: {entry.myScore}</span>;
    }

    return <span className={styles.statusText}>{config.label}</span>;
  };

  return (
    <div
      className={`${styles.card} ${isPending ? styles.pending : ''} ${isClickable ? styles.clickable : ''}`}
      onClick={handleCardClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {/* Game Thumbnail */}
      <div className={styles.thumbnail}>
        {game?.thumbnail ? (
          <img src={game.thumbnail} alt={game.title || 'Game'} />
        ) : (
          <div className={styles.thumbnailPlaceholder}>?</div>
        )}
      </div>

      {/* Game Info */}
      <div className={styles.info}>
        <span className={styles.title}>{game?.title || 'Unknown Game'}</span>
        {isPending && config.label && (
          <span className={styles.statusText}>{config.label}</span>
        )}
        {renderSubtitle()}
      </div>

      {/* Right Content (Button or Result) */}
      <div className={styles.rightContent}>
        {renderRightContent()}
      </div>
    </div>
  );
};
