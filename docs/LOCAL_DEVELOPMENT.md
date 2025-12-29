# Local Development Setup

Complete guide to run the P331 Telegram Gaming Platform locally.

---

## Prerequisites

Before starting, ensure you have installed:

| Tool | Version | Check Command |
|------|---------|---------------|
| Docker | 20.10+ | `docker --version` |
| Docker Compose | 1.29+ | `docker-compose --version` |
| Node.js | 20+ | `node --version` |
| npm | 9+ | `npm --version` |

---

## Step-by-Step Setup

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd p331-telegram-platform

# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..
```

### Step 2: Create Environment Files

```bash
# Create frontend environment file
cp .env.local.example .env.local

# Create backend environment file
cp server/.env.local.example server/.env.local
```

### Step 3: Start Everything

```bash
npm run dev:local
```

This single command will:
1. Start PostgreSQL database container
2. Start Nakama game server container
3. Wait for services to be healthy
4. Run database migrations
5. Seed the database with games and config
6. Start backend API server
7. Start frontend dev server

### Step 4: Open in Browser

Open http://localhost:5173 in your browser.

Since debug mode is enabled, you'll see a prompt asking for:
- **Telegram ID**: Enter any number (e.g., `123456789`)
- **Username**: Enter any name (e.g., `test_user`)

---

## Services Overview

After running `npm run dev:local`, these services are available:

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React app with hot reload |
| Backend API | http://localhost:3847/api | Express.js REST API |
| Nakama Console | http://localhost:7351 | Game server admin UI |
| Nakama API | http://localhost:7350 | Game server WebSocket/HTTP |
| PostgreSQL | localhost:5432 | Database |

### Docker Containers

| Container Name | Image | Purpose |
|----------------|-------|---------|
| telegram-game-db-pg | postgres:15-alpine | PostgreSQL database |
| telegram-game-nakama | heroiclabs/nakama:3.21.1 | Game server |

---

## Nakama Console Access

The Nakama admin console lets you view users, matches, and storage.

- **URL:** http://localhost:7351
- **Username:** `admin`
- **Password:** `password`

---

## Debug Mode (Browser Testing)

Debug mode allows testing without Telegram. It's enabled by default in local environment.

**How it works:**
1. Open http://localhost:5173
2. Browser prompts for Telegram ID and Username
3. Enter test values and click OK
4. App creates a debug user session

**Environment variables controlling this:**
```env
# Frontend (.env.local)
VITE_ALLOW_WEB_DEBUG=true

# Backend (server/.env.local)
ALLOW_WEB_DEBUG=true
```

---

## Environment Configuration

### Frontend (.env.local)

```env
# API Configuration
VITE_API_URL=http://localhost:3847/api
VITE_APP_URL=http://localhost:5173

# Debug Mode
VITE_ALLOW_WEB_DEBUG=true

# TON Configuration (optional for local)
VITE_PAYMENT_RECEIVER_ADDRESS=

# Nakama Game Server
VITE_NAKAMA_HOST=localhost
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_USE_SSL=false
```

### Backend (server/.env.local)

```env
PORT=3847
NODE_ENV=development
JWT_SECRET=local-dev-secret-key-min-32-characters-here
TELEGRAM_BOT_TOKEN=
DATABASE_URL=postgresql://p331:p331_local_dev@localhost:5432/p331
ALLOW_WEB_DEBUG=true
PAYMENT_RECEIVER_ADDRESS=
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Useful Commands

### Start/Stop Services

```bash
# Start everything (recommended)
npm run dev:local

# Stop all services (Ctrl+C in terminal, or):
docker-compose down

# Start only Docker services (DB + Nakama)
docker-compose up -d

# Start only frontend
npm run dev

# Start only backend
npm run dev:server

# Start frontend + backend (without Docker)
npm run dev:all
```

### Database Commands

```bash
# Run migrations
cd server && npx prisma migrate deploy

# Seed database
cd server && npm run prisma:seed

# Open Prisma Studio (database GUI)
cd server && npx prisma studio

# Reset database completely
docker-compose down -v
npm run dev:local
```

### Docker Commands

```bash
# View running containers
docker ps

# View container logs
docker-compose logs telegram-game-nakama
docker-compose logs telegram-game-db

# Restart a service
docker-compose restart telegram-game-nakama

# Remove all containers and volumes (clean slate)
docker-compose down -v
```

---

## Nakama Custom Game Logic

Custom game logic is in `nakama/modules/main.js`. This module provides:

- **Match handling** - PvP and PvH (Player vs House) matches
- **Wallet management** - Coin betting and payouts
- **Level selection** - Skill-based level matching
- **Leaderboards** - Weekly win tracking

### Available RPCs

| RPC Name | Description |
|----------|-------------|
| `join_game` | Join a game match |
| `add_test_coins` | Add test coins to wallet (debug) |
| `get_config` | Get server configuration |
| `get_player_stats` | Get player statistics |

### Updating Game Logic

```bash
# Edit the module
code nakama/modules/main.js

# Restart Nakama to apply changes
docker-compose restart telegram-game-nakama
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find what's using a port
lsof -i :5432   # PostgreSQL
lsof -i :7350   # Nakama
lsof -i :3847   # Backend
lsof -i :5173   # Frontend

# Kill process using port
kill -9 <PID>
```

### Nakama Won't Start

```bash
# Check logs
docker-compose logs telegram-game-nakama

# Common fix: restart with clean volumes
docker-compose down -v
npm run dev:local
```

### Database Connection Issues

```bash
# Verify PostgreSQL is running
docker ps | grep telegram-game-db-pg

# Check database logs
docker-compose logs telegram-game-db

# Test connection
psql -h localhost -U p331 -d p331
# Password: p331_local_dev
```

### Frontend Can't Connect to Backend

1. Check backend is running on port 3847
2. Verify `.env.local` has correct `VITE_API_URL=http://localhost:3847/api`
3. Check browser console for CORS errors

### "Debug mode not enabled" Error

Ensure both environment files have debug enabled:
```bash
# Check frontend
grep VITE_ALLOW_WEB_DEBUG .env.local

# Check backend
grep ALLOW_WEB_DEBUG server/.env.local
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│                    http://localhost:5173                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Vite + React)                   │
│                      localhost:5173                          │
│                    [Runs on host machine]                    │
└─────────────────────────────────────────────────────────────┘
                    │                    │
                    ▼                    ▼
┌───────────────────────────┐  ┌──────────────────────────────┐
│     Backend API           │  │      Nakama Game Server      │
│   localhost:3847          │  │      localhost:7350          │
│ [Runs on host machine]    │  │    [Docker container]        │
└───────────────────────────┘  └──────────────────────────────┘
                    │                    │
                    └──────────┬─────────┘
                               ▼
              ┌────────────────────────────────┐
              │        PostgreSQL              │
              │       localhost:5432           │
              │      [Docker container]        │
              └────────────────────────────────┘
```
