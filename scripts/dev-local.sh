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

    if [ ! -f "$PROJECT_DIR/server/.env.local" ]; then
        if [ -f "$PROJECT_DIR/server/.env.local.example" ]; then
            cp "$PROJECT_DIR/server/.env.local.example" "$PROJECT_DIR/server/.env.local"
            echo -e "${GREEN}✅ Created server/.env.local from template${NC}"
        fi
    fi
}

# Load local environment variables for database
load_local_env() {
    if [ -f "$PROJECT_DIR/server/.env.local" ]; then
        export $(grep -v '^#' "$PROJECT_DIR/server/.env.local" | xargs)
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
    # Use db push for local development
    npx prisma db push
    echo -e "${GREEN}✅ Migrations complete${NC}"
}

# Seed database
seed_database() {
    echo -e "${YELLOW}🌱 Seeding database...${NC}"
    cd "$PROJECT_DIR/server"
    npm run prisma:seed || true
    echo -e "${GREEN}✅ Seeding complete${NC}"
}

# Seed Nakama storage with game levels
seed_nakama() {
    echo -e "${YELLOW}🎮 Seeding Nakama game levels...${NC}"
    cd "$PROJECT_DIR"
    node scripts/seed-nakama.js || true
}

# Open browser with URLs
open_browser() {
    # Wait a moment for servers to be ready
    sleep 3

    # Open URLs in default browser (macOS)
    if command -v open &> /dev/null; then
        open "http://localhost:5173"
        open "http://localhost:7351"
    # Linux
    elif command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:5173"
        xdg-open "http://localhost:7351"
    fi
}

# Start backend and frontend
start_dev_servers() {
    echo -e "${YELLOW}🖥️  Starting development servers...${NC}"
    cd "$PROJECT_DIR"

    # Open browser in background after a short delay
    open_browser &

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
    load_local_env
    start_docker_services
    wait_for_services
    run_migrations
    seed_database
    seed_nakama

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
