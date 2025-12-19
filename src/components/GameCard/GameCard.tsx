import React from 'react';
import styles from './GameCard.module.css';

export interface Game {
  id: string;
  slug: string;  // human-readable identifier for URLs
  title: string;
  thumbnail: string;
  category: string;
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
      <div className={styles.thumbnailWrapper}>
        <img
          src={game.thumbnail}
          alt={game.title}
          className={styles.thumbnail}
        />
      </div>
      <div className={styles.title}>{game.title}</div>
    </button>
  );
};
