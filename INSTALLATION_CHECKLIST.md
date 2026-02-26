# ✅ Checklist การติดตั้งระบบตรวจสอบสลิป

## 📋 Pre-Installation

- [ ] ตรวจสอบว่า Node.js เวอร์ชัน 14+ ติดตั้งแล้ว
- [ ] ตรวจสอบว่า npm ติดตั้งแล้ว
- [ ] ตรวจสอบว่ามี Slip2Go Account
- [ ] ตรวจสอบว่ามี LINE OA Account
- [ ] ตรวจสอบว่ามี LINE Developers Account

## 🔑 Prepare Credentials

- [ ] ได้ Secret Key จาก Slip2Go
- [ ] ได้ API URL จาก Slip2Go
- [ ] ได้ LINE Channel Access Token
- [ ] ได้ LINE Channel Secret
- [ ] ได้ LINE Channel ID

## 📦 Installation Steps

### Step 1: Clone/Download Project
- [ ] โปรเจกต์ดาวน์โหลดแล้ว
- [ ] ไปที่ project directory

### Step 2: Install Dependencies
```bash
npm install
```
- [ ] Dependencies ติดตั้งสำเร็จ
- [ ] ไม่มี error ในการติดตั้ง

### Step 3: Setup Environment Variables
- [ ] สร้างหรือแก้ไขไฟล์ `.env`
- [ ] เพิ่ม `SLIP2GO_SECRET_KEY`
- [ ] เพิ่ม `SLIP2GO_API_URL`
- [ ] เพิ่ม `LINE_SLIP_VERIFICATION_ACCESS_TOKEN`
- [ ] เพิ่ม `LINE_SLIP_VERIFICATION_CHANNEL_SECRET`
- [ ] เพิ่ม `SLIP_CHECK_DUPLICATE=true`
- [ ] เพิ่ม `SLIP_CHECK_RECEIVER=true`

### Step 4: Verify Files
- [ ] `services/betting/qrCodeScannerService.js` มีอยู่
- [ ] `services/betting/lineSlipVerificationService.js` มีอยู่
- [ ] `routes/lineSlipVerificationWebhook.js` มีอยู่
- [ ] `config/slip-verification-config.js` มีอยู่
- [ ] `package.json` มี dependencies ใหม่

### Step 5: Update index.js
- [ ] เพิ่ม import: `const createLineSlipVerificationRouter = require('./routes/lineSlipVerificationWebhook');`
- [ ] เพิ่ม router ใน `start()` function
- [ ] ตรวจสอบ syntax ไม่มี error

### Step 6: Test System
```bash
node test-slip-verification.js
```
- [ ] Test 1: Service Initialization ✅
- [ ] Test 2: Environment Variables ✅
- [ ] Test 3: Message Creation ✅
- [ ] Test 4: Data Extraction ✅
- [ ] Test 5: Error Handling ✅

### Step 7: Configure Google Sheets (Optional)
- [ ] สร้าง Google Sheets ใหม่
- [ ] ตั้งค่า Google Service Account
- [ ] ดาวน์โหลด credentials.json
- [ ] เปิดใช้งาน Google Sheets API
- [ ] แชร์ Google Sheets กับ Service Account
- [ ] ตั้งค่า GOOGLE_SHEET_ID ใน .env
- [ ] ตั้งค่า GOOGLE_SERVICE_ACCOUNT_KEY ใน .env

### Step 8: Configure LINE Webhook
- [ ] ไปที่ LINE Developers Console
- [ ] เลือก Messaging API
- [ ] ตั้งค่า Webhook URL: `https://your-domain.com/webhook/line-slip-verification`
- [ ] เปิดใช้งาน "Use Webhook"
- [ ] ตรวจสอบ Channel Secret ตรงกับ `.env`

### Step 9: Start Server
```bash
npm start
```
- [ ] Server เริ่มต้นสำเร็จ
- [ ] ไม่มี error ในการเริ่มต้น
- [ ] Server listening on port 3001

### Step 10: Test with LINE OA
- [ ] เพิ่ม LINE OA เป็น friend
- [ ] ส่งรูปภาพสลิปไปยัง LINE OA
- [ ] ได้รับข้อความตอบกลับ
- [ ] ข้อมูลสลิปแสดงถูกต้อง
- [ ] ข้อมูลบันทึกลง Google Sheets ✅

## 🔍 Verification

### Services
- [ ] QRCodeScannerService ทำงานได้
- [ ] LineSlipVerificationService ทำงานได้
- [ ] Slip2GoQRVerificationService ทำงานได้

### Routes
- [ ] Webhook Handler รับ Event ได้
- [ ] ดาวน์โหลดรูปภาพได้
- [ ] ส่งข้อความตอบกลับได้

### Configuration
- [ ] Environment variables ตั้งค่าถูกต้อง
- [ ] Slip2Go API credentials ถูกต้อง
- [ ] LINE credentials ถูกต้อง

## 🐛 Troubleshooting

### ปัญหา: npm install ล้มเหลว
- [ ] ตรวจสอบ Node.js version
- [ ] ลบ `node_modules` และ `package-lock.json`
- [ ] รัน `npm install` อีกครั้ง

### ปัญหา: Environment variables ไม่ถูกอ่าน
- [ ] ตรวจสอบไฟล์ `.env` มีอยู่
- [ ] ตรวจสอบ `.env` ไม่มี syntax error
- [ ] รีสตาร์ท server

### ปัญหา: Webhook ไม่ได้รับ Event
- [ ] ตรวจสอบ Webhook URL ถูกต้อง
- [ ] ตรวจสอบ Server online
- [ ] ตรวจสอบ Channel Secret ตรงกัน
- [ ] ดูที่ LINE Developers Console logs

### ปัญหา: ไม่สามารถสแกน QR Code
- [ ] ตรวจสอบคุณภาพรูปภาพ
- [ ] ลองใช้รูปภาพที่ชัดเจนกว่า
- [ ] ตรวจสอบ QR Code ไม่เสียหาย

### ปัญหา: Slip2Go API ตอบกลับข้อผิดพลาด
- [ ] ตรวจสอบ Secret Key ถูกต้อง
- [ ] ตรวจสอบ QR Code String ถูกต้อง
- [ ] ตรวจสอบ API URL ถูกต้อง

## 📊 Performance Checklist

- [ ] Response time < 5 seconds
- [ ] ไม่มี memory leak
- [ ] ไม่มี error ในการทำงาน
- [ ] Logging ทำงานถูกต้อง

## 🔐 Security Checklist

- [ ] Secret Key ไม่ commit ไปยัง Git
- [ ] ใช้ HTTPS สำหรับ Webhook URL
- [ ] ตรวจสอบ Webhook Signature
- [ ] ไม่มี sensitive data ใน logs

## 📚 Documentation Checklist

- [ ] อ่าน `SLIP_VERIFICATION_SETUP.md`
- [ ] อ่าน `INTEGRATION_GUIDE.md`
- [ ] อ่าน `SLIP_VERIFICATION_README.md`
- [ ] อ่าน `IMPLEMENTATION_SUMMARY.md`

## ✅ Final Verification

- [ ] ทั้งหมดเสร็จแล้ว
- [ ] ระบบทำงานได้ปกติ
- [ ] ไม่มี error ในการทำงาน
- [ ] พร้อมใช้งานจริง

---

**Last Updated:** February 26, 2025
**Version:** 1.0.0

หากติดขัดที่ขั้นตอนใด โปรดติดต่อทีม Support
