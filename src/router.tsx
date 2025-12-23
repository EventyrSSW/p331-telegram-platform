import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { StorePage } from './pages/StorePage';
import { GamePage } from './pages/GamePage';

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
    path: '/game/:gameId',
    element: <GamePage />,
  },
]);
