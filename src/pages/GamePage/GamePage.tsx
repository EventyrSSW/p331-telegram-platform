import { useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { UnityGame } from '../../components/UnityGame';
import { MatchPresenceOverlay } from '../../components/MatchPresenceOverlay/MatchPresenceOverlay';
import { useNakama } from '../../contexts/NakamaContext';
import styles from './GamePage.module.css';

// Map game IDs to their Unity build slugs
const GAME_SLUGS: Record<string, string> = {
  'mahjong-dash': 'mahjong-dash',
  'puzzle-master': 'puzzle-master',
};

interface LocationState {
  level?: number;
  matchId?: string;
  betAmount?: number;
}

interface LevelCompleteData {
  level: number;
  score: number;
  coins: number;
  timeLeft?: number;
  timerDuration?: number;
}

export const GamePage = () => {
  const { gameId } = useParams<{ gameId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { match, submitScore, setMatchStatus, leaveMatch } = useNakama();
  const gameStartTime = useRef<number>(Date.now());

  const gameSlug = gameId ? GAME_SLUGS[gameId] : null;
  const state = location.state as LocationState | null;
  const levelData = state?.level ?? match.level?.id;
  const matchId = state?.matchId ?? match.matchId;

  // For mahjong-dash: get levelJson and timeLimit from match
  const levelJson = match.level?.levelJson;
  const timeLimit = match.level?.timeLimit;

  console.log('[GamePage] Render state:', {
    levelData,
    levelJson: levelJson ? levelJson.substring(0, 50) + '...' : null,
    timeLimit,
    matchId,
    matchStatus: match.status,
    presences: match.presences
  });

  // Set status to playing when game starts
  useEffect(() => {
    if (matchId && match.status === 'ready') {
      setMatchStatus('playing');
      gameStartTime.current = Date.now();
    }
  }, [matchId, match.status, setMatchStatus]);

  const handleLevelComplete = useCallback((data: LevelCompleteData) => {
    const timeMs = Date.now() - gameStartTime.current;

    console.log('='.repeat(50));
    console.log('[GamePage] LEVEL COMPLETE EVENT');
    console.log('[GamePage] Data from Unity:', JSON.stringify(data));
    console.log('[GamePage] Match ID:', matchId);
    console.log('[GamePage] Time played:', timeMs, 'ms (', Math.round(timeMs / 1000), 's)');
    console.log('='.repeat(50));

    // If in a match, submit score to Nakama
    if (matchId) {
      console.log('[GamePage] >>> SUBMITTING SCORE TO NAKAMA <<<');
      console.log('[GamePage] Match:', matchId);
      console.log('[GamePage] Score:', data.score);
      console.log('[GamePage] Time:', timeMs, 'ms');
      console.log('[GamePage] TimeLeft:', data.timeLeft);
      console.log('[GamePage] TimerDuration:', data.timerDuration);
      submitScore(data.score, timeMs, {
        timeLeft: data.timeLeft,
        timerDuration: data.timerDuration,
      });
    } else {
      console.log('[GamePage] No matchId - skipping score submission');
    }

    // Navigate to game detail page with result
    navigate(`/game/${gameId}/details`, {
      state: { gameResult: data },
      replace: true,
    });
  }, [gameId, navigate, matchId, submitScore]);

  const handleBack = useCallback(async () => {
    if (matchId) {
      console.log('[GamePage] Leaving match before navigating back:', matchId);
      await leaveMatch();
    }
    navigate(`/game/${gameId}/details`);
  }, [gameId, navigate, matchId, leaveMatch]);

  if (!gameSlug) {
    return (
      <div className={styles.notFoundContainer}>
        <h1 className={styles.notFoundTitle}>Game not found</h1>
        <button className={styles.backButton} onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className={styles.gameContainer}>
      <div className={styles.gameWrapper}>
        <MatchPresenceOverlay />
        <UnityGame
          gameSlug={gameSlug}
          levelData={levelData}
          levelJson={levelJson}
          timeLimit={timeLimit}
          onBack={handleBack}
          onLevelComplete={handleLevelComplete}
        />
      </div>
    </div>
  );
};
