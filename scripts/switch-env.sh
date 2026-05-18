#!/bin/bash
# Docker Compose Environment Switcher
# Quickly switch between development and production configurations

set -e

ENV_TYPE="${1:-}"
COMPOSE_FILE="docker-compose.yml"
COMPOSE_OVERRIDE="docker-compose.override.yml"

print_usage() {
    echo "Usage: $0 [dev|prod]"
    echo ""
    echo "Examples:"
    echo "  $0 dev      - Switch to development mode"
    echo "  $0 prod     - Switch to production mode"
    echo ""
    echo "Development mode:"
    echo "  - DEBUG=true"
    echo "  - MEILI_ENV=development"
    echo "  - Port forwarding for debugging"
    echo "  - Code volume mounting for hot reload"
    echo ""
    echo "Production mode:"
    echo "  - DEBUG=false"
    echo "  - MEILI_ENV=production"
    echo "  - No debug ports exposed"
    echo "  - Optimized container settings"
}

switch_to_dev() {
    echo "Switching to DEVELOPMENT mode..."
    
    cat > "$COMPOSE_OVERRIDE" << 'EOF'
# Development overrides - code hot reload and debugging
services:
  backend:
    environment:
      - DEBUG=true
      - MEILI_ENV=development
    volumes:
      - ./app:/app/app  # Enable hot reload
    ports:
      - "8000:8000"
      - "5678:5678"  # Python debugger port (pdb)
    
  frontend:
    environment:
      - VITE_API_BASE_URL=http://localhost:8000
    ports:
      - "3000:3000"
      - "5173:5173"  # Vite dev server
    
  postgres:
    environment:
      - POSTGRES_INITDB_ARGS=--encoding=UTF8
    
  meilisearch:
    environment:
      - MEILI_ENV=development
EOF
    
    echo "✓ Switched to development mode"
    echo ""
    echo "Current settings:"
    echo "  DEBUG=true"
    echo "  MEILI_ENV=development"
    echo "  Code hot reload enabled"
    echo ""
    echo "Next: docker-compose up -d"
}

switch_to_prod() {
    echo "Switching to PRODUCTION mode..."
    
    cat > "$COMPOSE_OVERRIDE" << 'EOF'
# Production overrides - optimized for performance
services:
  backend:
    environment:
      - DEBUG=false
      - MEILI_ENV=production
    # Remove volume mounts for production
    ports:
      - "8000:8000"
    restart: always
    
  frontend:
    restart: always
    ports:
      - "80:3000"  # Use standard HTTP port
      - "443:3000"  # HTTPS will be handled by Nginx/LB
    
  postgres:
    restart: always
    environment:
      - POSTGRES_INITDB_ARGS=--encoding=UTF8 -c shared_preload_libraries=pg_stat_statements
    
  meilisearch:
    restart: always
    environment:
      - MEILI_ENV=production
EOF
    
    echo "✓ Switched to production mode"
    echo ""
    echo "Current settings:"
    echo "  DEBUG=false"
    echo "  MEILI_ENV=production"
    echo "  Code volumes disabled"
    echo ""
    echo "⚠️  IMPORTANT:"
    echo "  1. Ensure .env has production secrets!"
    echo "  2. Update CORS_ORIGINS for your domain"
    echo "  3. Set strong JWT_SECRET and MEILI_MASTER_KEY"
    echo ""
    echo "Next: docker-compose down && docker-compose up -d"
}

main() {
    if [ -z "$ENV_TYPE" ]; then
        print_usage
        exit 1
    fi
    
    case "$ENV_TYPE" in
        dev|development)
            switch_to_dev
            ;;
        prod|production)
            switch_to_prod
            ;;
        *)
            echo "Error: Unknown environment '$ENV_TYPE'"
            echo ""
            print_usage
            exit 1
            ;;
    esac
}

main "$@"
