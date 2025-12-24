import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Header } from '../../components/Header/Header';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { api, Game } from '../../services/api';
import { haptic } from '../../providers/TelegramProvider';
import { GameResultModal, GameResultData } from '../../components/GameResultModal';
import { MatchResultModal } from '../../components/MatchResultModal';
import { SearchOpponentModal } from '../../components/SearchOpponentModal';
import { useMatch } from '../../hooks/useMatch';
import { useNakama } from '../../contexts/NakamaContext';
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

interface LocationState {
  gameResult?: GameResultData;
}

export function GameDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const { isConnected } = useNakama();
  const match = useMatch();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [betTierIndex, setBetTierIndex] = useState(0); // Start with $1 to win
  const [showResultModal, setShowResultModal] = useState(false);
  const [gameResult, setGameResult] = useState<GameResultData | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchStatus, setSearchStatus] = useState<'searching' | 'found' | 'starting'>('searching');

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

  useEffect(() => {
    if (locationState?.gameResult) {
      console.log('[GameDetailPage] Received game result:', locationState.gameResult);
      // Clear the state to prevent showing modal on refresh
      window.history.replaceState({}, document.title);
      setGameResult(locationState.gameResult);
      setShowResultModal(true);
    }
  }, [locationState]);

  // Handle match status changes
  useEffect(() => {
    if (match.status === 'waiting') {
      setShowSearchModal(true);
      setSearchStatus('searching');
    } else if (match.status === 'ready' && match.level && gameId) {
      setSearchStatus('found');
      // Brief delay to show "found" animation before navigating
      const timer = setTimeout(() => {
        setShowSearchModal(false);
        console.log('[GameDetailPage] Match ready, navigating to game with level:', match.level?.id);
        navigate(`/game/${gameId}`, {
          state: {
            level: match.level?.id,
            matchId: match.matchId,
            betAmount: match.betAmount,
          },
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [match.status, match.level, match.matchId, match.betAmount, gameId, navigate]);

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

  const handlePlay = useCallback(async () => {
    haptic.medium();
    if (!gameId) return;

    const selectedTier = BET_TIERS[betTierIndex];
    // Convert to cents for Nakama (wallet only accepts integers)
    const betAmount = Math.round(selectedTier.entry * 100);

    if (!isConnected) {
      setError('Not connected to game server');
      return;
    }

    try {
      const result = await match.joinGame(gameId, betAmount);
      if (result?.matchId) {
        console.log('[GameDetailPage] Joined match:', result.matchId);
      }
    } catch (err) {
      console.error('[GameDetailPage] Failed to join game:', err);
      setError(err instanceof Error ? err.message : 'Failed to join game');
    }
  }, [gameId, betTierIndex, isConnected, match]);

  const handleCancelSearch = useCallback(() => {
    haptic.light();
    setShowSearchModal(false);
    match.leaveMatch();
  }, [match]);

  const handleOpponentFound = useCallback(() => {
    setSearchStatus('starting');
  }, []);

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

  const handleCloseResultModal = () => {
    setShowResultModal(false);
    setGameResult(null);
  };

  const handlePlayAgain = () => {
    setShowResultModal(false);
    setGameResult(null);
    handlePlay();
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
        <button
          className={styles.playButton}
          onClick={handlePlay}
          disabled={match.status === 'joining' || match.status === 'waiting'}
        >
          {match.status === 'joining' ? (
            <span>Joining...</span>
          ) : match.status === 'waiting' ? (
            <span>Searching...</span>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5V19L19 12L8 5Z"/>
              </svg>
              <span>Play</span>
            </>
          )}
        </button>
      </main>

      <BottomNavBar />

      <GameResultModal
        isOpen={showResultModal}
        onClose={handleCloseResultModal}
        result={gameResult}
        onPlayAgain={handlePlayAgain}
      />

      <SearchOpponentModal
        isOpen={showSearchModal}
        onCancel={handleCancelSearch}
        status={searchStatus}
        matchType={match.matchType}
        betAmount={Math.round(currentTier.entry * 100)}
        onOpponentFound={handleOpponentFound}
      />

      <MatchResultModal
        isOpen={match.status === 'submitted' || match.status === 'completed'}
        onClose={() => match.reset()}
        status={match.status as 'waiting' | 'playing' | 'submitted' | 'completed'}
        matchType={match.matchType}
        players={[
          { username: 'You', score: match.myScore, isMe: true, isWinner: match.winner === 'You' },
          { username: match.matchType === 'PVH' ? 'House' : 'Opponent', score: match.opponentScore, isMe: false, isWinner: match.winner !== 'You' && match.winner !== null },
        ]}
        myScore={match.myScore}
        payout={match.payout}
        isWinner={match.winner === 'You' || (match.payout !== null && match.payout > 0)}
        onPlayAgain={handlePlayAgain}
      />
    </div>
  );
}
