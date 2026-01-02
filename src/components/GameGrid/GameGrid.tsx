import React from 'react';
import { GameCard, type Game } from '../GameCard';
import styles from './GameGrid.module.css';

interface GameGridProps {
  games: Game[];
  onGameClick?: (game: Game) => void;
  locked?: boolean;
}

export const GameGrid: React.FC<GameGridProps> = ({ games, onGameClick, locked }) => {
  return (
    <div className={styles.grid}>
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={locked ? { ...game, locked: true } : game}
          onClick={onGameClick}
        />
      ))}
    </div>
  );
};
