# Testing Checklist - AI Expense Chatbot

Checklist để test toàn bộ tính năng trước khi deploy production.

## 🔧 Pre-Test Setup

### 1. Environment Setup
- [ ] File `.env` đã tạo với `GEMINI_API_KEY`
- [ ] API key hợp lệ (test tại https://ai.google.dev/)
- [ ] Docker và Docker Compose đã cài đặt

### 2. Build Application
```bash
# Install dependencies
npm install

# Build Next.js
npm run build
```

**Expected**: Build thành công, không có errors

## 🧪 Local Testing (Development Mode)

### 1. Start Development Server
```bash
npm run dev
```

**Expected**:
- Server chạy tại http://localhost:3000
- Không có errors trong console

### 2. Test Chat UI

#### 2.1. Basic UI
- [ ] Trang chủ load thành công
- [ ] Chat input hiển thị
- [ ] Placeholder text tiếng Việt
- [ ] Examples hiển thị đúng

#### 2.2. Chat Interaction
Test các câu nhập:

**Test 1: Nhập chi tiêu đơn giản**
```
Input: "Ăn tối 200k"

Expected:
- AI trích xuất thành công
- Hiển thị confirmation:
  💰 Số tiền: 200,000 đ
  📁 Danh mục: Ẩm thực
  📄 Mô tả: ăn tối
  📅 Ngày: [today]
```

**Test 2: Format khác**
```
Input: "grab về nhà 45000"

Expected:
- Category: Di chuyển
- Amount: 45,000 đ
- Description: grab về nhà
```

**Test 3: Số tiền lớn**
```
Input: "mua laptop 15 triệu"

Expected:
- Amount: 15,000,000 đ
- Category: Mua sắm
```

**Test 4: Câu mơ hồ**
```
Input: "chi 100k"

Expected:
- Confidence < 0.7
- AI hỏi lại làm rõ
```

### 3. Test Confirmation Workflow

**Test 1: Confirm "Có"**
```
1. Input: "Ăn tối 200k"
2. Response: Confirmation message
3. Input: "Có"

Expected:
- ✅ Đã lưu giao dịch thành công!
- Database có 1 transaction mới
```

**Test 2: Cancel "Không"**
```
1. Input: "Ăn tối 200k"
2. Input: "Không"

Expected:
- ❌ Đã hủy
- Database không thay đổi
```

**Test 3: Edit "Sửa"**
```
1. Input: "Ăn tối 200k"
2. Input: "Sửa"

Expected:
- Yêu cầu nhập lại
```

### 4. Test Duplicate Detection

**Setup**: Lưu 1 transaction trước
```
1. Input: "Ăn tối 200k" → Confirm "Có"
```

**Test**:
```
2. Input: "Ăn tối 210k" (trong vòng 1 ngày)

Expected:
- ⚠️ Phát hiện giao dịch tương tự
- List duplicates
- Hỏi: "Đây có phải giao dịch trùng không?"
```

### 5. Test Monthly Report

**Setup**: Có ít nhất 5 transactions

**Test**:
```
Input: "báo cáo"

Expected:
- 📊 BÁO CÁO CHI TIÊU THÁNG...
- Tổng quan (total, count, average)
- Chi tiêu theo category
- Top 5 transactions
- So sánh với tháng trước
- Xu hướng 4 tuần
```

### 6. Test API Endpoints

#### 6.1. POST /api/chat
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"ăn tối 200k"}'
```

**Expected**: JSON response với `reply` và `state`

#### 6.2. GET /api/report
```bash
curl http://localhost:3000/api/report
```

**Expected**: JSON với `report` và `summary`

#### 6.3. GET /api/health
```bash
curl http://localhost:3000/api/health
```

**Expected**:
```json
{
  "status": "ok",
  "database": "connected"
}
```

### 7. Test Database

#### 7.1. SQLite File
```bash
ls -lh data/expenses.db
```

**Expected**: File exists

#### 7.2. FTS5 Search
```bash
sqlite3 data/expenses.db "SELECT * FROM transactions_fts WHERE description MATCH 'tối';"
```

**Expected**: Trả về transactions có "tối"

### 8. Test All Categories

Test từng category:

- [ ] **Ẩm thực**: "Ăn phở 50k"
- [ ] **Di chuyển**: "Taxi về nhà 100k"
- [ ] **Mua sắm**: "Mua áo 350k"
- [ ] **Giải trí**: "Xem phim 120k"
- [ ] **Sức khỏe**: "Mua thuốc 80k"
- [ ] **Học tập**: "Mua sách 200k"
- [ ] **Hóa đơn**: "Tiền điện 500k"
- [ ] **Khác**: "Chi 100k"

## 🐳 Docker Testing

### 1. Build Docker Image
```bash
docker build -t expense-chatbot .
```

**Expected**: Build thành công, no errors

### 2. Test Simple Compose
```bash
echo "GEMINI_API_KEY=your_key" > .env
docker-compose up -d
```

**Expected**:
- [ ] Containers start successfully
- [ ] Health check passes
- [ ] App accessible at http://localhost:3000

### 3. Test Production Compose (with Nginx)
```bash
docker compose -f docker-compose.prod.yml up -d
```

**Expected**:
- [ ] Both containers running (app + nginx)
- [ ] App accessible at http://localhost (via Nginx)
- [ ] Health check via Nginx: `curl http://localhost/api/health`

### 4. Test Database Persistence
```bash
# Add some transactions
# Stop containers
docker compose -f docker-compose.prod.yml down

# Start again
docker compose -f docker-compose.prod.yml up -d

# Check data persists
curl http://localhost/api/report
```

**Expected**: Data vẫn còn sau restart

### 5. Test Logs
```bash
docker compose -f docker-compose.prod.yml logs -f
```

**Expected**: Logs hiển thị rõ ràng, không có errors

## 🔒 Security Testing

### 1. API Key Protection
- [ ] Kiểm tra source code client: GEMINI_API_KEY không xuất hiện
- [ ] Check browser DevTools → Network: API key không bị leak
- [ ] Server-side only: API calls từ `/lib/gemini.ts`

### 2. Environment Variables
- [ ] `.env` trong `.gitignore`
- [ ] `.env.example` không chứa real key
- [ ] Docker mount .env correctly

## 📊 Performance Testing

### 1. Response Time
```bash
# Test chat response time
time curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"ăn tối 200k"}'
```

**Expected**: < 5 seconds (Gemini API call)

### 2. Report Generation
```bash
# With 100+ transactions
time curl http://localhost:3000/api/report
```

**Expected**: < 2 seconds

### 3. Database Performance
```bash
# Check WAL mode
sqlite3 data/expenses.db "PRAGMA journal_mode;"
```

**Expected**: Output = `wal`

## 🌐 Browser Testing

Test trên các browsers:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (nếu có)
- [ ] Mobile browser

Features to test:
- [ ] UI responsive
- [ ] Chat input works
- [ ] Messages display correctly
- [ ] Vietnamese characters render
- [ ] Loading states

## 📝 Edge Cases Testing

### 1. Invalid Input
```
Input: "abc xyz"

Expected: AI confidence < 0.7, ask for clarification
```

### 2. Very Large Amount
```
Input: "mua nhà 5 tỷ"

Expected: Amount = 5,000,000,000
```

### 3. Multiple Transactions
```
1. "ăn sáng 30k" → Confirm
2. "grab 50k" → Confirm
3. "cafe 40k" → Confirm

Expected: All saved separately
```

### 4. Report with No Data
```
# New database
Input: "báo cáo"

Expected: "❌ Chưa có giao dịch nào trong tháng này."
```

### 5. Special Characters
```
Input: "ăn phở bò tái nạm chín gầu gân sách 85k"

Expected: Parse correctly
```

## 🚀 Pre-Production Checklist

Before deploying to VPS:

### Code
- [ ] All tests passed
- [ ] No console.error in production
- [ ] Build completes without warnings
- [ ] All features working

### Docker
- [ ] Docker build successful
- [ ] Containers start and restart correctly
- [ ] Volumes mount properly
- [ ] Health checks pass

### Security
- [ ] API key protected
- [ ] .env not in git
- [ ] No secrets in code
- [ ] HTTPS ready (nginx config)

### Documentation
- [ ] README.md complete
- [ ] DEPLOYMENT_GUIDE.md ready
- [ ] Scripts executable (deploy-vps.sh, etc.)
- [ ] Comments in code

### Backup & Recovery
- [ ] Backup script tested
- [ ] Restore procedure verified
- [ ] Data directory writable

## 📋 Test Results Template

```
Date: YYYY-MM-DD
Tester: [Your Name]
Version: [Git Commit Hash]

✅ Passed:
- [List successful tests]

❌ Failed:
- [List failures with details]

🐛 Issues Found:
- [List bugs with steps to reproduce]

💡 Notes:
- [Additional observations]
```

## 🔍 Debugging Tips

### Check Database
```bash
sqlite3 data/expenses.db
.tables
SELECT * FROM transactions LIMIT 5;
.quit
```

### Check Docker Logs
```bash
docker compose -f docker-compose.prod.yml logs app | tail -100
```

### Check Gemini API
```bash
# Test API key manually
curl https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: YOUR_KEY" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### Check Database Lock
```bash
# Check processes using DB
lsof data/expenses.db

# Force unlock (if needed)
fuser -k data/expenses.db
```

## ✅ Final Sign-Off

All tests completed:
- [ ] Local development testing
- [ ] Docker testing
- [ ] Security testing
- [ ] Performance testing
- [ ] Browser testing
- [ ] Edge cases testing

**Ready for Production Deployment**: ✅ / ❌

**Signed**: ____________
**Date**: ____________
