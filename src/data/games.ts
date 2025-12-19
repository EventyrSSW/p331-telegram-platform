import { Game } from '../components';

export const featuredGame: Game = {
  id: 'featured-1',
  slug: 'epic-quest',
  title: 'Epic Quest',
  thumbnail: 'https://picsum.photos/seed/epic/800/500',
  category: 'Adventure',
};

export const popularGames: Game[] = [
  {
    id: 'popular-1',
    slug: 'space-invaders',
    title: 'Space Invaders',
    thumbnail: 'https://picsum.photos/seed/space/200/200',
    category: 'Arcade',
  },
  {
    id: 'popular-2',
    slug: 'puzzle-master',
    title: 'Puzzle Master',
    thumbnail: 'https://picsum.photos/seed/puzzle/200/200',
    category: 'Puzzle',
  },
  {
    id: 'popular-3',
    slug: 'racing-legends',
    title: 'Racing Legends',
    thumbnail: 'https://picsum.photos/seed/racing/200/200',
    category: 'Racing',
  },
  {
    id: 'popular-4',
    slug: 'card-champion',
    title: 'Card Champion',
    thumbnail: 'https://picsum.photos/seed/cards/200/200',
    category: 'Card',
  },
  {
    id: 'popular-5',
    slug: 'strategy-wars',
    title: 'Strategy Wars',
    thumbnail: 'https://picsum.photos/seed/strategy/200/200',
    category: 'Strategy',
  },
  {
    id: 'popular-6',
    slug: 'mega-jump',
    title: 'Mega Jump',
    thumbnail: 'https://picsum.photos/seed/jump/200/200',
    category: 'Platformer',
  },
];

export const newGames: Game[] = [
  {
    id: 'new-1',
    slug: 'neon-runner',
    title: 'Neon Runner',
    thumbnail: 'https://picsum.photos/seed/neon/200/200',
    category: 'Endless',
  },
  {
    id: 'new-2',
    slug: 'mystery-manor',
    title: 'Mystery Manor',
    thumbnail: 'https://picsum.photos/seed/mystery/200/200',
    category: 'Adventure',
  },
  {
    id: 'new-3',
    slug: 'block-breaker',
    title: 'Block Breaker',
    thumbnail: 'https://picsum.photos/seed/blocks/200/200',
    category: 'Puzzle',
  },
];
