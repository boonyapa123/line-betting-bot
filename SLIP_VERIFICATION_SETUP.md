# ระบบตรวจสอบสลิปจาก LINE OA

## 📋 ภาพรวม

ระบบนี้ช่วยให้ LINE OA สามารถรับรูปภาพสลิปจากผู้ใช้ และตรวจสอบความถูกต้องของสลิปโดยอัตโนมัติผ่าน Slip2Go API

## 🔧 ขั้นตอนการตั้งค่า

### 1. ติดตั้ง Dependencies

```bash
npm install
```

Dependencies ที่เพิ่มเข้ามา:
- `axios` - สำหรับเรียก HTTP API
- `jsqr` - สำหรับสแกน QR Code จากรูปภาพ
- `jimp` - สำหรับประมวลผลรูปภาพ

### 2. ตั้งค่า Environment Variables

ในไฟล์ `.env` ให้ตั้งค่าดังนี้:

```env
# Slip2Go Configuration
SLIP2GO_SECRET_KEY=<your-secret-key>
SLIP2GO_API_URL=https://api.slip2go.com

# LINE Slip Verification Configuration
LINE_SLIP_VERIFICATION_ACCESS_TOKEN=<your-line-access-token>
LINE_SLIP_VERIFICATION_CHANNEL_SECRET=<your-line-channel-secret>

# Slip Verification Settings
SLIP_CHECK_DUPLICATE=true          # ตรวจสอบสลิปซ้ำ
SLIP_CHECK_RECEIVER=true           # ตรวจสอบบัญชีผู้รับ
SLIP_CHECK_AMOUNT=false            # ตรวจสอบจำนวนเงิน
SLIP_CHECK_DATE=false              # ตรวจสอบวันที่
```

### 3. ตั้งค่า LINE Webhook

ใน LINE Developers Console:

1. ไปที่ **Messaging API** settings
2. ตั้งค่า **Webhook URL** เป็น:
   ```
   https://your-domain.com/webhook/line-slip-verification
   ```
3. เปิดใช้งาน **Use Webhook**
4. ตั้งค่า **Rich Menu** หรือ **Quick Reply** เพื่อให้ผู้ใช้สามารถส่งรูปภาพสลิปได้

### 4. เพิ่ม Route ใน index.js

```javascript
const createLineSlipVerificationRouter = require('./routes/lineSlipVerificationWebhook');

// เพิ่มใน start() function
const slipVerificationRouter = createLineSlipVerificationRouter(
  process.env.SLIP2GO_SECRET_KEY,
  process.env.LINE_SLIP_VERIFICATION_ACCESS_TOKEN,
  process.env.LINE_SLIP_VERIFICATION_CHANNEL_SECRET
);

app.use('/', slipVerificationRouter);
```

## 📊 ขั้นตอนการทำงาน

### 1. ผู้ใช้ส่งรูปภาพสลิป
```
ผู้ใช้ → LINE OA → [ส่งรูปภาพสลิป]
```

### 2. ระบบรับ Webhook
```
LINE OA → Webhook Handler → ตรวจสอบ Event Type
```

### 3. ดาวน์โหลดรูปภาพ
```
LINE API → ดาวน์โหลดรูปภาพ → Buffer
```

### 4. สแกน QR Code
```
QR Code Scanner → แยก QR Code String
```

### 5. ตรวจสอบสลิป
```
Slip2Go API → ตรวจสอบ QR Code → ได้ผลลัพธ์
```

### 6. ส่งข้อความตอบกลับ
```
LINE API → ส่งข้อความ → ผู้ใช้
```

## 🎯 Response Codes

| Code | ความหมาย | ข้อความตอบกลับ |
|------|---------|----------------|
| 200000 | พบสลิป | ✅ ได้รับยอดเงินแล้ว |
| 200200 | สลิปถูกต้อง | ✅ ได้รับยอดเงินแล้ว |
| 200401 | บัญชีผู้รับไม่ถูกต้อง | ❌ บัญชีผู้รับไม่ถูกต้อง |
| 200402 | ยอดโอนไม่ตรง | ❌ ยอดโอนเงินไม่ตรงเงื่อนไข |
| 200403 | วันที่ไม่ตรง | ❌ วันที่โอนไม่ตรงเงื่อนไข |
| 200404 | ไม่พบสลิป | ❌ ไม่พบข้อมูลสลิป |
| 200500 | สลิปปลอม | ❌ สลิปเสีย/สลิปปลอม |
| 200501 | สลิปซ้ำ | ❌ สลิปซ้ำ |

## 📝 ตัวอย่าง Payload

### Request ไปยัง Slip2Go API

```json
{
  "payload": {
    "qrCode": "0041000600000101030040220014242082547BPM049885102TH9104xxxx",
    "checkCondition": {
      "checkDuplicate": true,
      "checkReceiver": [
        {
          "accountNumber": "xxxxxx1234",
          "accountType": "01004"
        }
      ]
    }
  }
}
```

### Response จาก Slip2Go API

```json
{
  "code": "200000",
  "message": "Slip found",
  "data": {
    "referenceId": "92887bd5-60d3-4744-9a98-b8574eaxxxxx",
    "amount": 1000,
    "dateTime": "2025-10-05T14:48:00.000Z",
    "transRef": "015073144041ATF00999",
    "receiver": {
      "account": {
        "name": "บริษัท สลิปทูโก จำกัด",
        "bank": {
          "account": "xxx-x-x5366-x"
        }
      },
      "bank": {
        "id": "004",
        "name": "ธนาคารกสิกรไทย"
      }
    },
    "sender": {
      "account": {
        "name": "สมชาย สลิปทูโก",
        "bank": {
          "account": "xxx-x-x9866-x"
        }
      },
      "bank": {
        "id": "004",
        "name": "ธนาคารกสิกรไทย"
      }
    }
  }
}
```

## 🔐 ความปลอดภัย

1. **Secret Key** - เก็บไว้ใน `.env` อย่างปลอดภัย
2. **Webhook Signature** - ตรวจสอบลายเซ็นจาก LINE
3. **HTTPS Only** - ใช้ HTTPS สำหรับ Webhook URL
4. **Rate Limiting** - พิจารณาเพิ่ม rate limiting

## 🐛 Troubleshooting

### ปัญหา: ไม่สามารถสแกน QR Code
- ตรวจสอบคุณภาพของรูปภาพ
- ลองใช้รูปภาพที่มีความชัดเจนมากขึ้น
- ตรวจสอบว่า QR Code ไม่เสียหาย

### ปัญหา: Slip2Go API ตอบกลับข้อผิดพลาด
- ตรวจสอบ Secret Key
- ตรวจสอบ QR Code String
- ตรวจสอบเงื่อนไขการตรวจสอบ

### ปัญหา: ไม่ได้รับ Webhook จาก LINE
- ตรวจสอบ Webhook URL
- ตรวจสอบ Channel Secret
- ตรวจสอบ Server Logs

## 📚 ไฟล์ที่เกี่ยวข้อง

- `services/betting/qrCodeScannerService.js` - สแกน QR Code
- `services/betting/lineSlipVerificationService.js` - ตรวจสอบสลิป
- `services/betting/slip2GoQRVerificationService.js` - เรียก Slip2Go API
- `routes/lineSlipVerificationWebhook.js` - Webhook Handler

## 🚀 การใช้งาน

### ตรวจสอบสลิปจากรูปภาพ

```javascript
const LineSlipVerificationService = require('./services/betting/lineSlipVerificationService');

const service = new LineSlipVerificationService(process.env.SLIP2GO_SECRET_KEY);

// ตรวจสอบจาก URL
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

## 📞 ติดต่อสอบถาม

หากมีปัญหาหรือข้อสงสัย โปรดติดต่อทีม Support
