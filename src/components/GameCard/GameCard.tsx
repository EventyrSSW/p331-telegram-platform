import React from 'react';
import styles from './GameCard.module.css';

export interface Game {
  id: string;
  slug: string;
  title: string;
  thumbnail: string;
  category: string;
  featured?: boolean;
  topPromoted?: boolean;
}

interface GameCardProps {
  game: Game;
  onClick?: (game: Game) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  const handleClick = () => {
    onClick?.(game);
  };

  return (
    <button className={styles.card} onClick={handleClick}>
      {/* Ribbon Badge */}
      {game.featured && (
        <div className={styles.ribbonContainer}>
          <div className={`${styles.ribbon} ${styles.ribbonFeatured}`}>
            Featured
          </div>
        </div>
      )}
      {game.topPromoted && !game.featured && (
        <div className={styles.ribbonContainer}>
          <div className={`${styles.ribbon} ${styles.ribbonHot}`}>
            Hot
          </div>
        </div>
      )}

      <div className={styles.thumbnailWrapper}>
        <img
          src={game.thumbnail}
          alt={game.title}
          className={styles.thumbnail}
        />
      </div>
      <div className={styles.titleArea}>
        <span className={styles.title}>{game.title}</span>
      </div>
    </button>
  );
};
