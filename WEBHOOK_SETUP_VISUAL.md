# 📸 การตั้งค่า Webhook URL - Visual Guide

## 🎯 Webhook URL ที่ต้องใส่

```
https://your-domain.com/webhook/line-slip-verification
```

---

## 📍 ตำแหน่งที่ต้องใส่ใน LINE Developers Console

### Step 1: เปิด LINE Developers Console

```
https://developers.line.biz/console/
```

### Step 2: เลือก Provider และ Channel

```
┌─────────────────────────────────────────┐
│  LINE Developers Console                │
├─────────────────────────────────────────┤
│                                         │
│  Providers                              │
│  ├─ My Provider                         │
│  │  ├─ Channel 1                        │
│  │  ├─ Channel 2 (LINE OA) ← เลือกนี่  │
│  │  └─ Channel 3                        │
│  └─ Other Provider                      │
│                                         │
└─────────────────────────────────────────┘
```

### Step 3: ไปที่ Messaging API

```
┌─────────────────────────────────────────┐
│  Channel Settings                       │
├─────────────────────────────────────────┤
│                                         │
│  Menu:                                  │
│  ├─ Basic Settings                      │
│  ├─ Messaging API ← คลิกที่นี่          │
│  ├─ Rich Menu                           │
│  └─ Other Settings                      │
│                                         │
└─────────────────────────────────────────┘
```

### Step 4: ตั้งค่า Webhook URL

```
┌─────────────────────────────────────────────────────────────┐
│  Messaging API Settings                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Webhook URL                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ https://your-domain.com/webhook/line-slip-verification
│  └─────────────────────────────────────────────────────┘   │
│  [Edit] [Verify]                                            │
│                                                             │
│  Use webhook                                                │
│  ☑ ON (เปิดใช้งาน)                                         │
│                                                             │
│  Auto-reply                                                 │
│  ☐ OFF (ปิดใช้งาน)                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 วิธีการหา Domain ของคุณ

### ถ้า Server อยู่ที่ Heroku

```
┌─────────────────────────────────────────┐
│  Heroku Dashboard                       │
├─────────────────────────────────────────┤
│                                         │
│  Apps                                   │
│  ├─ my-slip-bot ← เลือกนี่              │
│  │  ├─ App name: my-slip-bot            │
│  │  ├─ Domain: my-slip-bot.herokuapp.com│
│  │  └─ URL: https://my-slip-bot...      │
│  └─ Other App                           │
│                                         │
│  Webhook URL:                           │
│  https://my-slip-bot.herokuapp.com/webhook/line-slip-verification
│                                         │
└─────────────────────────────────────────┘
```

### ถ้า Server อยู่ที่ Render

```
┌─────────────────────────────────────────┐
│  Render Dashboard                       │
├─────────────────────────────────────────┤
│                                         │
│  Services                               │
│  ├─ slip-verification ← เลือกนี่        │
│  │  ├─ Service name: slip-verification │
│  │  ├─ Domain: slip-verification...    │
│  │  └─ URL: https://slip-verification..│
│  └─ Other Service                       │
│                                         │
│  Webhook URL:                           │
│  https://slip-verification.onrender.com/webhook/line-slip-verification
│                                         │
└─────────────────────────────────────────┘
```

### ถ้า Server อยู่ที่ Railway

```
┌─────────────────────────────────────────┐
│  Railway Dashboard                      │
├─────────────────────────────────────────┤
│                                         │
│  Projects                               │
│  ├─ slip-verification ← เลือกนี่        │
│  │  ├─ Project name: slip-verification │
│  │  ├─ Domain: slip-verification...    │
│  │  └─ URL: https://slip-verification..│
│  └─ Other Project                       │
│                                         │
│  Webhook URL:                           │
│  https://slip-verification.railway.app/webhook/line-slip-verification
│                                         │
└─────────────────────────────────────────┘
```

---

## 📋 ขั้นตอนการตั้งค่า (Visual)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. หา Domain ของคุณ                                        │
│     ↓                                                       │
│     ตัวอย่าง: https://my-app.herokuapp.com                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  2. สร้าง Webhook URL                                       │
│     ↓                                                       │
│     https://my-app.herokuapp.com/webhook/line-slip-verification
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  3. ไปที่ LINE Developers Console                           │
│     ↓                                                       │
│     https://developers.line.biz/console/                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  4. เลือก Channel (LINE OA)                                 │
│     ↓                                                       │
│     Messaging API                                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  5. ใส่ Webhook URL                                         │
│     ↓                                                       │
│     ┌─────────────────────────────────────────────────┐    │
│     │ https://my-app.herokuapp.com/webhook/line-slip-verification
│     └─────────────────────────────────────────────────┘    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  6. เปิดใช้งาน Webhook                                      │
│     ↓                                                       │
│     ☑ Use webhook (ON)                                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  7. ตรวจสอบว่าตั้งค่าถูกต้อง                               │
│     ↓                                                       │
│     ✅ Webhook URL verified                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 ทดสอบ Webhook URL

### ทดสอบด้วย curl

```bash
# ทดสอบว่า Server ตอบสนอง
curl -X POST https://your-domain.com/webhook/line-slip-verification \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'

# ควรได้ response:
# {"message":"OK"}
# HTTP Status: 200
```

### ทดสอบส่งรูปภาพจาก LINE OA

```
1. เพิ่ม LINE OA เป็น friend
   ↓
2. ส่งรูปภาพสลิป
   ↓
3. ตรวจสอบว่าได้รับข้อความตอบกลับ
   ↓
✅ ตั้งค่าถูกต้อง
```

---

## 📊 ตัวอย่างการตั้งค่า

### ตัวอย่างที่ 1: Heroku

```
┌─────────────────────────────────────────────────────────────┐
│  Heroku                                                     │
├─────────────────────────────────────────────────────────────┤
│  App name: slip-verification-bot                            │
│  Domain: slip-verification-bot.herokuapp.com                │
│                                                             │
│  Webhook URL:                                               │
│  https://slip-verification-bot.herokuapp.com/webhook/line-slip-verification
│                                                             │
│  ใส่ใน LINE Developers Console ✅                          │
└─────────────────────────────────────────────────────────────┘
```

### ตัวอย่างที่ 2: Render

```
┌─────────────────────────────────────────────────────────────┐
│  Render                                                     │
├─────────────────────────────────────────────────────────────┤
│  Service name: slip-verification                            │
│  Domain: slip-verification.onrender.com                     │
│                                                             │
│  Webhook URL:                                               │
│  https://slip-verification.onrender.com/webhook/line-slip-verification
│                                                             │
│  ใส่ใน LINE Developers Console ✅                          │
└─────────────────────────────────────────────────────────────┘
```

### ตัวอย่างที่ 3: Railway

```
┌─────────────────────────────────────────────────────────────┐
│  Railway                                                    │
├─────────────────────────────────────────────────────────────┤
│  Project name: slip-verification                            │
│  Domain: slip-verification.railway.app                      │
│                                                             │
│  Webhook URL:                                               │
│  https://slip-verification.railway.app/webhook/line-slip-verification
│                                                             │
│  ใส่ใน LINE Developers Console ✅                          │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist

```
┌─────────────────────────────────────────────────────────────┐
│  Webhook URL Setup Checklist                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ☐ หา Domain ของคุณ                                        │
│  ☐ สร้าง Webhook URL                                       │
│  ☐ ไปที่ LINE Developers Console                           │
│  ☐ เลือก Channel (LINE OA)                                 │
│  ☐ ไปที่ Messaging API                                     │
│  ☐ ใส่ Webhook URL                                         │
│  ☐ เปิดใช้งาน Webhook (Use webhook: ON)                   │
│  ☐ ตรวจสอบว่า Webhook URL ถูกต้อง                         │
│  ☐ ทดสอบส่งรูปภาพจาก LINE OA                              │
│  ☐ ได้รับข้อความตอบกลับ ✅                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### ปัญหา: Webhook URL verification failed

```
┌─────────────────────────────────────────────────────────────┐
│  ❌ Webhook URL verification failed                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  สาเหตุ:                                                    │
│  1. URL ไม่ถูกต้อง                                          │
│  2. Server ไม่ online                                       │
│  3. Server ไม่ตอบสนอง                                      │
│                                                             │
│  วิธีแก้:                                                   │
│  1. ตรวจสอบ URL ว่าถูกต้อง                                 │
│  2. ตรวจสอบว่า Server กำลัง running                        │
│  3. ทดสอบด้วย curl                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### ปัญหา: ไม่ได้รับ Webhook Event

```
┌─────────────────────────────────────────────────────────────┐
│  ❌ ไม่ได้รับ Webhook Event                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  สาเหตุ:                                                    │
│  1. Webhook URL ไม่ถูกต้อง                                  │
│  2. "Use webhook" ไม่เปิดใช้งาน                            │
│                                                             │
│  วิธีแก้:                                                   │
│  1. ตรวจสอบ Webhook URL                                    │
│  2. ตรวจสอบว่า "Use webhook" เปิดใช้งาน                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📞 ติดต่อสอบถาม

หากยังมีปัญหา:
1. ดู `LINE_WEBHOOK_SETUP.md`
2. ดู `FIND_YOUR_DOMAIN.md`
3. ดู `TROUBLESHOOTING_GUIDE.md`
4. ติดต่อทีม Support

---

**Last Updated:** February 26, 2025
**Version:** 1.0.0
