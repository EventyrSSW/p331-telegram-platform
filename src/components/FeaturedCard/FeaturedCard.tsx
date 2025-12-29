import React from 'react';
import { Game } from '../GameCard';
import styles from './FeaturedCard.module.css';

interface FeaturedCardProps {
  game: Game;
  onPlay?: (game: Game) => void;
}

export const FeaturedCard: React.FC<FeaturedCardProps> = ({ game, onPlay }) => {
  const handlePlay = () => {
    onPlay?.(game);
  };

  return (
    <div className={styles.card}>
      <img
        src={game.thumbnail}
        alt={game.title}
        className={styles.image}
      />
      <div className={styles.categoryBadge}>{game.category}</div>
      <div className={styles.overlay}>
        <div className={styles.info}>
          <div className={styles.title}>{game.title}</div>
          <button className={styles.playButton} onClick={handlePlay}>
            Play Now
          </button>
        </div>
      </div>
    </div>
  );
};
