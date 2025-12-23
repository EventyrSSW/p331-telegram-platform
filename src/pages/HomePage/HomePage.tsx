import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../../providers/TelegramProvider';

// Track if initial haptic has been triggered this session
let initialHapticTriggered = false;
import {
  Header,
  FeaturedCarousel,
  CategoryFilter,
  GameGrid,
  Section,
  BottomNavBar,
  Game,
} from '../../components';
import { useGames } from '../../hooks/useGames';
import styles from './HomePage.module.css';

export const HomePage = () => {
  const { games, featuredGames, isLoading, error, refetch } = useGames();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  // Filter games by selected category
  const filteredGames = selectedCategory
    ? games.filter((game) => game.category.toLowerCase() === selectedCategory.toLowerCase())
    : games;

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

        {/* Category Filter */}
        <section className={styles.categoriesSection}>
          <CategoryFilter
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </section>

        {/* Games Grid */}
        <Section
          title={selectedCategory ? `${selectedCategory} Games` : 'Most Popular Games'}
        >
          <GameGrid games={filteredGames} onGameClick={handleGameClick} />
        </Section>
      </main>

      <BottomNavBar />
    </div>
  );
};
