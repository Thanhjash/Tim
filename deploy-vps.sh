#!/bin/bash

# VPS Deployment Script for AI Expense Chatbot
# Usage: ./deploy-vps.sh

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "📝 Please create .env file with GEMINI_API_KEY"
    echo "   Example: echo 'GEMINI_API_KEY=your_key_here' > .env"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker installed"
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Installing..."
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
    echo "✅ Docker Compose installed"
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data logs ssl

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.prod.yml down || true

# Build and start containers
echo "🔨 Building Docker image..."
docker compose -f docker-compose.prod.yml build --no-cache

echo "▶️  Starting containers..."
docker compose -f docker-compose.prod.yml up -d

# Wait for health check
echo "⏳ Waiting for application to be healthy..."
sleep 10

# Check if app is running
if docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "✅ Deployment successful!"
    echo ""
    echo "📊 Container status:"
    docker compose -f docker-compose.prod.yml ps
    echo ""
    echo "🌐 Application is running at:"
    echo "   - http://localhost (via Nginx)"
    echo "   - http://localhost:3000 (direct)"
    echo ""
    echo "📝 View logs:"
    echo "   docker compose -f docker-compose.prod.yml logs -f"
    echo ""
    echo "🔍 Health check:"
    echo "   curl http://localhost/api/health"
else
    echo "❌ Deployment failed!"
    echo "📝 Check logs:"
    docker compose -f docker-compose.prod.yml logs
    exit 1
fi

echo ""
echo "🔒 Next steps for production:"
echo "1. Setup SSL with Let's Encrypt:"
echo "   ./setup-ssl.sh your-domain.com"
echo "2. Configure firewall:"
echo "   sudo ufw allow 80/tcp"
echo "   sudo ufw allow 443/tcp"
echo "3. Setup automatic backups:"
echo "   ./backup.sh"
