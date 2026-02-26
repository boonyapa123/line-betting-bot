# 🎯 ระบบตรวจสอบสลิปจาก LINE OA

ระบบอัตโนมัติสำหรับตรวจสอบความถูกต้องของสลิปธนาคารจาก LINE OA โดยใช้ Slip2Go API

## 📦 ไฟล์ที่เพิ่มเข้ามา

### Services
- `services/betting/qrCodeScannerService.js` - สแกน QR Code จากรูปภาพ
- `services/betting/lineSlipVerificationService.js` - ตรวจสอบสลิปจาก LINE
- `services/betting/slip2GoQRVerificationService.js` - เรียก Slip2Go API (มีอยู่แล้ว)
- `services/betting/slip2GoVerificationService.js` - ตรวจสอบจากรูปภาพ (มีอยู่แล้ว)

### Routes
- `routes/lineSlipVerificationWebhook.js` - Webhook Handler สำหรับ LINE

### Configuration
- `config/slip-verification-config.js` - ตั้งค่าการตรวจสอบสลิป

### Documentation
- `SLIP_VERIFICATION_SETUP.md` - คู่มือการตั้งค่า
- `INTEGRATION_GUIDE.md` - คู่มือการเชื่อมต่อ
- `SLIP_VERIFICATION_README.md` - ไฟล์นี้

### Examples & Tests
- `examples/slip-verification-example.js` - ตัวอย่างการใช้งาน
- `test-slip-verification.js` - ไฟล์ทดสอบระบบ

## 🚀 Quick Start

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. ตั้งค่า Environment Variables

```bash
# ใน .env
SLIP2GO_SECRET_KEY=<your-secret-key>
SLIP2GO_API_URL=https://api.slip2go.com
LINE_SLIP_VERIFICATION_ACCESS_TOKEN=<your-line-token>
LINE_SLIP_VERIFICATION_CHANNEL_SECRET=<your-line-secret>
```

### 3. เชื่อมต่อกับ index.js

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

### 4. ทดสอบระบบ

```bash
node test-slip-verification.js
```

### 5. รัน Server

```bash
npm start
```

## 📊 ขั้นตอนการทำงาน

```
1. ผู้ใช้ส่งรูปภาพสลิปไปยัง LINE OA
   ↓
2. LINE OA ส่ง Webhook ไปยัง Server
   ↓
3. Server ดาวน์โหลดรูปภาพจาก LINE
   ↓
4. QR Code Scanner สแกน QR Code จากรูปภาพ
   ↓
5. Slip2Go API ตรวจสอบสลิป
   ↓
6. Server สร้างข้อความตอบกลับ
   ↓
7. Server ส่งข้อความตอบกลับไปยัง LINE OA
   ↓
8. ผู้ใช้ได้รับข้อความตอบกลับ
```

## 🔧 API Endpoints

### POST /webhook/line-slip-verification

รับ Webhook จาก LINE OA เมื่อมีการส่งรูปภาพสลิป

**Request Body:**
```json
{
  "events": [
    {
      "type": "message",
      "source": {
        "userId": "U1234567890abcdef1234567890abcdef",
        "groupId": "C1234567890abcdef1234567890abcdef"
      },
      "message": {
        "type": "image",
        "id": "100001"
      }
    }
  ]
}
```

**Response:**
```json
{
  "message": "OK"
}
```

## 💡 ตัวอย่างการใช้งาน

### ตรวจสอบสลิปจาก URL

```javascript
const LineSlipVerificationService = require('./services/betting/lineSlipVerificationService');

const service = new LineSlipVerificationService(process.env.SLIP2GO_SECRET_KEY);

const result = await service.verifySlipFromLineImage(imageUrl, {
  checkDuplicate: true,
  checkReceiver: [
    {
      accountNumber: 'xxxxxx1234',
      accountType: '01004'
    }
  ]
});

const message = service.createLineMessage(result);
console.log(message);
```

### ตรวจสอบสลิปจาก QR Code

```javascript
const result = await service.verifySlipFromQRCode(qrCodeString, {
  checkDuplicate: true
});
```

## 📋 Response Codes

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

## 🔐 ความปลอดภัย

- ✅ Secret Key เก็บใน `.env`
- ✅ HTTPS สำหรับ Webhook URL
- ✅ ตรวจสอบลายเซ็นจาก LINE
- ✅ Rate Limiting (ต้องเพิ่มเอง)

## 🐛 Troubleshooting

### ปัญหา: ไม่สามารถสแกน QR Code

**วิธีแก้:**
- ตรวจสอบคุณภาพของรูปภาพ
- ลองใช้รูปภาพที่มีความชัดเจนมากขึ้น
- ตรวจสอบว่า QR Code ไม่เสียหาย

### ปัญหา: Slip2Go API ตอบกลับข้อผิดพลาด

**วิธีแก้:**
- ตรวจสอบ Secret Key
- ตรวจสอบ QR Code String
- ตรวจสอบเงื่อนไขการตรวจสอบ

### ปัญหา: ไม่ได้รับ Webhook จาก LINE

**วิธีแก้:**
- ตรวจสอบ Webhook URL
- ตรวจสอบ Channel Secret
- ตรวจสอบ Server Logs

## 📚 ไฟล์ที่เกี่ยวข้อง

- `SLIP_VERIFICATION_SETUP.md` - คู่มือการตั้งค่า
- `INTEGRATION_GUIDE.md` - คู่มือการเชื่อมต่อ
- `examples/slip-verification-example.js` - ตัวอย่างการใช้งาน
- `test-slip-verification.js` - ไฟล์ทดสอบ

## 🎓 การเรียนรู้เพิ่มเติม

### QR Code Scanner
- ใช้ `jsQR` library สำหรับสแกน QR Code
- ใช้ `jimp` library สำหรับประมวลผลรูปภาพ

### Slip2Go API
- Endpoint: `https://api.slip2go.com/api/verify-slip/qr-code/info`
- Method: POST
- Authentication: Bearer Token

### LINE Messaging API
- Webhook URL: `/webhook/line-slip-verification`
- Event Type: message
- Message Type: image

## 📞 ติดต่อสอบถาม

หากมีปัญหาหรือข้อสงสัย โปรดติดต่อทีม Support

---

**Last Updated:** February 26, 2025
**Version:** 1.0.0
