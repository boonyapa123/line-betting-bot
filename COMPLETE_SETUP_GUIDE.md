# 📚 คู่มือการตั้งค่าระบบตรวจสอบสลิป - ฉบับสมบูรณ์

## 🎯 ภาพรวม

ระบบนี้ช่วยให้ LINE OA สามารถรับรูปภาพสลิปจากผู้ใช้ และตรวจสอบความถูกต้องของสลิปโดยอัตโนมัติผ่าน Slip2Go API

## 📦 ไฟล์ที่เพิ่มเข้ามา

### Services (3 ไฟล์)
```
services/betting/
├── qrCodeScannerService.js              ← สแกน QR Code
├── lineSlipVerificationService.js       ← ตรวจสอบสลิป
├── slip2GoQRVerificationService.js      ← เรียก API (มีอยู่แล้ว)
└── slip2GoVerificationService.js        ← ตรวจสอบจากรูปภาพ (มีอยู่แล้ว)
```

### Routes (1 ไฟล์)
```
routes/
└── lineSlipVerificationWebhook.js       ← Webhook Handler
```

### Configuration (1 ไฟล์)
```
config/
└── slip-verification-config.js          ← ตั้งค่า
```

### Documentation (6 ไฟล์)
```
├── SLIP_VERIFICATION_SETUP.md           ← คู่มือการตั้งค่า
├── INTEGRATION_GUIDE.md                 ← คู่มือการเชื่อมต่อ
├── SLIP_VERIFICATION_README.md          ← README
├── IMPLEMENTATION_SUMMARY.md            ← สรุปการนำไปใช้
├── INSTALLATION_CHECKLIST.md            ← Checklist
├── TROUBLESHOOTING_GUIDE.md             ← แก้ไขปัญหา
└── COMPLETE_SETUP_GUIDE.md              ← ไฟล์นี้
```

### Examples & Tests (2 ไฟล์)
```
├── examples/slip-verification-example.js ← ตัวอย่าง
└── test-slip-verification.js             ← ทดสอบ
```

### Updates (2 ไฟล์)
```
├── package.json                         ← เพิ่ม dependencies
└── .env                                 ← เพิ่ม variables
```

## 🚀 Quick Start (5 นาที)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า .env
```env
SLIP2GO_SECRET_KEY=<your-secret-key>
SLIP2GO_API_URL=https://api.slip2go.com
LINE_SLIP_VERIFICATION_ACCESS_TOKEN=<your-line-token>
LINE_SLIP_VERIFICATION_CHANNEL_SECRET=<your-line-secret>
SLIP_CHECK_DUPLICATE=true
SLIP_CHECK_RECEIVER=true
```

### 3. เชื่อมต่อ index.js
```javascript
const createLineSlipVerificationRouter = require('./routes/lineSlipVerificationWebhook');

// ใน start() function
const slipVerificationRouter = createLineSlipVerificationRouter(
  process.env.SLIP2GO_SECRET_KEY,
  process.env.LINE_SLIP_VERIFICATION_ACCESS_TOKEN,
  process.env.LINE_SLIP_VERIFICATION_CHANNEL_SECRET
);
app.use('/', slipVerificationRouter);
```

### 4. ทดสอบ
```bash
node test-slip-verification.js
npm start
```

### 5. ตั้งค่า LINE Webhook
- ไปที่ LINE Developers Console
- ตั้งค่า Webhook URL: `https://your-domain.com/webhook/line-slip-verification`
- เปิดใช้งาน "Use Webhook"

## 📖 Documentation Guide

### สำหรับผู้เริ่มต้น
1. อ่าน `SLIP_VERIFICATION_README.md` - ภาพรวมระบบ
2. ทำตาม `INSTALLATION_CHECKLIST.md` - ติดตั้งทีละขั้นตอน
3. ดู `examples/slip-verification-example.js` - ตัวอย่างการใช้งาน

### สำหรับผู้พัฒนา
1. อ่าน `SLIP_VERIFICATION_SETUP.md` - รายละเอียดการตั้งค่า
2. อ่าน `INTEGRATION_GUIDE.md` - วิธีการเชื่อมต่อ
3. ดู `IMPLEMENTATION_SUMMARY.md` - สรุปการนำไปใช้

### สำหรับการแก้ไขปัญหา
1. อ่าน `TROUBLESHOOTING_GUIDE.md` - แก้ไขปัญหาทั่วไป
2. ดู `test-slip-verification.js` - ทดสอบระบบ

## 🔄 Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ผู้ใช้ส่งรูปภาพสลิปไปยัง LINE OA                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. LINE OA ส่ง Webhook ไปยัง Server                         │
│    POST /webhook/line-slip-verification                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Server ดาวน์โหลดรูปภาพจาก LINE                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. QR Code Scanner สแกน QR Code จากรูปภาพ                 │
│    ใช้ jsQR + Jimp                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Slip2Go API ตรวจสอบสลิป                                 │
│    POST https://api.slip2go.com/api/verify-slip/qr-code/info
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Server สร้างข้อความตอบกลับ                              │
│    ✅ สำเร็จ หรือ ❌ ข้อผิดพลาด                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Server ส่งข้อความตอบกลับไปยัง LINE OA                  │
│    POST https://api.line.biz/v1/bot/message/push           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. ผู้ใช้ได้รับข้อความตอบกลับ                              │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Features

### ✅ ตรวจสอบสลิป
- สแกน QR Code จากรูปภาพ
- ตรวจสอบสลิปผ่าน Slip2Go API
- ตรวจสอบเงื่อนไขหลายประการ
- ตรวจสอบบัญชีผู้รับ
- ตรวจสอบจำนวนเงิน
- ตรวจสอบวันที่

### ✅ LINE Integration
- รับ Webhook จาก LINE OA
- ดาวน์โหลดรูปภาพจาก LINE
- ส่งข้อความตอบกลับ
- รองรับ Group Chat

### ✅ Error Handling
- จัดการ error codes ต่างๆ
- สร้างข้อความ error ที่เหมาะสม
- Log ข้อมูลสำหรับ debugging

### ✅ Configuration
- ตั้งค่าเงื่อนไขการตรวจสอบ
- ตั้งค่าบัญชีผู้รับ
- ตั้งค่าข้อความตอบกลับ

## 📊 Response Codes

| Code | ความหมาย | ข้อความ |
|------|---------|--------|
| 200000 | พบสลิป | ✅ ได้รับยอดเงินแล้ว |
| 200200 | สลิปถูกต้อง | ✅ ได้รับยอดเงินแล้ว |
| 200401 | บัญชีผู้รับไม่ถูกต้อง | ❌ บัญชีผู้รับไม่ถูกต้อง |
| 200402 | ยอดโอนไม่ตรง | ❌ ยอดโอนเงินไม่ตรงเงื่อนไข |
| 200403 | วันที่ไม่ตรง | ❌ วันที่โอนไม่ตรงเงื่อนไข |
| 200404 | ไม่พบสลิป | ❌ ไม่พบข้อมูลสลิป |
| 200500 | สลิปปลอม | ❌ สลิปเสีย/สลิปปลอม |
| 200501 | สลิปซ้ำ | ❌ สลิปซ้ำ |

## 🔐 Security

- ✅ Secret Key เก็บใน `.env`
- ✅ HTTPS สำหรับ Webhook URL
- ✅ ตรวจสอบลายเซ็นจาก LINE
- ✅ Input Validation
- ✅ Error Handling

## 📝 API Reference

### LineSlipVerificationService

```javascript
const service = new LineSlipVerificationService(slip2GoSecretKey);

// ตรวจสอบสลิปจาก URL
const result = await service.verifySlipFromLineImage(imageUrl, {
  checkDuplicate: true,
  checkReceiver: [{ accountNumber: 'xxx', accountType: '01004' }]
});

// ตรวจสอบสลิปจาก QR Code
const result = await service.verifySlipFromQRCode(qrCode, {
  checkDuplicate: true
});

// สร้างข้อความตอบกลับ
const message = service.createLineMessage(result);

// ดึงข้อมูลสลิป
const slipData = service.extractSlipData(result);
```

### QRCodeScannerService

```javascript
const scanner = new QRCodeScannerService();

// สแกน QR Code จากไฟล์
const qrCode = await scanner.scanQRCodeFromFile(imagePath);

// สแกน QR Code จาก Buffer
const qrCode = await scanner.scanQRCodeFromBuffer(imageBuffer);

// สแกน QR Code จาก URL
const qrCode = await scanner.scanQRCodeFromUrl(imageUrl);
```

## 🧪 Testing

### ทดสอบระบบ
```bash
node test-slip-verification.js
```

### ทดสอบแต่ละ Component
```javascript
// ทดสอบ QR Code Scanner
const scanner = new QRCodeScannerService();
const qrCode = await scanner.scanQRCodeFromFile('./test-slip.jpg');

// ทดสอบ Slip2Go API
const verifier = new Slip2GoQRVerificationService(secretKey);
const result = await verifier.verifySlipFromQRCode(qrCode);

// ทดสอบ LINE Message
const service = new LineSlipVerificationService(secretKey);
const message = service.createLineMessage(result);
```

## 🐛 Debugging

### เพิ่ม Logging
```javascript
console.log(`🔍 ตรวจสอบสลิป: ${imageUrl}`);
console.log(`   📸 สแกน QR Code...`);
console.log(`   ✅ พบ QR Code: ${qrCode}`);
```

### ใช้ Debugger
```bash
node --inspect index.js
# เปิด chrome://inspect
```

### ตรวจสอบ Logs
```bash
tail -f logs/error.log
tail -f logs/warn.log
```

## 📚 Next Steps

1. **เพิ่ม Database** - บันทึกข้อมูลสลิปลงฐานข้อมูล
2. **เพิ่ม Rate Limiting** - ป้องกัน abuse
3. **เพิ่ม Logging** - บันทึก transaction ทั้งหมด
4. **เพิ่ม Unit Tests** - ทดสอบแต่ละ function
5. **เพิ่ม Error Monitoring** - ติดตามข้อผิดพลาด
6. **เพิ่ม Analytics** - วิเคราะห์ข้อมูล

## 📞 Support

หากมีปัญหาหรือข้อสงสัย:

1. ตรวจสอบ `TROUBLESHOOTING_GUIDE.md`
2. ดู `test-slip-verification.js` output
3. ตรวจสอบ Server Logs
4. ติดต่อทีม Support

---

**Created:** February 26, 2025
**Version:** 1.0.0
**Status:** Ready for Production

ขอบคุณที่ใช้ระบบตรวจสอบสลิป 🙏
