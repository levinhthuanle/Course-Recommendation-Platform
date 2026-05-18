#!/bin/bash
# AWS EC2 Initial Setup Script
# Run this once on your EC2 instance to prepare for auto-deployment

set -e

echo "=== AWS EC2 Setup for Course Platform ==="

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
echo "Installing Docker..."
sudo apt-get install -y docker.io docker-compose

# Add current user to docker group (avoid sudo for docker)
sudo usermod -aG docker $USER
newgrp docker

# Install Git
sudo apt-get install -y git

# Create deployment directory
DEPLOY_DIR="/home/$USER/course-platform"
mkdir -p $DEPLOY_DIR
cd $DEPLOY_DIR

# Clone repository (replace with your repo URL)
echo "Cloning repository..."
git clone https://github.com/YOUR_USERNAME/course-platform.git .

# Create .env file (you'll populate this manually or via GitHub Secrets)
echo "Creating .env file template..."
cat > .env << 'EOF'
# Application
APP_NAME=Course Recommendation Platform
APP_VERSION=1.0.0
DEBUG=false
HOST=0.0.0.0
PORT=8000

# Meilisearch
MEILI_MASTER_KEY=your-master-key-here
MEILISEARCH_URL=http://meilisearch:7700
MEILISEARCH_INDEX_NAME=courses

# Gemini API
GEMINI_API_KEY=your-api-key-here

# JWT
JWT_SECRET=your-jwt-secret-here
JWT_EXP_MINUTES=1440

# Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-admin-password-here

# Database (optional PostgreSQL)
DATABASE_URL=

# Resources
RESOURCES_PATH=/app/Resources
EOF

echo ""
echo "=== Setup Complete ==="
echo "Next steps:"
echo "1. Edit .env file with your secrets:"
echo "   nano $DEPLOY_DIR/.env"
echo ""
echo "2. Configure GitHub Secrets:"
echo "   - EC2_HOST: your EC2 public IP"
echo "   - EC2_USER: ubuntu (or your username)"
echo "   - EC2_PRIVATE_KEY: your SSH private key"
echo "   - SLACK_WEBHOOK: (optional) for notifications"
echo ""
echo "3. Create 'Production' branch in GitHub"
echo "4. Push code to Production branch to trigger deployment"
echo ""
echo "5. Start services manually (first time):"
echo "   cd $DEPLOY_DIR"
echo "   docker-compose up -d"
