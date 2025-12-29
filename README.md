# P331 Telegram Gaming Platform

Complete guide to run the platform locally.

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

## Quick Start

```bash
# 1. Install dependencies
npm install && cd server && npm install && cd ..

# 2. Create environment files
cp .env.local.example .env.local
cp server/.env.local.example server/.env.local

# 3. Start everything
npm run dev:local

# 4. Open browser
open http://localhost:5173
```

---

## Architecture

```
                              ┌─────────────────────────────────┐
                              │            Browser              │
                              │     http://localhost:5173       │
                              └─────────────────────────────────┘
                                             │
                         ┌───────────────────┼───────────────────┐
                         │                   │                   │
                         ▼                   ▼                   ▼
              ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
              │    Frontend     │ │   Backend API   │ │  Nakama Server  │
              │   (Vite/React)  │ │   (Express.js)  │ │  (Game Server)  │
              │                 │ │                 │ │                 │
              │  localhost:5173 │ │ localhost:3847  │ │ localhost:7350  │
              │    [HOST]       │ │    [HOST]       │ │   [DOCKER]      │
              └─────────────────┘ └─────────────────┘ └─────────────────┘
                                         │                   │
                                         ▼                   ▼
                              ┌─────────────────┐ ┌─────────────────┐
                              │  Backend DB     │ │   Nakama DB     │
                              │  (PostgreSQL)   │ │  (PostgreSQL)   │
                              │                 │ │                 │
                              │ localhost:5432  │ │ localhost:5433  │
                              │   [DOCKER]      │ │   [DOCKER]      │
                              └─────────────────┘ └─────────────────┘
```

### Service Details

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HOST MACHINE                                    │
│                                                                             │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐        │
│  │  Frontend (Vite + React)     │  │  Backend API (Express.js)    │        │
│  │  Port: 5173                  │  │  Port: 3847                  │        │
│  │                              │  │                              │        │
│  │  - React 18 + TypeScript     │  │  - REST API endpoints        │        │
│  │  - TailwindCSS               │  │  - Prisma ORM                │        │
│  │  - TON Connect               │  │  - JWT authentication        │        │
│  │  - Telegram Mini App SDK     │  │  - Telegram auth             │        │
│  └──────────────────────────────┘  └──────────────────────────────┘        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                              DOCKER CONTAINERS                               │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  p331-backend-postgres                                              │    │
│  │  Image: postgres:15-alpine                                          │    │
│  │  Port: 5432                                                         │    │
│  │  Database: backend | User: backend | Pass: backend_local_dev        │    │
│  │                                                                     │    │
│  │  Tables: User, Game, CoinPackage, GameSession, Transaction, etc.   │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  p331-nakama-postgres                                               │    │
│  │  Image: postgres:15-alpine                                          │    │
│  │  Port: 5433                                                         │    │
│  │  Database: nakama | User: nakama | Pass: nakama_local_dev           │    │
│  │                                                                     │    │
│  │  Tables: users, wallet_ledger, leaderboard, storage, etc.          │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  p331-nakama-server                                                 │    │
│  │  Image: heroiclabs/nakama:3.21.1                                    │    │
│  │  Ports: 7349 (gRPC), 7350 (HTTP/WS), 7351 (Console)                │    │
│  │                                                                     │    │
│  │  Features:                                                          │    │
│  │  - Real-time multiplayer matches (PvP, PvH)                        │    │
│  │  - Wallet & coin management                                         │    │
│  │  - Leaderboards                                                     │    │
│  │  - Custom game logic (nakama/modules/main.js)                      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Services Overview

| Service | URL/Port | Container Name | Description |
|---------|----------|----------------|-------------|
| Frontend | http://localhost:5173 | - (host) | React app with hot reload |
| Backend API | http://localhost:3847/api | - (host) | Express.js REST API |
| Backend DB | localhost:5432 | `p331-backend-postgres` | PostgreSQL for backend |
| Nakama Server | http://localhost:7350 | `p331-nakama-server` | Game server |
| Nakama Console | http://localhost:7351 | `p331-nakama-server` | Game server admin UI |
| Nakama DB | localhost:5433 | `p331-nakama-postgres` | PostgreSQL for Nakama |

---

## Docker Containers

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `p331-backend-postgres` | postgres:15-alpine | 5432 | Backend database |
| `p331-nakama-postgres` | postgres:15-alpine | 5433 | Nakama database |
| `p331-nakama-server` | heroiclabs/nakama:3.21.1 | 7349-7351 | Game server |

---

## Nakama Console Access

- **URL:** http://localhost:7351
- **Username:** `admin`
- **Password:** `password`

---

## Debug Mode (Browser Testing)

Debug mode allows testing without Telegram. Enabled by default in local environment.

1. Open http://localhost:5173
2. Browser prompts for Telegram ID and Username
3. Enter test values (e.g., ID: `123456789`, Username: `test_user`)
4. App creates a debug user session

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
DATABASE_URL=postgresql://backend:backend_local_dev@localhost:5432/backend
ALLOW_WEB_DEBUG=true
PAYMENT_RECEIVER_ADDRESS=
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Database Credentials

### Backend PostgreSQL (port 5432)

| Setting | Value |
|---------|-------|
| Host | localhost |
| Port | 5432 |
| Database | backend |
| User | backend |
| Password | backend_local_dev |

```bash
# Connect via psql
psql -h localhost -p 5432 -U backend -d backend
# Password: backend_local_dev
```

### Nakama PostgreSQL (port 5433)

| Setting | Value |
|---------|-------|
| Host | localhost |
| Port | 5433 |
| Database | nakama |
| User | nakama |
| Password | nakama_local_dev |

```bash
# Connect via psql
psql -h localhost -p 5433 -U nakama -d nakama
# Password: nakama_local_dev
```

---

## Useful Commands

### Start/Stop Services

```bash
# Start everything (recommended)
npm run dev:local

# Stop all services (Ctrl+C in terminal, or):
docker-compose down

# Start only Docker services
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
docker-compose logs p331-nakama-server
docker-compose logs p331-backend-postgres
docker-compose logs p331-nakama-postgres

# Restart a service
docker-compose restart nakama

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
docker-compose restart nakama
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find what's using a port
lsof -i :5432   # Backend PostgreSQL
lsof -i :5433   # Nakama PostgreSQL
lsof -i :7350   # Nakama
lsof -i :3847   # Backend
lsof -i :5173   # Frontend

# Kill process using port
kill -9 <PID>
```

### Nakama Won't Start

```bash
# Check logs
docker-compose logs nakama

# Common fix: restart with clean volumes
docker-compose down -v
npm run dev:local
```

### Database Connection Issues

```bash
# Verify containers are running
docker ps

# Check specific container logs
docker-compose logs p331-backend-postgres
docker-compose logs p331-nakama-postgres
```

### Frontend Can't Connect to Backend

1. Check backend is running on port 3847
2. Verify `.env.local` has correct `VITE_API_URL=http://localhost:3847/api`
3. Check browser console for CORS errors

### "Debug mode not enabled" Error

Ensure both environment files have debug enabled:
```bash
grep VITE_ALLOW_WEB_DEBUG .env.local
grep ALLOW_WEB_DEBUG server/.env.local
```
