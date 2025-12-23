import { useState, useRef, useEffect } from 'react';
import { Game } from '../GameCard';
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
      video.play().catch(() => {
        // Autoplay failed, show thumbnail
        setVideoFailed(true);
      });
    };

    // If video is already ready, play immediately
    if (video.readyState >= 3) {
      tryPlay();
    }

    // Also listen for events in case video isn't ready yet
    video.addEventListener('canplay', tryPlay);
    video.addEventListener('loadeddata', tryPlay);

    return () => {
      video.removeEventListener('canplay', tryPlay);
      video.removeEventListener('loadeddata', tryPlay);
    };
  }, [game.videoUrl]);

  const handleVideoError = () => {
    setVideoFailed(true);
  };

  const showVideo = game.videoUrl && !videoFailed;

  return (
    <div
      className={styles.slide}
      onClick={() => onGameClick(game)}
    >
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
        className={styles.image}
        style={{ display: showVideo ? 'none' : 'block' }}
      />
      <div className={styles.overlay}>
        <span className={styles.category}>{game.category}</span>
        <h3 className={styles.title}>{game.title}</h3>
        <button
          className={styles.playButton}
          onClick={(e) => {
            e.stopPropagation();
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
