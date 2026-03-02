# 🚀 Betting Round System - Quick Start Guide

## ⚡ 5 นาทีเริ่มต้น

### 1. ติดตั้ง Dependencies
```bash
npm install googleapis
```

### 2. ตั้งค่า .env
```bash
cat > .env << EOF
GOOGLE_SHEETS_ID=your_spreadsheet_id
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret
PORT=3000
EOF
```

### 3. วาง credentials.json
- ดาวน์โหลดจาก Google Cloud Console
- วางในโฟลเดอร์ root

### 4. ทดสอบระบบ
```bash
node test-betting-round.js
```

### 5. เริ่มใช้งาน
```bash
node index.js
```

---

## 📱 วิธีใช้งาน

### Admin Commands

| คำสั่ง | ตัวอย่าง | ผลลัพธ์ |
|--------|---------|--------|
| เปิดรอบ | `:เริ่ม ฟ้าหลังฝน` | เปิดรับการเล่น |
| ปิดรอบ | `:หยุด` | ปิดรับการเล่น |
| สรุปผล | `:สรุป ฟ้าหลังฝน 315` | คำนวณและแสดงผล |

### User Betting

| วิธี | ตัวอย่าง | หมายถึง |
|-----|---------|--------|
| วิธีที่ 1 | `ฟ้าหลังฝน ชล. 500` | เล่นบั้งไฟ "ฟ้าหลังฝน" ฝั่ง "ไล่" 500 บาท |
| วิธีที่ 2 | `0/3(300-330) ล. 500 ฟ้าหลังฝน` | เล่นบั้งไฟ "ฟ้าหลังฝน" ราคา 300-330 ฝั่ง "ไล่" 500 บาท |

---

## 🧪 ทดสอบด้วย cURL

### เปิดรอบ
```bash
curl -X POST http://localhost:3000/api/betting/admin/start \
  -H "Content-Type: application/json" \
  -d '{"slipName": "ฟ้าหลังฝน"}'
```

### ปิดรอบ
```bash
curl -X POST http://localhost:3000/api/betting/admin/stop
```

### สรุปผล
```bash
curl -X POST http://localhost:3000/api/betting/admin/calculate \
  -H "Content-Type: application/json" \
  -d '{"slipName": "ฟ้าหลังฝน", "score": 315}'
```

### ดึงข้อมูล
```bash
# สถานะ
curl http://localhost:3000/api/betting/status

# การเล่นทั้งหมด
curl http://localhost:3000/api/betting/transactions

# ยอดเงินทั้งหมด
curl http://localhost:3000/api/betting/balances
```

---

## 📊 ตัวอย่างการทำงาน

```
1️⃣ Admin: :เริ่ม ฟ้าหลังฝน
   Bot: ✅ เปิดรอบการเล่น: ฟ้าหลังฝน

2️⃣ Alice: ฟ้าหลังฝน ชล. 500
   Bot: ✅ บันทึกการเล่นสำเร็จ

3️⃣ Bob: ฟ้าหลังฝน ชถ. 500
   Bot: ✅ บันทึกการเล่นสำเร็จ

4️⃣ Admin: :หยุด
   Bot: รอบนี้ปิดการทายแล้วคะ/ครับ

5️⃣ Admin: :สรุป ฟ้าหลังฝน 315
   Bot: 📊 สรุปผลการเล่น
        🏆 ชนะ: Alice +500 บาท
        ❌ แพ้: Bob -500 บาท
```

---

## 🔧 Troubleshooting

### ❌ "credentials.json not found"
```bash
# ตรวจสอบว่าไฟล์อยู่ในโฟลเดอร์ root
ls -la credentials.json
```

### ❌ "GOOGLE_SHEETS_ID is not set"
```bash
# ตรวจสอบ .env
cat .env
```

### ❌ "Invalid message format"
```
✓ ถูก: ฟ้าหลังฝน ชล. 500
✗ ผิด: ฟ้าหลังฝนชล.500 (ลืมเว้นวรรค)
```

---

## 📚 เอกสารเพิ่มเติม

- 📖 [BETTING_ROUND_SYSTEM.md](./BETTING_ROUND_SYSTEM.md) - เอกสารระบบ
- 🔧 [BETTING_ROUND_SETUP.md](./BETTING_ROUND_SETUP.md) - คู่มือการตั้งค่า
- ✅ [BETTING_SETUP_CHECKLIST.md](./BETTING_SETUP_CHECKLIST.md) - Checklist
- 📊 [BETTING_SYSTEM_SUMMARY.md](./BETTING_SYSTEM_SUMMARY.md) - สรุประบบ

---

## 🎯 Next Steps

1. ✅ ตั้งค่า Google Sheets
2. ✅ ตั้งค่า LINE Bot
3. ✅ ทดสอบระบบ
4. ✅ Deploy ไปยัง Production

---

**Happy Betting! 🎰**
