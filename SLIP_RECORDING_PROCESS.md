# 💾 ระบบบันทึกยอดเงินเมื่อสลิปถูกต้อง

## 📋 ภาพรวม

เมื่อสลิปตรวจสอบสำเร็จ ระบบจะบันทึกข้อมูลลง Google Sheets ใน 2 ชีท:

1. **Transactions Sheet** - บันทึกรายการเงิน (ประวัติการฝาก)
2. **Players Sheet** - อัปเดตยอดเงินของผู้เล่น

---

## 🔄 ขั้นตอนการบันทึก

### ขั้นตอนที่ 1: ตรวจสอบสลิป

```
ผู้ใช้ส่งสลิป
    ↓
ระบบตรวจสอบสลิป
    ↓
ได้รับ Response Code: 200000 หรือ 200200 (สลิปถูกต้อง)
    ↓
ดำเนินการบันทึก
```

### ขั้นตอนที่ 2: ดึงยอดเงินปัจจุบัน

```javascript
const currentBalance = await getPlayerBalance(userId, lineUserName);
console.log(`Current balance: ${currentBalance} บาท`);
```

**วิธีค้นหา:**
1. ค้นหาจากชื่อ LINE (primary)
2. ค้นหาจาก Linked IDs (backup)
3. ค้นหาจาก User ID (fallback)

### ขั้นตอนที่ 3: บันทึกลง Transactions Sheet

```javascript
await _recordTransactionToSheetFromSlip(
  googleAuth,
  GOOGLE_SHEET_ID,
  userId,
  lineUserName,
  accessToken,
  slipData,
  currentBalance
);
```

**ข้อมูลที่บันทึก:**
- วันที่ (Date)
- ชื่อ LINE (Line User Name)
- ประเภท (Type) = 'deposit'
- จำนวนเงิน (Amount)
- Reference ID
- สถานะ (Status) = 'verified'
- หมายเหตุ (Remark)
- ยอดเงินก่อน (Balance Before)
- ยอดเงินหลัง (Balance After)
- เวลา (Time)
- Access Token

### ขั้นตอนที่ 4: อัปเดต Players Sheet

```javascript
await _recordPlayerToSheetFromSlip(
  googleAuth,
  GOOGLE_SHEET_ID,
  userId,
  lineUserName,
  accessToken,
  slipData.amount
);
```

**ข้อมูลที่อัปเดต:**
- User ID
- ชื่อ LINE
- Linked IDs (JSON)
- ยอดเงินปัจจุบัน (Current Balance) = ยอดเงินเก่า + จำนวนเงิน
- รวมเงินฝากทั้งหมด (Total Deposits) = รวมเงินฝากเก่า + จำนวนเงิน
- สถานะ (Status) = 'active'
- วันที่สร้าง (Created Date)
- วันที่อัปเดต (Updated Date)
- Access Token

---

## 📊 ตัวอย่างการบันทึก

### ตัวอย่าง 1: ผู้เล่นใหม่

```
ผู้ใช้: สมชาย สายไหม (User ID: Uf08190b1da70f9ba810d424cf7d04366)
สลิป: 100 บาท

ขั้นตอน:
1. ตรวจสอบสลิป → ✅ ถูกต้อง
2. ดึงยอดเงินปัจจุบัน → 0 บาท (ผู้เล่นใหม่)
3. บันทึก Transactions:
   - วันที่: 28/02/2569
   - ชื่อ: สมชาย สายไหม
   - ประเภท: deposit
   - จำนวนเงิน: 100 บาท
   - ยอดเงินก่อน: 0 บาท
   - ยอดเงินหลัง: 100 บาท
4. อัปเดต Players:
   - ชื่อ: สมชาย สายไหม
   - ยอดเงินปัจจุบัน: 100 บาท
   - รวมเงินฝากทั้งหมด: 100 บาท
   - สถานะ: active
```

### ตัวอย่าง 2: ผู้เล่นเก่า

```
ผู้ใช้: สมชาย สายไหม (User ID: Uf08190b1da70f9ba810d424cf7d04366)
สลิป: 50 บาท
ยอดเงินปัจจุบัน: 100 บาท

ขั้นตอน:
1. ตรวจสอบสลิป → ✅ ถูกต้อง
2. ดึงยอดเงินปัจจุบัน → 100 บาท
3. บันทึก Transactions:
   - วันที่: 28/02/2569
   - ชื่อ: สมชาย สายไหม
   - ประเภท: deposit
   - จำนวนเงิน: 50 บาท
   - ยอดเงินก่อน: 100 บาท
   - ยอดเงินหลัง: 150 บาท
4. อัปเดต Players:
   - ชื่อ: สมชาย สายไหม
   - ยอดเงินปัจจุบัน: 150 บาท (100 + 50)
   - รวมเงินฝากทั้งหมด: 150 บาท (100 + 50)
   - สถานะ: active
```

---

## 📝 Google Sheets Structure

### Transactions Sheet

| Column | ชื่อ | ตัวอย่าง |
|--------|------|---------|
| A | วันที่ | 28/02/2569 |
| B | ชื่อ LINE | สมชาย สายไหม |
| C | ประเภท | deposit |
| D | จำนวนเงิน | 100 |
| E | Reference ID | 92887bd5-60d3-4744-9a98-b8574eaxxxxx-xx |
| F | หมายเหตุ | - |
| G | สถานะ | verified |
| H | รายละเอียด | Slip verified from LINE OA |
| I | ยอดเงินก่อน | 0 |
| J | ยอดเงินหลัง | 100 |
| K | เวลา | 28/02/2569 12:51:36 |
| L | Access Token | 4T31zd9SH2ZeCnipxzAD9L74EHbQAmGK0aAxyoM9gdLerSl/... |

### Players Sheet

| Column | ชื่อ | ตัวอย่าง |
|--------|------|---------|
| A | User ID | Uf08190b1da70f9ba810d424cf7d04366 |
| B | ชื่อ LINE | สมชาย สายไหม |
| C | Linked IDs | ["Uf08190b1da70f9ba810d424cf7d04366"] |
| D | Email | - |
| E | ยอดเงินปัจจุบัน | 100 |
| F | รวมเงินฝากทั้งหมด | 100 |
| G | รวมเงินถอนทั้งหมด | 0 |
| H | สถานะ | active |
| I | วันที่สร้าง | 28/02/2569 12:51:36 |
| J | วันที่อัปเดต | 28/02/2569 12:51:36 |
| K | Access Token | 4T31zd9SH2ZeCnipxzAD9L74EHbQAmGK0aAxyoM9gdLerSl/... |

---

## 🔍 วิธีค้นหาผู้เล่น

### 1. ค้นหาจากชื่อ LINE (Primary)

```javascript
for (let i = 1; i < rows.length; i++) {
  if (rows[i] && rows[i][1] === lineUserName) {
    // พบผู้เล่น
    playerRowIndex = i + 1;
    currentBalance = parseFloat(rows[i][4]) || 0;
    break;
  }
}
```

### 2. ค้นหาจาก Linked IDs (Backup)

```javascript
for (let i = 1; i < rows.length; i++) {
  if (rows[i] && rows[i][2]) {
    try {
      const linkedIds = JSON.parse(rows[i][2]);
      if (Array.isArray(linkedIds) && linkedIds.includes(userId)) {
        // พบผู้เล่น
        playerRowIndex = i + 1;
        currentBalance = parseFloat(rows[i][4]) || 0;
        break;
      }
    } catch (e) {
      // ข้ามไป
    }
  }
}
```

### 3. ค้นหาจาก User ID (Fallback)

```javascript
for (let i = 1; i < rows.length; i++) {
  if (rows[i] && rows[i][0] === userId) {
    // พบผู้เล่น
    playerRowIndex = i + 1;
    currentBalance = parseFloat(rows[i][4]) || 0;
    break;
  }
}
```

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
    ├─ ค้นหาจากชื่อ LINE
    ├─ ค้นหาจาก Linked IDs
    └─ ค้นหาจาก User ID
    ↓
บันทึก Transactions Sheet
    ├─ วันที่
    ├─ ชื่อ LINE
    ├─ ประเภท: deposit
    ├─ จำนวนเงิน
    ├─ Reference ID
    ├─ สถานะ: verified
    ├─ ยอดเงินก่อน
    ├─ ยอดเงินหลัง
    └─ เวลา
    ↓
อัปเดต Players Sheet
    ├─ ยอดเงินปัจจุบัน = ยอดเงินเก่า + จำนวนเงิน
    ├─ รวมเงินฝากทั้งหมด = รวมเงินฝากเก่า + จำนวนเงิน
    ├─ สถานะ: active
    └─ วันที่อัปเดต
    ↓
✅ บันทึกสำเร็จ
```

---

## 📊 ตัวอย่างบันทึก

```
📝 _recordPlayerToSheetFromSlip called:
   userId: Uf08190b1da70f9ba810d424cf7d04366
   lineUserName: สมชาย สายไหม
   amount: 100

🔍 Searching by LINE name: "สมชาย สายไหม"
✅ Found player by name at row 2: balance=0, deposits=0

📝 อัปเดตผู้เล่น: สมชาย สายไหม (row 2)
✅ อัปเดตสำเร็จ: 100 บาท (ชื่อ: สมชาย สายไหม)

📝 Recording to Transactions sheet...
   💰 Balance Before: 0
   💰 Amount: 100
   💰 Balance After: 100
✅ บันทึกรายการเงินสำเร็จ
```

---

## 🐛 Troubleshooting

### ปัญหา: ไม่พบผู้เล่น

**วิธีแก้:**
1. ตรวจสอบว่าชื่อ LINE ตรงกัน (case-sensitive)
2. ตรวจสอบว่า Linked IDs ถูกต้อง
3. ตรวจสอบว่า User ID ถูกต้อง

### ปัญหา: ยอดเงินไม่ถูกต้อง

**วิธีแก้:**
1. ตรวจสอบว่าดึงยอดเงินปัจจุบันถูกต้อง
2. ตรวจสอบว่าคำนวณยอดเงินใหม่ถูกต้อง
3. ตรวจสอบบันทึก Transactions

### ปัญหา: บันทึกไม่สำเร็จ

**วิธีแก้:**
1. ตรวจสอบว่า Google Sheets ID ถูกต้อง
2. ตรวจสอบว่า Google Auth ทำงานปกติ
3. ตรวจสอบบันทึก error message

---

## 📞 ติดต่อ

หากมีปัญหาหรือข้อเสนอแนะ โปรดติดต่อทีมพัฒนา
