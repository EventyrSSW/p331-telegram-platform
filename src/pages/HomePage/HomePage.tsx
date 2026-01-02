import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../../providers/TelegramProvider';
import { useModal } from '../../contexts/ModalContext';

// Track if initial haptic has been triggered this session
let initialHapticTriggered = false;
import {
  Header,
  FeaturedCarousel,
  GameGrid,
  Section,
  BottomNavBar,
  Game,
} from '../../components';
import { WelcomeBonusBanner } from '../../components/WelcomeBonusBanner/WelcomeBonusBanner';
import { useGames } from '../../contexts/GamesContext';
import styles from './HomePage.module.css';

export const HomePage = () => {
  const { games, featuredGames, isLoading, error, refetch } = useGames();
  const { openAddTonModal } = useModal();
  const navigate = useNavigate();

  // Haptic feedback only on first app load
  useEffect(() => {
    if (!isLoading && !error && !initialHapticTriggered) {
      initialHapticTriggered = true;
      haptic.medium();
    }
  }, [isLoading, error]);

  const handleGameClick = (game: Game) => {
    navigate(`/game/${game.slug}/details`);
  };

  const handleBonusClick = () => {
    openAddTonModal();
  };

  if (error) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.error}>
            <p>Error: {error}</p>
            <button onClick={refetch}>Retry</button>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.loading}>Loading games...</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        {/* Featured Games Carousel */}
        {featuredGames.length > 0 && (
          <section className={styles.featuredSection}>
            <FeaturedCarousel games={featuredGames} onGameClick={handleGameClick} />
          </section>
        )}

        {/* Welcome Bonus Banner */}
        <section className={styles.bonusSection}>
          <WelcomeBonusBanner variant="blue" onDepositClick={handleBonusClick} />
        </section>

        {/* Games Grid - Locked/Coming Soon */}
        <Section title="Soon to Be Unlocked">
          <GameGrid games={games} onGameClick={handleGameClick} locked />
        </Section>
      </main>

      <BottomNavBar />
    </div>
  );
};
