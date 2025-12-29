# Local Development Setup

## Prerequisites

- **Docker** & **Docker Compose** - For PostgreSQL and Nakama
- **Node.js 20+** - For backend and frontend
- **npm** - Package manager

## Quick Start

```bash
# 1. Clone and install dependencies
npm install
cd server && npm install && cd ..

# 2. Start everything with one command
npm run dev:local
```

This will:
1. Start PostgreSQL database (port 5432)
2. Start Nakama game server (ports 7349, 7350, 7351)
3. Run database migrations
4. Seed the database with games and config
5. Start backend API server (port 3847)
6. Start frontend dev server (port 5173)

## Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React app with hot reload |
| Backend API | http://localhost:3847/api | Express.js REST API |
| Nakama Console | http://localhost:7351 | Game server admin UI |
| Nakama API | http://localhost:7350 | Game server HTTP/WebSocket |
| PostgreSQL | localhost:5432 | Database |

## Nakama Console

- **URL:** http://localhost:7351
- **Username:** admin
- **Password:** password

## Nakama Custom Modules

Custom game logic is located at `nakama/modules/main.js`. This module provides:

- **Match handling** - PvP and PvH (Player vs House) matches
- **Wallet management** - Coin betting and payouts
- **Level selection** - Skill-based level matching
- **Leaderboards** - Weekly win tracking
- **RPCs** - `join_game`, `add_test_coins`, `get_config`, `get_player_stats`

To modify game logic, edit `nakama/modules/main.js` and restart Nakama:

```bash
docker-compose restart nakama
```

## Environment Files

### Frontend (.env.local)

Created automatically from `.env.local.example`:

```env
VITE_API_URL=http://localhost:3847/api
VITE_APP_URL=http://localhost:5173
VITE_ALLOW_WEB_DEBUG=true
VITE_NAKAMA_HOST=localhost
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_USE_SSL=false
```

### Backend (server/.env)

Created automatically from `server/.env.local.example`:

```env
PORT=3847
NODE_ENV=development
JWT_SECRET=local-dev-secret-key-min-32-characters-here
DATABASE_URL=postgresql://p331:p331_local_dev@localhost:5432/p331
ALLOW_WEB_DEBUG=true
```

## Debug Mode

With `VITE_ALLOW_WEB_DEBUG=true` and `ALLOW_WEB_DEBUG=true`, you can test in browser without Telegram:

1. Open http://localhost:5173
2. A prompt will ask for Telegram ID and Username
3. Enter any test values (e.g., ID: 123456789, Username: test_user)

## Individual Commands

```bash
# Start only Docker services (DB + Nakama)
docker-compose up -d

# Start only backend
npm run dev:server

# Start only frontend
npm run dev

# Start frontend + backend (no Docker)
npm run dev:all

# Stop Docker services
docker-compose down

# Reset database
docker-compose down -v  # Removes volumes
docker-compose up -d
cd server && npx prisma migrate deploy && npm run prisma:seed
```

## Troubleshooting

### Port conflicts

```bash
# Check what's using a port
lsof -i :5432  # PostgreSQL
lsof -i :7350  # Nakama
lsof -i :3847  # Backend
lsof -i :5173  # Frontend
```

### Database issues

```bash
# Reset database completely
docker-compose down -v
docker-compose up -d db
sleep 5
cd server && npx prisma migrate deploy && npm run prisma:seed
```

### Nakama not starting

```bash
# Check Nakama logs
docker-compose logs nakama

# Restart Nakama
docker-compose restart nakama
```
