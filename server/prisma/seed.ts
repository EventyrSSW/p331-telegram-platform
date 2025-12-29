import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const games = [
  {
    slug: 'mahjong-dash',
    title: 'Mahjong Dash',
    description: 'Mahjong Dash is a fresh twist on classic Mahjong puzzles—slide tiles to rearrange the board, match identical tiles in a row or column, and clear all tiles to beat the level.',
    thumbnail: 'https://play-lh.googleusercontent.com/7t5ira1csgh5H5EuBwt1xmaMEHssN13ABopnpOAXpIIOhA_U80yhGnjhHmHa948xXAe1D-w_BrFh76Ocd6XaSw=w5120-h2880-rw',
    category: 'Puzzle',
    featured: true,
    mainUrl: 'https://play.google.com/store/apps/details?id=com.vgames.mahjongdash&hl=en',
    screen1Url: 'https://play-lh.googleusercontent.com/7t5ira1csgh5H5EuBwt1xmaMEHssN13ABopnpOAXpIIOhA_U80yhGnjhHmHa948xXAe1D-w_BrFh76Ocd6XaSw=w5120-h2880-rw',
    screen2Url: 'https://play-lh.googleusercontent.com/u7PCzdEhxxjdgBdx3-QwDkvA6lw2Ll-pfeynYfxTJfmCI5hER_7qPKTlVwJxCrt1edAsviwhNTYJQaUbFfUOxQ=w5120-h2880-rw',
    screen3Url: 'https://play-lh.googleusercontent.com/3rOBIgyhIL3rUKgPj8NrTu31kMsVDdeWGvWuGJC628s1L7HET61LA1DkzQ66T9w7C-fY7zKqkq-yBDjYedcU=w5120-h2880-rw',
    screen4Url: 'https://play-lh.googleusercontent.com/ZatixCG0ETaB5pWzKXfgYvl1doZ7NDFLSENCCMvh9POibV4ej1dfO6QWzpu1t2hXyRFbKHauDSpCuRz_e0xzoQ=w5120-h2880-rw',
    rating: 4.9,
    reviewCount: 7,
    videoUrl: "https://tixta.b-cdn.net/tg_game_videos/mahjong_updated.mp4",
    topPromoted: false,
  },
  {
    slug: 'puzzle-master',
    title: 'Puzzle Master',
    description: 'Challenge your mind with hundreds of brain-teasing puzzles. Match colors, solve patterns, and unlock new levels.',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/79/02/f5/7902f5bc-7389-d7b2-6524-57c062a83870/mzl.vgxttdpa.jpg/392x696bb.jpg',
    category: 'Puzzle',
    featured: false,
    mainUrl: 'https://games.skillz.com/mobile/games/block-blitz-2788',
    screen1Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/79/02/f5/7902f5bc-7389-d7b2-6524-57c062a83870/mzl.vgxttdpa.jpg/392x696bb.jpg',
    screen2Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/9d/3d/da/9d3ddacc-0756-ce23-13ce-0de817b7878e/mzl.lqgcmkjt.jpg/392x696bb.jpg',
    screen3Url: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/c7/f6/ec/c7f6ec52-b2d6-3af4-f3cc-c149f8d2a749/f0396d54-930b-421e-9c61-7319bedff823_paymentmodule_1242x2208.png/392x696bb.png',
    screen4Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/f0/35/27/f03527ed-b6ca-e277-913a-34aa24ab1a7e/mzl.gpplewke.jpg/392x696bb.jpg',
    rating: 4.52,
    reviewCount: 4746,
    videoUrl: null,
    topPromoted: true,
  },
  {
    slug: 'bubble-shooter-arena',
    title: 'Bubble Shooter Arena',
    description: 'Bubble Shooter Arena is a fast, addictive bubble-matching game where you race to pop as many bubbles as possible and outscore opponents in quick, competitive rounds.',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Purple115/v4/13/9b/54/139b5440-5ef7-85f0-0d1e-d4b43f632296/pr_source.png/392x696bb.png',
    category: 'Puzzle',
    featured: false,
    mainUrl: 'https://games.skillz.com/mobile/games/bubble-shooter-arena-2940',
    screen1Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple115/v4/13/9b/54/139b5440-5ef7-85f0-0d1e-d4b43f632296/pr_source.png/392x696bb.png',
    screen2Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple115/v4/05/70/f2/0570f298-370d-1e40-7daf-f600636f585f/pr_source.png/392x696bb.png',
    screen3Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple115/v4/49/da/eb/49daebbd-49ac-39d8-26cc-a8e090ea08d7/pr_source.png/392x696bb.png',
    screen4Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple115/v4/85/e1/b8/85e1b851-f26d-dcef-6314-489f659c61e4/pr_source.png/392x696bb.png',
    rating: 4.42,
    reviewCount: 4597,
    videoUrl: "https://tixta.b-cdn.net/tg_game_videos/bubble1_updated.mp4",
    topPromoted: false,
  },
  {
    slug: 'bubble-shooter-tournaments',
    title: 'Bubble Shooter Tournaments',
    description: 'Bubble Shooter! Tournaments is a classic bubble-matching game with competitive tournaments—aim, shoot, pop color groups, and climb the leaderboards.',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Purple124/v4/3b/c9/26/3bc92662-e531-e064-69c4-01bce6fcff24/pr_source.png/392x696bb.png',
    category: 'Puzzle',
    featured: false,
    mainUrl: 'https://games.skillz.com/mobile/games/320?creative_id=skillztv',
    screen1Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple124/v4/3b/c9/26/3bc92662-e531-e064-69c4-01bce6fcff24/pr_source.png/392x696bb.png',
    screen2Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple114/v4/1c/74/0a/1c740a9d-73cb-6ef9-e768-c61982f075f2/pr_source.png/392x696bb.png',
    screen3Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple124/v4/e6/14/a2/e614a212-b663-90a4-57c0-de13a582ba32/pr_source.png/392x696bb.png',
    screen4Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple114/v4/93/e9/5b/93e95bdb-cde9-f9b1-29dc-a25d73e73992/pr_source.png/392x696bb.png',
    rating: 4.42,
    reviewCount: 6374,
    videoUrl: null,
    topPromoted: false,
  },
  {
    slug: 'onet-cash',
    title: 'Onet Cash',
    description: 'Onet Cash is a relaxing pair-matching puzzle where you connect identical tiles, clear the board fast, and compete against players worldwide in head-to-head matches and tournaments for cash and real prizes (where available).',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Purple112/v4/bc/65/ef/bc65ef34-5ea1-8450-4b3b-97492652d3e6/84366271-f618-4b2d-b0b3-fe6d31696350_1.jpg/392x696bb.jpg',
    category: 'Puzzle',
    featured: false,
    mainUrl: 'https://games.skillz.com/mobile/games/17074',
    screen1Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple112/v4/bc/65/ef/bc65ef34-5ea1-8450-4b3b-97492652d3e6/84366271-f618-4b2d-b0b3-fe6d31696350_1.jpg/392x696bb.jpg',
    screen2Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple122/v4/b6/6b/39/b66b39b1-509b-4d74-18a6-4c22b29a3dfd/c27b4a88-8e94-44fa-afe3-91fc32e39428_4.jpg/392x696bb.jpg',
    screen3Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple122/v4/d8/b2/35/d8b23559-b9b7-9f18-e59a-fb2e239ac155/370d653f-040c-48a1-8a77-72bdf63ad224_5.jpg/392x696bb.jpg',
    screen4Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple122/v4/33/32/9b/33329bbc-552d-5ec5-886b-68478858a8f7/f4bb073a-d498-45ca-86b3-0c4a00898157_7.jpg/392x696bb.jpg',
    rating: 4.61,
    reviewCount: 181,
    videoUrl: null,
    topPromoted: false,
  },
  {
    slug: 'jewel-blitz',
    title: 'Jewel Blitz - Block Puzzle',
    description: 'Jewel Blitz: Block Puzzle is a fast PvP block puzzler—clear lines, chain combos, and win 3-minute matches.',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Purple116/v4/c3/8a/15/c38a15fa-47f6-44e1-f1e1-c6ac77e5c84c/pr_source.png/392x696bb.png',
    category: 'Puzzle',
    featured: false,
    mainUrl: 'https://games.skillz.com/mobile/games/jewel-blitz-block-puzzle-5410',
    screen1Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple116/v4/c3/8a/15/c38a15fa-47f6-44e1-f1e1-c6ac77e5c84c/pr_source.png/392x696bb.png',
    screen2Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple116/v4/c3/8a/15/c38a15fa-47f6-44e1-f1e1-c6ac77e5c84c/pr_source.png/392x696bb.png',
    screen3Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple116/v4/c3/8a/15/c38a15fa-47f6-44e1-f1e1-c6ac77e5c84c/pr_source.png/392x696bb.png',
    screen4Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple126/v4/ad/5d/4c/ad5d4c93-0b4b-77b7-38ca-c204d137da80/pr_source.png/392x696bb.png',
    rating: 4.65,
    reviewCount: 2812,
    videoUrl: null,
    topPromoted: false,
  },
  {
    slug: 'sushi-drop-tournament',
    title: 'Sushi Drop Tournament',
    description: 'Sushi Drop Tournament is a skill-based number puzzle where you stack and merge matching sushi blocks to build higher-value tiles—aim for 2048 and beyond, then compete in head-to-head matches and big tournaments.',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/70/f8/b2/70f8b2c3-7772-b806-be0e-8f0e630170b1/SDT_1242x2208_1.png/392x696bb.png',
    category: 'Puzzle',
    featured: false,
    mainUrl: 'https://games.skillz.com/mobile/games/sushi-drop-tournament-18056',
    screen1Url: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/70/f8/b2/70f8b2c3-7772-b806-be0e-8f0e630170b1/SDT_1242x2208_1.png/392x696bb.png',
    screen2Url: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/ef/88/10/ef8810d5-d957-1d0d-7875-b1172fcbfc33/SDT_1242x2208_2.png/392x696bb.png',
    screen3Url: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/ff/a8/f0/ffa8f0fb-2b0d-761e-5ce0-8776c2fc6228/SDT_1242x2208_3.png/392x696bb.png',
    screen4Url: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/68/bd/25/68bd2599-bf65-9985-4588-ef86b9fa4866/SDT_1242x2208_7.png/392x696bb.png',
    rating: 4.53,
    reviewCount: 98,
    videoUrl: null,
    topPromoted: false,
  },
  {
    slug: 'candyprize',
    title: 'CandyPrize',
    description: 'CandyPrize is a fast, skill-based match-3 game built for fair competition—match candies, trigger powerful bursts, and outscore real opponents in quick head-to-head battles and tournaments.',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Purple123/v4/3a/27/40/3a274086-7560-a712-aa02-87abc60acbd6/pr_source.png/392x696bb.png',
    category: 'Puzzle',
    featured: false,
    mainUrl: 'https://games.skillz.com/mobile/games/candyprize-6803',
    screen1Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple123/v4/3a/27/40/3a274086-7560-a712-aa02-87abc60acbd6/pr_source.png/392x696bb.png',
    screen2Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple113/v4/ea/78/af/ea78af94-e486-d9a9-c675-c335fa3a8eb6/pr_source.png/392x696bb.png',
    screen3Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple113/v4/90/ff/eb/90ffeb18-3c8e-a6a5-c8f1-bd7ebff7c110/pr_source.png/392x696bb.png',
    screen4Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple113/v4/76/d0/4e/76d04e10-4900-7243-4ef3-ebfb2e861660/pr_source.png/392x696bb.png',
    rating: 4.63,
    reviewCount: 1038,
    videoUrl: null,
    topPromoted: false,
  },
  {
    slug: 'number-shoot-tournament',
    title: 'Number Shoot Tournament',
    description: 'Number Shoot Tournament is a fast, skill-based number puzzle where you shoot and merge matching blocks to build bigger tiles, chase 2048+, and compete in head-to-head matches and tournaments.',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource116/v4/9a/4b/7e/9a4b7ea8-c2e2-2a76-c7c2-5c3cc8bbcb41/dcec9099-caff-4e61-9589-40b12e4ccabd_NumberShoot_Skillz_iphone_S001.png/392x696bb.png',
    category: 'Puzzle',
    featured: false,
    mainUrl: 'https://apps.apple.com/us/app/number-shoot-tournament/id1594805850',
    screen1Url: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource116/v4/9a/4b/7e/9a4b7ea8-c2e2-2a76-c7c2-5c3cc8bbcb41/dcec9099-caff-4e61-9589-40b12e4ccabd_NumberShoot_Skillz_iphone_S001.png/392x696bb.png',
    screen2Url: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource126/v4/c4/e0/80/c4e08016-7572-9549-4377-414812112a28/3483c97a-21f6-4144-aca4-8ac1cf07655d_NumberShoot_Skillz_iphone_S008.png/392x696bb.png',
    screen3Url: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource126/v4/e3/c4/da/e3c4daec-d795-b9e5-1280-98adae752aa4/03430f29-3542-4c49-a7e3-d29a1a744eef_NumberShoot_Skillz_iphone_S004.png/392x696bb.png',
    screen4Url: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource126/v4/3e/23/5d/3e235d49-bdd9-b27b-2a27-d51db87cd708/d86a3b93-23a5-4420-833f-1e703876147b_NumberShoot_Skillz_iphone_S003.png/392x696bb.png',
    rating: 4.75,
    reviewCount: 49,
    videoUrl: "https://tixta.b-cdn.net/tg_game_videos/number_updated.mp4",
    topPromoted: false,
  },
  {
    slug: 'diamond-blitz-2',
    title: 'Diamond Blitz 2',
    description: 'Diamond Blitz 2 is a fast competitive match-3 game. Swap and match diamonds, trigger powerful boosts, and outscore real opponents in quick head-to-head battles.',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Purple114/v4/af/a1/b9/afa1b928-7020-e316-242c-249d471c797e/mzl.leoetcyj.jpg/392x696bb.jpg',
    category: 'Puzzle',
    featured: false,
    mainUrl: 'http://games.skillz.com/mobile/games/diamond-blitz-2-2922',
    screen1Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple114/v4/af/a1/b9/afa1b928-7020-e316-242c-249d471c797e/mzl.leoetcyj.jpg/392x696bb.jpg',
    screen2Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple114/v4/f2/af/b2/f2afb2ee-03a4-47b2-a313-458d418b0f4f/mzl.nurgfqla.jpg/392x696bb.jpg',
    screen3Url: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource114/v4/f5/7c/bb/f57cbbda-1a4e-d9d8-64d0-93507c797c95/d75801fc-56ce-47a8-b0a8-bb0dfe5af56c_1242x2208.png/392x696bb.png',
    screen4Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple124/v4/a1/13/26/a11326cb-b8c8-959e-dd9c-f74c110a1abc/mzl.gtzvbyqb.jpg/392x696bb.jpg',
    rating: 4.46,
    reviewCount: 1426,
    videoUrl: null,
    topPromoted: false,
  },
  {
    slug: 'block-puzzle',
    title: 'Block Puzzle Win Real Money',
    description: 'Block Puzzle Win Real Money is a skill-based block puzzle where you place shapes, clear lines, and compete for rewards in Skillz matches and tournaments.',
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/b0/84/51/b08451d7-1271-321d-4b91-587f9b71e561/9d633708-8349-4633-ae38-5f9b4a69d4cf_Fun_Puzzle__U00281242__U00d7_2208_px_U0029.png/392x696bb.png',
    category: 'Puzzle',
    featured: false,
    mainUrl: 'https://games.skillz.com/mobile/games/block-puzzle-win-real-money-21961',
    screen1Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/b0/84/51/b08451d7-1271-321d-4b91-587f9b71e561/9d633708-8349-4633-ae38-5f9b4a69d4cf_Fun_Puzzle__U00281242__U00d7_2208_px_U0029.png/392x696bb.png',
    screen2Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/4f/cf/8f/4fcf8fc1-0c84-4cf3-8396-77b925796165/af6e0b6e-fbca-4370-a5b3-7ac7902e8eda_IOS_5_Blocks.png/392x696bb.png',
    screen3Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/a9/78/ae/a978ae87-9778-5b77-f92a-ddbd9e7cd96b/cd6ab308-9572-4fd1-aa5c-56a1bd883eb2_3.png/392x696bb.png',
    screen4Url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/97/0e/3e/970e3eb5-4c3e-0094-28ea-5af16df8c29f/4ad6f5ce-445d-4cfa-81f2-fb82f6b436e3_4.png/392x696bb.png',
    rating: 4.60,
    reviewCount: 1667,
    videoUrl: null,
    topPromoted: false,
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
    { key: 'ton_receiver_address', value: process.env.PAYMENT_RECEIVER_ADDRESS || '' },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }
  console.log('System config seeded');

  // Seed coin packages
  const coinPackages = [
    { name: 'Starter', coins: 100, price: 0.01, bonus: 0, sortOrder: 1 },
    { name: 'Popular', coins: 500, price: 0.02, bonus: 25, sortOrder: 2 },
    { name: 'Value', coins: 1000, price: 0.03, bonus: 40, sortOrder: 3 },
    { name: 'Best Deal', coins: 5000, price: 0.04, bonus: 65, sortOrder: 4 },
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
