import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, BottomNavBar, ResultCard } from '../../components';
import { useGames } from '../../contexts/GamesContext';
import { useNakama } from '../../contexts/NakamaContext';
import { MatchHistoryEntry, nakamaService } from '../../services/nakama';
import { haptic } from '../../providers/TelegramProvider';
import styles from './ResultsPage.module.css';

interface GroupedResults {
  pending: MatchHistoryEntry[];
  byDate: { [date: string]: MatchHistoryEntry[] };
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function groupResults(history: MatchHistoryEntry[]): GroupedResults {
  const pending: MatchHistoryEntry[] = [];
  const byDate: { [date: string]: MatchHistoryEntry[] } = {};

  history.forEach(entry => {
    // Pending statuses
    if (['waiting', 'ready', 'playing', 'submitted'].includes(entry.status)) {
      pending.push(entry);
      return;
    }

    // Completed/Cancelled - group by date
    const dateKey = formatDate(entry.updatedAt);
    if (!byDate[dateKey]) {
      byDate[dateKey] = [];
    }
    byDate[dateKey].push(entry);
  });

  return { pending, byDate };
}

export function ResultsPage() {
  const navigate = useNavigate();
  const { allGames, isLoading: gamesLoading } = useGames();
  const { rejoinMatch } = useNakama();
  const [history, setHistory] = useState<MatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!nakamaService.isAuthenticated()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await nakamaService.getMatchHistory(50);
      setHistory(response.history || []);
    } catch (err) {
      console.error('[ResultsPage] Failed to fetch history:', err);
      setError('Failed to load match history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const getGameBySlug = useCallback((gameId: string) => {
    return allGames.find(g => g.slug === gameId || g.id === gameId) || null;
  }, [allGames]);

  const handleContinue = async (entry: MatchHistoryEntry) => {
    haptic.medium();

    try {
      // Sync status before reconnecting
      const syncResult = await nakamaService.syncMatchStatus(entry.matchId);

      if (!syncResult.canReconnect) {
        // Match has ended, refresh the page
        alert('Match has ended');
        fetchHistory();
        return;
      }

      // Rejoin the match via context (handles socket connection and presences)
      console.log('[ResultsPage] Rejoining match via context:', entry.matchId);
      const success = await rejoinMatch({
        matchId: entry.matchId,
        gameId: entry.gameId,
        betAmount: entry.betAmount,
        levelId: entry.levelId,
        matchType: entry.matchType,
      });

      if (!success) {
        alert('Failed to rejoin match. Please try again.');
        return;
      }

      // Navigate to game page with match data
      const game = getGameBySlug(entry.gameId);
      if (game) {
        navigate(`/game/${game.slug}`, {
          state: {
            level: entry.levelId,
            matchId: entry.matchId,
            betAmount: entry.betAmount,
          },
        });
      }
    } catch (err) {
      console.error('[ResultsPage] Failed to reconnect:', err);
      alert('Failed to reconnect. Please try again.');
    }
  };

  const handleCancel = async (entry: MatchHistoryEntry) => {
    haptic.medium();

    const confirmed = window.confirm(`Cancel match and get refund of ${(entry.betAmount / 100).toFixed(2)} TON?`);
    if (!confirmed) return;

    try {
      const result = await nakamaService.cancelMatch(entry.matchId);

      if (result.success) {
        alert(`Match cancelled. ${((result.refundAmount ?? 0) / 100).toFixed(2)} TON refunded.`);
        fetchHistory(); // Refresh the list
      } else {
        alert(result.error || 'Failed to cancel match');
      }
    } catch (err) {
      console.error('[ResultsPage] Failed to cancel match:', err);
      alert('Failed to cancel match. Please try again.');
    }
  };

  const handleRetry = () => {
    fetchHistory();
  };

  const grouped = groupResults(history);
  const dateKeys = Object.keys(grouped.byDate);
  const hasAnyResults = grouped.pending.length > 0 || dateKeys.length > 0;

  if (gamesLoading) {
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

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        {/* Loading State */}
        {loading && (
          <div className={styles.loading}>Loading match history...</div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className={styles.error}>
            <p>{error}</p>
            <button className={styles.retryButton} onClick={handleRetry}>Try Again</button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && !hasAnyResults && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🎮</span>
            <p className={styles.emptyTitle}>No match results yet</p>
            <p className={styles.emptySubtext}>Play a game to see your results here!</p>
          </div>
        )}

        {/* Pending Section */}
        {!loading && grouped.pending.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Pending</h2>
            <div className={styles.cardList}>
              {grouped.pending.map(entry => (
                <ResultCard
                  key={entry.matchId}
                  entry={entry}
                  game={getGameBySlug(entry.gameId)}
                  onContinue={entry.status === 'playing' ? () => handleContinue(entry) : undefined}
                  onCancel={entry.status === 'waiting' ? () => handleCancel(entry) : undefined}
                />
              ))}
            </div>
          </section>
        )}

        {/* History Sections by Date */}
        {!loading && dateKeys.map(dateKey => (
          <section key={dateKey} className={styles.section}>
            <h2 className={styles.sectionTitle}>{dateKey}</h2>
            <div className={styles.cardList}>
              {grouped.byDate[dateKey].map(entry => (
                <ResultCard
                  key={entry.matchId}
                  entry={entry}
                  game={getGameBySlug(entry.gameId)}
                />
              ))}
            </div>
          </section>
        ))}
      </main>
      <BottomNavBar />
    </div>
  );
}
