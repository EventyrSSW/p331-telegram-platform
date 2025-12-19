import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const games = [
  {
    slug: 'mahjong-dash',
    title: 'Mahjong Dash',
    description: 'Classic Mahjong tile-matching puzzle game. Match pairs of tiles to clear the board!',
    thumbnail: 'https://picsum.photos/seed/mahjong/800/500',
    category: 'Puzzle',
    featured: true,
  },
  {
    slug: 'space-invaders',
    title: 'Space Invaders',
    description: 'Classic arcade action as you defend Earth from waves of alien invaders. Simple controls, addictive gameplay.',
    thumbnail: 'https://picsum.photos/seed/space/200/200',
    category: 'Arcade',
    featured: false,
  },
  {
    slug: 'puzzle-master',
    title: 'Puzzle Master',
    description: 'Challenge your mind with hundreds of brain-teasing puzzles. Match colors, solve patterns, and unlock new levels.',
    thumbnail: 'https://picsum.photos/seed/puzzle/200/200',
    category: 'Puzzle',
    featured: false,
  },
  {
    slug: 'racing-legends',
    title: 'Racing Legends',
    description: 'Hit the tracks in high-speed racing action. Customize your car, compete against rivals, and become a legend.',
    thumbnail: 'https://picsum.photos/seed/racing/200/200',
    category: 'Racing',
    featured: false,
  },
  {
    slug: 'card-champion',
    title: 'Card Champion',
    description: 'Master the art of strategy in this fast-paced card game. Build your deck, outsmart opponents, and claim victory.',
    thumbnail: 'https://picsum.photos/seed/cards/200/200',
    category: 'Card',
    featured: false,
  },
  {
    slug: 'strategy-wars',
    title: 'Strategy Wars',
    description: 'Build your empire, command armies, and conquer territories in this deep strategy game. Plan your moves wisely.',
    thumbnail: 'https://picsum.photos/seed/strategy/200/200',
    category: 'Strategy',
    featured: false,
  },
  {
    slug: 'mega-jump',
    title: 'Mega Jump',
    description: 'Jump, bounce, and soar to new heights! Collect power-ups and avoid obstacles in this fun platformer adventure.',
    thumbnail: 'https://picsum.photos/seed/jump/200/200',
    category: 'Platformer',
    featured: false,
  },
  {
    slug: 'neon-runner',
    title: 'Neon Runner',
    description: 'Run through a neon-lit cyberpunk world. Dodge obstacles, collect coins, and set new high scores in this endless runner.',
    thumbnail: 'https://picsum.photos/seed/neon/200/200',
    category: 'Endless',
    featured: false,
  },
  {
    slug: 'mystery-manor',
    title: 'Mystery Manor',
    description: 'Explore a haunted mansion filled with secrets. Solve mysteries, find hidden objects, and uncover the truth.',
    thumbnail: 'https://picsum.photos/seed/mystery/200/200',
    category: 'Adventure',
    featured: false,
  },
  {
    slug: 'block-breaker',
    title: 'Block Breaker',
    description: 'Break blocks, create combos, and clear the board in this satisfying puzzle game. Easy to learn, hard to master.',
    thumbnail: 'https://picsum.photos/seed/blocks/200/200',
    category: 'Puzzle',
    featured: false,
  },
];

async function main() {
  console.log('Seeding games...');

  for (const game of games) {
    await prisma.game.upsert({
      where: { slug: game.slug },
      update: game,
      create: game,
    });
  }

  console.log(`Seeded ${games.length} games`);

  // Seed system configuration
  const systemConfigs = [
    { key: 'ton_network', value: 'testnet' },
    { key: 'ton_receiver_address', value: '' },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }
  console.log('System config seeded');

  // Seed coin packages
  const coinPackages = [
    { name: 'Starter', coins: 100, price: 0.01, bonus: 0, sortOrder: 1 },
    { name: 'Popular', coins: 500, price: 0.04, bonus: 25, sortOrder: 2 },
    { name: 'Value', coins: 1000, price: 0.07, bonus: 40, sortOrder: 3 },
    { name: 'Best Deal', coins: 5000, price: 0.3, bonus: 65, sortOrder: 4 },
  ];

  for (const pkg of coinPackages) {
    const existing = await prisma.coinPackage.findFirst({
      where: { name: pkg.name },
    });
    if (!existing) {
      await prisma.coinPackage.create({ data: pkg });
    }
  }
  console.log('Coin packages seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
