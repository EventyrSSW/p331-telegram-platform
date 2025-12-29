import { useState, useRef, useEffect } from 'react';
import { Game } from '../GameCard';
import { haptic } from '../../providers/TelegramProvider';
import styles from './FeaturedCarousel.module.css';

interface FeaturedCarouselProps {
  games: Game[];
  onGameClick: (game: Game) => void;
}

const VideoSlide = ({ game, onGameClick }: { game: Game; onGameClick: (game: Game) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

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
    <div
      className={styles.slide}
      onClick={() => {
        haptic.light();
        onGameClick(game);
      }}
    >
      {showVideo && (
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
        className={styles.image}
        style={{ display: showVideo ? 'none' : 'block' }}
      />
      <div className={styles.overlay}>
        <div className={styles.leftInfo}>
          <span className={styles.category}>{game.category}</span>
          <h3 className={styles.title}>{game.title}</h3>
        </div>
        <button
          className={styles.playButton}
          onClick={(e) => {
            e.stopPropagation();
            haptic.light();
            onGameClick(game);
          }}
        >
          Play Now
        </button>
      </div>
    </div>
  );
};

export const FeaturedCarousel = ({ games, onGameClick }: FeaturedCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const slideWidth = carousel.clientWidth;
      const newIndex = Math.round(scrollLeft / slideWidth);
      setActiveIndex(newIndex);
    };

    carousel.addEventListener('scroll', handleScroll);
    return () => carousel.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToIndex = (index: number) => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const slideWidth = carousel.clientWidth;
    carousel.scrollTo({
      left: slideWidth * index,
      behavior: 'smooth',
    });
  };

  if (games.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.carousel} ref={carouselRef}>
        {games.map((game) => (
          <VideoSlide key={game.id} game={game} onGameClick={onGameClick} />
        ))}
      </div>
      {games.length > 1 && (
        <div className={styles.indicators}>
          {games.map((_, index) => (
            <button
              key={index}
              className={`${styles.indicator} ${index === activeIndex ? styles.indicatorActive : ''}`}
              onClick={() => scrollToIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
