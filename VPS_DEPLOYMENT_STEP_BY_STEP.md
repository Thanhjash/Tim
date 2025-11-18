# 🚀 HƯỚNG DẪN DEPLOY LÊN VPS - CHI TIẾT TỪNG BƯỚC

## 📋 CHUẨN BỊ

### 1. Bạn cần có:
- ✅ 1 VPS (DigitalOcean, Linode, Vultr, AWS EC2, Google Cloud, etc.)
- ✅ IP address của VPS
- ✅ SSH access (username + password hoặc SSH key)
- ✅ Gemini API key (lấy free tại https://ai.google.dev/)

### 2. VPS Requirements:
- **OS:** Ubuntu 20.04/22.04 hoặc Debian 11/12
- **RAM:** Tối thiểu 1GB (khuyến nghị 2GB)
- **Disk:** 10GB
- **Ports:** 80 (HTTP), 443 (HTTPS), 22 (SSH)

---

## 🎯 OPTION 1: DEPLOY TỰ ĐỘNG (KHUYẾN NGHỊ - DỄ NHẤT!)

### Bước 1: Kết nối vào VPS

**Trên Windows:**
```bash
# Dùng PuTTY hoặc Windows Terminal
ssh root@your_vps_ip

# Hoặc nếu có username khác:
ssh your_username@your_vps_ip
```

**Trên Mac/Linux:**
```bash
ssh root@your_vps_ip
# Nhập password khi được hỏi
```

### Bước 2: Update hệ thống

```bash
# Update package list
sudo apt update

# Upgrade packages (optional nhưng nên làm)
sudo apt upgrade -y
```

### Bước 3: Clone repository

```bash
# Di chuyển về home directory
cd ~

# Clone repo (thay <repo-url> bằng URL thực của bạn)
git clone https://github.com/Thanhjash/Tim.git

# Vào thư mục project
cd Tim

# Kiểm tra files
ls -la
```

Bạn sẽ thấy:
```
deploy-vps.sh          ← Script deploy tự động
docker-compose.prod.yml ← Config production
README.md              ← Documentation
...
```

### Bước 4: Lấy Gemini API Key

**4.1. Mở browser, vào:** https://ai.google.dev/

**4.2. Đăng nhập** với Google account

**4.3. Click "Get API Key"** ở góc trên bên phải

**4.4. Click "Create API key"**

**4.5. Chọn project** (hoặc tạo mới)

**4.6. Copy API key** (dạng: `AIzaSy...`)

### Bước 5: Tạo file .env

```bash
# Tạo file .env
nano .env
```

Nhập nội dung (thay your_key bằng API key vừa copy):
```
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Lưu file:**
- Nhấn `Ctrl + O` (save)
- Nhấn `Enter` (confirm)
- Nhấn `Ctrl + X` (exit)

**Kiểm tra file đã tạo:**
```bash
cat .env
```

Phải hiển thị: `GEMINI_API_KEY=AIzaSy...`

### Bước 6: Chạy Deploy Script (TỰ ĐỘNG!)

```bash
# Make script executable
chmod +x deploy-vps.sh

# Chạy deployment
./deploy-vps.sh
```

**Script sẽ tự động:**
1. ✅ Kiểm tra và cài Docker
2. ✅ Kiểm tra và cài Docker Compose
3. ✅ Build Docker image
4. ✅ Start containers (App + Nginx)
5. ✅ Health check
6. ✅ Show status

**Quá trình này mất ~5-10 phút**

### Bước 7: Kiểm tra deployment

Khi script chạy xong, bạn sẽ thấy:
```
✅ Deployment successful!

📊 Container status:
NAME                      STATUS
expense-chatbot           Up
expense-chatbot-nginx     Up

🌐 Application is running at:
   - http://localhost (via Nginx)
   - http://localhost:3000 (direct)
```

**Test ngay:**
```bash
# Health check
curl http://localhost/api/health
```

Kết quả phải là:
```json
{
  "status": "ok",
  "database": "connected"
}
```

### Bước 8: Truy cập app

**Mở browser, vào:**
```
http://your_vps_ip
```

Ví dụ: `http://123.45.67.89`

Bạn sẽ thấy giao diện chat! 🎉

**Test luôn:**
- Nhập: "Ăn tối 200k"
- AI sẽ trả lời với confirmation
- Nhập: "Có"
- Done! Đã lưu giao dịch

---

## 🎯 OPTION 2: DEPLOY MANUAL (CONTROL TỪNG BƯỚC)

### Bước 1-5: Giống Option 1 (kết nối VPS, clone repo, tạo .env)

### Bước 6: Cài Docker manually

```bash
# Cài Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify Docker
docker --version
```

### Bước 7: Cài Docker Compose

```bash
# Cài Docker Compose plugin
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# Verify
docker compose version
```

### Bước 8: Build và Start

```bash
# Build image (mất ~3-5 phút)
docker compose -f docker-compose.prod.yml build

# Start containers
docker compose -f docker-compose.prod.yml up -d
```

### Bước 9: Kiểm tra

```bash
# Check containers
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Nhấn Ctrl+C để thoát logs
```

### Bước 10: Test

```bash
# Health check
curl http://localhost/api/health

# Truy cập browser
# http://your_vps_ip
```

---

## 🔒 SETUP SSL/HTTPS (OPTIONAL - NÊN LÀM!)

### Yêu cầu:
- ✅ Có domain (vd: chatbot.yourdomain.com)
- ✅ Domain đã trỏ về VPS IP

### Bước 1: Trỏ domain về VPS

**Trên domain provider (GoDaddy, Namecheap, Cloudflare, etc.):**

Tạo A Record:
```
Type: A
Name: @ (hoặc subdomain như "chatbot")
Value: your_vps_ip
TTL: 3600
```

Chờ 5-10 phút để DNS propagate.

**Kiểm tra:**
```bash
ping your-domain.com
# Phải trả về VPS IP
```

### Bước 2: Chạy SSL Setup Script

```bash
# Trên VPS, trong thư mục Tim
./setup-ssl.sh your-domain.com
```

Ví dụ:
```bash
./setup-ssl.sh chatbot.example.com
```

Script sẽ:
1. Cài Certbot
2. Lấy SSL certificate từ Let's Encrypt
3. Config Nginx
4. Restart containers

### Bước 3: Truy cập với HTTPS

```
https://your-domain.com
```

✅ Có biểu tượng ổ khóa = SSL OK!

---

## 🛡️ BẢO MẬT VPS (NÊN LÀM!)

### 1. Setup Firewall

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH (QUAN TRỌNG - làm trước!)
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### 2. Đổi SSH Port (Optional)

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Tìm dòng:
# Port 22

# Đổi thành:
Port 2222

# Save và restart SSH
sudo systemctl restart sshd

# Update firewall
sudo ufw allow 2222/tcp
sudo ufw delete allow 22/tcp
```

### 3. Disable Root Login (Optional)

```bash
# Tạo user mới
sudo adduser deployer
sudo usermod -aG sudo deployer

# Switch sang user mới
su - deployer

# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Tìm và đổi:
PermitRootLogin no

# Restart SSH
sudo systemctl restart sshd
```

---

## 💾 SETUP AUTO BACKUP

### 1. Test Backup Script

```bash
# Trong thư mục Tim
./backup.sh
```

Kết quả:
```
💾 Creating backup...
✅ Backup created successfully!
📦 File: ./backups/expenses_backup_20231118_120000.db.gz
```

### 2. Setup Cron Job (Auto Backup Hàng Ngày)

```bash
# Mở crontab
crontab -e

# Chọn editor (thường chọn nano = số 1)

# Thêm dòng này vào cuối file:
0 2 * * * cd /root/Tim && ./backup.sh >> ./logs/backup.log 2>&1

# Save (Ctrl+O, Enter, Ctrl+X)
```

Giải thích:
- `0 2 * * *` = Chạy lúc 2h sáng mỗi ngày
- `cd /root/Tim` = Vào thư mục project (thay /root bằng path thực)
- `./backup.sh` = Chạy backup
- `>> ./logs/backup.log` = Ghi log

**Kiểm tra cron đã set:**
```bash
crontab -l
```

---

## 🔧 QUẢN LÝ APP SAU KHI DEPLOY

### Xem Logs

```bash
# All logs
docker compose -f docker-compose.prod.yml logs -f

# App logs only
docker compose -f docker-compose.prod.yml logs -f app

# Nginx logs only
docker compose -f docker-compose.prod.yml logs -f nginx

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100
```

### Restart App

```bash
# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart app only
docker compose -f docker-compose.prod.yml restart app

# Restart nginx only
docker compose -f docker-compose.prod.yml restart nginx
```

### Stop App

```bash
docker compose -f docker-compose.prod.yml down
```

### Start App

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Xem Container Status

```bash
docker compose -f docker-compose.prod.yml ps
```

### Xem Resource Usage

```bash
# CPU, Memory usage
docker stats

# Disk usage
df -h

# Memory
free -m
```

---

## 🔄 UPDATE APP (KHI CÓ CODE MỚI)

```bash
# 1. Pull latest code
cd ~/Tim
git pull origin main

# 2. Rebuild image
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache

# 3. Start lại
docker compose -f docker-compose.prod.yml up -d

# 4. Check health
curl http://localhost/api/health
```

---

## 🐛 TROUBLESHOOTING (XỬ LÝ LỖI)

### Lỗi 1: "Port 80 already in use"

```bash
# Tìm process đang dùng port 80
sudo lsof -i :80

# Nếu là Apache
sudo systemctl stop apache2
sudo systemctl disable apache2

# Nếu là Nginx cũ
sudo systemctl stop nginx
sudo systemctl disable nginx

# Start lại app
docker compose -f docker-compose.prod.yml up -d
```

### Lỗi 2: "Cannot connect to Docker daemon"

```bash
# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Thử lại
docker compose -f docker-compose.prod.yml up -d
```

### Lỗi 3: "Database is locked"

```bash
# Restart containers
docker compose -f docker-compose.prod.yml restart
```

### Lỗi 4: "GEMINI_API_KEY not found"

```bash
# Check .env file
cat .env

# Nếu không có, tạo lại
nano .env
# Thêm: GEMINI_API_KEY=your_key

# Restart
docker compose -f docker-compose.prod.yml restart
```

### Lỗi 5: "403 Forbidden" từ Gemini API

**Nguyên nhân:** API key sai hoặc hết quota

**Fix:**
1. Vào https://ai.google.dev/
2. Tạo API key mới
3. Update .env
4. Restart app

### Lỗi 6: Container không start

```bash
# Xem logs chi tiết
docker compose -f docker-compose.prod.yml logs

# Rebuild từ đầu
docker compose -f docker-compose.prod.yml down
docker system prune -a  # Xóa cache
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Lỗi 7: Out of Memory

```bash
# Tạo swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Lỗi 8: Cannot access from browser

```bash
# 1. Check firewall
sudo ufw status

# 2. Check containers running
docker compose -f docker-compose.prod.yml ps

# 3. Check nginx
curl http://localhost

# 4. Check app directly
curl http://localhost:3000

# 5. Check VPS IP
ip addr show
```

---

## 📊 MONITORING (GIÁM SÁT)

### Check Health Thường Xuyên

```bash
# Health endpoint
curl http://localhost/api/health

# Hoặc từ bên ngoài
curl http://your_vps_ip/api/health
```

### Monitor Logs Real-time

```bash
# Follow logs
docker compose -f docker-compose.prod.yml logs -f

# Filter errors only
docker compose -f docker-compose.prod.yml logs -f | grep -i error
```

### Check Database Size

```bash
ls -lh data/expenses.db
```

### List Backups

```bash
ls -lh backups/
```

---

## 📝 CHECKLIST SAU KHI DEPLOY

### ✅ Basic Checks
- [ ] App accessible tại http://vps_ip
- [ ] Health check returns OK
- [ ] Chat input works
- [ ] Can add expense (test: "ăn tối 200k")
- [ ] Can view report (test: "báo cáo")

### ✅ Security Checks
- [ ] Firewall enabled
- [ ] Only necessary ports open (80, 443, 22/custom)
- [ ] .env file not in git
- [ ] API key working

### ✅ Production Checks
- [ ] Containers auto-restart (restart: unless-stopped)
- [ ] Data persists after restart
- [ ] Backup script tested
- [ ] Cron job for auto backup set
- [ ] SSL/HTTPS configured (if have domain)
- [ ] Logs rotation configured

### ✅ Performance Checks
- [ ] Response time < 5 seconds
- [ ] Database WAL mode enabled
- [ ] No memory leaks (check after 24h)
- [ ] Disk usage reasonable

---

## 🆘 NEED HELP?

### Check Documentation
1. `README.md` - Overview
2. `DEPLOYMENT_GUIDE.md` - This file
3. `TESTING_CHECKLIST.md` - Testing guide
4. `FINAL_CHECK.md` - Requirements check

### Debug Commands
```bash
# Full system check
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=50
curl http://localhost/api/health
df -h
free -m
```

### Backup Before Any Changes
```bash
./backup.sh
```

### Restore from Backup
```bash
# List backups
ls -lh backups/

# Restore
gunzip -c backups/expenses_backup_YYYYMMDD_HHMMSS.db.gz > data/expenses.db

# Restart
docker compose -f docker-compose.prod.yml restart
```

---

## 🎉 DONE!

Sau khi làm xong các bước trên, app của bạn đã:
- ✅ Chạy trên VPS
- ✅ Có Nginx reverse proxy
- ✅ Auto restart khi server reboot
- ✅ Data được persist
- ✅ Có backup tự động
- ✅ SSL/HTTPS (nếu có domain)
- ✅ Bảo mật với firewall

**App sẽ chạy 24/7!** 🚀

---

## 📞 QUICK REFERENCE

### Common Commands
```bash
# Start
docker compose -f docker-compose.prod.yml up -d

# Stop
docker compose -f docker-compose.prod.yml down

# Restart
docker compose -f docker-compose.prod.yml restart

# Logs
docker compose -f docker-compose.prod.yml logs -f

# Status
docker compose -f docker-compose.prod.yml ps

# Health
curl http://localhost/api/health

# Backup
./backup.sh

# Update
git pull && docker compose -f docker-compose.prod.yml up -d --build
```

### File Locations
```
/root/Tim/              ← Project directory
/root/Tim/data/         ← SQLite database
/root/Tim/backups/      ← Backup files
/root/Tim/logs/         ← Log files
/root/Tim/.env          ← Environment config
```

### Important Ports
```
80   ← HTTP (Nginx)
443  ← HTTPS (Nginx, if SSL)
3000 ← App direct (internal)
22   ← SSH
```

**Chúc bạn deploy thành công!** 🎊
