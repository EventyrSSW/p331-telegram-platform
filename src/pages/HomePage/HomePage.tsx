import {
  Header,
  ActionCard,
  PlaceholderCard,
  FeaturedCard,
  Section,
  GameGrid,
  Game,
} from '../../components';
import { useGames } from '../../hooks/useGames';
import styles from './HomePage.module.css';

export const HomePage = () => {
  const { games, featuredGame, isLoading, error, refetch } = useGames();

  const handleGameClick = (game: Game) => {
    console.log(game.id);
  };

  const handleSurpriseMe = () => {
    if (games.length > 0) {
      const randomGame = games[Math.floor(Math.random() * games.length)];
      console.log(randomGame.id);
    }
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
        {/* Quick Actions Section */}
        <div className={styles.quickActions}>
          <div className={styles.actionItem}>
            <ActionCard
              icon="layers"
              label="Surprise me!"
              onClick={handleSurpriseMe}
            />
          </div>
          <div className={styles.actionItem}>
            <PlaceholderCard icon="clock" />
          </div>
          <div className={styles.actionItem}>
            <PlaceholderCard icon="clock" />
          </div>
        </div>

        {/* Featured Section */}
        {featuredGame && (
          <Section title="Featured">
            <FeaturedCard game={featuredGame} onPlay={handleGameClick} />
          </Section>
        )}

        {/* Popular Games Section */}
        <Section title="Popular Games">
          <GameGrid games={games} onGameClick={handleGameClick} />
        </Section>

        {/* New Games Section */}
        <Section title="New Games">
          <GameGrid games={games} onGameClick={handleGameClick} />
        </Section>
      </main>
    </div>
  );
};
