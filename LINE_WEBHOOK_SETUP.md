# 🔗 การตั้งค่า LINE Webhook URL

## 📍 Webhook URL ที่ต้องใส่

### ✅ URL ที่ถูกต้อง

```
https://your-domain.com/webhook/line-slip-verification
```

### 🔍 ตัวอย่าง

**ถ้า Server ของคุณอยู่ที่:**
- `https://example.com` → ใส่ `https://example.com/webhook/line-slip-verification`
- `https://myapp.herokuapp.com` → ใส่ `https://myapp.herokuapp.com/webhook/line-slip-verification`
- `https://slip-verification.onrender.com` → ใส่ `https://slip-verification.onrender.com/webhook/line-slip-verification`

---

## 📋 ขั้นตอนการตั้งค่า

### Step 1: ไปที่ LINE Developers Console

1. เปิด [LINE Developers Console](https://developers.line.biz/console/)
2. เข้าสู่ระบบด้วย LINE Account
3. เลือก Provider ของคุณ
4. เลือก Channel (LINE OA)

---

### Step 2: ไปที่ Messaging API Settings

1. ในเมนูด้านซ้าย ให้คลิก **"Messaging API"**
2. ตรวจสอบว่าเลือก Channel ที่ถูกต้อง

---

### Step 3: ตั้งค่า Webhook URL

1. ค้นหา **"Webhook URL"** section
2. คลิก **"Edit"** หรือ **"Verify"**
3. ใส่ URL ของคุณ:
   ```
   https://your-domain.com/webhook/line-slip-verification
   ```

---

### Step 4: ตั้งค่า Webhook Usage

1. ค้นหา **"Use webhook"** toggle
2. เปิดใช้งาน (ON) ✅

---

### Step 5: ตั้งค่า Auto-reply

1. ค้นหา **"Auto-reply"** section
2. ปิดใช้งาน (OFF) ❌
   - เพราะเราจะส่งข้อความตอบกลับเอง

---

### Step 6: ตั้งค่า Rich Menu (Optional)

1. สร้าง Rich Menu เพื่อให้ผู้ใช้ส่งรูปภาพได้ง่าย
2. หรือให้ผู้ใช้ส่งรูปภาพโดยตรง

---

## 🔐 ตรวจสอบ Channel Secret

1. ในหน้า Messaging API Settings
2. ค้นหา **"Channel Secret"**
3. คัดลอกค่า
4. ใส่ใน `.env`:
   ```env
   LINE_SLIP_VERIFICATION_CHANNEL_SECRET=<ค่าที่คัดลอก>
   ```

---

## 🔑 ตรวจสอบ Channel Access Token

1. ในหน้า Messaging API Settings
2. ค้นหา **"Channel Access Token"**
3. คลิก **"Issue"** ถ้ายังไม่มี
4. คัดลอกค่า
5. ใส่ใน `.env`:
   ```env
   LINE_SLIP_VERIFICATION_ACCESS_TOKEN=<ค่าที่คัดลอก>
   ```

---

## 📝 ตัวอย่างการตั้งค่า .env

```env
# LINE Slip Verification Configuration
LINE_SLIP_VERIFICATION_ACCESS_TOKEN=4T31zd9SH2ZeCnipxzAD9L74EHbQAmGK0aAxyoM9gdLerSl/EwLJrsjDGKrV0EzNXn2hFs1hSGM/CU/Gin/UmQCR0pIrzMQIggUXyhCf6/hVI4RrB75We/rGtO2lQXzQHIiTKJTFyTNRQkm+fSq3HAdB04t89/1O/w1cDnyilFU=

LINE_SLIP_VERIFICATION_CHANNEL_SECRET=749db713285115a94531a93cf4d17033

# Webhook URL (ใส่ใน LINE Developers Console)
# https://your-domain.com/webhook/line-slip-verification
```

---

## ✅ ตรวจสอบว่าตั้งค่าถูกต้อง

### 1. ทดสอบ Webhook URL

```bash
# ทดสอบว่า Server ตอบสนอง
curl -X POST https://your-domain.com/webhook/line-slip-verification \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'

# ควรได้ response 200 OK
```

### 2. ตรวจสอบ Logs ใน LINE Developers Console

1. ไปที่ Messaging API Settings
2. ค้นหา **"Webhook logs"** หรือ **"Webhook delivery logs"**
3. ตรวจสอบว่ามี request ที่สำเร็จ

### 3. ทดสอบส่งรูปภาพจาก LINE OA

1. เพิ่ม LINE OA เป็น friend
2. ส่งรูปภาพสลิป
3. ตรวจสอบว่าได้รับข้อความตอบกลับ

---

## 🐛 Troubleshooting

### ปัญหา: Webhook URL ไม่ถูกต้อง

**ข้อความ Error:**
```
Webhook URL verification failed
```

**สาเหตุ:**
- URL ไม่ถูกต้อง
- Server ไม่ online
- Server ไม่ตอบสนอง

**วิธีแก้:**
1. ตรวจสอบ URL ว่าถูกต้อง
2. ตรวจสอบว่า Server กำลัง running
3. ทดสอบด้วย curl:
   ```bash
   curl -X POST https://your-domain.com/webhook/line-slip-verification \
     -H "Content-Type: application/json" \
     -d '{"events":[]}'
   ```

---

### ปัญหา: ไม่ได้รับ Webhook Event

**สาเหตุ:**
- Webhook URL ไม่ถูกต้อง
- "Use webhook" ไม่เปิดใช้งาน
- Channel Secret ไม่ตรงกัน

**วิธีแก้:**
1. ตรวจสอบ Webhook URL
2. ตรวจสอบว่า "Use webhook" เปิดใช้งาน
3. ตรวจสอบ Channel Secret ใน `.env`
4. ดู Webhook logs ใน LINE Developers Console

---

### ปัญหา: ได้รับ Webhook แต่ไม่ได้รับข้อความตอบกลับ

**สาเหตุ:**
- Channel Access Token ไม่ถูกต้อง
- User ID ไม่ถูกต้อง
- LINE API ไม่ตอบสนอง

**วิธีแก้:**
1. ตรวจสอบ Channel Access Token
2. ตรวจสอบ Server Logs
3. ทดสอบส่งข้อความด้วย curl:
   ```bash
   curl -X POST https://api.line.biz/v1/bot/message/push \
     -H "Authorization: Bearer <ACCESS_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
       "to": "<USER_ID>",
       "messages": [{
         "type": "text",
         "text": "Test message"
       }]
     }'
   ```

---

## 📊 ตัวอย่าง Webhook URL สำหรับ Platform ต่างๆ

### Heroku
```
https://your-app-name.herokuapp.com/webhook/line-slip-verification
```

### Render
```
https://your-app-name.onrender.com/webhook/line-slip-verification
```

### Railway
```
https://your-app-name.railway.app/webhook/line-slip-verification
```

### AWS
```
https://your-domain.execute-api.region.amazonaws.com/webhook/line-slip-verification
```

### Google Cloud
```
https://your-project-id.cloudfunctions.net/webhook/line-slip-verification
```

### Azure
```
https://your-app-name.azurewebsites.net/webhook/line-slip-verification
```

### DigitalOcean
```
https://your-domain.com/webhook/line-slip-verification
```

---

## 🔒 ความปลอดภัย

### ✅ ทำ
- ใช้ HTTPS เท่านั้น
- เก็บ Channel Secret ใน `.env`
- เก็บ Channel Access Token ใน `.env`
- ตรวจสอบ Webhook Signature

### ❌ อย่าทำ
- ใช้ HTTP (ไม่ปลอดภัย)
- Commit credentials ไปยัง Git
- แชร์ Channel Secret กับคนอื่น
- ใช้ URL ที่ไม่ปลอดภัย

---

## 📞 ติดต่อสอบถาม

หากมีปัญหา:
1. ตรวจสอบ Webhook logs ใน LINE Developers Console
2. ตรวจสอบ Server logs
3. ดู `TROUBLESHOOTING_GUIDE.md`
4. ติดต่อทีม Support

---

**Last Updated:** February 26, 2025
**Version:** 1.0.0
