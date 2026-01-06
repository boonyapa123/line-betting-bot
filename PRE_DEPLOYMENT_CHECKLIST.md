# Pre-Deployment Checklist

## ✅ ตรวจสอบก่อน Deploy

### 1. Code & Configuration
- [ ] ทั้งหมด code ได้ commit ไปยัง Git
- [ ] `.env` ไม่ได้ commit (ตรวจสอบ `.gitignore`)
- [ ] `credentials.json` ไม่ได้ commit
- [ ] ไม่มี console.log ที่ไม่จำเป็น
- [ ] ไม่มี hardcoded values

### 2. Environment Variables
- [ ] `LINE_CHANNEL_ACCESS_TOKEN` - ถูกต้อง
- [ ] `LINE_CHANNEL_SECRET` - ถูกต้อง
- [ ] `GOOGLE_SHEETS_ID` - ถูกต้อง
- [ ] `GOOGLE_CREDENTIALS_PATH` - ถูกต้อง
- [ ] `PORT` - ตั้งค่าแล้ว (default: 3000)
- [ ] `LIFF_ID` - ถูกต้อง
- [ ] `NODE_ENV` - ตั้งเป็น `production`

### 3. Google Sheets
- [ ] Google Sheets มี sheet "Bets"
- [ ] Column A-F มีข้อมูล
- [ ] Column G (ยอดเงิน) เพิ่มแล้ว
- [ ] Column H (สถานะอัปเดต) เพิ่มแล้ว
- [ ] Service Account มี access ไปยัง Sheets
- [ ] `credentials.json` ถูกต้อง

### 4. LINE Configuration
- [ ] LINE Channel ID ถูกต้อง
- [ ] LINE Channel Secret ถูกต้อง
- [ ] LINE Channel Access Token ถูกต้อง
- [ ] Webhook URL ตั้งแล้ว (HTTPS)
- [ ] Webhook Enable ไว้
- [ ] Rich Menu ตั้งแล้ว (ถ้ามี)

### 5. LIFF Configuration
- [ ] LIFF ID ถูกต้อง
- [ ] LIFF app ตั้งค่าให้ "Allow all users"
- [ ] LIFF URL เป็น HTTPS
- [ ] LIFF app size เป็น "Full"
- [ ] LIFF permissions ตั้งแล้ว (Profile, OpenID)

### 6. Dependencies
- [ ] `npm install` รันแล้ว
- [ ] ไม่มี security vulnerabilities
  ```bash
  npm audit
  ```
- [ ] ทั้งหมด dependencies ใน package.json

### 7. Testing
- [ ] ทดสอบ locally ด้วย `npm start`
- [ ] ทดสอบคำสั่ง `สรุปยอดแทง`
- [ ] ทดสอบคำสั่ง `สรุปยอดโอนเงิน`
- [ ] ทดสอบคำสั่ง `/ยกเลิก`
- [ ] ทดสอบการบันทึกการแทง
- [ ] ทดสอบการลบข้อความ
- [ ] ไม่มี error ใน console

### 8. Logs & Monitoring
- [ ] ตั้ค่า log directory
- [ ] ตั้งค่า log rotation (ถ้าใช้ PM2)
- [ ] ตั้งค่า monitoring (ถ้าใช้ PM2)
- [ ] ตั้งค่า error tracking (ถ้ามี)

### 9. Database & Storage
- [ ] Google Sheets backup ทำแล้ว
- [ ] ไม่มี sensitive data ใน logs
- [ ] ตั้งค่า backup schedule

### 10. Security
- [ ] Webhook URL เป็น HTTPS
- [ ] ไม่มี hardcoded secrets
- [ ] ไม่มี debug mode ใน production
- [ ] ตั้งค่า CORS ถูกต้อง
- [ ] ตั้งค่า rate limiting (ถ้าจำเป็น)

### 11. Performance
- [ ] ตรวจสอบ response time
- [ ] ตรวจสอบ memory usage
- [ ] ตรวจสอบ CPU usage
- [ ] ตั้งค่า max memory restart (PM2)

### 12. Deployment Method
- [ ] เลือก deployment method (PM2/Docker/Heroku)
- [ ] ตั้งค่า deployment config
- [ ] ทดสอบ deployment locally
- [ ] ตั้งค่า auto-restart
- [ ] ตั้งค่า monitoring

---

## 🚀 Deployment Steps

### Step 1: Final Testing
```bash
npm start
# ทดสอบทั้งหมด commands
```

### Step 2: Build (ถ้ามี TypeScript)
```bash
npm run build
```

### Step 3: Deploy
```bash
# PM2
pm2 start ecosystem.config.js

# Docker
docker build -t line-betting-bot:latest .
docker run -d --name line-betting-bot -p 3000:3000 --env-file .env line-betting-bot:latest

# Heroku
git push heroku main
```

### Step 4: Verify
```bash
# ตรวจสอบ app ทำงาน
curl https://your-domain.com/health

# ตรวจสอบ logs
pm2 logs line-betting-bot
# หรือ
docker logs -f line-betting-bot
# หรือ
heroku logs --tail
```

### Step 5: Test in LINE
1. เพิ่ม Bot เป็นเพื่อน
2. พิมพ์ `สรุปยอดแทง`
3. ควรได้รับสรุปการแทง

---

## 📋 Post-Deployment

### ตรวจสอบหลังจาก Deploy
- [ ] Webhook ทำงาน
- [ ] Bot ตอบสนองต่อคำสั่ง
- [ ] Google Sheets อัปเดตถูกต้อง
- [ ] ไม่มี error ใน logs
- [ ] Performance ปกติ

### Monitor
- [ ] ตรวจสอบ logs ทุกวัน
- [ ] ตรวจสอบ Google Sheets ทุกวัน
- [ ] ตรวจสอบ server resources ทุกสัปดาห์

### Backup
- [ ] Backup Google Sheets ทุกวัน
- [ ] Backup logs ทุกสัปดาห์
- [ ] Backup config ทุกเดือน

---

## ⚠️ Emergency Procedures

### ถ้า Bot ไม่ตอบสนอง
1. ตรวจสอบ logs
2. Restart app
3. ตรวจสอบ Webhook URL
4. ตรวจสอบ LINE Channel Token

### ถ้า Google Sheets ไม่อัปเดต
1. ตรวจสอบ credentials.json
2. ตรวจสอบ Google Sheets permissions
3. ตรวจสอบ GOOGLE_SHEETS_ID

### ถ้า LIFF ไม่เปิด
1. ตรวจสอบ LIFF ID
2. ตรวจสอบ LIFF URL
3. ตรวจสอบ LIFF app settings

---

## 📞 Support

หากมีปัญหา:
1. ตรวจสอบ logs
2. ตรวจสอบ configuration
3. ตรวจสอบ LINE Developers Console
4. ตรวจสอบ Google Sheets permissions
