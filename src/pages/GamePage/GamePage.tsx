import { useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { UnityGame } from '../../components/UnityGame';
import { useMatch } from '../../hooks/useMatch';

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
  const match = useMatch();
  const gameStartTime = useRef<number>(Date.now());

  const gameSlug = gameId ? GAME_SLUGS[gameId] : null;
  const state = location.state as LocationState | null;
  const levelData = state?.level;
  const matchId = state?.matchId;

  console.log('[GamePage] Received state:', { levelData, matchId });

  const handleLevelComplete = useCallback((data: LevelCompleteData) => {
    console.log('[GamePage] Level complete:', data);

    // If in a match, submit score to Nakama
    if (matchId) {
      const timeMs = Date.now() - gameStartTime.current;
      console.log('[GamePage] Submitting score to match:', matchId, 'score:', data.score, 'time:', timeMs);
      match.submitScore(data.score, timeMs);
    }

    // Navigate to game detail page with result
    navigate(`/game/${gameId}/details`, {
      state: { gameResult: data },
      replace: true,
    });
  }, [gameId, navigate, matchId, match]);

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
    <UnityGame
      gameSlug={gameSlug}
      levelData={levelData}
      onBack={handleBack}
      onLevelComplete={handleLevelComplete}
    />
  );
};
