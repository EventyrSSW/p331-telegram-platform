import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../../components/Header/Header';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { api, Game } from '../../services/api';
import { haptic } from '../../providers/TelegramProvider';
import styles from './GameDetailPage.module.css';

export function GameDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGame() {
      if (!gameId) {
        setError('Game ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await api.getGame(gameId);
        setGame(response.game);
      } catch (err) {
        console.error('Failed to fetch game:', err);
        setError(err instanceof Error ? err.message : 'Failed to load game details');
      } finally {
        setLoading(false);
      }
    }

    fetchGame();
  }, [gameId]);

  const handlePlayNow = () => {
    haptic.medium();
    if (gameId) {
      navigate(`/game/${gameId}`);
    }
  };

  const handleRetry = () => {
    if (gameId) {
      setLoading(true);
      setError(null);
      api.getGame(gameId)
        .then(response => setGame(response.game))
        .catch(err => setError(err instanceof Error ? err.message : 'Failed to load game details'))
        .finally(() => setLoading(false));
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={`full-${i}`} className={styles.star}>★</span>);
    }

    if (hasHalfStar) {
      stars.push(<span key="half" className={styles.star}>★</span>);
    }

    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className={styles.starEmpty}>★</span>);
    }

    return stars;
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        Loading game details...
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className={styles.error}>
        <div className={styles.errorTitle}>Oops!</div>
        <div className={styles.errorMessage}>
          {error || 'Game not found'}
        </div>
        <button className={styles.errorButton} onClick={handleRetry}>
          Try Again
        </button>
      </div>
    );
  }

  const heroImage = game.mainUrl || game.thumbnail;
  const screenshots = [
    game.screen1Url,
    game.screen2Url,
    game.screen3Url,
    game.screen4Url,
  ].filter(Boolean);

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <section className={styles.heroSection}>
          <img
            src={heroImage}
            alt={game.title}
            className={styles.heroImage}
          />
          <div className={styles.heroOverlay}>
            <h1 className={styles.gameTitle}>{game.title}</h1>
          </div>
        </section>

        {screenshots.length > 0 && (
          <section className={styles.screenshotsSection}>
            <h2 className={styles.sectionTitle}>Screenshots</h2>
            <div className={styles.screenshotCarousel}>
              {screenshots.map((screenshot, index) => (
                <div key={index} className={styles.screenshotItem}>
                  <img
                    src={screenshot}
                    alt={`Screenshot ${index + 1}`}
                    className={styles.screenshotImage}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={styles.reviewsSection}>
          <div className={styles.reviewsCard}>
            <div className={styles.ratingValue}>
              {game.rating?.toFixed(1) || '0.0'}
            </div>
            <div className={styles.stars}>
              {renderStars(game.rating || 0)}
            </div>
            <div className={styles.reviewCount}>
              {game.reviewCount || 0} reviews
            </div>
          </div>
        </section>
      </main>

      <section className={styles.ctaSection}>
        <button className={styles.playButton} onClick={handlePlayNow}>
          Play Now
        </button>
      </section>

      <BottomNavBar />
    </div>
  );
}
