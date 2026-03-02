# 💾 ระบบบันทึกยอดเงิน - เน้นชื่อ LINE เป็นหลัก

## 📋 ภาพรวม

ระบบบันทึกยอดเงินตอนนี้จะ **เน้นตรวจชื่อ LINE เป็นหลัก** ในการค้นหาและบันทึกข้อมูล

---

## 🔄 ลำดับการค้นหา

### ✅ PRIMARY: ชื่อ LINE (เป็นหลัก)

```javascript
// ค้นหาจากชื่อ LINE ก่อน
for (let i = 1; i < rows.length; i++) {
  if (rows[i] && rows[i][1] === actualUserName) {
    playerRowIndex = i + 1;
    currentBalance = parseFloat(rows[i][4]) || 0;
    console.log(`✅ FOUND by LINE name at row ${playerRowIndex}`);
    break;
  }
}
```

**ตัวอย่าง:**
- ค้นหา: "สมชาย สายไหม"
- ผลลัพธ์: ✅ พบ (ใช้ข้อมูลนี้)

### ⚠️ BACKUP: User ID (ถ้าไม่พบชื่อ LINE)

```javascript
// ถ้าไม่พบจากชื่อ LINE ให้ค้นหาจาก User ID
if (!playerRowIndex) {
  for (let i = 1; i < rows.length; i++) {
    if (rows[i] && rows[i][0] === userId) {
      playerRowIndex = i + 1;
      currentBalance = parseFloat(rows[i][4]) || 0;
      console.log(`✅ FOUND by User ID at row ${playerRowIndex}`);
      break;
    }
  }
}
```

**ตัวอย่าง:**
- ค้นหา: "Uf08190b1da70f9ba810d424cf7d04366"
- ผลลัพธ์: ✅ พบ (ใช้ข้อมูลนี้)

---

## 📊 ตัวอย่างการบันทึก

### ตัวอย่าง 1: ผู้เล่นใหม่

```
ผู้ใช้ LINE: สมชาย สายไหม
User ID: Uf08190b1da70f9ba810d424cf7d04366
สลิป: 100 บาท

ขั้นตอน:
1. ตรวจสอบสลิป → ✅ ถูกต้อง
2. ดึงยอดเงินปัจจุบัน
   🔍 PRIMARY: ค้นหาชื่อ "สมชาย สายไหม" → ❌ ไม่พบ
   ⚠️  BACKUP: ค้นหา User ID → ❌ ไม่พบ
   → ยอดเงิน = 0 บาท (ผู้เล่นใหม่)
3. บันทึก Players Sheet:
   - ชื่อ LINE: สมชาย สายไหม (PRIMARY)
   - ยอดเงินปัจจุบัน: 100 บาท
   - รวมเงินฝากทั้งหมด: 100 บาท
4. บันทึก Transactions Sheet:
   - ชื่อ: สมชาย สายไหม
   - จำนวนเงิน: 100 บาท
```

### ตัวอย่าง 2: ผู้เล่นเก่า

```
ผู้ใช้ LINE: สมชาย สายไหม
User ID: Uf08190b1da70f9ba810d424cf7d04366
สลิป: 50 บาท
ยอดเงินปัจจุบัน: 100 บาท

ขั้นตอน:
1. ตรวจสอบสลิป → ✅ ถูกต้อง
2. ดึงยอดเงินปัจจุบัน
   🔍 PRIMARY: ค้นหาชื่อ "สมชาย สายไหม" → ✅ พบ
   → ยอดเงิน = 100 บาท
3. อัปเดต Players Sheet:
   - ชื่อ LINE: สมชาย สายไหม (PRIMARY)
   - ยอดเงินปัจจุบัน: 150 บาท (100 + 50)
   - รวมเงินฝากทั้งหมด: 150 บาท (100 + 50)
4. บันทึก Transactions Sheet:
   - ชื่อ: สมชาย สายไหม
   - จำนวนเงิน: 50 บาท
   - ยอดเงินก่อน: 100 บาท
   - ยอดเงินหลัง: 150 บาท
```

### ตัวอย่าง 3: ผู้เล่นเดียวกัน User ID ต่างกัน

```
ผู้ใช้ LINE: สมชาย สายไหม (ชื่อเดียวกัน)
User ID เก่า: Uf08190b1da70f9ba810d424cf7d04366
User ID ใหม่: Uf08190b1da70f9ba810d424cf7d04367
สลิป: 50 บาท
ยอดเงินปัจจุบัน: 100 บาท

ขั้นตอน:
1. ตรวจสอบสลิป → ✅ ถูกต้อง
2. ดึงยอดเงินปัจจุบัน
   🔍 PRIMARY: ค้นหาชื่อ "สมชาย สายไหม" → ✅ พบ
   → ยอดเงิน = 100 บาท (ใช้ข้อมูลเดิม)
3. อัปเดต Players Sheet:
   - ชื่อ LINE: สมชาย สายไหม (PRIMARY)
   - ยอดเงินปัจจุบัน: 150 บาท (100 + 50)
   - รวมเงินฝากทั้งหมด: 150 บาท (100 + 50)
   - User ID: Uf08190b1da70f9ba810d424cf7d04367 (อัปเดตเป็น User ID ใหม่)
4. บันทึก Transactions Sheet:
   - ชื่อ: สมชาย สายไหม
   - จำนวนเงิน: 50 บาท
```

---

## 🔍 ตัวอย่างบันทึก

### บันทึกการค้นหา

```
📝 _recordPlayerToSheetFromSlip called:
   userId: Uf08190b1da70f9ba810d424cf7d04366
   lineUserName: สมชาย สายไหม
   amount: 100

🔍 PRIMARY: Searching by LINE name: "สมชาย สายไหม"
✅ FOUND by LINE name at row 2: balance=0, deposits=0

📊 Current Balance: 0 บาท
📊 Total Deposits: 0 บาท

📝 CREATE: Creating new player: สมชาย สายไหม
✅ CREATE SUCCESS: สมชาย สายไหม | Balance: 100 บาท
```

### บันทึกการอัปเดต

```
📝 _recordPlayerToSheetFromSlip called:
   userId: Uf08190b1da70f9ba810d424cf7d04366
   lineUserName: สมชาย สายไหม
   amount: 50

🔍 PRIMARY: Searching by LINE name: "สมชาย สายไหม"
✅ FOUND by LINE name at row 2: balance=100, deposits=100

📊 Current Balance: 100 บาท
📊 Total Deposits: 100 บาท

📝 UPDATE: Updating player: สมชาย สายไหม (row 2)
✅ UPDATE SUCCESS: สมชาย สายไหม | Balance: 100 → 150 บาท
```

---

## 📊 Google Sheets Structure

### Players Sheet

| Column | ชื่อ | ตัวอย่าง | หมายเหตุ |
|--------|------|---------|---------|
| A | User ID | Uf08190b1da70f9ba810d424cf7d04366 | อัปเดตได้ |
| B | ชื่อ LINE | สมชาย สายไหม | ✅ PRIMARY KEY |
| C | Email | - | - |
| D | Phone | - | - |
| E | ยอดเงินปัจจุบัน | 150 | อัปเดตทุกครั้ง |
| F | รวมเงินฝากทั้งหมด | 150 | อัปเดตทุกครั้ง |
| G | รวมเงินถอนทั้งหมด | 0 | - |
| H | สถานะ | active | - |
| I | วันที่สร้าง | 28/02/2569 12:51:36 | - |
| J | วันที่อัปเดต | 28/02/2569 12:51:36 | อัปเดตทุกครั้ง |
| K | Access Token | 4T31zd9SH2ZeCnipxzAD9L74EHbQAmGK0aAxyoM9gdLerSl/... | - |

---

## ✅ ข้อดี

1. **ชื่อ LINE เป็นหลัก** - ค้นหาจากชื่อ LINE ก่อน
2. **User ID เป็น Backup** - ถ้าไม่พบชื่อ LINE ให้ค้นหาจาก User ID
3. **ยืดหยุ่น** - รองรับ User ID ที่เปลี่ยนแปลง
4. **ชัดเจน** - บันทึกแสดงว่าค้นหาจากไหน (PRIMARY/BACKUP)

---

## 🔄 การไหลของข้อมูล

```
ผู้ใช้ส่งสลิป
    ↓
ตรวจสอบสลิป
    ↓
Code 200000 หรือ 200200 (สลิปถูกต้อง)
    ↓
ดึงยอดเงินปัจจุบัน
    ├─ 🔍 PRIMARY: ค้นหาจากชื่อ LINE
    └─ ⚠️  BACKUP: ค้นหาจาก User ID (ถ้าไม่พบ)
    ↓
บันทึก/อัปเดต Players Sheet
    ├─ ชื่อ LINE (PRIMARY KEY)
    ├─ ยอดเงินปัจจุบัน
    ├─ รวมเงินฝากทั้งหมด
    └─ User ID (อัปเดตได้)
    ↓
บันทึก Transactions Sheet
    ├─ ชื่อ LINE
    ├─ จำนวนเงิน
    ├─ ยอดเงินก่อน/หลัง
    └─ Reference ID
    ↓
✅ บันทึกสำเร็จ
```

---

## 🐛 Troubleshooting

### ปัญหา: ไม่พบผู้เล่น

**วิธีแก้:**
1. ตรวจสอบว่าชื่อ LINE ตรงกัน (case-sensitive)
2. ตรวจสอบว่าไม่มีช่องว่างพิเศษ
3. ตรวจสอบบันทึก PRIMARY/BACKUP

### ปัญหา: ยอดเงินไม่ถูกต้อง

**วิธีแก้:**
1. ตรวจสอบว่าค้นหาจากชื่อ LINE ถูกต้อง
2. ตรวจสอบว่าคำนวณยอดเงินใหม่ถูกต้อง
3. ตรวจสอบบันทึก Transactions

---

## 📞 ติดต่อ

หากมีปัญหาหรือข้อเสนอแนะ โปรดติดต่อทีมพัฒนา
