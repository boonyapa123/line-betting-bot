# คู่มือการ Deploy ระบบแทง

## 1. ตรวจสอบความพร้อม

### ตรวจสอบ Environment Variables
```bash
# ตรวจสอบว่า .env มีข้อมูลครบถ้วน
cat .env
```

ต้องมี:
- `LINE_CHANNEL_ACCESS_TOKEN` - Token จาก LINE Developers
- `LINE_CHANNEL_SECRET` - Secret จาก LINE Developers
- `GOOGLE_SHEETS_ID` - ID ของ Google Sheets
- `GOOGLE_CREDENTIALS_PATH` - Path ไปยัง credentials.json
- `PORT` - Port ที่ใช้ (default: 3000)
- `LIFF_ID` - LIFF ID สำหรับ LIFF apps

### ตรวจสอบ Google Sheets
```bash
# รันคำสั่งเพื่อเพิ่มคอลัมน์ G และ H
node scripts/add-columns-to-sheets.js
```

### ตรวจสอบ Dependencies
```bash
# ตรวจสอบว่า node_modules ครบถ้วน
npm install
```

---

## 2. Build & Test

### Build Project
```bash
# ถ้ามี TypeScript files
npm run build
```

### Test Locally
```bash
# รันบน localhost:3000
npm start
```

ทดสอบคำสั่งต่อไปนี้ใน LINE:
- `สรุปยอดแทง` - ดูสรุปการแทง
- `สรุปยอดโอนเงิน` - ดูยอดเงินที่ต้องโอน
- `/ยกเลิก` - ยกเลิกการแทงล่าสุด

---

## 3. Deploy ขึ้น Server

### Option A: Deploy ด้วย PM2 (แนะนำ)

#### 1. ติดตั้ง PM2
```bash
npm install -g pm2
```

#### 2. สร้าง PM2 Config File
สร้างไฟล์ `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'line-betting-bot',
    script: './src/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};
```

#### 3. Start ด้วย PM2
```bash
# Start app
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### 4. Monitor App
```bash
# ดูสถานะ
pm2 status

# ดู logs
pm2 logs line-betting-bot

# Restart app
pm2 restart line-betting-bot

# Stop app
pm2 stop line-betting-bot
```

---

### Option B: Deploy ด้วย Docker

#### 1. สร้าง Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app files
COPY . .

# Expose port
EXPOSE 3000

# Start app
CMD ["node", "src/index.js"]
```

#### 2. สร้าง .dockerignore
```
node_modules
npm-debug.log
.git
.gitignore
.env
logs
```

#### 3. Build Docker Image
```bash
docker build -t line-betting-bot:latest .
```

#### 4. Run Docker Container
```bash
docker run -d \
  --name line-betting-bot \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  line-betting-bot:latest
```

#### 5. Monitor Container
```bash
# ดูสถานะ
docker ps

# ดู logs
docker logs -f line-betting-bot

# Restart container
docker restart line-betting-bot

# Stop container
docker stop line-betting-bot
```

---

### Option C: Deploy ด้วย Heroku

#### 1. ติดตั้ง Heroku CLI
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Linux
curl https://cli-assets.heroku.com/install.sh | sh
```

#### 2. Login ไป Heroku
```bash
heroku login
```

#### 3. สร้าง Heroku App
```bash
heroku create line-betting-bot
```

#### 4. ตั้ง Environment Variables
```bash
heroku config:set LINE_CHANNEL_ACCESS_TOKEN=your_token
heroku config:set LINE_CHANNEL_SECRET=your_secret
heroku config:set GOOGLE_SHEETS_ID=your_sheets_id
heroku config:set GOOGLE_CREDENTIALS_PATH=./credentials.json
heroku config:set LIFF_ID=your_liff_id
```

#### 5. Upload credentials.json
```bash
# Copy credentials.json ไปยัง Heroku
heroku config:set GOOGLE_CREDENTIALS=$(cat credentials.json | base64)
```

#### 6. Deploy
```bash
git push heroku main
```

#### 7. Monitor
```bash
# ดู logs
heroku logs --tail

# Restart app
heroku restart
```

---

## 4. ตั้งค่า Webhook URL

### ใน LINE Developers Console:

1. ไปที่ **Messaging API** settings
2. ตั้ง **Webhook URL** เป็น:
   ```
   https://your-domain.com/webhook
   ```
3. Enable **Webhook**

### ตัวอย่าง URLs:
- **PM2**: `https://your-server-ip:3000/webhook`
- **Docker**: `https://your-domain.com/webhook`
- **Heroku**: `https://line-betting-bot.herokuapp.com/webhook`

---

## 5. ตรวจสอบหลังจาก Deploy

### ทดสอบ Webhook
```bash
# ทดสอบว่า webhook ทำงาน
curl -X POST https://your-domain.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'
```

### ทดสอบใน LINE
1. เพิ่ม Bot เป็นเพื่อน
2. พิมพ์ `สรุปยอดแทง`
3. ควรได้รับสรุปการแทง

### ตรวจสอบ Logs
```bash
# PM2
pm2 logs line-betting-bot

# Docker
docker logs -f line-betting-bot

# Heroku
heroku logs --tail
```

---

## 6. Troubleshooting

### ปัญหา: Webhook ไม่ทำงาน
**วิธีแก้:**
1. ตรวจสอบ Webhook URL ใน LINE Developers Console
2. ตรวจสอบว่า server ทำงานอยู่
3. ตรวจสอบ logs

### ปัญหา: ไม่สามารถเชื่อมต่อ Google Sheets
**วิธีแก้:**
1. ตรวจสอบ `GOOGLE_SHEETS_ID` ใน .env
2. ตรวจสอบ `credentials.json` มีอยู่
3. ตรวจสอบ Google Sheets permissions

### ปัญหา: LIFF ไม่เปิด
**วิธีแก้:**
1. ตรวจสอบ `LIFF_ID` ใน .env
2. ตรวจสอบ LIFF app ตั้งค่าให้ "Allow all users"
3. ตรวจสอบ LIFF URL เป็น HTTPS

---

## 7. Maintenance

### Backup Google Sheets
```bash
# ทำ backup ทุกวัน
0 2 * * * cp /path/to/sheets-backup.json /path/to/backup/sheets-$(date +\%Y\%m\%d).json
```

### Monitor Performance
```bash
# PM2
pm2 monit

# Docker
docker stats line-betting-bot
```

### Update Dependencies
```bash
npm update
npm audit fix
```

---

## 8. Rollback

### ถ้าเกิดปัญหา

#### PM2
```bash
# Restart app
pm2 restart line-betting-bot

# Revert to previous version
git revert HEAD
npm install
pm2 restart line-betting-bot
```

#### Docker
```bash
# Stop current container
docker stop line-betting-bot

# Run previous version
docker run -d \
  --name line-betting-bot \
  -p 3000:3000 \
  --env-file .env \
  line-betting-bot:previous-tag
```

#### Heroku
```bash
# Rollback to previous release
heroku releases
heroku rollback v2
```

---

## 9. Security Checklist

- [ ] ตรวจสอบ `.env` ไม่ได้ commit ไปยัง Git
- [ ] ตรวจสอบ `credentials.json` ไม่ได้ commit ไปยัง Git
- [ ] ตรวจสอบ Webhook URL เป็น HTTPS
- [ ] ตรวจสอบ LINE Channel Secret ถูกต้อง
- [ ] ตรวจสอบ Google Sheets permissions ถูกต้อง
- [ ] ตรวจสอบ LIFF app ตั้งค่าให้ "Allow all users"
- [ ] ตรวจสอบ Server firewall ปิด port ที่ไม่ใช้

---

## 10. Support

หากมีปัญหา:
1. ตรวจสอบ logs
2. ตรวจสอบ .env configuration
3. ตรวจสอบ LINE Developers Console settings
4. ตรวจสอบ Google Sheets permissions
