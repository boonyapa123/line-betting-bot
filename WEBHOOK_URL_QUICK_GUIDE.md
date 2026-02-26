# ⚡ Webhook URL - Quick Guide

## 🎯 Webhook URL ที่ต้องใส่

```
https://your-domain.com/webhook/line-slip-verification
```

---

## 🔍 หา Domain ของคุณ

### Platform ต่างๆ

| Platform | Domain Format | ตัวอย่าง |
|----------|---------------|---------|
| **Heroku** | `https://<app-name>.herokuapp.com` | `https://my-app.herokuapp.com` |
| **Render** | `https://<service-name>.onrender.com` | `https://my-app.onrender.com` |
| **Railway** | `https://<project-name>.railway.app` | `https://my-app.railway.app` |
| **AWS** | `https://<domain>.execute-api.<region>.amazonaws.com` | `https://abc123.execute-api.ap-southeast-1.amazonaws.com` |
| **Google Cloud** | `https://<project-id>.cloudfunctions.net` | `https://my-project-123.cloudfunctions.net` |
| **Azure** | `https://<app-name>.azurewebsites.net` | `https://my-app.azurewebsites.net` |
| **DigitalOcean** | `https://<your-domain.com>` | `https://my-app.example.com` |
| **Custom Domain** | `https://<your-domain.com>` | `https://slip-verification.com` |

---

## 📝 ขั้นตอนการตั้งค่า

### Step 1: หา Domain ของคุณ

ดู `FIND_YOUR_DOMAIN.md` เพื่อหา Domain ของคุณ

### Step 2: สร้าง Webhook URL

```
https://your-domain.com/webhook/line-slip-verification
```

### Step 3: ไปที่ LINE Developers Console

1. เปิด [LINE Developers Console](https://developers.line.biz/console/)
2. เลือก Provider
3. เลือก Channel (LINE OA)
4. ไปที่ **Messaging API**

### Step 4: ตั้งค่า Webhook URL

1. ค้นหา **"Webhook URL"** section
2. คลิก **"Edit"**
3. ใส่ Webhook URL ของคุณ
4. คลิก **"Verify"** หรือ **"Save"**

### Step 5: เปิดใช้งาน Webhook

1. ค้นหา **"Use webhook"** toggle
2. เปิดใช้งาน (ON) ✅

---

## ✅ ตรวจสอบว่าตั้งค่าถูกต้อง

### ทดสอบ Webhook URL

```bash
# ทดสอบว่า Server ตอบสนอง
curl -X POST https://your-domain.com/webhook/line-slip-verification \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'

# ควรได้ response 200 OK
```

### ทดสอบส่งรูปภาพจาก LINE OA

1. เพิ่ม LINE OA เป็น friend
2. ส่งรูปภาพสลิป
3. ตรวจสอบว่าได้รับข้อความตอบกลับ

---

## 🎯 ตัวอย่างการตั้งค่า

### ตัวอย่างที่ 1: Heroku

```
1. App name: slip-verification-bot
2. Domain: https://slip-verification-bot.herokuapp.com
3. Webhook URL: https://slip-verification-bot.herokuapp.com/webhook/line-slip-verification
4. ใส่ใน LINE Developers Console
```

### ตัวอย่างที่ 2: Render

```
1. Service name: slip-verification
2. Domain: https://slip-verification.onrender.com
3. Webhook URL: https://slip-verification.onrender.com/webhook/line-slip-verification
4. ใส่ใน LINE Developers Console
```

### ตัวอย่างที่ 3: Railway

```
1. Project name: slip-verification
2. Domain: https://slip-verification.railway.app
3. Webhook URL: https://slip-verification.railway.app/webhook/line-slip-verification
4. ใส่ใน LINE Developers Console
```

---

## 🔐 ความปลอดภัย

### ✅ ทำ
- ใช้ HTTPS เท่านั้น
- ตรวจสอบว่า URL ถูกต้อง
- ตรวจสอบว่า Server กำลัง running

### ❌ อย่าทำ
- ใช้ HTTP (ไม่ปลอดภัย)
- ใส่ URL ที่ไม่ถูกต้อง
- ใส่ URL ที่ Server ไม่ running

---

## 🐛 Troubleshooting

### ปัญหา: Webhook URL verification failed

**สาเหตุ:**
- URL ไม่ถูกต้อง
- Server ไม่ online
- Server ไม่ตอบสนอง

**วิธีแก้:**
1. ตรวจสอบ URL ว่าถูกต้อง
2. ตรวจสอบว่า Server กำลัง running
3. ทดสอบด้วย curl

### ปัญหา: ไม่ได้รับ Webhook Event

**สาเหตุ:**
- Webhook URL ไม่ถูกต้อง
- "Use webhook" ไม่เปิดใช้งาน

**วิธีแก้:**
1. ตรวจสอบ Webhook URL
2. ตรวจสอบว่า "Use webhook" เปิดใช้งาน

---

## 📚 ไฟล์ที่เกี่ยวข้อง

- `LINE_WEBHOOK_SETUP.md` - ขั้นตอนการตั้งค่า Webhook URL
- `FIND_YOUR_DOMAIN.md` - วิธีการหา Domain ของคุณ
- `TROUBLESHOOTING_GUIDE.md` - แก้ไขปัญหา

---

**Last Updated:** February 26, 2025
**Version:** 1.0.0
