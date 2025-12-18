import {
  Header,
  ActionCard,
  PlaceholderCard,
  FeaturedCard,
  Section,
  GameGrid,
  Game,
} from '../../components';
import { featuredGame, popularGames, newGames } from '../../data/games';
import styles from './HomePage.module.css';

export const HomePage = () => {
  const handleGameClick = (game: Game) => {
    console.log(game.id);
  };

  const handleSurpriseMe = () => {
    const allGames = [...popularGames, ...newGames];
    const randomGame = allGames[Math.floor(Math.random() * allGames.length)];
    console.log(randomGame.id);
  };

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
        <Section title="Featured">
          <FeaturedCard game={featuredGame} onClick={handleGameClick} />
        </Section>

        {/* Popular Games Section */}
        <Section title="Popular Games">
          <GameGrid games={popularGames} onGameClick={handleGameClick} />
        </Section>

        {/* New Games Section */}
        <Section title="New Games">
          <GameGrid games={newGames} onGameClick={handleGameClick} />
        </Section>
      </main>
    </div>
  );
};
