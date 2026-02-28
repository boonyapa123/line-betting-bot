# Webhook Timeout Fix

## ปัญหา
LINE webhook ขึ้น timeout error เมื่อ verify webhook URL

```
Error: A timeout occurred when sending a webhook event object
```

## สาเหตุ
1. Webhook handler ใช้ `async` ทำให้ LINE รอให้ประมวลผลเสร็จ
2. ดาวน์โหลดรูปภาพจาก LINE ใช้เวลานาน
3. ตรวจสอบสลิปกับ Slip2Go API ใช้เวลานาน
4. LINE มี timeout ประมาณ 3-5 วินาที

## วิธีแก้ไข

### 1. ตอบสนองทันที
```javascript
// ❌ ก่อน: รอให้ประมวลผลเสร็จ
router.post('/webhook', async (req, res) => {
  // ... ประมวลผล ...
  res.status(200).json({ message: 'OK' });
});

// ✅ หลัง: ตอบสนองทันที
router.post('/webhook', (req, res) => {
  res.status(200).json({ message: 'OK' });
  
  // ประมวลผลในพื้นหลัง
  setImmediate(() => {
    // ... ประมวลผล ...
  });
});
```

### 2. เพิ่ม Timeout สำหรับ Download
```javascript
async function _downloadLineImage(messageId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Download timeout'));
    }, 10000); // 10 second timeout
    
    // ... download logic ...
  });
}
```

### 3. เพิ่ม Health Check Endpoint
```javascript
// GET /webhook - สำหรับ LINE verify
router.get('/webhook', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
```

## ขั้นตอนการ Verify Webhook ใน LINE

1. ไปที่ LINE Official Account Manager
2. ไปที่ Messaging API settings
3. ที่ "Webhook settings" → คลิก "Verify"
4. LINE จะส่ง GET request ไปยัง webhook URL
5. ระบบจะตอบสนอง 200 OK
6. LINE จะแสดง "Verified" ✅

## ตรวจสอบ Webhook

### ทดสอบ Health Check
```bash
curl https://line-betting-bot.onrender.com/webhook
```

Response:
```json
{
  "status": "ok",
  "message": "Webhook is running"
}
```

### ทดสอบ Webhook Event
```bash
node test-slip-webhook.js
```

## Logs ที่ควรเห็น

### Success
```
📨 รับ Webhook จาก LINE
   📸 รับรูปภาพ Message ID: 100001
   ✅ ดาวน์โหลดรูปภาพสำเร็จ (12345 bytes)
🔍 ตรวจสอบสลิปจาก LINE Image
   📸 พยายามสแกน QR Code จากรูปภาพ...
   ✅ พบ QR Code: ...
✅ ตรวจสอบสำเร็จ
   ✅ ส่งข้อความสำเร็จ
```

### Error
```
📨 รับ Webhook จาก LINE
   ❌ Signature ไม่ถูกต้อง
```

## Configuration ที่ต้องตรวจสอบ

```
.env:
├─ LINE_SLIP_VERIFICATION_ACCESS_TOKEN ✅
├─ LINE_SLIP_VERIFICATION_CHANNEL_SECRET ✅
├─ SLIP2GO_SECRET_KEY ✅
└─ PORT ✅

LINE Official Account:
├─ Webhook URL: https://line-betting-bot.onrender.com/webhook ✅
├─ Use webhook: ON ✅
└─ Webhook redelivery: OFF (optional)
```

## ถ้ายังไม่ได้

1. **ตรวจสอบ Webhook URL ใน LINE**
   - ต้องเป็น HTTPS
   - ต้องเป็น public URL (ไม่ใช่ localhost)
   - ต้องตรงกับ `/webhook` path

2. **ตรวจสอบ Channel Secret**
   - ต้องใช้ `LINE_SLIP_VERIFICATION_CHANNEL_SECRET`
   - ไม่ใช่ `LINE_CHANNEL_SECRET` หรือ `LINE_CHANNEL_SECRET_2`

3. **ตรวจสอบ Access Token**
   - ต้องใช้ `LINE_SLIP_VERIFICATION_ACCESS_TOKEN`
   - ต้องมี permission ดาวน์โหลดรูปภาพ

4. **ตรวจสอบ Logs**
   - ดู server logs เพื่อหาข้อผิดพลาด
   - ตรวจสอบว่า signature verification ผ่านหรือไม่

## ผลลัพธ์ที่คาดหวัง

✅ Webhook URL verified ใน LINE
✅ ลูกค้าส่งรูปสลิป → ระบบตรวจสอบ → ส่งข้อความตอบกลับ
✅ ข้อมูลบันทึกลง Google Sheets
