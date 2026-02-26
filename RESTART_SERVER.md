# 🔄 วิธีการ Restart Server

## 🎯 ทำไมต้อง Restart?

เมื่อคุณแก้ไขโค้ด Server ต้อง restart เพื่อให้การเปลี่ยนแปลงมีผล

---

## 🔄 วิธีการ Restart

### ถ้า Server อยู่ที่ Render

#### วิธีที่ 1: ผ่าน Render Dashboard

1. เปิด [Render Dashboard](https://dashboard.render.com)
2. เลือก Service ของคุณ
3. ไปที่ **"Manual Deploy"** หรือ **"Restart"**
4. คลิก **"Restart"** หรือ **"Deploy"**

#### วิธีที่ 2: ผ่าน Git Push

```bash
# Push code ใหม่ไปยัง Git
git add .
git commit -m "Fix webhook response"
git push

# Render จะ auto-deploy
```

---

### ถ้า Server อยู่ที่ Heroku

#### วิธีที่ 1: ผ่าน Heroku Dashboard

1. เปิด [Heroku Dashboard](https://dashboard.heroku.com)
2. เลือก App ของคุณ
3. ไปที่ **"More"** → **"Restart all dynos"**

#### วิธีที่ 2: ผ่าน Heroku CLI

```bash
# ติดตั้ง Heroku CLI
brew install heroku

# Login
heroku login

# Restart app
heroku restart -a <app-name>
```

#### วิธีที่ 3: ผ่าน Git Push

```bash
# Push code ใหม่ไปยัง Git
git add .
git commit -m "Fix webhook response"
git push heroku main

# Heroku จะ auto-deploy
```

---

### ถ้า Server อยู่ที่ Railway

#### วิธีที่ 1: ผ่าน Railway Dashboard

1. เปิด [Railway Dashboard](https://railway.app)
2. เลือก Project ของคุณ
3. ไปที่ **"Deployments"**
4. คลิก **"Redeploy"** หรือ **"Restart"**

#### วิธีที่ 2: ผ่าน Git Push

```bash
# Push code ใหม่ไปยัง Git
git add .
git commit -m "Fix webhook response"
git push

# Railway จะ auto-deploy
```

---

### ถ้า Server อยู่ที่ AWS

#### วิธีที่ 1: ผ่าน AWS Console

1. เปิด AWS Console
2. ไปที่ EC2 หรือ Lambda
3. Restart instance หรือ redeploy function

#### วิธีที่ 2: ผ่าน AWS CLI

```bash
# ติดตั้ง AWS CLI
brew install awscli

# Configure
aws configure

# Restart instance
aws ec2 reboot-instances --instance-ids <instance-id>
```

---

### ถ้า Server อยู่ที่ Google Cloud

#### วิธีที่ 1: ผ่าน Google Cloud Console

1. เปิด Google Cloud Console
2. ไปที่ Cloud Functions หรือ App Engine
3. Redeploy function หรือ restart service

#### วิธีที่ 2: ผ่าน Google Cloud CLI

```bash
# ติดตั้ง Google Cloud CLI
brew install google-cloud-sdk

# Deploy function
gcloud functions deploy <function-name>
```

---

### ถ้า Server อยู่ที่ Azure

#### วิธีที่ 1: ผ่าน Azure Portal

1. เปิด Azure Portal
2. ไปที่ App Service
3. คลิก **"Restart"**

#### วิธีที่ 2: ผ่าน Azure CLI

```bash
# ติดตั้ง Azure CLI
brew install azure-cli

# Login
az login

# Restart app
az webapp restart --name <app-name> --resource-group <resource-group>
```

---

### ถ้า Server อยู่ที่ DigitalOcean

#### วิธีที่ 1: ผ่าน DigitalOcean Console

1. เปิด DigitalOcean Control Panel
2. ไปที่ App Platform หรือ Droplets
3. Restart app หรือ droplet

#### วิธีที่ 2: ผ่าน SSH

```bash
# SSH เข้า server
ssh root@<your-server-ip>

# Restart service
systemctl restart <service-name>

# หรือ
pm2 restart all
```

---

### ถ้า Server อยู่ที่ localhost (Local Development)

#### วิธีที่ 1: ปิดและเปิดใหม่

```bash
# ปิด server (Ctrl+C)
# เปิด server ใหม่
npm start
```

#### วิธีที่ 2: ใช้ nodemon (Auto-restart)

```bash
# ติดตั้ง nodemon
npm install -D nodemon

# เพิ่มใน package.json
{
  "scripts": {
    "dev": "nodemon index.js"
  }
}

# รัน
npm run dev

# nodemon จะ auto-restart เมื่อมีการเปลี่ยนแปลงโค้ด
```

---

## 📋 Checklist

- [ ] แก้ไขโค้ด
- [ ] Commit changes
- [ ] Push ไปยัง Git (ถ้าใช้ auto-deploy)
- [ ] Restart Server
- [ ] ตรวจสอบว่า Server กำลัง running
- [ ] ทดสอบ Webhook URL

---

## 🧪 ทดสอบหลังจาก Restart

```bash
# ทดสอบว่า Server ตอบสนอง
curl https://slip-verification.onrender.com

# ทดสอบ Webhook URL
curl -X POST https://slip-verification.onrender.com/webhook/line-slip-verification \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'

# ควรได้ response 200 OK
```

---

## 📊 Timeline

```
แก้ไขโค้ด
    ↓
Commit changes
    ↓
Push ไปยัง Git
    ↓
Restart Server
    ↓
Server กำลัง running
    ↓
ทดสอบ Webhook URL
    ↓
✅ ทำงานได้
```

---

## 🐛 Troubleshooting

### ปัญหา: Server ยังไม่ restart

**วิธีแก้:**
1. รอ 1-2 นาที
2. Refresh page
3. Restart ใหม่

### ปัญหา: Server restart แล้วแต่ยังไม่ทำงาน

**วิธีแก้:**
1. ตรวจสอบ logs
2. ตรวจสอบว่า code ถูกต้อง
3. ตรวจสอบ environment variables

---

## 📞 ติดต่อสอบถาม

หากยังมีปัญหา:
1. ตรวจสอบ Server logs
2. ดู `TROUBLESHOOTING_GUIDE.md`
3. ติดต่อทีม Support

---

**Last Updated:** February 26, 2025
**Version:** 1.0.0
