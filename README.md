# AI Expense Chatbot

Chatbot quản lý chi tiêu thông minh với AI, sử dụng Next.js, SQLite, và Gemini AI.

## Tính năng

- Nhập chi tiêu bằng tiếng Việt tự nhiên
- AI tự động trích xuất thông tin (số tiền, danh mục, mô tả)
- Phát hiện giao dịch trùng lặp
- Báo cáo chi tiêu theo tháng
- SQLite với FTS5 cho tìm kiếm semantic
- API key được bảo vệ server-side (proxy)

## Tech Stack

- **Frontend**: Next.js 15, React 18, TailwindCSS
- **Database**: SQLite với FTS5 (Full-Text Search)
- **AI**: Google Gemini 2.0 Flash
- **Deployment**: Docker, Vercel (hoặc VPS)

## Cài đặt

### 1. Clone repository

```bash
git clone <repo-url>
cd Tim
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình môi trường

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Thêm Gemini API key vào file `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Lấy API key miễn phí tại: https://ai.google.dev/

### 4. Chạy development

```bash
npm run dev
```

Mở http://localhost:3000

## Deploy với Docker (VPS)

### Deployment tự động (Production - Khuyến nghị)

```bash
# 1. Tạo file .env với GEMINI_API_KEY
echo "GEMINI_API_KEY=your_key_here" > .env

# 2. Chạy deployment script
./deploy-vps.sh

# 3. (Optional) Setup SSL với Let's Encrypt
./setup-ssl.sh your-domain.com

# 4. (Optional) Setup auto backup
./backup.sh
# Add to crontab: 0 2 * * * cd /path/to/project && ./backup.sh
```

Script `deploy-vps.sh` sẽ tự động:
- ✅ Kiểm tra và cài đặt Docker/Docker Compose
- ✅ Build Docker image
- ✅ Start containers với Nginx reverse proxy
- ✅ Setup health checks
- ✅ Verify deployment

### Development (Local testing)

```bash
# Tạo file .env với GEMINI_API_KEY
echo "GEMINI_API_KEY=your_key_here" > .env

# Build và run (simple mode, no Nginx)
docker-compose up -d

# Xem logs
docker-compose logs -f

# Stop
docker-compose down
```

### Build Docker image thủ công

```bash
# Build
docker build -t expense-chatbot .

# Run
docker run -d \
  -p 3000:3000 \
  -e GEMINI_API_KEY=your_key_here \
  -v $(pwd)/data:/app/data \
  --name expense-chatbot \
  expense-chatbot
```

### Production với Nginx Reverse Proxy

```bash
# Build và run với Nginx
docker compose -f docker-compose.prod.yml up -d

# Xem logs
docker compose -f docker-compose.prod.yml logs -f

# Stop
docker compose -f docker-compose.prod.yml down
```

## Deploy lên Vercel

**Lưu ý**: Vercel không hỗ trợ SQLite do serverless architecture. Có 2 options:

### Option 1: Sử dụng Vercel cho frontend + VPS cho database

Deploy frontend lên Vercel và API calls đến VPS backend.

### Option 2: Deploy hoàn toàn trên VPS (Khuyến nghị)

Vì dự án sử dụng SQLite, nên deploy trên VPS với Docker là tốt nhất:

1. Thuê VPS (DigitalOcean, Linode, AWS EC2, etc.)
2. Cài Docker và Docker Compose
3. Clone repo và chạy docker-compose

```bash
# Trên VPS
git clone <repo-url>
cd Tim
echo "GEMINI_API_KEY=your_key" > .env
docker-compose up -d
```

4. Cấu hình Nginx reverse proxy (optional):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Cấu trúc thư mục

```
.
├── app/
│   ├── api/
│   │   ├── chat/          # Chat endpoint (3-step workflow)
│   │   ├── report/        # Report generation
│   │   └── health/        # Health check
│   ├── page.tsx           # Chat UI
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── db.ts              # SQLite database functions
│   └── gemini.ts          # Gemini AI integration (server-side)
├── data/                  # SQLite database (created automatically)
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Sử dụng

### Nhập chi tiêu

Gõ câu tự nhiên bằng tiếng Việt:

- "Ăn tối 200k"
- "Grab về nhà 45000"
- "Mua áo 350k"
- "Đi cafe 50k"

### Xem báo cáo

Gõ: "báo cáo" hoặc "report" hoặc "thống kê"

## API Endpoints

### POST /api/chat

Chat với AI để nhập chi tiêu.

**Request:**
```json
{
  "message": "ăn tối 200k"
}
```

**Response:**
```json
{
  "reply": "📝 Xác nhận thông tin...",
  "state": "awaiting_confirmation"
}
```

### GET /api/report

Lấy báo cáo chi tiêu.

**Query params:**
- `month`: Tháng (1-12)
- `year`: Năm (YYYY)

**Example:**
```
GET /api/report?month=11&year=2025
```

### GET /api/health

Health check cho Docker.

## AI Workflow (3 bước)

### STEP 1: Extraction
AI trích xuất thông tin từ câu nhập tự nhiên:
- Số tiền (VND)
- Danh mục (8 loại: Ẩm thực, Di chuyển, Mua sắm, Giải trí, Sức khỏe, Học tập, Hóa đơn, Khác)
- Mô tả ngắn gọn
- Độ tin cậy (confidence)

### STEP 2: Duplicate Detection
Kiểm tra giao dịch trùng lặp:
- Cùng user, cùng category
- Số tiền chênh lệch < 10%
- Trong vòng 1 ngày

### STEP 3: Confirmation
User xác nhận trước khi lưu:
- Có: Lưu vào database
- Không: Hủy
- Sửa: Nhập lại

## Database Schema

```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  raw_input TEXT,
  ai_confidence REAL,
  metadata JSON
);

-- FTS5 for semantic search
CREATE VIRTUAL TABLE transactions_fts USING fts5(
  description,
  category,
  content=transactions
);
```

## Bảo mật

- API key được lưu server-side, không expose ra client
- SQLite database chỉ accessible từ server
- User ID demo (trong production cần implement auth)
- HTTPS recommended cho production

## Performance

- SQLite WAL mode cho concurrency tốt hơn
- FTS5 cho full-text search nhanh
- Gemini 2.0 Flash: 15 requests/phút (free tier)
- Docker volume cho persistent data

## Troubleshooting

### Database locked

```bash
# Restart container
docker-compose restart
```

### Out of memory

Tăng memory cho container trong `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 512M
```

## License

MIT
