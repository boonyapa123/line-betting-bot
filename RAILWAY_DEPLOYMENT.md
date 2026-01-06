# การ Deploy ไปยัง Railway.app (24/7 Online)

## ขั้นตอนที่ 1: เตรียม Repository

### 1.1 ตรวจสอบ .gitignore
```bash
cat .gitignore
```

ต้องมี:
```
node_modules/
.env
credentials.json
logs/
```

### 1.2 Commit code ไปยัง GitHub
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

---

## ขั้นตอนที่ 2: สร้าง Railway Account

1. ไปที่ https://railway.app
2. Click "Start Project"
3. Login ด้วย GitHub account
4. Authorize Railway เข้าถึง GitHub

---

## ขั้นตอนที่ 3: Deploy ไปยัง Railway

### 3.1 สร้าง New Project
1. Click "New Project"
2. เลือก "Deploy from GitHub repo"
3. เลือก repository ของคุณ
4. Railway จะ auto-detect Node.js project

### 3.2 ตั้ง Environment Variables
ใน Railway Dashboard:
1. ไปที่ Project Settings
2. ไปที่ "Variables"
3. เพิ่ม variables ทั้งหมดจาก .env:

```
LINE_CHANNEL_ACCESS_TOKEN=your_token_here
LINE_CHANNEL_SECRET=your_secret_here
GOOGLE_SHEETS_ID=your_sheets_id_here
GOOGLE_CREDENTIALS_PATH=./credentials.json
LIFF_ID=your_liff_id_here
PORT=3000
NODE_ENV=production
```

### 3.3 Upload credentials.json
1. ใน Railway Dashboard ไปที่ "Variables"
2. สร้าง variable ชื่อ `GOOGLE_CREDENTIALS_JSON`
3. Copy content ของ credentials.json และ paste เป็น value

---

## ขั้นตอนที่ 4: ปรับแต่ง App สำหรับ Railway

### 4.1 สร้าง Procfile
สร้างไฟล์ `Procfile` ในรูท:
```
web: node src/index.js
```

### 4.2 ปรับแต่ง src/index.js
ตรวจสอบว่า PORT มาจาก environment variable:

```javascript
const PORT = process.env.PORT || 3000;
```

### 4.3 ปรับแต่ง Google Credentials
ถ้า credentials.json ต้องอ่านจาก environment variable:

```javascript
// ใน config/database.js หรือที่ที่ใช้ credentials
if (process.env.GOOGLE_CREDENTIALS_JSON) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  // ใช้ credentials object โดยตรง
} else {
  // อ่านจาก file
  const credentials = require('../credentials.json');
}
```

---

## ขั้นตอนที่ 5: ตั้งค่า Webhook URL ใน LINE

### 5.1 ได้ URL จาก Railway
1. ใน Railway Dashboard ไปที่ Deployments
2. ดู "Public URL" (เช่น `https://line-betting-bot-production.up.railway.app`)

### 5.2 ตั้ง Webhook ใน LINE Developers Console
1. ไปที่ https://developers.line.biz/console/
2. เลือก Channel ของคุณ
3. ไปที่ "Messaging API" settings
4. ตั้ง "Webhook URL" เป็น:
   ```
   https://your-railway-url/webhook
   ```
5. Enable "Use webhook"
6. Click "Verify" เพื่อทดสอบ

---

## ขั้นตอนที่ 6: ตรวจสอบการทำงาน

### 6.1 ดู Logs
ใน Railway Dashboard:
1. ไปที่ Deployments
2. Click ที่ deployment ล่าสุด
3. ดู Logs

### 6.2 ทดสอบใน LINE
1. เพิ่ม Bot เป็นเพื่อน
2. พิมพ์ `สรุปยอดแทง`
3. ควรได้รับสรุปการแทง

### 6.3 ทดสอบ Health Check
```bash
curl https://your-railway-url/health
```

ควรได้ response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-06T...",
  "database": "connected"
}
```

---

## ขั้นตอนที่ 7: Auto-Deploy (Optional)

Railway จะ auto-deploy เมื่อ push ไปยัง GitHub:

```bash
# ทำการเปลี่ยนแปลง
git add .
git commit -m "Update bot"
git push origin main

# Railway จะ auto-deploy ใน 1-2 นาที
```

---

## ขั้นตอนที่ 8: Monitoring

### ดู Logs
```bash
# ใน Railway Dashboard
# Deployments > Latest > Logs
```

### ดู Metrics
```bash
# ใน Railway Dashboard
# Deployments > Metrics
```

### ตั้ง Alerts (Optional)
ใน Railway Dashboard:
1. ไปที่ Project Settings
2. ไปที่ "Alerts"
3. ตั้ง alert สำหรับ crashes

---

## ขั้นตอนที่ 9: Troubleshooting

### ปัญหา: Deployment Failed
**วิธีแก้:**
1. ตรวจสอบ Logs ใน Railway Dashboard
2. ตรวจสอบ package.json มี `start` script
3. ตรวจสอบ PORT ใช้ environment variable

### ปัญหา: Webhook ไม่ทำงาน
**วิธีแก้:**
1. ตรวจสอบ Webhook URL ใน LINE Developers Console
2. ตรวจสอบ LINE_CHANNEL_SECRET ถูกต้อง
3. ทดสอบ `/health` endpoint

### ปัญหา: ไม่สามารถเชื่อมต่อ Google Sheets
**วิธีแก้:**
1. ตรวจสอบ GOOGLE_CREDENTIALS_JSON ถูกต้อง
2. ตรวจสอบ GOOGLE_SHEETS_ID ถูกต้อง
3. ตรวจสอบ Google Sheets permissions

---

## ขั้นตอนที่ 10: Backup & Maintenance

### Backup Data
```bash
# ทำ backup Google Sheets ทุกวัน
# ใช้ Google Sheets API หรือ manual download
```

### Update Dependencies
```bash
npm update
git add package-lock.json
git commit -m "Update dependencies"
git push origin main
# Railway จะ auto-deploy
```

---

## ข้อมูลเพิ่มเติม

- **Railway Pricing**: https://railway.app/pricing
- **Railway Docs**: https://docs.railway.app
- **Free Tier**: $5/เดือน (เพียงพอสำหรับ bot)
- **Support**: Railway support ดีมาก

---

## สรุป

✅ Deploy ง่าย ๆ ผ่าน GitHub
✅ ทำงาน 24/7 โดยอัตโนมัติ
✅ Auto-deploy เมื่อ push code
✅ ราคาถูก ($5/เดือน)
✅ ไม่ต้องจัดการ server
✅ Logs และ monitoring ดี
