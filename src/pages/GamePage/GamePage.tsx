import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { UnityGame } from '../../components/UnityGame';

// Map game IDs to their Unity build slugs
const GAME_SLUGS: Record<string, string> = {
  'mahjong-dash': 'mahjong3',
  'puzzle-master': 'mahjong-dash',
};

export const GamePage = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const gameSlug = gameId ? GAME_SLUGS[gameId] : null;
  const levelParam = searchParams.get('level');
  const levelData = levelParam ? parseInt(levelParam, 10) : undefined;

  if (!gameSlug) {
    return (
      <div style={{ padding: 20, color: 'white', textAlign: 'center' }}>
        <h1>Game not found</h1>
        <button onClick={() => navigate('/')}>Back to Home</button>
      </div>
    );
  }

  return <UnityGame gameSlug={gameSlug} levelData={levelData} onBack={() => navigate('/')} />;
};
