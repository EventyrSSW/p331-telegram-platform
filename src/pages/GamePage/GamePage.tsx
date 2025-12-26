import { useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { UnityGame } from '../../components/UnityGame';
import { MatchPresenceOverlay } from '../../components/MatchPresenceOverlay/MatchPresenceOverlay';
import { useNakama } from '../../contexts/NakamaContext';

// Map game IDs to their Unity build slugs
const GAME_SLUGS: Record<string, string> = {
  'mahjong-dash': 'mahjong3',
  'puzzle-master': 'mahjong-dash',
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
}

export const GamePage = () => {
  const { gameId } = useParams<{ gameId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { match, submitScore, setMatchStatus } = useNakama();
  const gameStartTime = useRef<number>(Date.now());

  const gameSlug = gameId ? GAME_SLUGS[gameId] : null;
  const state = location.state as LocationState | null;
  const levelData = state?.level ?? match.level?.id;
  const matchId = state?.matchId ?? match.matchId;

  console.log('[GamePage] Render state:', {
    levelData,
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
    console.log('[GamePage] Level complete:', data);

    // If in a match, submit score to Nakama
    if (matchId) {
      const timeMs = Date.now() - gameStartTime.current;
      console.log('[GamePage] Submitting score to match:', matchId, 'score:', data.score, 'time:', timeMs);
      submitScore(data.score, timeMs);
    }

    // Navigate to game detail page with result
    navigate(`/game/${gameId}/details`, {
      state: { gameResult: data },
      replace: true,
    });
  }, [gameId, navigate, matchId, submitScore]);

  const handleBack = useCallback(() => {
    navigate(`/game/${gameId}/details`);
  }, [gameId, navigate]);

  if (!gameSlug) {
    return (
      <div style={{ padding: 20, color: 'white', textAlign: 'center' }}>
        <h1>Game not found</h1>
        <button onClick={() => navigate('/')}>Back to Home</button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MatchPresenceOverlay />
      <UnityGame
        gameSlug={gameSlug}
        levelData={levelData}
        onBack={handleBack}
        onLevelComplete={handleLevelComplete}
      />
    </div>
  );
};
