# 🔄 วิธีการ Restart Server ใน Render.com

## 🎯 ขั้นตอนการ Restart

### Step 1: เปิด Render Dashboard

1. ไปที่ https://dashboard.render.com
2. เข้าสู่ระบบด้วย Account ของคุณ

---

### Step 2: เลือก Service ของคุณ

```
┌─────────────────────────────────────────┐
│  Render Dashboard                       │
├─────────────────────────────────────────┤
│                                         │
│  Services                               │
│  ├─ slip-verification ← เลือกนี่        │
│  ├─ other-service                       │
│  └─ another-service                     │
│                                         │
└─────────────────────────────────────────┘
```

---

### Step 3: ไปที่ Service Settings

1. คลิกที่ Service ของคุณ
2. ดู Service name: `slip-verification`

---

### Step 4: Restart Service

#### วิธีที่ 1: ผ่าน Dashboard (ง่ายที่สุด)

1. ในหน้า Service ของคุณ
2. ค้นหา **"Manual Deploy"** หรือ **"Restart"** button
3. คลิก **"Restart"** หรือ **"Redeploy"**

```
┌─────────────────────────────────────────┐
│  slip-verification Service              │
├─────────────────────────────────────────┤
│                                         │
│  Status: Running                        │
│                                         │
│  [Restart] [Redeploy] [Settings]        │
│     ↑                                   │
│     คลิกที่นี่                           │
│                                         │
└─────────────────────────────────────────┘
```

#### วิธีที่ 2: ผ่าน Git Push (Auto-deploy)

```bash
# 1. แก้ไขโค้ด
# 2. Commit changes
git add .
git commit -m "Fix webhook response"

# 3. Push ไปยัง Git
git push

# Render จะ auto-deploy และ restart
```

---

## ⏱️ รอให้ Restart เสร็จ

```
┌─────────────────────────────────────────┐
│  Deployment Status                      │
├─────────────────────────────────────────┤
│                                         │
│  Status: Deploying...                   │
│  Progress: ████████░░ 80%               │
│                                         │
│  รอ 1-2 นาที                            │
│                                         │
└─────────────────────────────────────────┘
```

---

## ✅ ตรวจสอบว่า Restart สำเร็จ

### 1. ตรวจสอบ Status

```
┌─────────────────────────────────────────┐
│  slip-verification Service              │
├─────────────────────────────────────────┤
│                                         │
│  Status: Running ✅                     │
│  Last deployed: just now                │
│                                         │
└─────────────────────────────────────────┘
```

### 2. ทดสอบ Webhook URL

```bash
# ทดสอบว่า Server ตอบสนอง
curl -X POST https://slip-verification.onrender.com/webhook/line-slip-verification \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'

# ควรได้ response 200 OK
# {"message":"OK"}
```

### 3. ทดสอบส่งรูปภาพจาก LINE OA

1. เพิ่ม LINE OA เป็น friend
2. ส่งรูปภาพสลิป
3. ตรวจสอบว่าได้รับข้อความตอบกลับ

---

## 📊 Timeline

```
คลิก Restart
    ↓
Render เริ่ม deploy
    ↓
รอ 1-2 นาที
    ↓
Status: Running ✅
    ↓
ทดสอบ Webhook URL
    ↓
✅ ทำงานได้
```

---

## 🔍 ตรวจสอบ Logs

### ดู Logs ใน Render Dashboard

1. ไปที่ Service ของคุณ
2. ค้นหา **"Logs"** tab
3. ดู logs ล่าสุด

```
┌─────────────────────────────────────────┐
│  Logs                                   │
├─────────────────────────────────────────┤
│                                         │
│  2025-02-26 14:30:45 Starting server... │
│  2025-02-26 14:30:46 Server running     │
│  2025-02-26 14:30:47 Ready to receive   │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### ปัญหา: Restart ไม่สำเร็จ

**สาเหตุ:**
- Code มี error
- Environment variables ไม่ถูกต้อง
- Dependencies ไม่ติดตั้ง

**วิธีแก้:**
1. ตรวจสอบ Logs
2. ตรวจสอบ Code
3. ตรวจสอบ Environment Variables

### ปัญหา: Server ยังไม่ restart

**วิธีแก้:**
1. รอ 1-2 นาที
2. Refresh page
3. Restart ใหม่

### ปัญหา: Webhook URL ยังไม่ทำงาน

**วิธีแก้:**
1. ตรวจสอบว่า Server กำลัง running
2. ทดสอบ Webhook URL ด้วย curl
3. ตรวจสอบ Logs

---

## 📋 Checklist

- [ ] เปิด Render Dashboard
- [ ] เลือก Service ของคุณ
- [ ] คลิก Restart หรือ Redeploy
- [ ] รอให้ Restart เสร็จ
- [ ] ตรวจสอบ Status: Running ✅
- [ ] ทดสอบ Webhook URL
- [ ] ส่งรูปภาพจาก LINE OA
- [ ] ได้รับข้อความตอบกลับ ✅

---

## 🎯 ตัวอย่าง

### ตัวอย่าง: Restart ใน Render

```
1. เปิด https://dashboard.render.com
   ↓
2. เลือก Service: slip-verification
   ↓
3. คลิก Restart button
   ↓
4. รอ 1-2 นาที
   ↓
5. Status: Running ✅
   ↓
6. ทดสอบ Webhook URL
   ↓
7. ✅ ทำงานได้
```

---

## 📞 ติดต่อสอบถาม

หากยังมีปัญหา:
1. ตรวจสอบ Logs ใน Render Dashboard
2. ดู `FIX_404_ERROR.md`
3. ดู `TROUBLESHOOTING_GUIDE.md`
4. ติดต่อทีม Support

---

**Last Updated:** February 26, 2025
**Version:** 1.0.0
