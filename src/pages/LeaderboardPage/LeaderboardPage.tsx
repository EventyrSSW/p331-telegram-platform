import { Header, BottomNavBar } from '../../components';
import styles from './LeaderboardPage.module.css';

interface LeaderboardPlayer {
  id: string;
  rank: number;
  username: string;
  avatar: string;
  score: number;
  gamesPlayed: number;
}

const MOCK_LEADERBOARD: LeaderboardPlayer[] = [
  { id: '1', rank: 1, username: 'CryptoKing', avatar: '👑', score: 125000, gamesPlayed: 342 },
  { id: '2', rank: 2, username: 'GameMaster', avatar: '🎮', score: 98500, gamesPlayed: 287 },
  { id: '3', rank: 3, username: 'TonPlayer', avatar: '💎', score: 87200, gamesPlayed: 256 },
  { id: '4', rank: 4, username: 'LuckyWinner', avatar: '🍀', score: 72100, gamesPlayed: 198 },
  { id: '5', rank: 5, username: 'ProGamer', avatar: '🏆', score: 65800, gamesPlayed: 175 },
  { id: '6', rank: 6, username: 'CardShark', avatar: '🃏', score: 54300, gamesPlayed: 163 },
  { id: '7', rank: 7, username: 'PuzzlePro', avatar: '🧩', score: 48900, gamesPlayed: 142 },
  { id: '8', rank: 8, username: 'ArcadeAce', avatar: '👾', score: 42500, gamesPlayed: 128 },
  { id: '9', rank: 9, username: 'BoardBoss', avatar: '♟️', score: 38200, gamesPlayed: 115 },
  { id: '10', rank: 10, username: 'SportsStar', avatar: '⚽', score: 31800, gamesPlayed: 98 },
];

const getRankClass = (rank: number): string => {
  if (rank === 1) return styles.rankTop1;
  if (rank === 2) return styles.rankTop2;
  if (rank === 3) return styles.rankTop3;
  return '';
};

const formatScore = (score: number): string => {
  return score.toLocaleString();
};

export const LeaderboardPage = () => {
  const players = MOCK_LEADERBOARD;

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <h1 className={styles.title}>Leaderboard</h1>

        {players.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🏆</span>
            <p>No players yet. Be the first!</p>
          </div>
        ) : (
          <div className={styles.leaderboardList}>
            {players.map((player) => (
              <div key={player.id} className={styles.playerCard}>
                <div className={`${styles.rank} ${getRankClass(player.rank)}`}>
                  {player.rank}
                </div>
                <div className={styles.avatar}>{player.avatar}</div>
                <div className={styles.playerInfo}>
                  <span className={styles.playerName}>{player.username}</span>
                  <span className={styles.playerStats}>
                    {player.gamesPlayed} games played
                  </span>
                </div>
                <div className={styles.score}>{formatScore(player.score)}</div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNavBar />
    </div>
  );
};
