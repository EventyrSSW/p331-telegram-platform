import React from 'react';
import { GameCard, type Game } from '../GameCard';
import styles from './GameGrid.module.css';

interface GameGridProps {
  games: Game[];
  onGameClick?: (game: Game) => void;
}

export const GameGrid: React.FC<GameGridProps> = ({ games, onGameClick }) => {
  return (
    <div className={styles.grid}>
      {games.map((game) => (
        <GameCard key={game.id} game={game} onClick={onGameClick} />
      ))}
    </div>
  );
};
