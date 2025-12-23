import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../../components/Header/Header';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { api, Game } from '../../services/api';
import { haptic } from '../../providers/TelegramProvider';
import styles from './GameDetailPage.module.css';

// Bet tiers configuration: entry and win amounts
const BET_TIERS = [
  { win: 1, entry: 0.60 },
  { win: 2, entry: 1.20 },
  { win: 3, entry: 1.80 },
  { win: 4, entry: 2.40 },
  { win: 8, entry: 4.80 },
  { win: 16, entry: 9.60 },
  { win: 20, entry: 12.00 },
];

export function GameDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [betTierIndex, setBetTierIndex] = useState(0); // Start with $1 to win

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

  const handleBack = () => {
    haptic.light();
    navigate('/');
  };

  const handleDecrease = () => {
    haptic.light();
    if (betTierIndex > 0) {
      setBetTierIndex(betTierIndex - 1);
    }
  };

  const handleIncrease = () => {
    haptic.light();
    if (betTierIndex < BET_TIERS.length - 1) {
      setBetTierIndex(betTierIndex + 1);
    }
  };

  const handlePlay = () => {
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

  const currentTier = BET_TIERS[betTierIndex];
  const totalSlots = BET_TIERS.length;
  const filledSlots = betTierIndex + 1; // Dynamic: fills based on selected tier

  if (loading) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.loading}>Loading...</div>
        </main>
        <BottomNavBar />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.error}>
            <div className={styles.errorTitle}>Oops!</div>
            <div className={styles.errorMessage}>
              {error || 'Game not found'}
            </div>
            <button className={styles.errorButton} onClick={handleRetry}>
              Try Again
            </button>
          </div>
        </main>
        <BottomNavBar />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />

      {/* Hero Section with Back Button */}
      <section className={styles.heroSection}>
        <button className={styles.backButton} onClick={handleBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <img
          src={game.thumbnail}
          alt={game.title}
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay}>
          <h1 className={styles.gameTitle}>{game.title}</h1>
        </div>
      </section>

      {/* Bet Selection Section */}
      <main className={styles.betSection}>
        {/* Win Amount Selector */}
        <div className={styles.winSection}>
          <div className={styles.winLabel}>
            <span>WIN</span>
            <div className={styles.winUnderline} />
          </div>
          <div className={styles.winAmountRow}>
            <button
              className={styles.stepperButton}
              onClick={handleDecrease}
              disabled={betTierIndex === 0}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
            <span className={styles.winAmount}>${currentTier.win}</span>
            <button
              className={styles.stepperButton}
              onClick={handleIncrease}
              disabled={betTierIndex === BET_TIERS.length - 1}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Entry Fee */}
        <div className={styles.entryFee}>
          <span className={styles.entryAmount}>${currentTier.entry.toFixed(2)}</span>
          <span className={styles.entryLabel}> Entry</span>
        </div>

        {/* Entry Bar - fills dynamically based on tier */}
        <div className={styles.entryBarContainer}>
          {Array.from({ length: totalSlots }).map((_, index) => {
            const isFilled = index < filledSlots;
            return (
              <div
                key={index}
                className={`${styles.entryBarSlot} ${isFilled ? styles.entryBarFilled : styles.entryBarEmpty}`}
              />
            );
          })}
        </div>

        {/* Play Button */}
        <button className={styles.playButton} onClick={handlePlay}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5V19L19 12L8 5Z"/>
          </svg>
          <span>Play</span>
        </button>
      </main>

      <BottomNavBar />
    </div>
  );
}
