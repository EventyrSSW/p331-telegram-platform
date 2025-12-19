# Architecture & Security Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring the p331 Telegram gaming platform up to industry-standard security and architecture patterns for production cryptocurrency applications.

**Architecture:** Implement layered security with JWT authentication, Telegram signature verification, database persistence, and blockchain payment verification. Restructure backend into clean service/controller separation with proper middleware.

**Tech Stack:** PostgreSQL + Prisma ORM, JWT tokens, express-validator, express-rate-limit, Winston logging, Zod schemas

---

## Phase 1: Critical Security Fixes

### Task 1: Fix Broken CORS Configuration

**Files:**
- Modify: `server/src/index.ts:30-45`

**Step 1: Read the current CORS implementation**

Review the existing CORS config to understand what needs fixing.

**Step 2: Fix the CORS fallback that allows all origins**

Replace the broken CORS configuration:

```typescript
// server/src/index.ts - Replace CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://p331-tg-platform.vercel.app',
  'https://telegram-platform.eventyr.cloud',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow Vercel preview deployments
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Allow ngrok tunnels for development
    if (origin.includes('.ngrok')) {
      return callback(null, true);
    }

    // REJECT unknown origins - this was the bug!
    console.warn('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
}));
```

**Step 3: Test CORS is blocking unknown origins**

Run: `curl -H "Origin: https://evil.com" -I http://localhost:3001/api/health`
Expected: Should NOT return `Access-Control-Allow-Origin: https://evil.com`

**Step 4: Commit**

```bash
git add server/src/index.ts
git commit -m "fix(security): reject unknown CORS origins instead of allowing all"
```

---

### Task 2: Add Environment Variables for Secrets

**Files:**
- Create: `server/.env.example`
- Modify: `server/src/index.ts`
- Modify: `src/pages/SettingsPage/SettingsPage.tsx`
- Create: `src/config/env.ts`

**Step 1: Create server environment template**

```bash
# server/.env.example
PORT=3001
NODE_ENV=development

# Security
JWT_SECRET=your-secret-key-min-32-chars-here
TELEGRAM_BOT_TOKEN=your-bot-token

# TON
PAYMENT_RECEIVER_ADDRESS=UQCNMVjr-your-wallet-address

# Database (Phase 2)
DATABASE_URL=postgresql://user:password@localhost:5432/p331

# CORS
ALLOWED_ORIGINS=http://localhost:5173,https://p331-tg-platform.vercel.app
```

**Step 2: Create frontend environment config**

```typescript
// src/config/env.ts
export const env = {
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  appUrl: import.meta.env.VITE_APP_URL || window.location.origin,
  paymentReceiverAddress: import.meta.env.VITE_PAYMENT_RECEIVER_ADDRESS || '',
} as const;

// Validate required vars in production
if (import.meta.env.PROD && !env.paymentReceiverAddress) {
  console.error('Missing VITE_PAYMENT_RECEIVER_ADDRESS in production');
}
```

**Step 3: Update SettingsPage to use env config**

Replace hardcoded `PAYMENT_RECEIVER_ADDRESS` with `env.paymentReceiverAddress`.

**Step 4: Update .gitignore**

Ensure `.env` and `.env.local` are ignored (already should be).

**Step 5: Commit**

```bash
git add server/.env.example src/config/env.ts src/pages/SettingsPage/SettingsPage.tsx
git commit -m "feat(config): move secrets to environment variables"
```

---

### Task 3: Add Telegram Init Data Verification

**Files:**
- Create: `server/src/middleware/telegramAuth.ts`
- Create: `server/src/utils/telegram.ts`
- Modify: `server/src/index.ts`

**Step 1: Create Telegram verification utility**

```typescript
// server/src/utils/telegram.ts
import crypto from 'crypto';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramInitData {
  user: TelegramUser;
  auth_date: number;
  hash: string;
  query_id?: string;
}

export function verifyTelegramWebAppData(initData: string, botToken: string): TelegramInitData | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) {
      return null;
    }

    // Remove hash from params for verification
    urlParams.delete('hash');

    // Sort params alphabetically and create data-check-string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key from bot token
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate expected hash
    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (hash !== expectedHash) {
      return null;
    }

    // Verify auth_date is not too old (max 1 hour)
    const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 3600) {
      return null;
    }

    // Parse user data
    const userString = urlParams.get('user');
    if (!userString) {
      return null;
    }

    const user = JSON.parse(userString) as TelegramUser;

    return {
      user,
      auth_date: authDate,
      hash,
      query_id: urlParams.get('query_id') || undefined,
    };
  } catch {
    return null;
  }
}
```

**Step 2: Create authentication middleware**

```typescript
// server/src/middleware/telegramAuth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyTelegramWebAppData, TelegramInitData } from '../utils/telegram';

declare global {
  namespace Express {
    interface Request {
      telegramUser?: TelegramInitData['user'];
    }
  }
}

export function telegramAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const initData = req.headers['x-telegram-init-data'] as string;

  if (!initData) {
    return res.status(401).json({ error: 'Missing Telegram init data' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const verified = verifyTelegramWebAppData(initData, botToken);

  if (!verified) {
    return res.status(401).json({ error: 'Invalid Telegram authentication' });
  }

  req.telegramUser = verified.user;
  next();
}
```

**Step 3: Update frontend to send init data**

```typescript
// src/services/api.ts - Update fetch method
private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  // Add Telegram init data for authentication
  const initData = window.Telegram?.WebApp?.initData;
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData;
  }

  const response = await fetch(`${this.baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  // ... rest of method
}
```

**Step 4: Apply middleware to protected routes**

```typescript
// server/src/index.ts
import { telegramAuthMiddleware } from './middleware/telegramAuth';

// Apply to user routes (protected)
app.use('/api/users', telegramAuthMiddleware, usersRoutes);

// Games routes remain public
app.use('/api/games', gamesRoutes);
```

**Step 5: Commit**

```bash
git add server/src/middleware/telegramAuth.ts server/src/utils/telegram.ts server/src/index.ts src/services/api.ts
git commit -m "feat(auth): add Telegram WebApp init data verification"
```

---

### Task 4: Add Rate Limiting

**Files:**
- Create: `server/src/middleware/rateLimit.ts`
- Modify: `server/src/index.ts`

**Step 1: Install rate limiting package**

Run: `cd server && npm install express-rate-limit`

**Step 2: Create rate limiting middleware**

```typescript
// server/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

// General API rate limit
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limit for coin operations
export const coinOperationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 coin operations per minute
  message: { error: 'Too many coin operations, please wait' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict limit for purchases
export const purchaseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 purchases per hour
  message: { error: 'Purchase limit reached, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
```

**Step 3: Apply rate limiters**

```typescript
// server/src/index.ts
import { generalLimiter, coinOperationLimiter } from './middleware/rateLimit';

// Apply general limiter to all routes
app.use(generalLimiter);

// Apply stricter limiter to coin operations in users routes
```

**Step 4: Apply stricter limiter to specific routes**

```typescript
// server/src/routes/users.ts
import { coinOperationLimiter } from '../middleware/rateLimit';

router.post('/:walletAddress/add-coins', coinOperationLimiter, async (req, res) => {
  // ... existing logic
});

router.post('/:walletAddress/deduct-coins', coinOperationLimiter, async (req, res) => {
  // ... existing logic
});
```

**Step 5: Commit**

```bash
git add server/package.json server/src/middleware/rateLimit.ts server/src/index.ts server/src/routes/users.ts
git commit -m "feat(security): add rate limiting to prevent abuse"
```

---

### Task 5: Add Request Validation with Zod

**Files:**
- Create: `server/src/schemas/users.ts`
- Modify: `server/src/routes/users.ts`

**Step 1: Install Zod**

Run: `cd server && npm install zod`

**Step 2: Create validation schemas**

```typescript
// server/src/schemas/users.ts
import { z } from 'zod';

export const walletAddressSchema = z.string()
  .min(48, 'Invalid wallet address')
  .max(67, 'Invalid wallet address')
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid wallet address format');

export const coinAmountSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .int('Amount must be a whole number')
    .max(1_000_000, 'Amount too large'),
});

export const addCoinsSchema = coinAmountSchema.extend({
  transactionHash: z.string().optional(), // For future blockchain verification
});
```

**Step 3: Update users routes with validation**

```typescript
// server/src/routes/users.ts
import { walletAddressSchema, coinAmountSchema } from '../schemas/users';

router.get('/:walletAddress/balance', async (req, res) => {
  const parseResult = walletAddressSchema.safeParse(req.params.walletAddress);

  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.errors[0].message });
  }

  const walletAddress = parseResult.data;
  // ... rest of logic
});

router.post('/:walletAddress/add-coins', coinOperationLimiter, async (req, res) => {
  const walletParse = walletAddressSchema.safeParse(req.params.walletAddress);
  const bodyParse = coinAmountSchema.safeParse(req.body);

  if (!walletParse.success) {
    return res.status(400).json({ error: walletParse.error.errors[0].message });
  }
  if (!bodyParse.success) {
    return res.status(400).json({ error: bodyParse.error.errors[0].message });
  }

  const walletAddress = walletParse.data;
  const { amount } = bodyParse.data;
  // ... rest of logic
});
```

**Step 4: Commit**

```bash
git add server/package.json server/src/schemas/users.ts server/src/routes/users.ts
git commit -m "feat(validation): add Zod schemas for request validation"
```

---

## Phase 2: Database & Persistence

### Task 6: Set Up PostgreSQL with Prisma

**Files:**
- Create: `server/prisma/schema.prisma`
- Create: `server/src/db/client.ts`

**Step 1: Install Prisma**

Run: `cd server && npm install prisma @prisma/client && npx prisma init`

**Step 2: Define database schema**

```prisma
// server/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id              String    @id @default(cuid())
  telegramId      BigInt    @unique
  username        String?
  firstName       String?
  lastName        String?
  walletAddress   String?   @unique
  coinBalance     Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  transactions    Transaction[]
  gameSessions    GameSession[]

  @@index([telegramId])
  @@index([walletAddress])
}

model Transaction {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  type            TransactionType
  amount          Int
  tonAmount       BigInt?   // In nanoTON
  tonTxHash       String?   // Blockchain transaction hash
  status          TransactionStatus @default(PENDING)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([userId])
  @@index([tonTxHash])
}

enum TransactionType {
  PURCHASE      // Buy coins with TON
  GAME_SPEND    // Spend coins in game
  GAME_WIN      // Win coins in game
  ADMIN_GRANT   // Admin adds coins
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

model Game {
  id              String    @id @default(cuid())
  slug            String    @unique
  title           String
  description     String
  thumbnail       String
  category        String
  featured        Boolean   @default(false)
  active          Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  sessions        GameSession[]
}

model GameSession {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  gameId          String
  game            Game      @relation(fields: [gameId], references: [id])
  coinsSpent      Int       @default(0)
  coinsWon        Int       @default(0)
  startedAt       DateTime  @default(now())
  endedAt         DateTime?

  @@index([userId])
  @@index([gameId])
}
```

**Step 3: Create Prisma client singleton**

```typescript
// server/src/db/client.ts
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
```

**Step 4: Generate Prisma client and run migration**

Run: `cd server && npx prisma migrate dev --name init`

**Step 5: Commit**

```bash
git add server/prisma/ server/src/db/client.ts server/package.json
git commit -m "feat(db): add PostgreSQL with Prisma ORM"
```

---

### Task 7: Migrate User Routes to Database

**Files:**
- Create: `server/src/services/userService.ts`
- Modify: `server/src/routes/users.ts`

**Step 1: Create user service**

```typescript
// server/src/services/userService.ts
import { prisma } from '../db/client';
import { TransactionType, TransactionStatus } from '@prisma/client';

export class UserService {
  async findOrCreateByTelegramId(telegramId: number, userData: {
    username?: string;
    firstName?: string;
    lastName?: string;
  }) {
    return prisma.user.upsert({
      where: { telegramId: BigInt(telegramId) },
      update: {
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
      create: {
        telegramId: BigInt(telegramId),
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
    });
  }

  async linkWallet(telegramId: number, walletAddress: string) {
    return prisma.user.update({
      where: { telegramId: BigInt(telegramId) },
      data: { walletAddress },
    });
  }

  async getBalance(telegramId: number) {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      select: { coinBalance: true, walletAddress: true },
    });
    return user;
  }

  async addCoins(telegramId: number, amount: number, tonTxHash?: string) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { telegramId: BigInt(telegramId) },
        data: { coinBalance: { increment: amount } },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: TransactionType.PURCHASE,
          amount,
          tonTxHash,
          status: TransactionStatus.COMPLETED,
        },
      });

      return user;
    });
  }

  async deductCoins(telegramId: number, amount: number) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
      });

      if (!user || user.coinBalance < amount) {
        throw new Error('Insufficient balance');
      }

      const updated = await tx.user.update({
        where: { telegramId: BigInt(telegramId) },
        data: { coinBalance: { decrement: amount } },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: TransactionType.GAME_SPEND,
          amount: -amount,
          status: TransactionStatus.COMPLETED,
        },
      });

      return updated;
    });
  }
}

export const userService = new UserService();
```

**Step 2: Update users routes**

```typescript
// server/src/routes/users.ts
import { Router } from 'express';
import { userService } from '../services/userService';
import { coinAmountSchema } from '../schemas/users';
import { coinOperationLimiter } from '../middleware/rateLimit';

const router = Router();

// Get user balance (uses telegramUser from auth middleware)
router.get('/me/balance', async (req, res) => {
  try {
    const telegramUser = req.telegramUser!;
    const user = await userService.getBalance(telegramUser.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      telegramId: telegramUser.id,
      walletAddress: user.walletAddress,
      balance: user.coinBalance,
    });
  } catch (error) {
    console.error('Error getting balance:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// Add coins after purchase
router.post('/me/add-coins', coinOperationLimiter, async (req, res) => {
  try {
    const telegramUser = req.telegramUser!;
    const bodyParse = coinAmountSchema.safeParse(req.body);

    if (!bodyParse.success) {
      return res.status(400).json({ error: bodyParse.error.errors[0].message });
    }

    const { amount } = bodyParse.data;
    const tonTxHash = req.body.transactionHash;

    const user = await userService.addCoins(telegramUser.id, amount, tonTxHash);

    res.json({
      telegramId: telegramUser.id,
      balance: user.coinBalance,
    });
  } catch (error) {
    console.error('Error adding coins:', error);
    res.status(500).json({ error: 'Failed to add coins' });
  }
});

// Deduct coins for game play
router.post('/me/deduct-coins', coinOperationLimiter, async (req, res) => {
  try {
    const telegramUser = req.telegramUser!;
    const bodyParse = coinAmountSchema.safeParse(req.body);

    if (!bodyParse.success) {
      return res.status(400).json({ error: bodyParse.error.errors[0].message });
    }

    const { amount } = bodyParse.data;

    const user = await userService.deductCoins(telegramUser.id, amount);

    res.json({
      telegramId: telegramUser.id,
      balance: user.coinBalance,
    });
  } catch (error: any) {
    if (error.message === 'Insufficient balance') {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    console.error('Error deducting coins:', error);
    res.status(500).json({ error: 'Failed to deduct coins' });
  }
});

export default router;
```

**Step 3: Update frontend API calls**

```typescript
// src/services/api.ts - Update endpoints
async getUserBalance(): Promise<UserBalance> {
  return this.fetch<UserBalance>('/users/me/balance');
}

async addCoins(amount: number, transactionHash?: string): Promise<UserBalance> {
  return this.fetch<UserBalance>('/users/me/add-coins', {
    method: 'POST',
    body: JSON.stringify({ amount, transactionHash }),
  });
}

async deductCoins(amount: number): Promise<UserBalance> {
  return this.fetch<UserBalance>('/users/me/deduct-coins', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}
```

**Step 4: Commit**

```bash
git add server/src/services/userService.ts server/src/routes/users.ts src/services/api.ts
git commit -m "feat(users): migrate user routes to database with proper auth"
```

---

### Task 8: Migrate Games to Database

**Files:**
- Create: `server/src/services/gameService.ts`
- Modify: `server/src/routes/games.ts`
- Create: `server/prisma/seed.ts`

**Step 1: Create game service**

```typescript
// server/src/services/gameService.ts
import { prisma } from '../db/client';

export class GameService {
  async getAllGames() {
    return prisma.game.findMany({
      where: { active: true },
      orderBy: { title: 'asc' },
    });
  }

  async getFeaturedGame() {
    return prisma.game.findFirst({
      where: { featured: true, active: true },
    });
  }

  async getGameBySlug(slug: string) {
    return prisma.game.findUnique({
      where: { slug },
    });
  }

  async getGameById(id: string) {
    return prisma.game.findUnique({
      where: { id },
    });
  }
}

export const gameService = new GameService();
```

**Step 2: Create seed file for initial games**

```typescript
// server/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const games = [
  {
    slug: 'mahjong-dash',
    title: 'Mahjong Dash',
    description: 'Match tiles in this classic puzzle game with a modern twist',
    thumbnail: '/games/mahjong3/TemplateData/favicon.ico',
    category: 'Puzzle',
    featured: true,
  },
  {
    slug: 'crypto-slots',
    title: 'Crypto Slots',
    description: 'Spin to win in this exciting slot machine game',
    thumbnail: '/placeholder-game.png',
    category: 'Casino',
    featured: false,
  },
  // Add other games from existing data...
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Step 3: Update package.json for seeding**

Add to `server/package.json` scripts:
```json
"prisma:seed": "ts-node prisma/seed.ts"
```

**Step 4: Update games routes**

```typescript
// server/src/routes/games.ts
import { Router } from 'express';
import { gameService } from '../services/gameService';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const games = await gameService.getAllGames();
    res.json({ games });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

router.get('/featured', async (req, res) => {
  try {
    const game = await gameService.getFeaturedGame();
    if (!game) {
      return res.status(404).json({ error: 'No featured game found' });
    }
    res.json({ game });
  } catch (error) {
    console.error('Error fetching featured game:', error);
    res.status(500).json({ error: 'Failed to fetch featured game' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const game = await gameService.getGameBySlug(req.params.slug);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json({ game });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

export default router;
```

**Step 5: Run seed**

Run: `cd server && npm run prisma:seed`

**Step 6: Commit**

```bash
git add server/src/services/gameService.ts server/src/routes/games.ts server/prisma/seed.ts server/package.json
git commit -m "feat(games): migrate games to database with seed data"
```

---

## Phase 3: Logging & Monitoring

### Task 9: Add Structured Logging

**Files:**
- Create: `server/src/utils/logger.ts`
- Create: `server/src/middleware/requestLogger.ts`
- Modify: `server/src/index.ts`

**Step 1: Install Winston**

Run: `cd server && npm install winston`

**Step 2: Create logger utility**

```typescript
// server/src/utils/logger.ts
import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} ${level}: ${message} ${metaStr}`;
  })
);

const prodFormat = combine(
  timestamp(),
  json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
  ],
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error'
  }));
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log'
  }));
}
```

**Step 3: Create request logging middleware**

```typescript
// server/src/middleware/requestLogger.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      telegramUserId: req.telegramUser?.id,
      ip: req.ip,
    };

    if (res.statusCode >= 400) {
      logger.warn('Request failed', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
}
```

**Step 4: Apply to Express app**

```typescript
// server/src/index.ts
import { logger } from './utils/logger';
import { requestLogger } from './middleware/requestLogger';

// Early in middleware chain
app.use(requestLogger);

// Replace console.log/error with logger
logger.info('Server started', { port: PORT });
```

**Step 5: Commit**

```bash
git add server/src/utils/logger.ts server/src/middleware/requestLogger.ts server/src/index.ts server/package.json
git commit -m "feat(logging): add Winston structured logging"
```

---

### Task 10: Add Global Error Handler

**Files:**
- Create: `server/src/middleware/errorHandler.ts`
- Modify: `server/src/index.ts`

**Step 1: Create error handler**

```typescript
// server/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Resource already exists' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Resource not found' });
    }
  }

  // Custom app errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Default to 500
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
}
```

**Step 2: Apply error handler (must be last middleware)**

```typescript
// server/src/index.ts
import { errorHandler } from './middleware/errorHandler';

// ... routes ...

// Error handler must be last
app.use(errorHandler);
```

**Step 3: Commit**

```bash
git add server/src/middleware/errorHandler.ts server/src/index.ts
git commit -m "feat(errors): add global error handler with proper logging"
```

---

## Phase 4: Backend Architecture Cleanup

### Task 11: Restructure Server Directory

**Files:**
- Create directory structure:
  ```
  server/src/
  ├── config/
  │   └── index.ts
  ├── controllers/
  │   ├── gamesController.ts
  │   └── usersController.ts
  ├── middleware/
  │   ├── errorHandler.ts
  │   ├── rateLimit.ts
  │   ├── requestLogger.ts
  │   └── telegramAuth.ts
  ├── routes/
  │   ├── index.ts
  │   ├── games.ts
  │   └── users.ts
  ├── services/
  │   ├── gameService.ts
  │   └── userService.ts
  ├── schemas/
  │   └── users.ts
  ├── utils/
  │   ├── logger.ts
  │   └── telegram.ts
  ├── db/
  │   └── client.ts
  └── index.ts
  ```

**Step 1: Create config module**

```typescript
// server/src/config/index.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: '7d',
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  },

  ton: {
    paymentReceiverAddress: process.env.PAYMENT_RECEIVER_ADDRESS || '',
  },

  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .filter(Boolean)
      .concat([
        'http://localhost:5173',
        'http://localhost:3000',
      ]),
  },
} as const;

// Validate required config in production
if (config.isProduction) {
  const required = ['JWT_SECRET', 'TELEGRAM_BOT_TOKEN', 'DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
```

**Step 2: Create controllers**

```typescript
// server/src/controllers/gamesController.ts
import { Request, Response, NextFunction } from 'express';
import { gameService } from '../services/gameService';

export const gamesController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const games = await gameService.getAllGames();
      res.json({ games });
    } catch (error) {
      next(error);
    }
  },

  async getFeatured(req: Request, res: Response, next: NextFunction) {
    try {
      const game = await gameService.getFeaturedGame();
      if (!game) {
        return res.status(404).json({ error: 'No featured game found' });
      }
      res.json({ game });
    } catch (error) {
      next(error);
    }
  },

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const game = await gameService.getGameBySlug(req.params.slug);
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }
      res.json({ game });
    } catch (error) {
      next(error);
    }
  },
};
```

```typescript
// server/src/controllers/usersController.ts
import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { coinAmountSchema } from '../schemas/users';

export const usersController = {
  async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser!;
      const user = await userService.getBalance(telegramUser.id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        telegramId: telegramUser.id,
        walletAddress: user.walletAddress,
        balance: user.coinBalance,
      });
    } catch (error) {
      next(error);
    }
  },

  async addCoins(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser!;
      const bodyParse = coinAmountSchema.safeParse(req.body);

      if (!bodyParse.success) {
        return res.status(400).json({ error: bodyParse.error.errors[0].message });
      }

      const { amount } = bodyParse.data;
      const tonTxHash = req.body.transactionHash;

      const user = await userService.addCoins(telegramUser.id, amount, tonTxHash);

      res.json({
        telegramId: telegramUser.id,
        balance: user.coinBalance,
      });
    } catch (error) {
      next(error);
    }
  },

  async deductCoins(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser!;
      const bodyParse = coinAmountSchema.safeParse(req.body);

      if (!bodyParse.success) {
        return res.status(400).json({ error: bodyParse.error.errors[0].message });
      }

      const { amount } = bodyParse.data;

      const user = await userService.deductCoins(telegramUser.id, amount);

      res.json({
        telegramId: telegramUser.id,
        balance: user.coinBalance,
      });
    } catch (error: any) {
      if (error.message === 'Insufficient balance') {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      next(error);
    }
  },
};
```

**Step 3: Update routes to use controllers**

```typescript
// server/src/routes/games.ts
import { Router } from 'express';
import { gamesController } from '../controllers/gamesController';

const router = Router();

router.get('/', gamesController.getAll);
router.get('/featured', gamesController.getFeatured);
router.get('/:slug', gamesController.getBySlug);

export default router;
```

```typescript
// server/src/routes/users.ts
import { Router } from 'express';
import { usersController } from '../controllers/usersController';
import { coinOperationLimiter } from '../middleware/rateLimit';

const router = Router();

router.get('/me/balance', usersController.getBalance);
router.post('/me/add-coins', coinOperationLimiter, usersController.addCoins);
router.post('/me/deduct-coins', coinOperationLimiter, usersController.deductCoins);

export default router;
```

**Step 4: Create central route index**

```typescript
// server/src/routes/index.ts
import { Router } from 'express';
import gamesRoutes from './games';
import usersRoutes from './users';
import { telegramAuthMiddleware } from '../middleware/telegramAuth';

const router = Router();

// Health check (public)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
router.use('/games', gamesRoutes);

// Protected routes
router.use('/users', telegramAuthMiddleware, usersRoutes);

export default router;
```

**Step 5: Clean up index.ts**

```typescript
// server/src/index.ts
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './utils/logger';
import routes from './routes';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimit';

const app = express();

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (config.cors.allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (origin.includes('.ngrok')) return callback(null, true);

    logger.warn('CORS blocked origin', { origin });
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
}));

// Middleware
app.use(express.json());
app.use(requestLogger);
app.use(generalLimiter);

// Routes
app.use('/api', routes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  logger.info('Server started', {
    port: config.port,
    env: config.nodeEnv,
  });
});
```

**Step 6: Commit**

```bash
git add server/src/
git commit -m "refactor(server): restructure to controllers/services pattern"
```

---

## Phase 5: Frontend Improvements

### Task 12: Add Error Boundaries

**Files:**
- Create: `src/components/ErrorBoundary/ErrorBoundary.tsx`
- Create: `src/components/ErrorBoundary/index.ts`
- Modify: `src/App.tsx`

**Step 1: Create ErrorBoundary component**

```typescript
// src/components/ErrorBoundary/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={styles.errorContainer}>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button onClick={this.handleRetry} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

```css
/* src/components/ErrorBoundary/ErrorBoundary.module.css */
.errorContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 24px;
  text-align: center;
}

.errorContainer h2 {
  margin-bottom: 12px;
  color: var(--color-error, #ff4444);
}

.errorContainer p {
  margin-bottom: 16px;
  color: var(--color-text-secondary);
}

.retryButton {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: var(--color-primary, #0088cc);
  color: white;
  cursor: pointer;
}
```

```typescript
// src/components/ErrorBoundary/index.ts
export { ErrorBoundary } from './ErrorBoundary';
```

**Step 2: Wrap App with ErrorBoundary**

```typescript
// src/App.tsx
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <TonConnectProvider>
        <TelegramProvider>
          <AppContent />
        </TelegramProvider>
      </TonConnectProvider>
    </ErrorBoundary>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/ErrorBoundary/ src/App.tsx
git commit -m "feat(ui): add ErrorBoundary for graceful error handling"
```

---

### Task 13: Improve API Error Handling

**Files:**
- Modify: `src/services/api.ts`
- Create: `src/utils/errors.ts`

**Step 1: Create error utilities**

```typescript
// src/utils/errors.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isAuthError() {
    return this.statusCode === 401;
  }

  get isNotFound() {
    return this.statusCode === 404;
  }

  get isRateLimited() {
    return this.statusCode === 429;
  }
}

export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isAuthError) return 'Please reconnect your wallet';
    if (error.isRateLimited) return 'Too many requests. Please wait a moment.';
    if (error.isNotFound) return 'Resource not found';
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}
```

**Step 2: Update API service**

```typescript
// src/services/api.ts
import { ApiError } from '../utils/errors';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '/api';
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    // Add Telegram init data for authentication
    const initData = window.Telegram?.WebApp?.initData;
    if (initData) {
      headers['X-Telegram-Init-Data'] = initData;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      let errorDetails: unknown;

      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
        errorDetails = errorData.details;
      } catch {
        // Response wasn't JSON
      }

      throw new ApiError(response.status, errorMessage, errorDetails);
    }

    return response.json();
  }

  // ... rest of methods unchanged
}
```

**Step 3: Commit**

```bash
git add src/utils/errors.ts src/services/api.ts
git commit -m "feat(api): improve error handling with typed ApiError"
```

---

## Phase 6: Documentation & DevOps

### Task 14: Add API Documentation

**Files:**
- Create: `docs/API.md`

**Step 1: Write API documentation**

```markdown
# P331 Platform API Documentation

## Base URL

- Development: `http://localhost:3001/api`
- Production: `https://telegram-platform.eventyr.cloud/api`

## Authentication

All protected endpoints require a Telegram WebApp init data header:

```
X-Telegram-Init-Data: <initData from Telegram.WebApp>
```

## Endpoints

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-19T10:00:00.000Z"
}
```

### Games

#### List All Games

```
GET /games
```

Response:
```json
{
  "games": [
    {
      "id": "cuid",
      "slug": "mahjong-dash",
      "title": "Mahjong Dash",
      "description": "Match tiles...",
      "thumbnail": "/games/mahjong3/...",
      "category": "Puzzle",
      "featured": true
    }
  ]
}
```

#### Get Featured Game

```
GET /games/featured
```

#### Get Game by Slug

```
GET /games/:slug
```

### Users (Protected)

#### Get Balance

```
GET /users/me/balance
```

Response:
```json
{
  "telegramId": 123456789,
  "walletAddress": "UQ...",
  "balance": 100
}
```

#### Add Coins

```
POST /users/me/add-coins
Content-Type: application/json

{
  "amount": 100,
  "transactionHash": "optional-ton-tx-hash"
}
```

#### Deduct Coins

```
POST /users/me/deduct-coins
Content-Type: application/json

{
  "amount": 10
}
```

## Error Responses

```json
{
  "error": "Error message",
  "details": [...]  // Optional validation details
}
```

### Status Codes

- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid auth)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
```

**Step 2: Commit**

```bash
git add docs/API.md
git commit -m "docs: add API documentation"
```

---

### Task 15: Add Docker Support

**Files:**
- Create: `server/Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

**Step 1: Create server Dockerfile**

```dockerfile
# server/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

**Step 2: Create docker-compose for local development**

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: p331
      POSTGRES_PASSWORD: p331_local_dev
      POSTGRES_DB: p331
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U p331"]
      interval: 5s
      timeout: 5s
      retries: 5

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://p331:p331_local_dev@db:5432/p331
      NODE_ENV: development
      PORT: 3001
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./server/src:/app/src:ro

volumes:
  postgres_data:
```

**Step 3: Create .dockerignore**

```
# .dockerignore
node_modules
dist
.env
.env.local
*.log
.git
```

**Step 4: Commit**

```bash
git add server/Dockerfile docker-compose.yml .dockerignore
git commit -m "feat(devops): add Docker support for local development"
```

---

## Summary

This plan addresses the following critical issues:

### Security (Phase 1)
1. **Fixed CORS** - No longer allows all origins
2. **Environment secrets** - Moved from hardcoded values
3. **Telegram auth** - Server-side verification of init data
4. **Rate limiting** - Prevents abuse
5. **Input validation** - Zod schemas for all inputs

### Persistence (Phase 2)
6. **PostgreSQL + Prisma** - Proper database with migrations
7. **User service** - Database-backed user management
8. **Game service** - Database-backed game catalog
9. **Transaction tracking** - Audit trail for all coin operations

### Observability (Phase 3)
10. **Structured logging** - Winston with JSON in production
11. **Global error handling** - Consistent error responses

### Architecture (Phase 4)
12. **Controller/Service pattern** - Clean separation of concerns
13. **Centralized config** - All settings in one place
14. **Clean routing** - Organized route structure

### Frontend (Phase 5)
15. **Error boundaries** - Graceful error handling
16. **Typed API errors** - Better error UX

### DevOps (Phase 6)
17. **API documentation** - OpenAPI-style docs
18. **Docker** - Containerized deployment

---

**Plan complete and saved to `docs/plans/2025-12-19-architecture-security-improvements.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
