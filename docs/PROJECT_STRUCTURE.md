# P331 Telegram Platform - Project Structure & Database Documentation

## Overview

A Telegram Mini App gaming platform with TON blockchain integration for in-app purchases.

**Tech Stack:**
- **Frontend:** React 19, TypeScript, Vite, TonConnect
- **Backend:** Express.js 5, TypeScript, Prisma ORM
- **Database:** PostgreSQL (Supabase)
- **Deployment:** Hetzner VPS with PM2, Nginx

---

## Project Structure

```
p331-telegram-platform/
├── docs/                          # Documentation
│   └── plans/                     # Implementation plans
├── public/                        # Static assets
│   └── tonconnect-manifest.json   # TonConnect wallet config
├── scripts/                       # Utility scripts
│   └── dev-with-ngrok.sh          # Development with ngrok tunnel
├── src/                           # Frontend source code
│   ├── components/                # Reusable UI components
│   │   ├── BuyCoinsCard/          # Coin purchase card
│   │   ├── CoinBalance/           # Balance display
│   │   ├── GameCard/              # Game thumbnail card
│   │   ├── Header/                # App header with navigation
│   │   ├── Navigation/            # Bottom navigation bar
│   │   ├── Section/               # Content section wrapper
│   │   └── index.ts               # Component exports
│   ├── contexts/                  # React contexts
│   │   ├── AuthContext.tsx        # Authentication state & JWT
│   │   └── ConfigContext.tsx      # App configuration from API
│   ├── hooks/                     # Custom React hooks
│   │   └── useUserBalance.ts      # Balance management hook
│   ├── pages/                     # Page components
│   │   ├── GameDetailPage/        # Individual game page
│   │   ├── GamesPage/             # Games catalog
│   │   ├── HomePage/              # Main landing page
│   │   └── SettingsPage/          # User settings & wallet
│   ├── services/                  # API services
│   │   └── api.ts                 # API client with auth
│   ├── utils/                     # Utility functions
│   │   └── errors.ts              # Custom error classes
│   ├── App.tsx                    # Main app with routing
│   ├── App.css                    # Global styles
│   ├── main.tsx                   # App entry point
│   └── vite-env.d.ts              # Vite type definitions
├── server/                        # Backend source code
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   ├── seed.ts                # Database seeding
│   │   └── migrations/            # Database migrations
│   ├── src/
│   │   ├── controllers/           # Request handlers
│   │   │   ├── authController.ts  # Authentication endpoints
│   │   │   ├── configController.ts# Configuration endpoints
│   │   │   ├── gamesController.ts # Games CRUD endpoints
│   │   │   └── usersController.ts # User management endpoints
│   │   ├── db/
│   │   │   └── client.ts          # Prisma client instance
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT & Telegram auth
│   │   │   ├── errorHandler.ts    # Global error handling
│   │   │   └── rateLimit.ts       # Rate limiting
│   │   ├── routes/                # Express routes
│   │   │   ├── auth.ts            # /api/auth/*
│   │   │   ├── config.ts          # /api/config
│   │   │   ├── games.ts           # /api/games/*
│   │   │   └── users.ts           # /api/users/*
│   │   ├── schemas/               # Zod validation schemas
│   │   │   └── users.ts           # User input validation
│   │   ├── services/              # Business logic
│   │   │   ├── authService.ts     # Auth & JWT handling
│   │   │   └── userService.ts     # User operations
│   │   ├── utils/
│   │   │   ├── logger.ts          # Winston logger
│   │   │   └── telegram.ts        # Telegram auth validation
│   │   └── index.ts               # Server entry point
│   ├── ecosystem.config.js        # PM2 configuration
│   ├── package.json               # Backend dependencies
│   └── tsconfig.json              # TypeScript config
├── deploy.sh                      # Deployment script
├── package.json                   # Frontend dependencies
├── tsconfig.json                  # Frontend TypeScript config
├── vite.config.ts                 # Vite bundler config
└── index.html                     # HTML entry point
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│      User       │     │   Transaction   │     │      Game       │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │────<│ userId (FK)     │     │ id (PK)         │
│ telegramId (UQ) │     │ id (PK)         │     │ slug (UQ)       │
│ username        │     │ type            │     │ title           │
│ firstName       │     │ amount          │     │ description     │
│ lastName        │     │ tonAmount       │     │ thumbnail       │
│ languageCode    │     │ tonTxHash       │     │ category        │
│ photoUrl        │     │ status          │     │ featured        │
│ isPremium       │     │ createdAt       │     │ active          │
│ walletAddress   │     │ updatedAt       │     │ createdAt       │
│ coinBalance     │     └─────────────────┘     │ updatedAt       │
│ createdAt       │                             └────────┬────────┘
│ updatedAt       │                                      │
└────────┬────────┘                                      │
         │                                               │
         │     ┌─────────────────┐                       │
         └────>│  GameSession    │<──────────────────────┘
               ├─────────────────┤
               │ id (PK)         │
               │ userId (FK)     │
               │ gameId (FK)     │
               │ coinsSpent      │
               │ coinsWon        │
               │ startedAt       │
               │ endedAt         │
               └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│  SystemConfig   │     │  CoinPackage    │
├─────────────────┤     ├─────────────────┤
│ key (PK)        │     │ id (PK)         │
│ value           │     │ name            │
│ updatedAt       │     │ coins           │
└─────────────────┘     │ price           │
                        │ bonus           │
                        │ sortOrder       │
                        │ active          │
                        │ createdAt       │
                        │ updatedAt       │
                        └─────────────────┘
```

---

### Table Details

#### User
Stores Telegram user data and wallet information.

| Column        | Type      | Constraints       | Description                          |
|---------------|-----------|-------------------|--------------------------------------|
| id            | String    | PK, CUID          | Unique identifier                    |
| telegramId    | BigInt    | UNIQUE, NOT NULL  | Telegram user ID                     |
| username      | String?   |                   | Telegram username                    |
| firstName     | String?   |                   | First name from Telegram             |
| lastName      | String?   |                   | Last name from Telegram              |
| languageCode  | String?   |                   | User's language (e.g., "en", "ru")   |
| photoUrl      | String?   |                   | Telegram profile photo URL           |
| isPremium     | Boolean   | DEFAULT false     | Telegram Premium status              |
| walletAddress | String?   | UNIQUE            | Connected TON wallet address         |
| coinBalance   | Int       | DEFAULT 0         | Current coin balance                 |
| createdAt     | DateTime  | DEFAULT now()     | Record creation timestamp            |
| updatedAt     | DateTime  | @updatedAt        | Last update timestamp                |

**Indexes:** `telegramId`, `walletAddress`

---

#### Transaction
Records all coin transactions (purchases, game spending, winnings).

| Column     | Type              | Constraints       | Description                          |
|------------|-------------------|-------------------|--------------------------------------|
| id         | String            | PK, CUID          | Unique identifier                    |
| userId     | String            | FK -> User.id     | Reference to user                    |
| type       | TransactionType   | NOT NULL          | Type of transaction                  |
| amount     | Int               | NOT NULL          | Coin amount (negative for spending)  |
| tonAmount  | BigInt?           |                   | TON amount in nanoTON                |
| tonTxHash  | String?           |                   | Blockchain transaction BOC           |
| status     | TransactionStatus | DEFAULT PENDING   | Transaction status                   |
| createdAt  | DateTime          | DEFAULT now()     | Record creation timestamp            |
| updatedAt  | DateTime          | @updatedAt        | Last update timestamp                |

**Indexes:** `userId`, `tonTxHash`

**TransactionType Enum:**
- `PURCHASE` - Buy coins with TON
- `GAME_SPEND` - Spend coins in game
- `GAME_WIN` - Win coins in game
- `ADMIN_GRANT` - Admin adds coins

**TransactionStatus Enum:**
- `PENDING` - Transaction in progress
- `COMPLETED` - Successfully completed
- `FAILED` - Transaction failed
- `REFUNDED` - Transaction refunded

---

#### Game
Catalog of available games.

| Column      | Type     | Constraints       | Description                          |
|-------------|----------|-------------------|--------------------------------------|
| id          | String   | PK, CUID          | Unique identifier                    |
| slug        | String   | UNIQUE, NOT NULL  | URL-friendly identifier              |
| title       | String   | NOT NULL          | Game display name                    |
| description | String   | NOT NULL          | Game description                     |
| thumbnail   | String   | NOT NULL          | Thumbnail image URL                  |
| category    | String   | NOT NULL          | Game category                        |
| featured    | Boolean  | DEFAULT false     | Featured on homepage                 |
| active      | Boolean  | DEFAULT true      | Game is available                    |
| createdAt   | DateTime | DEFAULT now()     | Record creation timestamp            |
| updatedAt   | DateTime | @updatedAt        | Last update timestamp                |

---

#### GameSession
Tracks individual game play sessions.

| Column     | Type      | Constraints       | Description                          |
|------------|-----------|-------------------|--------------------------------------|
| id         | String    | PK, CUID          | Unique identifier                    |
| userId     | String    | FK -> User.id     | Reference to user                    |
| gameId     | String    | FK -> Game.id     | Reference to game                    |
| coinsSpent | Int       | DEFAULT 0         | Coins spent in session               |
| coinsWon   | Int       | DEFAULT 0         | Coins won in session                 |
| startedAt  | DateTime  | DEFAULT now()     | Session start time                   |
| endedAt    | DateTime? |                   | Session end time                     |

**Indexes:** `userId`, `gameId`

---

#### SystemConfig
Key-value store for application configuration.

| Column    | Type     | Constraints  | Description                          |
|-----------|----------|--------------|--------------------------------------|
| key       | String   | PK           | Configuration key                    |
| value     | String   | NOT NULL     | Configuration value                  |
| updatedAt | DateTime | @updatedAt   | Last update timestamp                |

**Current Keys:**
- `ton_network` - "mainnet" or "testnet"
- `ton_receiver_address` - Wallet address for receiving payments

---

#### CoinPackage
Defines purchasable coin packages.

| Column    | Type     | Constraints   | Description                          |
|-----------|----------|---------------|--------------------------------------|
| id        | String   | PK, CUID      | Unique identifier                    |
| name      | String   | NOT NULL      | Package display name                 |
| coins     | Int      | NOT NULL      | Number of coins in package           |
| price     | Float    | NOT NULL      | Price in TON                         |
| bonus     | Int      | DEFAULT 0     | Bonus coins (percentage or flat)     |
| sortOrder | Int      | DEFAULT 0     | Display order                        |
| active    | Boolean  | DEFAULT true  | Package is available                 |
| createdAt | DateTime | DEFAULT now() | Record creation timestamp            |
| updatedAt | DateTime | @updatedAt    | Last update timestamp                |

---

## API Endpoints

### Authentication
| Method | Endpoint           | Description                    |
|--------|-------------------|--------------------------------|
| POST   | /api/auth/telegram | Authenticate with Telegram data |
| GET    | /api/auth/me       | Get current user info          |

### Users
| Method | Endpoint                | Description                    |
|--------|------------------------|--------------------------------|
| GET    | /api/users/me/balance   | Get user balance               |
| POST   | /api/users/me/add-coins | Add coins (after TON payment)  |
| POST   | /api/users/me/deduct-coins | Deduct coins              |
| POST   | /api/users/me/link-wallet | Link TON wallet address     |

### Games
| Method | Endpoint              | Description                    |
|--------|----------------------|--------------------------------|
| GET    | /api/games            | List all games                 |
| GET    | /api/games/featured   | Get featured game              |
| GET    | /api/games/:id        | Get game by ID or slug         |

### Configuration
| Method | Endpoint     | Description                    |
|--------|-------------|--------------------------------|
| GET    | /api/config  | Get app config (TON, packages) |

---

## Environment Variables

### Server (.env)
```env
PORT=5331
NODE_ENV=production
DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=your-bot-token
JWT_SECRET=your-jwt-secret
```

### Frontend (.env)
```env
VITE_API_URL=https://your-domain.com/api
```

---

## Deployment

### Production Server (Hetzner)
- **Location:** `/opt/p331-telegram-platform`
- **Process Manager:** PM2 (`p331-backend`)
- **Web Server:** Nginx (reverse proxy)
- **Domain:** `p331.eventyr.dev`

### Deploy Command
```bash
ssh root@server "cd /opt/p331-telegram-platform && bash deploy.sh"
```

### Deploy Script Actions
1. Git pull latest code
2. Install dependencies
3. Run Prisma migrations
4. Seed database
5. Build server
6. Restart PM2
