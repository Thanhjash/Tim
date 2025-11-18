# Hướng dẫn Deploy lên VPS Production

## Yêu cầu hệ thống

- VPS với Ubuntu 20.04/22.04 (hoặc Debian)
- RAM: Tối thiểu 1GB (khuyến nghị 2GB)
- Disk: Tối thiểu 10GB
- Docker và Docker Compose

## Bước 1: Chuẩn bị VPS

### 1.1. Kết nối SSH vào VPS

```bash
ssh root@your-vps-ip
```

### 1.2. Update hệ thống

```bash
apt update && apt upgrade -y
```

### 1.3. Tạo user mới (bảo mật)

```bash
adduser deployer
usermod -aG sudo deployer
su - deployer
```

## Bước 2: Clone Repository

```bash
cd ~
git clone <your-repo-url>
cd Tim
```

## Bước 3: Cấu hình môi trường

### 3.1. Tạo file .env

```bash
nano .env
```

Thêm nội dung:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Lưu và thoát (Ctrl+O, Enter, Ctrl+X)

### 3.2. Lấy Gemini API Key

1. Truy cập: https://ai.google.dev/
2. Đăng nhập với Google account
3. Tạo API key mới
4. Copy và paste vào file `.env`

## Bước 4: Deploy

### Option 1: Deploy tự động (Khuyến nghị)

```bash
# Make script executable
chmod +x deploy-vps.sh

# Run deployment
./deploy-vps.sh
```

Script sẽ tự động:
- ✅ Cài đặt Docker (nếu chưa có)
- ✅ Build Docker image
- ✅ Start containers (App + Nginx)
- ✅ Verify deployment

### Option 2: Deploy thủ công

```bash
# Build và start containers
docker compose -f docker-compose.prod.yml up -d

# Kiểm tra containers
docker compose -f docker-compose.prod.yml ps

# Xem logs
docker compose -f docker-compose.prod.yml logs -f
```

## Bước 5: Kiểm tra

### 5.1. Health Check

```bash
curl http://localhost/api/health
```

Kết quả mong đợi:
```json
{
  "status": "ok",
  "timestamp": "2025-11-18T...",
  "database": "connected"
}
```

### 5.2. Truy cập ứng dụng

Mở browser: `http://your-vps-ip`

## Bước 6: Setup Domain và SSL (Production)

### 6.1. Cấu hình DNS

Trỏ domain về VPS IP:
- Type: A Record
- Name: @ (hoặc subdomain)
- Value: your-vps-ip
- TTL: 3600

### 6.2. Setup SSL với Let's Encrypt

```bash
./setup-ssl.sh your-domain.com
```

Script sẽ:
- ✅ Cài đặt Certbot
- ✅ Lấy SSL certificate
- ✅ Cấu hình Nginx
- ✅ Restart containers

### 6.3. Truy cập với HTTPS

Mở browser: `https://your-domain.com`

## Bước 7: Setup Firewall

```bash
# Bật UFW
sudo ufw enable

# Cho phép SSH
sudo ufw allow 22/tcp

# Cho phép HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Kiểm tra status
sudo ufw status
```

## Bước 8: Setup Auto Backup

### 8.1. Test backup

```bash
./backup.sh
```

### 8.2. Setup cron job

```bash
crontab -e
```

Thêm dòng sau (backup lúc 2h sáng mỗi ngày):

```cron
0 2 * * * cd /home/deployer/Tim && ./backup.sh >> ./logs/backup.log 2>&1
```

### 8.3. Kiểm tra backups

```bash
ls -lh backups/
```

## Bước 9: Monitoring

### 9.1. Xem logs

```bash
# All logs
docker compose -f docker-compose.prod.yml logs -f

# App logs only
docker compose -f docker-compose.prod.yml logs -f app

# Nginx logs only
docker compose -f docker-compose.prod.yml logs -f nginx
```

### 9.2. Kiểm tra resource usage

```bash
# Container stats
docker stats

# Disk usage
df -h

# Memory usage
free -m
```

## Bước 10: Update ứng dụng

```bash
# Pull latest code
git pull origin main

# Rebuild và restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# Verify
curl http://localhost/api/health
```

## Troubleshooting

### Container không start

```bash
# Xem logs chi tiết
docker compose -f docker-compose.prod.yml logs

# Rebuild image
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Database locked

```bash
# Restart containers
docker compose -f docker-compose.prod.yml restart

# Nếu vẫn lỗi, restore từ backup
gunzip -c backups/expenses_backup_YYYYMMDD_HHMMSS.db.gz > data/expenses.db
docker compose -f docker-compose.prod.yml restart
```

### Out of memory

```bash
# Tăng swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Thêm vào /etc/fstab để persistent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### SSL certificate renewal

```bash
# Manual renewal
sudo certbot renew

# Setup auto renewal (already in cron)
sudo crontab -e

# Add:
0 0 1 * * certbot renew --quiet && cd /home/deployer/Tim && ./setup-ssl.sh your-domain.com
```

## Useful Commands

```bash
# Stop all containers
docker compose -f docker-compose.prod.yml down

# Restart all containers
docker compose -f docker-compose.prod.yml restart

# View container logs
docker compose -f docker-compose.prod.yml logs -f [service_name]

# Execute command in container
docker compose -f docker-compose.prod.yml exec app sh

# Remove all stopped containers
docker system prune -a

# Backup database manually
./backup.sh

# Restore database
gunzip -c backups/backup_file.db.gz > data/expenses.db
docker compose -f docker-compose.prod.yml restart
```

## Security Best Practices

1. ✅ Luôn dùng HTTPS trong production
2. ✅ Đổi SSH port mặc định (22 → custom)
3. ✅ Disable root SSH login
4. ✅ Setup SSH key authentication
5. ✅ Enable UFW firewall
6. ✅ Regular system updates
7. ✅ Daily database backups
8. ✅ Monitor logs thường xuyên
9. ✅ Giới hạn API rate limiting (nếu cần)
10. ✅ Không commit .env vào git

## Performance Tuning

### Nginx caching (Optional)

Thêm vào `nginx.conf`:

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=100m inactive=60m;

location / {
    proxy_cache my_cache;
    proxy_cache_valid 200 5m;
    # ... rest of config
}
```

### Docker resource limits

Thêm vào `docker-compose.prod.yml`:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

## Support

Nếu gặp vấn đề:
1. Kiểm tra logs: `docker compose -f docker-compose.prod.yml logs`
2. Health check: `curl http://localhost/api/health`
3. Container status: `docker compose -f docker-compose.prod.yml ps`
4. System resources: `docker stats`
