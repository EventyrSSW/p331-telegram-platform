import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { StorePage } from './pages/StorePage';
import { GamePage } from './pages/GamePage';
import { GameDetailPage } from './pages/GameDetailPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage/SettingsPage';
import { CashOutPage } from './pages/CashOutPage/CashOutPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/store',
    element: <StorePage />,
  },
  {
    path: '/game/:gameId/details',
    element: <GameDetailPage />,
  },
  {
    path: '/game/:gameId',
    element: <GamePage />,
  },
  {
    path: '/leaderboard',
    element: <LeaderboardPage />,
  },
  {
    path: '/profile',
    element: <ProfilePage />,
  },
  {
    path: '/settings',
    element: <SettingsPage />,
  },
  {
    path: '/cashout',
    element: <CashOutPage />,
  },
]);
