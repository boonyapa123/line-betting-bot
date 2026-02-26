# 🔧 คู่มือแก้ไขปัญหา - ระบบตรวจสอบสลิป

## 🚨 ปัญหาทั่วไป

### 1. npm install ล้มเหลว

**ข้อความ Error:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**สาเหตุ:**
- Node.js version ไม่เข้ากัน
- npm cache เสีย

**วิธีแก้:**
```bash
# ลบ node_modules และ package-lock.json
rm -rf node_modules package-lock.json

# ลบ npm cache
npm cache clean --force

# ติดตั้งใหม่
npm install
```

---

### 2. Environment Variables ไม่ถูกอ่าน

**ข้อความ Error:**
```
Cannot read property 'SLIP2GO_SECRET_KEY' of undefined
```

**สาเหตุ:**
- ไฟล์ `.env` ไม่มีอยู่
- `.env` ไม่ได้ load
- ตัวแปรไม่ได้ตั้งค่า

**วิธีแก้:**
```bash
# ตรวจสอบว่า .env มีอยู่
ls -la .env

# ตรวจสอบเนื้อหา .env
cat .env

# ตรวจสอบว่า dotenv ติดตั้งแล้ว
npm list dotenv

# รีสตาร์ท server
npm start
```

---

### 3. Webhook ไม่ได้รับ Event จาก LINE

**สาเหตุ:**
- Webhook URL ไม่ถูกต้อง
- Server ไม่ online
- Channel Secret ไม่ตรงกัน
- Firewall บล็อก

**วิธีแก้:**

#### ตรวจสอบ Webhook URL
```bash
# ใน LINE Developers Console
# ไปที่ Messaging API > Webhook settings
# ตรวจสอบ URL ตรงกับ server ของคุณ
```

#### ตรวจสอบ Server Online
```bash
# ทดสอบ server ด้วย curl
curl -X POST https://your-domain.com/webhook/line-slip-verification \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'

# ควรได้ response 200 OK
```

#### ตรวจสอบ Channel Secret
```bash
# ใน .env
LINE_SLIP_VERIFICATION_CHANNEL_SECRET=<ค่าจาก LINE Developers Console>

# ตรวจสอบว่าตรงกัน
```

#### ตรวจสอบ Logs
```bash
# ดูที่ LINE Developers Console
# ไปที่ Messaging API > Webhook logs
# ตรวจสอบว่ามี error หรือไม่
```

---

### 4. ไม่สามารถสแกน QR Code

**ข้อความ Error:**
```
ไม่พบ QR Code ในรูปภาพ
```

**สาเหตุ:**
- คุณภาพรูปภาพไม่ดี
- QR Code เสียหาย
- QR Code ไม่ชัดเจน
- มุมรูปภาพไม่ถูกต้อง

**วิธีแก้:**

#### ตรวจสอบคุณภาพรูปภาพ
```javascript
// ใน qrCodeScannerService.js
// เพิ่ม logging เพื่อดูรูปภาพ
console.log(`Image size: ${width}x${height}`);
console.log(`Image format: ${image.getExtension()}`);
```

#### ลองใช้รูปภาพที่ชัดเจนกว่า
- ถ่ายรูปสลิปในแสงที่ดี
- ถ่ายรูปตรง ไม่เอียง
- ตรวจสอบว่า QR Code ไม่เสียหาย

#### ทดสอบด้วย QR Code String โดยตรง
```javascript
const result = await service.verifySlipFromQRCode(qrCodeString);
```

---

### 5. Slip2Go API ตอบกลับข้อผิดพลาด

**ข้อความ Error:**
```
code: "200404"
message: "Slip Not Found"
```

**สาเหตุ:**
- Secret Key ไม่ถูกต้อง
- QR Code String ไม่ถูกต้อง
- API URL ไม่ถูกต้อง
- สลิปไม่มีอยู่ในระบบ

**วิธีแก้:**

#### ตรวจสอบ Secret Key
```bash
# ใน .env
SLIP2GO_SECRET_KEY=<ค่าจาก Slip2Go>

# ตรวจสอบว่าไม่มี space หรือ special characters
```

#### ตรวจสอบ QR Code String
```javascript
// QR Code ต้องขึ้นต้นด้วย 0041
console.log(`QR Code: ${qrCode}`);
console.log(`Starts with 0041: ${qrCode.startsWith('0041')}`);
```

#### ตรวจสอบ API URL
```bash
# ใน .env
SLIP2GO_API_URL=https://api.slip2go.com

# ตรวจสอบว่าถูกต้อง
```

#### ทดสอบ API ด้วย curl
```bash
curl -X POST https://api.slip2go.com/api/verify-slip/qr-code/info \
  -H "Authorization: Bearer <SECRET_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "qrCode": "0041000600000101030040220014242082547BPM049885102TH9104xxxx",
      "checkCondition": {
        "checkDuplicate": true
      }
    }
  }'
```

---

### 6. ไม่ได้รับข้อความตอบกลับจาก LINE

**สาเหตุ:**
- LINE Access Token ไม่ถูกต้อง
- User ID ไม่ถูกต้อง
- API endpoint ไม่ถูกต้อง

**วิธีแก้:**

#### ตรวจสอบ LINE Access Token
```bash
# ใน .env
LINE_SLIP_VERIFICATION_ACCESS_TOKEN=<ค่าจาก LINE Developers Console>

# ตรวจสอบว่าไม่หมดอายุ
```

#### ตรวจสอบ User ID
```javascript
// ใน webhook handler
console.log(`User ID: ${event.source.userId}`);
console.log(`Group ID: ${event.source.groupId}`);
```

#### ทดสอบ LINE API ด้วย curl
```bash
curl -X POST https://api.line.biz/v1/bot/message/push \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "<USER_ID>",
    "messages": [
      {
        "type": "text",
        "text": "Test message"
      }
    ]
  }'
```

---

### 7. Server Crash หรือ Hang

**ข้อความ Error:**
```
Cannot allocate memory
Process killed
```

**สาเหตุ:**
- Memory leak
- Infinite loop
- Too many connections

**วิธีแก้:**

#### ตรวจสอบ Memory Usage
```bash
# ดูการใช้ memory
node --max-old-space-size=4096 index.js

# ดูการใช้ memory ในระหว่างการทำงาน
ps aux | grep node
```

#### ตรวจสอบ Logs
```bash
# ดูที่ logs directory
tail -f logs/error.log
tail -f logs/warn.log
```

#### เพิ่ม Error Handler
```javascript
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // บันทึก error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  // บันทึก error
});
```

---

### 8. QR Code Scanner ช้า

**สาเหตุ:**
- รูปภาพขนาดใหญ่
- ประมวลผลรูปภาพช้า
- Network ช้า

**วิธีแก้:**

#### ลดขนาดรูปภาพ
```javascript
// ใน qrCodeScannerService.js
const image = await Jimp.read(imagePath);
image.resize(800, 600); // ลดขนาด
```

#### เพิ่ม Timeout
```javascript
const timeout = setTimeout(() => {
  throw new Error('QR Code scanning timeout');
}, 10000); // 10 seconds
```

#### ใช้ Worker Thread
```javascript
const { Worker } = require('worker_threads');
// ประมวลผล QR Code ใน background thread
```

---

## 📊 Debugging Tips

### 1. เพิ่ม Logging

```javascript
console.log(`🔍 ตรวจสอบสลิป: ${imageUrl}`);
console.log(`   📸 สแกน QR Code...`);
console.log(`   ✅ พบ QR Code: ${qrCode}`);
console.log(`   📤 เรียก API...`);
console.log(`   ✅ ได้ผลลัพธ์: ${JSON.stringify(result)}`);
```

### 2. ใช้ Debugger

```bash
# รัน server ด้วย debugger
node --inspect index.js

# เปิด Chrome DevTools
# ไปที่ chrome://inspect
```

### 3. ทดสอบแต่ละ Component

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

### 4. ตรวจสอบ Network

```bash
# ตรวจสอบ connection ไปยัง Slip2Go API
curl -I https://api.slip2go.com

# ตรวจสอบ connection ไปยัง LINE API
curl -I https://api.line.biz
```

---

## 📞 ติดต่อสอบถาม

หากปัญหายังไม่แก้ได้ โปรดติดต่อทีม Support พร้อมข้อมูลต่อไปนี้:

1. Error message ที่ได้
2. Server logs
3. Environment variables (ซ่อน sensitive data)
4. ขั้นตอนที่ทำให้เกิด error
5. Expected behavior vs Actual behavior

---

**Last Updated:** February 26, 2025
**Version:** 1.0.0
