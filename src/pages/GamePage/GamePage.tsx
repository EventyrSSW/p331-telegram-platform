import { useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { UnityGame } from '../../components/UnityGame';

// Map game IDs to their Unity build slugs
const GAME_SLUGS: Record<string, string> = {
  'mahjong-dash': 'mahjong3',
  'puzzle-master': 'mahjong-dash',
};

interface LocationState {
  level?: number;
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

  const gameSlug = gameId ? GAME_SLUGS[gameId] : null;
  const state = location.state as LocationState | null;
  const levelData = state?.level;

  console.log('[GamePage] Received level from navigation state:', levelData);

  const handleLevelComplete = useCallback((data: LevelCompleteData) => {
    console.log('[GamePage] Level complete, navigating to details with result:', data);
    navigate(`/game/${gameId}/details`, {
      state: { gameResult: data },
      replace: true,
    });
  }, [gameId, navigate]);

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
