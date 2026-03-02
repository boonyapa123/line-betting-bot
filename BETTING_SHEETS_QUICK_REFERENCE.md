# 📊 Betting System - Google Sheets Quick Reference

## ✅ ตั้งค่าแล้ว

```
✅ Spreadsheet ID: 1rRVKOpYZbOFpRiZ2ym5b5AFcB4e_swQe8y9y9UlhDAQ
✅ Worksheet Name: Bets
✅ Service Account Key: credentials.json
```

---

## 📋 ชีทที่ใช้

### 1. **Bets** (ชีทหลัก)
บันทึกการเล่นทั้งหมด

| Column | ข้อมูล |
|--------|--------|
| A | Timestamp |
| B | UserID |
| C | DisplayName |
| D | Method (1/2) |
| E | Price (วิธีที่ 2 เท่านั้น) |
| F | Side (ชล/ชถ/ล/ย) |
| G | Amount |
| H | SlipName |
| I | Status |

### 2. **RoundState**
สถานะรอบการเล่น

| Column | ข้อมูล |
|--------|--------|
| A | State (OPEN/CLOSED/CALCULATING) |
| B | RoundID |
| C | StartTime |
| D | SlipName |

### 3. **UsersBalance**
ยอดเงินคงเหลือ

| Column | ข้อมูล |
|--------|--------|
| A | UserID |
| B | DisplayName |
| C | Balance |

---

## 🔄 ขั้นตอนการบันทึก

```
User ส่งข้อความ
    ↓
Parser ตรวจสอบรูปแบบ
    ↓
Validator ตรวจสอบข้อมูล
    ↓
บันทึกลงชีท "Bets"
    ↓
ส่งข้อความยืนยัน
```

---

## 📝 ตัวอย่างข้อมูล

### วิธีที่ 1
```
User: ฟ้าหลังฝน ชล. 500

บันทึก:
2024-03-02T10:30:00Z | U001 | Alice | 1 | | ชล | 500 | ฟ้าหลังฝน | OPEN
```

### วิธีที่ 2
```
User: 0/3(300-330) ล. 500 ฟ้าหลังฝน

บันทึก:
2024-03-02T10:31:00Z | U002 | Bob | 2 | 0/3(300-330) | ล | 500 | ฟ้าหลังฝน | OPEN
```

---

## 🎯 Admin Commands

| คำสั่ง | ผลลัพธ์ |
|--------|--------|
| `:เริ่ม ฟ้าหลังฝน` | เปิดรอบ → บันทึก RoundState |
| `:หยุด` | ปิดรอบ → อัปเดต RoundState |
| `:สรุป ฟ้าหลังฝน 315` | คำนวณผล → อัปเดต UsersBalance → ล้าง Bets |

---

## 🔍 ตรวจสอบข้อมูล

### ตรวจสอบการเล่น
1. ไปที่ชีท "Bets"
2. ดูแถวล่าสุด
3. ตรวจสอบ Timestamp, UserID, Amount

### ตรวจสอบยอดเงิน
1. ไปที่ชีท "UsersBalance"
2. ดูยอดเงินของแต่ละ User
3. ตรวจสอบว่าถูกต้องหรือไม่

### ตรวจสอบสถานะรอบ
1. ไปที่ชีท "RoundState"
2. ดูแถวแรก
3. ตรวจสอบ State (OPEN/CLOSED/CALCULATING)

---

## 🧪 ทดสอบ

### ทดสอบการบันทึก
```bash
# 1. เปิดรอบ
curl -X POST http://localhost:3001/api/betting/admin/start \
  -H "Content-Type: application/json" \
  -d '{"slipName": "ฟ้าหลังฝน"}'

# 2. ตรวจสอบชีท "RoundState"
# ควรเห็น: OPEN | ROUND_xxx | 2024-03-02T... | ฟ้าหลังฝน

# 3. ปิดรอบ
curl -X POST http://localhost:3001/api/betting/admin/stop

# 4. ตรวจสอบชีท "RoundState"
# ควรเห็น: CLOSED
```

---

## 📊 ข้อมูลที่บันทึก

### ต่อการเล่น
- ✅ Timestamp (เวลาที่เล่น)
- ✅ User ID (รหัส User)
- ✅ Display Name (ชื่อ User)
- ✅ Method (วิธีที่ 1 หรือ 2)
- ✅ Price (ราคา - วิธีที่ 2 เท่านั้น)
- ✅ Side (ฝั่ง - ชล/ชถ/ล/ย)
- ✅ Amount (จำนวนเงิน)
- ✅ Slip Name (ชื่อบั้งไฟ)
- ✅ Status (สถานะ - OPEN/MATCHED)

### ต่อรอบ
- ✅ State (OPEN/CLOSED/CALCULATING)
- ✅ Round ID (รหัสรอบ)
- ✅ Start Time (เวลาเริ่มรอบ)
- ✅ Slip Name (ชื่อบั้งไฟ)

### ต่อ User
- ✅ User ID (รหัส User)
- ✅ Display Name (ชื่อ User)
- ✅ Balance (ยอดเงินคงเหลือ)

---

## 🔐 Security

- ✅ ไม่ share credentials.json
- ✅ ใช้ Service Account
- ✅ ตรวจสอบ permissions
- ✅ Backup ข้อมูลเป็นประจำ

---

## 🚀 Ready to Use

```
✅ Spreadsheet: 1rRVKOpYZbOFpRiZ2ym5b5AFcB4e_swQe8y9y9UlhDAQ
✅ Worksheet: Bets
✅ Service Account: credentials.json
✅ Status: READY
```

ระบบพร้อมบันทึกการเล่นลงชีท "Bets" แล้ว! 🎉

---

**Last Updated:** 2024-03-02
