# 🧪 LINE Betting Bot - Local Testing

## ✅ Status

- ✅ Webhook ได้รับข้อมูล
- ✅ Pair detection ทำงาน
- ⏳ Google Sheets (ต้องเพิ่ม credentials.json)

## 🚀 Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup .env
```bash
cp .env.example .env
```

### 3. Add Google Credentials
1. ไปที่ https://console.cloud.google.com/
2. สร้าง Service Account
3. ดาวน์โหลด JSON key
4. บันทึกเป็น `credentials.json`

### 4. Start Server
```bash
npm start
```

### 5. Setup ngrok (ใน Terminal ใหม่)
```bash
ngrok http 3001
```

### 6. Update Webhook URL ใน LINE Bot Console
```
https://abc123.ngrok-free.app/webhook
```

### 7. Run Test
```bash
node test-local-webhook.js
```

## 📊 Test Results

### Message 1 (User A)
```
Message: "ชล 500 มะปราง"
✅ Webhook received
✅ Message extracted
📦 Stored with replyToken
```

### Message 2 (User B - Reply)
```
Message: "ถ 500 อ้วน"
✅ Webhook received
✅ Pair detected
   User A: U1111111111111111111111111111111
   User B: U2222222222222222222222222222222
📤 Recording to Google Sheets...
```

## 🔍 Logs

ดูที่ Terminal ที่เปิด server:

```
🔔 Webhook received
📨 Webhook handler started
   Events count: 1
📨 Processing message
   From: U1111111111111111111111111111111
   Text: "ชล 500 มะปราง"
   ReplyToken: token_test1
   📦 Stored message with replyToken: token_test1
⏭️  No pair detected (waiting for reply)
✅ Webhook handler completed
```

## 🎯 Next Steps

1. ✅ Webhook ทำงาน
2. ✅ Pair detection ทำงาน
3. ⏳ Google Sheets (ต้องเพิ่ม credentials.json)
4. ⏳ Test กับ LINE Bot จริง
5. ⏳ Deploy ไป Render.com

## 📝 Notes

- ngrok URL เปลี่ยนทุกครั้ง (free plan)
- ต้องอัปเดต Webhook URL ใน LINE Bot Console ทุกครั้ง
- Test file: `test-local-webhook.js`

---

**ทดสอบบน local ให้ผ่านก่อน แล้วค่อยอัปไป server!** ✅
