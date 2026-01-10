import { useEffect, useState, useRef } from 'react';
import { Header, BottomNavBar } from '../../components';
import { nakamaService, LeaderboardRecord, LeaderboardResponse } from '../../services/nakama';
import styles from './LeaderboardPage.module.css';

const getRankClass = (rank: number): string => {
  if (rank === 1) return styles.rankTop1;
  if (rank === 2) return styles.rankTop2;
  if (rank === 3) return styles.rankTop3;
  return '';
};

const formatScore = (score: number): string => {
  return score.toLocaleString();
};

const getAvatarEmoji = (username: string): string => {
  const emojis = ['👑', '🎮', '💎', '🍀', '🏆', '🃏', '🧩', '👾', '♟️', '⚽', '🎯', '🎲'];
  const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return emojis[hash % emojis.length];
};

export const LeaderboardPage = () => {
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [myRecord, setMyRecord] = useState<LeaderboardRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchInitiatedRef = useRef(false);

  useEffect(() => {
    if (fetchInitiatedRef.current) return;
    fetchInitiatedRef.current = true;
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    if (!nakamaService.isAuthenticated()) {
      setLoading(false);
      setError('Please sign in to view the leaderboard');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response: LeaderboardResponse = await nakamaService.getLeaderboard(50);
      setRecords(response.records);
      setMyRecord(response.myRecord);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const myRankVisible = myRecord && records.some(r => r.odredacted === myRecord.odredacted);

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <h1 className={styles.title}>Leaderboard</h1>

        {loading ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>⏳</span>
            <p>Loading...</p>
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>⚠️</span>
            <p>{error}</p>
          </div>
        ) : records.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🏆</span>
            <p>No players yet. Be the first!</p>
          </div>
        ) : (
          <>
            <div className={styles.leaderboardList}>
              {records.map((player) => (
                <div key={player.odredacted} className={styles.playerCard}>
                  <div className={`${styles.rank} ${getRankClass(player.rank)}`}>
                    {player.rank}
                  </div>
                  <div className={styles.avatar}>
                    {player.avatarUrl ? (
                      <img src={player.avatarUrl} alt="" className={styles.avatarImage} />
                    ) : (
                      getAvatarEmoji(player.username)
                    )}
                  </div>
                  <div className={styles.playerInfo}>
                    <span className={styles.playerName}>
                      {player.displayName || player.username}
                    </span>
                    <span className={styles.playerStats}>
                      {player.subscore} games played
                    </span>
                  </div>
                  <div className={styles.score}>{formatScore(player.score)} wins</div>
                </div>
              ))}
            </div>

            {myRecord && !myRankVisible && (
              <div className={styles.myRankSection}>
                <div className={styles.myRankDivider}>...</div>
                <div className={`${styles.playerCard} ${styles.myRankCard}`}>
                  <div className={styles.rank}>{myRecord.rank}</div>
                  <div className={styles.avatar}>
                    {myRecord.avatarUrl ? (
                      <img src={myRecord.avatarUrl} alt="" className={styles.avatarImage} />
                    ) : (
                      getAvatarEmoji(myRecord.username)
                    )}
                  </div>
                  <div className={styles.playerInfo}>
                    <span className={styles.playerName}>
                      {myRecord.displayName || myRecord.username} (You)
                    </span>
                    <span className={styles.playerStats}>
                      {myRecord.subscore} games played
                    </span>
                  </div>
                  <div className={styles.score}>{formatScore(myRecord.score)} wins</div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <BottomNavBar />
    </div>
  );
};
