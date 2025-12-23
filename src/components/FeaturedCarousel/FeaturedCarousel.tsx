import { useState, useRef, useEffect } from 'react';
import { Game } from '../GameCard';
import styles from './FeaturedCarousel.module.css';

interface FeaturedCarouselProps {
  games: Game[];
  onGameClick: (game: Game) => void;
}

// Extract YouTube video ID from various URL formats
const getYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
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
        {games.map((game, index) => {
          const videoId = game.videoUrl ? getYouTubeVideoId(game.videoUrl) : null;
          const isActive = index === activeIndex;

          return (
            <div
              key={game.id}
              className={styles.slide}
              onClick={() => !videoId && onGameClick(game)}
            >
              {videoId ? (
                <iframe
                  className={styles.video}
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=${isActive ? 1 : 0}&mute=1&loop=1&playlist=${videoId}&playsinline=1&controls=0&modestbranding=1&rel=0`}
                  title={game.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <img
                  src={game.thumbnail}
                  alt={game.title}
                  className={styles.image}
                />
              )}
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
        })}
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
