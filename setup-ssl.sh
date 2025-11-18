#!/bin/bash

# SSL Setup Script using Let's Encrypt
# Usage: ./setup-ssl.sh your-domain.com

set -e

if [ -z "$1" ]; then
    echo "❌ Error: Domain name is required"
    echo "Usage: ./setup-ssl.sh your-domain.com"
    exit 1
fi

DOMAIN=$1

echo "🔒 Setting up SSL for $DOMAIN..."

# Install certbot
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot
fi

# Stop nginx temporarily
echo "🛑 Stopping nginx..."
docker compose -f docker-compose.prod.yml stop nginx

# Get SSL certificate
echo "📜 Obtaining SSL certificate..."
sudo certbot certonly --standalone \
    -d $DOMAIN \
    --non-interactive \
    --agree-tos \
    --email admin@$DOMAIN \
    --preferred-challenges http

# Copy certificates
echo "📋 Copying certificates..."
sudo mkdir -p ssl
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/
sudo chmod 644 ssl/*.pem

# Update nginx.conf
echo "⚙️  Updating nginx configuration..."
sed -i "s/server_name localhost;/server_name $DOMAIN;/g" nginx.conf

# Restart containers
echo "▶️  Restarting containers..."
docker compose -f docker-compose.prod.yml up -d

echo "✅ SSL setup complete!"
echo ""
echo "🌐 Your site is now available at:"
echo "   https://$DOMAIN"
echo ""
echo "🔄 Certificate auto-renewal:"
echo "   Add to crontab: 0 0 1 * * certbot renew --quiet && ./setup-ssl.sh $DOMAIN"
