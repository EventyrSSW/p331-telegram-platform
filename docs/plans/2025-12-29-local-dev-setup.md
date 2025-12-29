# Local Development Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a one-command local development setup that runs frontend, backend, database, and Nakama game server with all required configurations.

**Architecture:** Docker Compose orchestrates all services (PostgreSQL, Nakama, backend). Frontend runs via Vite with hot reload. Environment files are templated for local development with sensible defaults. A single npm script starts everything.

**Tech Stack:** Docker Compose, PostgreSQL 15, Nakama 3.x, Node.js 20, Vite, React

---

## Current State Analysis

### Services Required
1. **PostgreSQL** - Database (port 5432)
2. **Nakama** - Game server (ports 7349, 7350, 7351)
3. **Backend** - Express.js API server (port 3847)
4. **Frontend** - Vite dev server (port 5173)

### Current Gaps
1. No Nakama service in docker-compose.yml
2. No `.env.local` template with all local settings
3. No `server/.env.local` template
4. Missing `npm run dev:local` command that starts everything
5. Backend Dockerfile designed for production, not development with hot reload

---

## Task 1: Create Local Environment Template for Frontend

**Files:**
- Create: `.env.local.example`

**Step 1: Create the frontend local env template**

```bash
# .env.local.example
# Copy to .env.local and adjust as needed

# API Configuration
VITE_API_URL=http://localhost:3847/api
VITE_APP_URL=http://localhost:5173

# Debug Mode - enables browser prompt for Telegram ID/username
VITE_ALLOW_WEB_DEBUG=true

# TON Configuration (optional for local dev)
VITE_PAYMENT_RECEIVER_ADDRESS=

# Nakama Game Server - Local Docker
VITE_NAKAMA_HOST=localhost
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_USE_SSL=false
```

**Step 2: Verify file created**

Run: `cat .env.local.example`
Expected: File contents displayed

**Step 3: Commit**

```bash
git add .env.local.example
git commit -m "feat: add frontend local environment template"
```

---

## Task 2: Create Local Environment Template for Backend

**Files:**
- Create: `server/.env.local.example`

**Step 1: Create the backend local env template**

```bash
# server/.env.local.example
# Copy to server/.env.local for local development

# Server
PORT=3847
NODE_ENV=development

# Security
JWT_SECRET=local-dev-secret-key-min-32-characters-here
TELEGRAM_BOT_TOKEN=

# Database - Local Docker PostgreSQL
DATABASE_URL=postgresql://p331:p331_local_dev@localhost:5432/p331

# Debug Mode - allows authentication without Telegram verification
ALLOW_WEB_DEBUG=true

# TON (optional for local dev)
PAYMENT_RECEIVER_ADDRESS=

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Step 2: Verify file created**

Run: `cat server/.env.local.example`
Expected: File contents displayed

**Step 3: Commit**

```bash
git add server/.env.local.example
git commit -m "feat: add backend local environment template"
```

---

## Task 3: Update Docker Compose with Nakama Service

**Files:**
- Modify: `docker-compose.yml`

**Step 1: Update docker-compose.yml to add Nakama**

Replace the entire docker-compose.yml with:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
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

  # Nakama Game Server
  nakama:
    image: registry.heroiclabs.com/heroiclabs/nakama:3.21.1
    entrypoint:
      - "/bin/sh"
      - "-ecx"
      - >
        /nakama/nakama migrate up --database.address postgres:p331_local_dev@db:5432/p331 &&
        exec /nakama/nakama --name nakama1 --database.address postgres:p331_local_dev@db:5432/p331 --logger.level DEBUG --session.token_expiry_sec 7200 --runtime.js_entrypoint "main.js"
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "7349:7349"   # gRPC API
      - "7350:7350"   # HTTP API / WebSocket
      - "7351:7351"   # Console
    volumes:
      - ./nakama/modules:/nakama/data/modules:ro   # Custom game logic
    healthcheck:
      test: ["CMD", "/nakama/nakama", "healthcheck"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**Step 2: Verify docker-compose syntax**

Run: `docker-compose config`
Expected: Valid YAML output, no errors

**Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add Nakama game server to docker-compose"
```

---

## Task 4: Move Nakama Modules to Project Root

**Files:**
- Create: `nakama/modules/main.js` (moved from scripts/nakama-tests/nakama-server/modules/)

**Step 1: Create nakama modules directory structure**

```bash
mkdir -p nakama/modules
```

**Step 2: Copy the Nakama server module**

```bash
cp scripts/nakama-tests/nakama-server/modules/main.js nakama/modules/main.js
```

**Step 3: Verify the module is in place**

Run: `ls -la nakama/modules/`
Expected: `main.js` file listed

**Step 4: Verify module content**

Run: `head -30 nakama/modules/main.js`
Expected: Shows the InitModule function and game logic

**Step 5: Commit**

```bash
git add nakama/
git commit -m "feat: relocate Nakama modules to project root for Docker mount"
```

---

## Task 5: Create Local Development Startup Script

**Files:**
- Create: `scripts/dev-local.sh`

**Step 1: Create the local dev startup script**

```bash
#!/bin/bash

# Local Development Startup Script
# Starts all services: PostgreSQL, Nakama, Backend, Frontend

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Starting P331 Local Development Environment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required tools
check_requirements() {
    local missing=()

    if ! command -v docker &> /dev/null; then
        missing+=("docker")
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        missing+=("docker-compose")
    fi

    if ! command -v npm &> /dev/null; then
        missing+=("npm")
    fi

    if [ ${#missing[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing required tools: ${missing[*]}${NC}"
        exit 1
    fi
}

# Setup environment files if they don't exist
setup_env_files() {
    if [ ! -f "$PROJECT_DIR/.env.local" ]; then
        if [ -f "$PROJECT_DIR/.env.local.example" ]; then
            cp "$PROJECT_DIR/.env.local.example" "$PROJECT_DIR/.env.local"
            echo -e "${GREEN}✅ Created .env.local from template${NC}"
        fi
    fi

    if [ ! -f "$PROJECT_DIR/server/.env" ]; then
        if [ -f "$PROJECT_DIR/server/.env.local.example" ]; then
            cp "$PROJECT_DIR/server/.env.local.example" "$PROJECT_DIR/server/.env"
            echo -e "${GREEN}✅ Created server/.env from template${NC}"
        fi
    fi
}

# Start Docker services
start_docker_services() {
    echo -e "${YELLOW}📦 Starting Docker services (PostgreSQL, Nakama)...${NC}"
    cd "$PROJECT_DIR"

    # Use docker compose (v2) or docker-compose (v1)
    if docker compose version &> /dev/null; then
        docker compose up -d
    else
        docker-compose up -d
    fi

    echo -e "${GREEN}✅ Docker services started${NC}"
}

# Wait for services to be ready
wait_for_services() {
    echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"

    # Wait for PostgreSQL
    echo -n "   PostgreSQL: "
    for i in {1..30}; do
        if pg_isready -h localhost -p 5432 -U p331 &> /dev/null 2>&1; then
            echo -e "${GREEN}ready${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${YELLOW}timeout (may still work)${NC}"
        fi
        sleep 1
    done

    # Wait for Nakama
    echo -n "   Nakama: "
    for i in {1..30}; do
        if curl -s http://localhost:7350/healthcheck &> /dev/null; then
            echo -e "${GREEN}ready${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${YELLOW}timeout (may still work)${NC}"
        fi
        sleep 1
    done
}

# Run database migrations
run_migrations() {
    echo -e "${YELLOW}🔄 Running database migrations...${NC}"
    cd "$PROJECT_DIR/server"
    npx prisma migrate deploy
    echo -e "${GREEN}✅ Migrations complete${NC}"
}

# Seed database
seed_database() {
    echo -e "${YELLOW}🌱 Seeding database...${NC}"
    cd "$PROJECT_DIR/server"
    npm run prisma:seed || true
    echo -e "${GREEN}✅ Seeding complete${NC}"
}

# Start backend and frontend
start_dev_servers() {
    echo -e "${YELLOW}🖥️  Starting development servers...${NC}"
    cd "$PROJECT_DIR"

    # This will run both frontend and backend concurrently
    npm run dev:all
}

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping services...${NC}"
    cd "$PROJECT_DIR"

    if docker compose version &> /dev/null; then
        docker compose down
    else
        docker-compose down
    fi

    echo -e "${GREEN}👋 Goodbye!${NC}"
}

# Main execution
main() {
    check_requirements
    setup_env_files
    start_docker_services
    wait_for_services
    run_migrations
    seed_database

    echo ""
    echo -e "${GREEN}✅ Local development environment is ready!${NC}"
    echo ""
    echo "📋 Services:"
    echo "   Frontend:       http://localhost:5173"
    echo "   Backend API:    http://localhost:3847/api"
    echo "   Nakama Console: http://localhost:7351"
    echo "   Nakama API:     http://localhost:7350"
    echo "   PostgreSQL:     localhost:5432"
    echo ""
    echo "📝 Default Nakama Console credentials:"
    echo "   Username: admin"
    echo "   Password: password"
    echo ""
    echo "Press Ctrl+C to stop all services..."
    echo ""

    trap cleanup EXIT
    start_dev_servers
}

main "$@"
```

**Step 2: Make script executable**

Run: `chmod +x scripts/dev-local.sh`
Expected: No output, script is now executable

**Step 3: Commit**

```bash
git add scripts/dev-local.sh
git commit -m "feat: add local development startup script"
```

---

## Task 6: Add NPM Script for Local Development

**Files:**
- Modify: `package.json`

**Step 1: Add dev:local script to package.json**

Add to the "scripts" section:

```json
"dev:local": "./scripts/dev-local.sh"
```

The scripts section should look like:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "dev:server": "cd server && npm run dev",
  "dev:all": "concurrently \"npm run dev\" \"npm run dev:server\"",
  "dev:local": "./scripts/dev-local.sh",
  "dev:ngrok": "./scripts/dev-with-ngrok.sh",
  "build:server": "cd server && npm run build",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:run": "vitest run"
}
```

**Step 2: Verify package.json is valid**

Run: `npm run --list`
Expected: Lists all scripts including dev:local

**Step 3: Commit**

```bash
git add package.json
git commit -m "feat: add npm run dev:local command"
```

---

## Task 7: Create Docker Compose Override for Development

**Files:**
- Create: `docker-compose.override.yml`

**Step 1: Create development override file**

This file automatically merges with docker-compose.yml for development:

```yaml
# docker-compose.override.yml
# Development overrides - automatically applied when running docker-compose up

version: '3.8'

services:
  db:
    # Expose PostgreSQL for direct access during development
    ports:
      - "5432:5432"

  nakama:
    # More verbose logging for development
    entrypoint:
      - "/bin/sh"
      - "-ecx"
      - >
        /nakama/nakama migrate up --database.address postgres:p331_local_dev@db:5432/p331 &&
        exec /nakama/nakama --name nakama1 --database.address postgres:p331_local_dev@db:5432/p331 --logger.level DEBUG --session.token_expiry_sec 7200 --runtime.js_entrypoint "main.js" --console.username admin --console.password password
    environment:
      - NAKAMA_CONSOLE_USERNAME=admin
      - NAKAMA_CONSOLE_PASSWORD=password
    volumes:
      - ./nakama/modules:/nakama/data/modules:ro   # Custom game logic (hot-reload friendly)
```

**Step 2: Verify syntax**

Run: `docker-compose config`
Expected: Valid merged config output

**Step 3: Commit**

```bash
git add docker-compose.override.yml
git commit -m "feat: add docker-compose development overrides"
```

---

## Task 8: Update .gitignore for Local Files

**Files:**
- Modify: `.gitignore` (or create if doesn't exist)

**Step 1: Check current .gitignore**

Run: `cat .gitignore 2>/dev/null || echo "No .gitignore found"`

**Step 2: Ensure local env files are ignored**

Add these entries if not present:

```
# Local environment files
.env.local
.env.*.local
server/.env
server/.env.local

# Docker volumes
postgres_data/

# Ngrok logs
.ngrok.log
```

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: update gitignore for local dev files"
```

---

## Task 9: Create Quick Start Documentation

**Files:**
- Create: `docs/LOCAL_DEVELOPMENT.md`

**Step 1: Create the documentation**

```markdown
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
```

**Step 2: Verify file created**

Run: `head -20 docs/LOCAL_DEVELOPMENT.md`
Expected: First 20 lines of documentation displayed

**Step 3: Commit**

```bash
git add docs/LOCAL_DEVELOPMENT.md
git commit -m "docs: add local development setup guide"
```

---

## Task 10: Test the Complete Setup

**Files:** None (testing only)

**Step 1: Stop any running services**

```bash
docker-compose down 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
```

**Step 2: Run the local dev command**

```bash
npm run dev:local
```

Expected output:
- Docker services start
- Migrations run
- Seeds run
- Frontend available at http://localhost:5173
- Backend available at http://localhost:3847/api
- Nakama console available at http://localhost:7351

**Step 3: Verify services**

In a new terminal:

```bash
# Test backend health
curl http://localhost:3847/api/health

# Test Nakama health
curl http://localhost:7350/healthcheck

# Test frontend
curl -s http://localhost:5173 | head -5
```

Expected: All return valid responses

**Step 4: Test debug authentication flow**

1. Open http://localhost:5173 in browser
2. Debug prompt should appear asking for Telegram ID and Username
3. Enter test values
4. Should authenticate and show the app

---

## Task 11: Final Commit with All Changes

**Step 1: Check git status**

```bash
git status
```

**Step 2: Create final summary commit if needed**

If there are any uncommitted changes:

```bash
git add -A
git commit -m "feat: complete local development setup

- Added Docker Compose with PostgreSQL and Nakama
- Created environment templates for frontend and backend
- Added npm run dev:local one-command startup
- Added development documentation
- Configured debug mode for browser testing"
```

---

## Summary

After completing all tasks, developers can run:

```bash
npm run dev:local
```

This single command will:
1. Start PostgreSQL (port 5432)
2. Start Nakama game server with custom modules (ports 7350, 7351)
3. Run database migrations
4. Seed initial data
5. Start backend with hot reload (port 3847)
6. Start frontend with hot reload (port 5173)

All services are configured for local development with debug authentication enabled.

**Nakama modules** at `nakama/modules/main.js` are automatically mounted and loaded, providing match handling, wallet management, and game RPCs.
