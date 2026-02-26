# 🌐 วิธีการหา Domain ของคุณ

## 🎯 Webhook URL ที่ต้องใส่

```
https://your-domain.com/webhook/line-slip-verification
```

**ต้องแทนที่ `your-domain.com` ด้วย Domain ของคุณ**

---

## 🔍 วิธีการหา Domain ของคุณ

### 1️⃣ ถ้า Server อยู่ที่ Heroku

**ขั้นตอน:**
1. เปิด [Heroku Dashboard](https://dashboard.heroku.com)
2. เลือก App ของคุณ
3. ดู **"App name"** ที่ด้านบน
4. Domain ของคุณคือ: `https://<app-name>.herokuapp.com`

**ตัวอย่าง:**
```
App name: my-slip-verification
Domain: https://my-slip-verification.herokuapp.com
Webhook URL: https://my-slip-verification.herokuapp.com/webhook/line-slip-verification
```

---

### 2️⃣ ถ้า Server อยู่ที่ Render

**ขั้นตอน:**
1. เปิด [Render Dashboard](https://dashboard.render.com)
2. เลือก Service ของคุณ
3. ดู **"Service name"** หรือ **"URL"**
4. Domain ของคุณคือ: `https://<service-name>.onrender.com`

**ตัวอย่าง:**
```
Service name: slip-verification
Domain: https://slip-verification.onrender.com
Webhook URL: https://slip-verification.onrender.com/webhook/line-slip-verification
```

---

### 3️⃣ ถ้า Server อยู่ที่ Railway

**ขั้นตอน:**
1. เปิด [Railway Dashboard](https://railway.app)
2. เลือก Project ของคุณ
3. ดู **"Domain"** ใน Settings
4. Domain ของคุณคือ: `https://<project-name>.railway.app`

**ตัวอย่าง:**
```
Project name: slip-verification
Domain: https://slip-verification.railway.app
Webhook URL: https://slip-verification.railway.app/webhook/line-slip-verification
```

---

### 4️⃣ ถ้า Server อยู่ที่ AWS

**ขั้นตอน:**
1. เปิด AWS Console
2. ไปที่ API Gateway หรือ CloudFront
3. ดู **"Domain name"**
4. Domain ของคุณคือ: `https://<domain>.execute-api.<region>.amazonaws.com`

**ตัวอย่าง:**
```
Domain: https://abc123.execute-api.ap-southeast-1.amazonaws.com
Webhook URL: https://abc123.execute-api.ap-southeast-1.amazonaws.com/webhook/line-slip-verification
```

---

### 5️⃣ ถ้า Server อยู่ที่ Google Cloud

**ขั้นตอน:**
1. เปิด Google Cloud Console
2. ไปที่ Cloud Functions หรือ App Engine
3. ดู **"URL"** หรือ **"Domain"**
4. Domain ของคุณคือ: `https://<project-id>.cloudfunctions.net`

**ตัวอย่าง:**
```
Domain: https://my-project-123.cloudfunctions.net
Webhook URL: https://my-project-123.cloudfunctions.net/webhook/line-slip-verification
```

---

### 6️⃣ ถ้า Server อยู่ที่ Azure

**ขั้นตอน:**
1. เปิด Azure Portal
2. ไปที่ App Service
3. ดู **"Default domain"** หรือ **"URL"**
4. Domain ของคุณคือ: `https://<app-name>.azurewebsites.net`

**ตัวอย่าง:**
```
App name: slip-verification
Domain: https://slip-verification.azurewebsites.net
Webhook URL: https://slip-verification.azurewebsites.net/webhook/line-slip-verification
```

---

### 7️⃣ ถ้า Server อยู่ที่ DigitalOcean

**ขั้นตอน:**
1. เปิด DigitalOcean Control Panel
2. ไปที่ App Platform หรือ Droplets
3. ดู **"Domain"** หรือ **"IP Address"**
4. Domain ของคุณคือ: `https://<your-domain.com>`

**ตัวอย่าง:**
```
Domain: https://slip-verification.example.com
Webhook URL: https://slip-verification.example.com/webhook/line-slip-verification
```

---

### 8️⃣ ถ้า Server อยู่ที่ localhost (Local Development)

**ขั้นตอน:**
1. ใช้ ngrok เพื่อ expose localhost ไปยัง internet
2. ติดตั้ง ngrok: `brew install ngrok` (macOS)
3. รัน ngrok: `ngrok http 3001`
4. ได้ URL เช่น: `https://abc123.ngrok.io`

**ตัวอย่าง:**
```
ngrok URL: https://abc123.ngrok.io
Webhook URL: https://abc123.ngrok.io/webhook/line-slip-verification
```

---

## 📋 Checklist

- [ ] หา Domain ของคุณ
- [ ] ตรวจสอบว่า Domain ถูกต้อง
- [ ] ตรวจสอบว่า Server กำลัง running
- [ ] ทดสอบ Domain ด้วย curl:
  ```bash
  curl https://your-domain.com
  ```
- [ ] ใส่ Webhook URL ใน LINE Developers Console
- [ ] ตรวจสอบว่า Webhook URL ถูกต้อง

---

## 🧪 ทดสอบ Webhook URL

### ทดสอบว่า Server ตอบสนอง

```bash
# ทดสอบ GET request
curl https://your-domain.com

# ทดสอบ POST request
curl -X POST https://your-domain.com/webhook/line-slip-verification \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'

# ควรได้ response 200 OK
```

---

## 🔐 ตรวจสอบ HTTPS

**⚠️ สำคัญ:** Webhook URL ต้องใช้ HTTPS เท่านั้น

```
❌ http://your-domain.com/webhook/line-slip-verification
✅ https://your-domain.com/webhook/line-slip-verification
```

---

## 📝 ตัวอย่างการตั้งค่า

### ตัวอย่างที่ 1: Heroku

```
1. App name: my-slip-bot
2. Domain: https://my-slip-bot.herokuapp.com
3. Webhook URL: https://my-slip-bot.herokuapp.com/webhook/line-slip-verification
4. ใส่ใน LINE Developers Console
```

### ตัวอย่างที่ 2: Render

```
1. Service name: slip-verification
2. Domain: https://slip-verification.onrender.com
3. Webhook URL: https://slip-verification.onrender.com/webhook/line-slip-verification
4. ใส่ใน LINE Developers Console
```

### ตัวอย่างที่ 3: Custom Domain

```
1. Domain: slip-verification.example.com
2. Webhook URL: https://slip-verification.example.com/webhook/line-slip-verification
3. ใส่ใน LINE Developers Console
```

---

## 🐛 Troubleshooting

### ปัญหา: ไม่รู้ว่า Domain ของตัวเองคืออะไร

**วิธีแก้:**
1. ตรวจสอบ Dashboard ของ Hosting Provider
2. ดู URL ที่ใช้เข้า Dashboard
3. ถ้า URL คือ `https://example.com` แล้ว Domain ของคุณคือ `https://example.com`

### ปัญหา: Domain ไม่ตอบสนอง

**วิธีแก้:**
1. ตรวจสอบว่า Server กำลัง running
2. ตรวจสอบ Firewall settings
3. ตรวจสอบ DNS settings
4. ทดสอบด้วย curl

### ปัญหา: ใช้ HTTP แทน HTTPS

**วิธีแก้:**
1. ตรวจสอบว่า Server ใช้ HTTPS
2. ตั้งค่า SSL Certificate
3. ใช้ HTTPS เท่านั้น

---

## 📞 ติดต่อสอบถาม

หากยังไม่รู้ว่า Domain ของคุณคืออะไร:
1. ตรวจสอบ Dashboard ของ Hosting Provider
2. ดู URL ที่ใช้เข้า Dashboard
3. ติดต่อ Support ของ Hosting Provider

---

**Last Updated:** February 26, 2025
**Version:** 1.0.0
