# ✅ Betting Round System - Setup Checklist

## 📋 Pre-Setup

- [ ] Node.js v14+ ติดตั้งแล้ว
- [ ] npm ติดตั้งแล้ว
- [ ] Git ติดตั้งแล้ว
- [ ] Google Account มี
- [ ] LINE Developer Account มี

## 🔧 Step 1: Google Sheets Setup

### 1.1 สร้าง Google Sheets
- [ ] ไปที่ [Google Sheets](https://sheets.google.com)
- [ ] สร้าง Spreadsheet ใหม่
- [ ] ตั้งชื่อ: "Betting Round System"
- [ ] คัดลอก Spreadsheet ID จาก URL

### 1.2 สร้าง Sheets
- [ ] สร้าง Sheet ชื่อ "RoundState"
- [ ] สร้าง Sheet ชื่อ "Transactions"
- [ ] สร้าง Sheet ชื่อ "UsersBalance"

### 1.3 ตั้งค่า Headers

**RoundState:**
- [ ] A1: State
- [ ] B1: RoundID
- [ ] C1: StartTime
- [ ] D1: SlipName

**Transactions:**
- [ ] A1: Timestamp
- [ ] B1: UserID
- [ ] C1: DisplayName
- [ ] D1: Method
- [ ] E1: Price
- [ ] F1: Side
- [ ] G1: Amount
- [ ] H1: SlipName
- [ ] I1: Status

**UsersBalance:**
- [ ] A1: UserID
- [ ] B1: DisplayName
- [ ] C1: Balance

## 🔑 Step 2: Google Cloud Setup

### 2.1 สร้าง Project
- [ ] ไปที่ [Google Cloud Console](https://console.cloud.google.com)
- [ ] สร้าง Project ใหม่
- [ ] ตั้งชื่อ: "Betting Bot"
- [ ] รอให้ Project สร้างเสร็จ

### 2.2 เปิด Google Sheets API
- [ ] ไปที่ APIs & Services
- [ ] ค้นหา "Google Sheets API"
- [ ] คลิก "Enable"

### 2.3 สร้าง Service Account
- [ ] ไปที่ Credentials
- [ ] คลิก "Create Credentials"
- [ ] เลือก "Service Account"
- [ ] ตั้งชื่อ: "betting-bot"
- [ ] คลิก "Create and Continue"
- [ ] ข้ามขั้นตอนถัดไป
- [ ] คลิก "Done"

### 2.4 สร้าง Key
- [ ] ไปที่ Service Accounts
- [ ] คลิกที่ Service Account ที่สร้าง
- [ ] ไปที่ "Keys" tab
- [ ] คลิก "Add Key" → "Create new key"
- [ ] เลือก "JSON"
- [ ] ดาวน์โหลด JSON file

### 2.5 บันทึก Credentials
- [ ] วางไฟล์ JSON ในโฟลเดอร์ root
- [ ] เปลี่ยนชื่อเป็น "credentials.json"
- [ ] เพิ่ม credentials.json ใน .gitignore

### 2.6 Share Spreadsheet
- [ ] ไปที่ Google Sheets
- [ ] คลิก "Share"
- [ ] ใส่ email จาก Service Account (ใน JSON file)
- [ ] ให้ Editor access
- [ ] คลิก "Share"

## 📱 Step 3: LINE Bot Setup

### 3.1 สร้าง Channel
- [ ] ไปที่ [LINE Developers](https://developers.line.biz)
- [ ] สร้าง Provider ใหม่ (ถ้ายังไม่มี)
- [ ] สร้าง Messaging API Channel ใหม่
- [ ] ตั้งชื่อ: "Betting Bot"

### 3.2 ดึง Credentials
- [ ] ไปที่ Channel settings
- [ ] คัดลอก "Channel Access Token"
- [ ] คัดลอก "Channel Secret"

### 3.3 ตั้งค่า Webhook
- [ ] ไปที่ Messaging API settings
- [ ] ตั้ง Webhook URL: `https://your-domain.com/api/betting/webhook`
- [ ] เปิด "Use webhook"
- [ ] ปิด "Auto-reply messages"

## 💻 Step 4: Local Setup

### 4.1 Clone Repository
- [ ] Clone project
- [ ] เข้าไปในโฟลเดอร์ project

### 4.2 ติดตั้ง Dependencies
```bash
npm install
```
- [ ] ติดตั้งเสร็จ

### 4.3 ตั้งค่า Environment
- [ ] สร้างไฟล์ `.env`
- [ ] ใส่ค่าต่อไปนี้:

```
GOOGLE_SHEETS_ID=your_spreadsheet_id
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
PORT=3000
NODE_ENV=development
```

- [ ] บันทึกไฟล์

### 4.4 ทดสอบระบบ
```bash
node test-betting-round.js
```
- [ ] ทดสอบผ่าน (ควรเห็น ✅ ทั้งหมด)

## 🚀 Step 5: Deployment

### 5.1 เลือก Hosting
- [ ] Railway
- [ ] Heroku
- [ ] AWS
- [ ] Google Cloud
- [ ] DigitalOcean
- [ ] อื่นๆ

### 5.2 Deploy
- [ ] Push code ไปยัง Git
- [ ] Connect repository กับ hosting
- [ ] ตั้งค่า environment variables
- [ ] Deploy

### 5.3 ตั้งค่า Webhook URL
- [ ] ไปที่ LINE Developers
- [ ] อัปเดต Webhook URL ให้ชี้ไปยัง production domain
- [ ] ทดสอบ webhook

## 🧪 Step 6: Testing

### 6.1 ทดสอบ Admin Commands
- [ ] ส่ง `:เริ่ม ฟ้าหลังฝน` ไปยัง Bot
- [ ] ตรวจสอบว่า Bot ตอบกลับ
- [ ] ตรวจสอบ Google Sheets (RoundState)

### 6.2 ทดสอบ User Betting
- [ ] ส่ง `ฟ้าหลังฝน ชล. 500` ไปยัง Bot
- [ ] ตรวจสอบว่า Bot ตอบกลับ
- [ ] ตรวจสอบ Google Sheets (Transactions)

### 6.3 ทดสอบ Pairing
- [ ] ส่ง `ฟ้าหลังฝน ชถ. 500` จาก User อื่น
- [ ] ตรวจสอบว่า Bot ตอบกลับ
- [ ] ตรวจสอบ Google Sheets (ควรมี 2 rows)

### 6.4 ทดสอบ Stop
- [ ] ส่ง `:หยุด` ไปยัง Bot
- [ ] ตรวจสอบว่า Bot ตอบกลับ
- [ ] ส่ง `ฟ้าหลังฝน ชล. 500` อีกครั้ง
- [ ] ตรวจสอบว่า Bot ตอบ "ปิดรับทายแล้ว"

### 6.5 ทดสอบ Calculate
- [ ] ส่ง `:สรุป ฟ้าหลังฝน 315` ไปยัง Bot
- [ ] ตรวจสอบว่า Bot ส่งรายงานผลลัพธ์
- [ ] ตรวจสอบ Google Sheets (UsersBalance ควรอัปเดต)

## 📊 Step 7: Monitoring

### 7.1 ตั้งค่า Logging
- [ ] ตั้งค่า log files
- [ ] ตั้งค่า error tracking (เช่น Sentry)
- [ ] ตั้งค่า monitoring (เช่น Datadog)

### 7.2 ตรวจสอบประจำวัน
- [ ] ตรวจสอบ error logs
- [ ] ตรวจสอบ Google Sheets
- [ ] ตรวจสอบ Bot responses

### 7.3 Backup
- [ ] ตั้งค่า Google Sheets backup
- [ ] ตั้งค่า database backup (ถ้ามี)

## 🔒 Step 8: Security

### 8.1 ตั้งค่า Permissions
- [ ] ตรวจสอบ Google Sheets permissions
- [ ] ตรวจสอบ Service Account permissions
- [ ] ตรวจสอบ LINE Bot permissions

### 8.2 ตั้งค่า Secrets
- [ ] ไม่ commit credentials.json
- [ ] ไม่ commit .env
- [ ] ใช้ environment variables ใน production

### 8.3 ตั้งค่า Rate Limiting
- [ ] ตั้งค่า rate limiting สำหรับ API
- [ ] ตั้งค่า rate limiting สำหรับ Google Sheets

## 📝 Step 9: Documentation

### 9.1 อัปเดต README
- [ ] เพิ่มคำแนะนำการใช้งาน
- [ ] เพิ่ม troubleshooting guide
- [ ] เพิ่ม API documentation

### 9.2 สร้าง User Guide
- [ ] สร้าง guide สำหรับ Admin
- [ ] สร้าง guide สำหรับ User
- [ ] สร้าง FAQ

## ✨ Step 10: Launch

### 10.1 Final Testing
- [ ] ทดสอบทั้งระบบ
- [ ] ทดสอบ edge cases
- [ ] ทดสอบ error handling

### 10.2 Announce
- [ ] ประกาศให้ Admin ทราบ
- [ ] ประกาศให้ User ทราบ
- [ ] ให้ training (ถ้าจำเป็น)

### 10.3 Monitor
- [ ] ติดตามการใช้งาน
- [ ] รวบรวม feedback
- [ ] ปรับปรุงตามความจำเป็น

## 🎉 Completion

- [ ] ทั้งหมดเสร็จสิ้น!
- [ ] ระบบพร้อมใช้งาน
- [ ] ทีมได้รับ training
- [ ] Documentation สมบูรณ์

## 📞 Support

หากมีปัญหา:
1. ตรวจสอบ BETTING_ROUND_SETUP.md
2. ตรวจสอบ BETTING_ROUND_SYSTEM.md
3. ดูไฟล์ log
4. ติดต่อ support

---

**Last Updated:** 2024-03-02
**Status:** ✅ Ready for Setup
