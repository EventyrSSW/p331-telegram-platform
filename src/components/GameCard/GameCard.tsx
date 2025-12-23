import React, { useRef, useState, useEffect } from 'react';
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
}

interface GameCardProps {
  game: Game;
  onClick?: (game: Game) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  const handleClick = () => {
    onClick?.(game);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !game.videoUrl) return;

    // Try to play video when it's ready
    const handleCanPlay = () => {
      video.play().catch(() => {
        // Autoplay failed, show thumbnail
        setVideoFailed(true);
      });
    };

    video.addEventListener('canplay', handleCanPlay);
    return () => video.removeEventListener('canplay', handleCanPlay);
  }, [game.videoUrl]);

  const handleVideoError = () => {
    setVideoFailed(true);
  };

  const showVideo = game.videoUrl && !videoFailed;

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
        {showVideo && (
          <video
            ref={videoRef}
            className={styles.video}
            src={game.videoUrl}
            poster={game.thumbnail}
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
          style={{ display: showVideo ? 'none' : 'block' }}
        />
      </div>
      <div className={styles.titleArea}>
        <span className={styles.title}>{game.title}</span>
      </div>
    </button>
  );
};
