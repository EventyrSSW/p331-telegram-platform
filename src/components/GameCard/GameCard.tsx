import React, { useRef, useState, useEffect } from 'react';
import { haptic } from '../../providers/TelegramProvider';
import styles from './GameCard.module.css';

export interface Game {
  id: string;
  slug: string;
  title: string;
  thumbnail: string;
  category: string;
  featured?: boolean;
  topPromoted?: boolean;
  videoUrl?: string;
  locked?: boolean;
}

interface GameCardProps {
  game: Game;
  onClick?: (game: Game) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  const handleClick = () => {
    if (game.locked) return; // Don't allow clicks on locked games
    haptic.light();
    onClick?.(game);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !game.videoUrl) return;

    const tryPlay = () => {
      if (video.paused) {
        video.play().catch(() => {
          setVideoFailed(true);
        });
      }
    };

    // Try immediately
    tryPlay();

    // Retry after a short delay (for first load timing)
    const timeout = setTimeout(tryPlay, 100);

    // Also listen for events
    video.addEventListener('canplay', tryPlay);
    video.addEventListener('loadeddata', tryPlay);
    video.addEventListener('loadedmetadata', tryPlay);

    return () => {
      clearTimeout(timeout);
      video.removeEventListener('canplay', tryPlay);
      video.removeEventListener('loadeddata', tryPlay);
      video.removeEventListener('loadedmetadata', tryPlay);
    };
  }, [game.videoUrl]);

  const handleVideoError = () => {
    setVideoFailed(true);
  };

  const showVideo = game.videoUrl && !videoFailed;

  return (
    <button className={`${styles.card} ${game.locked ? styles.locked : ''}`} onClick={handleClick}>
      {/* Ribbon Badge */}
      {game.featured && !game.locked && (
        <div className={styles.ribbonContainer}>
          <div className={`${styles.ribbon} ${styles.ribbonFeatured}`}>
            Featured
          </div>
        </div>
      )}
      {game.topPromoted && !game.featured && !game.locked && (
        <div className={styles.ribbonContainer}>
          <div className={`${styles.ribbon} ${styles.ribbonHot}`}>
            Hot
          </div>
        </div>
      )}

      <div className={styles.thumbnailWrapper}>
        {showVideo && !game.locked && (
          <video
            ref={videoRef}
            className={styles.video}
            src={game.videoUrl}
            poster={game.thumbnail}
            autoPlay
            muted
            loop
            playsInline
            onError={handleVideoError}
          />
        )}
        <img
          src={game.thumbnail}
          alt={game.title}
          className={styles.thumbnail}
          style={{ display: showVideo && !game.locked ? 'none' : 'block' }}
        />

        {/* Locked Overlay */}
        {game.locked && (
          <div className={styles.lockedOverlay}>
            <div className={styles.lockIcon}>🔒</div>
            <div className={styles.lockText}>Unlock Soon</div>
          </div>
        )}
      </div>
      <div className={styles.titleArea}>
        <span className={styles.title}>{game.title}</span>
      </div>
    </button>
  );
};
