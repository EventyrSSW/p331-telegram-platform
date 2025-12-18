export interface Game {
  id: string;
  title: string;
  thumbnail: string;
  category: string;
  description?: string;
  featured?: boolean;
}

export const games: Game[] = [
  {
    id: 'featured-1',
    title: 'Epic Quest',
    thumbnail: 'https://picsum.photos/seed/epic/800/500',
    category: 'Adventure',
    description: 'Embark on an epic journey through mystical lands, battling fierce creatures and solving ancient puzzles to save the kingdom.',
    featured: true,
  },
  {
    id: 'popular-1',
    title: 'Space Invaders',
    thumbnail: 'https://picsum.photos/seed/space/200/200',
    category: 'Arcade',
    description: 'Classic arcade action as you defend Earth from waves of alien invaders. Simple controls, addictive gameplay.',
  },
  {
    id: 'popular-2',
    title: 'Puzzle Master',
    thumbnail: 'https://picsum.photos/seed/puzzle/200/200',
    category: 'Puzzle',
    description: 'Challenge your mind with hundreds of brain-teasing puzzles. Match colors, solve patterns, and unlock new levels.',
  },
  {
    id: 'popular-3',
    title: 'Racing Legends',
    thumbnail: 'https://picsum.photos/seed/racing/200/200',
    category: 'Racing',
    description: 'Hit the tracks in high-speed racing action. Customize your car, compete against rivals, and become a legend.',
  },
  {
    id: 'popular-4',
    title: 'Card Champion',
    thumbnail: 'https://picsum.photos/seed/cards/200/200',
    category: 'Card',
    description: 'Master the art of strategy in this fast-paced card game. Build your deck, outsmart opponents, and claim victory.',
  },
  {
    id: 'popular-5',
    title: 'Strategy Wars',
    thumbnail: 'https://picsum.photos/seed/strategy/200/200',
    category: 'Strategy',
    description: 'Build your empire, command armies, and conquer territories in this deep strategy game. Plan your moves wisely.',
  },
  {
    id: 'popular-6',
    title: 'Mega Jump',
    thumbnail: 'https://picsum.photos/seed/jump/200/200',
    category: 'Platformer',
    description: 'Jump, bounce, and soar to new heights! Collect power-ups and avoid obstacles in this fun platformer adventure.',
  },
  {
    id: 'new-1',
    title: 'Neon Runner',
    thumbnail: 'https://picsum.photos/seed/neon/200/200',
    category: 'Endless',
    description: 'Run through a neon-lit cyberpunk world. Dodge obstacles, collect coins, and set new high scores in this endless runner.',
  },
  {
    id: 'new-2',
    title: 'Mystery Manor',
    thumbnail: 'https://picsum.photos/seed/mystery/200/200',
    category: 'Adventure',
    description: 'Explore a haunted mansion filled with secrets. Solve mysteries, find hidden objects, and uncover the truth.',
  },
  {
    id: 'new-3',
    title: 'Block Breaker',
    thumbnail: 'https://picsum.photos/seed/blocks/200/200',
    category: 'Puzzle',
    description: 'Break blocks, create combos, and clear the board in this satisfying puzzle game. Easy to learn, hard to master.',
  },
];
