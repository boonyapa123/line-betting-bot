# คู่มือการเชื่อมต่อระบบตรวจสอบสลิป

## 📌 ขั้นตอนการเชื่อมต่อ

### 1. เพิ่ม Route ใน index.js

ในไฟล์ `index.js` ให้เพิ่มโค้ดต่อไปนี้:

```javascript
// เพิ่มที่ด้านบนของไฟล์ (ใน imports)
const createLineSlipVerificationRouter = require('./routes/lineSlipVerificationWebhook');

// เพิ่มใน start() function หลังจากสร้าง app
async function start() {
  // ... โค้ดเดิม ...

  // สร้าง Slip Verification Router
  const slipVerificationRouter = createLineSlipVerificationRouter(
    process.env.SLIP2GO_SECRET_KEY,
    process.env.LINE_SLIP_VERIFICATION_ACCESS_TOKEN,
    process.env.LINE_SLIP_VERIFICATION_CHANNEL_SECRET
  );

  // เพิ่ม Router ไปยัง Express App
  app.use('/', slipVerificationRouter);

  // ... โค้ดเดิม ...
}
```

### 2. ตั้งค่า Environment Variables

ในไฟล์ `.env` ให้เพิ่มตัวแปรต่อไปนี้:

```env
# Slip2Go Configuration
SLIP2GO_SECRET_KEY=<your-secret-key-from-slip2go>
SLIP2GO_API_URL=https://api.slip2go.com

# LINE Slip Verification Configuration
LINE_SLIP_VERIFICATION_ACCESS_TOKEN=<your-line-access-token>
LINE_SLIP_VERIFICATION_CHANNEL_SECRET=<your-line-channel-secret>

# Slip Verification Settings
SLIP_CHECK_DUPLICATE=true
SLIP_CHECK_RECEIVER=true
SLIP_CHECK_AMOUNT=false
SLIP_CHECK_DATE=false

# Receiver Account Configuration (optional)
RECEIVER_ACCOUNT_NUMBER=xxxxxx1234
RECEIVER_ACCOUNT_TYPE=01004
RECEIVER_ACCOUNT_NAME_TH=บริษัท สลิปทูโก จำกัด
```

### 3. ติดตั้ง Dependencies

```bash
npm install
```

### 4. ตั้งค่า LINE Webhook

ใน LINE Developers Console:

1. ไปที่ **Messaging API** settings
2. ตั้งค่า **Webhook URL** เป็น:
   ```
   https://your-domain.com/webhook/line-slip-verification
   ```
3. เปิดใช้งาน **Use Webhook**

### 5. ทดสอบระบบ

```bash
npm start
```

## 🔄 Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    LINE OA User                             │
│                  (ส่งรูปภาพสลิป)                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              LINE Webhook Handler                           │
│         (รับ Event จาก LINE OA)                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Download Image from LINE                          │
│         (ดาวน์โหลดรูปภาพสลิป)                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          QR Code Scanner Service                            │
│      (สแกน QR Code จากรูปภาพ)                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│        Slip2Go Verification Service                         │
│      (ตรวจสอบสลิปผ่าน API)                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Create Response Message                           │
│        (สร้างข้อความตอบกลับ)                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          Send Message to LINE OA                            │
│        (ส่งข้อความตอบกลับ)                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    LINE OA User                             │
│              (ได้รับข้อความตอบกลับ)                         │
└─────────────────────────────────────────────────────────────┘
```

## 📝 ตัวอย่างการใช้งาน

### ตรวจสอบสลิปจาก URL

```javascript
const LineSlipVerificationService = require('./services/betting/lineSlipVerificationService');

const service = new LineSlipVerificationService(process.env.SLIP2GO_SECRET_KEY);

// ตรวจสอบสลิป
const result = await service.verifySlipFromLineImage(imageUrl, {
  checkDuplicate: true,
  checkReceiver: [
    {
      accountNumber: 'xxxxxx1234',
      accountType: '01004'
    }
  ]
});

// สร้างข้อความตอบกลับ
const message = service.createLineMessage(result);
console.log(message);
```

### ตรวจสอบสลิปจาก QR Code

```javascript
const result = await service.verifySlipFromQRCode(qrCodeString, {
  checkDuplicate: true
});
```

## 🔐 ความปลอดภัย

1. **Secret Key** - เก็บไว้ใน `.env` อย่างปลอดภัย
2. **HTTPS Only** - ใช้ HTTPS สำหรับ Webhook URL
3. **Webhook Signature** - ตรวจสอบลายเซ็นจาก LINE
4. **Rate Limiting** - พิจารณาเพิ่ม rate limiting

## 🐛 Troubleshooting

### ปัญหา: Webhook ไม่ได้รับ Event

**สาเหตุ:**
- Webhook URL ไม่ถูกต้อง
- Server ไม่ online
- Channel Secret ไม่ตรงกัน

**วิธีแก้:**
1. ตรวจสอบ Webhook URL ใน LINE Developers Console
2. ตรวจสอบว่า Server กำลัง running
3. ตรวจสอบ Channel Secret ใน `.env`

#