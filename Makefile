.PHONY: help dev build up down logs clean test deploy health

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m # No Color

help:
	@echo "$(BLUE)Course Platform Development Tools$(NC)"
	@echo ""
	@echo "$(GREEN)Local Development$(NC)"
	@echo "  make dev           - Start dev environment with hot reload"
	@echo "  make build         - Build all Docker images"
	@echo "  make up            - Start all services"
	@echo "  make down          - Stop all services"
	@echo "  make logs          - View all service logs"
	@echo "  make logs-backend  - View backend logs"
	@echo "  make logs-frontend - View frontend logs"
	@echo "  make clean         - Stop and remove all containers"
	@echo ""
	@echo "$(GREEN)Testing$(NC)"
	@echo "  make test          - Run all tests"
	@echo "  make test-backend  - Run backend pytest tests"
	@echo "  make test-frontend - Run frontend vitest tests"
	@echo ""
	@echo "$(GREEN)Deployment$(NC)"
	@echo "  make health        - Check service health"
	@echo "  make restart       - Restart all services"
	@echo "  make rebuild       - Rebuild without cache and restart"
	@echo ""
	@echo "$(GREEN)Database$(NC)"
	@echo "  make db-reset      - Reset PostgreSQL (WARNING: data loss!)"
	@echo "  make db-shell      - Access PostgreSQL shell"
	@echo ""

# Development
dev:
	@echo "$(BLUE)Starting development environment...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Services running$(NC)"
	@echo ""
	@echo "Access:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:8000"
	@echo "  API Docs: http://localhost:8000/docs"
	@echo "  Meilisearch: http://localhost:7700"
	@echo ""

build:
	@echo "$(BLUE)Building Docker images...$(NC)"
	docker-compose build --no-cache
	@echo "$(GREEN)✓ Build complete$(NC)"

up:
	@echo "$(BLUE)Starting services...$(NC)"
	docker-compose up -d
	@sleep 5
	@echo "$(GREEN)✓ Services started$(NC)"

down:
	@echo "$(BLUE)Stopping services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Services stopped$(NC)"

logs:
	docker-compose logs -f --tail 50

logs-backend:
	docker-compose logs -f backend --tail 100

logs-frontend:
	docker-compose logs -f frontend --tail 100

clean:
	@echo "$(BLUE)Cleaning up...$(NC)"
	docker-compose down -v
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

# Testing
test:
	@echo "$(BLUE)Running all tests...$(NC)"
	@make test-backend
	@make test-frontend

test-backend:
	@echo "$(BLUE)Running backend tests...$(NC)"
	docker-compose exec -T backend pytest -v --tb=short tests/

test-frontend:
	@echo "$(BLUE)Running frontend tests...$(NC)"
	cd frontend && npm run test

# Health & Monitoring
health:
	@echo "$(BLUE)Checking service health...$(NC)"
	@echo ""
	@echo "Docker Services:"
	@docker-compose ps
	@echo ""
	@echo "Health Checks:"
	@echo -n "Backend:     "
	@curl -s http://localhost:8000/health > /dev/null && echo "$(GREEN)✓$(NC)" || echo "$(RED)✗$(NC)"
	@echo -n "Meilisearch: "
	@curl -s http://localhost:7700/health > /dev/null && echo "$(GREEN)✓$(NC)" || echo "$(RED)✗$(NC)"
	@echo -n "Frontend:    "
	@curl -s http://localhost:3000 > /dev/null && echo "$(GREEN)✓$(NC)" || echo "$(RED)✗$(NC)"
	@echo ""

restart:
	@echo "$(BLUE)Restarting services...$(NC)"
	docker-compose restart
	@echo "$(GREEN)✓ Services restarted$(NC)"

rebuild:
	@echo "$(BLUE)Rebuilding without cache...$(NC)"
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d
	@echo "$(GREEN)✓ Rebuild complete$(NC)"

# Database
db-reset:
	@echo "$(RED)WARNING: This will DELETE all database data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)Resetting database...$(NC)"; \
		docker-compose down -v; \
		docker-compose up -d postgres; \
		sleep 5; \
		@echo "$(GREEN)✓ Database reset complete$(NC)"; \
	else \
		echo "$(RED)Cancelled$(NC)"; \
	fi

db-shell:
	@echo "$(BLUE)Connecting to PostgreSQL...$(NC)"
	@docker-compose exec postgres psql -U postgres -d course_db

# Utility
venv:
	@echo "$(BLUE)Creating Python virtual environment...$(NC)"
	python -m venv .venv
	@echo "$(GREEN)✓ Virtual environment created$(NC)"
	@echo "Activate with: source .venv/bin/activate"

install:
	@echo "$(BLUE)Installing Python dependencies...$(NC)"
	pip install -r Requirements.txt
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

.DEFAULT_GOAL := help
