# 🚀 ngrok Setup - Local Testing

## ✅ ngrok ทำงานแล้ว!

**Webhook URL:**
```
https://ef150da7608c.ngrok-free.app/webhook
```

## 📋 ขั้นตอนถัดไป

### 1. ตั้งค่า Webhook URL ใน LINE Bot Console

1. ไปที่ https://developers.line.biz/console/
2. เลือก Channel
3. ไปที่ **Messaging API** tab
4. หา **Webhook URL** section
5. ลบ URL เก่า (ถ้ามี)
6. ใส่ URL ใหม่:
   ```
   https://ef150da7608c.ngrok-free.app/webhook
   ```
7. คลิก **Verify** เพื่อทดสอบ
8. เปิด **Use webhook** toggle

### 2. เปิด Terminal ใหม่ และ start server

```bash
npm start
```

**ผลลัพธ์ที่ควรเห็น:**
```
🔧 Initializing Google Sheets...
✅ Google Sheets access verified
📝 Clearing old headers and creating new ones...
✅ Headers created
Google Sheets initialized
LINE OA Chat Tracker listening on port 3001
```

### 3. ส่งข้อความทดสอบ

1. เพิ่ม LINE Bot เข้ากลุ่มแชท
2. ส่งข้อความแรก: `"ชล 500 มะปราง"`
3. ส่งข้อความตอบกลับ: `"ถ 500 อ้วน"` (ใช้ Reply feature)

### 4. ตรวจสอบ Logs

ดูที่ Terminal ที่เปิด server ว่า:
- ✅ Webhook ได้รับข้อมูล
- ✅ Pair ถูกตรวจจับ
- ✅ Google Sheets บันทึกข้อมูล

### 5. ตรวจสอบ Google Sheets

1. ไปที่ https://sheets.google.com
2. เปิด Sheet ชื่อ "Bets"
3. ดูว่าข้อมูลถูกบันทึกหรือไม่

---

## 🔍 ตรวจสอบ ngrok

### ดูสถานะ ngrok
```bash
curl http://localhost:4040/api/tunnels
```

### ดูเหมือนว่า Logs ของ ngrok
```
ngrok                                                       (Ctrl+C to quit)

Session Status                online
Account                       <your-account>
Version                        3.x.x
Region                         us (United States)
Forwarding                     https://ef150da7608c.ngrok-free.app -> http://localhost:3001
Connections                   0/20
```

---

## ⚠️ สำคัญ

- **ngrok URL เปลี่ยนทุกครั้ง** ที่เปิด (ถ้าใช้ free plan)
- ต้อง **อัปเดต Webhook URL** ใน LINE Bot Console ทุกครั้ง
- ถ้าต้องการ URL เดิม ให้ upgrade ngrok เป็น paid plan

---

## 🎯 ขั้นตอนเร็ว

1. ✅ ngrok ทำงาน: `https://ef150da7608c.ngrok-free.app/webhook`
2. ตั้งค่า Webhook URL ใน LINE Bot Console
3. เปิด Terminal ใหม่: `npm start`
4. ส่งข้อความทดสอบ
5. ดูที่ logs
6. ตรวจสอบ Google Sheets

---

**พร้อมทดสอบแล้ว!** ✅
