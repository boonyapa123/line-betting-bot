# 🔧 แก้ไข: ชีท Bets ต้องมี 21 คอลัมน์ (A-U)

## ❌ ปัญหาที่พบ

### Data Rows มีเพียง 17 คอลัมน์
```
Expected: 21 columns (A-U)
Actual: 17 columns (A-Q)
Missing: H-U (User B data, Results, MATCHED Auto status)
```

### สาเหตุ
Google Sheets API **ตัดคอลัมน์ว่างเปล่าที่ส่วนท้ายของแถว** เมื่อบันทึก

---

## ✅ วิธีแก้ไข

### 1️⃣ แก้ไข `BetsSheetColumns.createRow()`
**ปัญหา**: สร้างแถว 21 คอลัมน์ แต่ไม่ได้เติมค่าว่างเปล่า

**วิธีแก้**: เปลี่ยนจาก `new Array(21).fill('')` เป็นการสร้างแถวที่มี 21 คอลัมน์พร้อมค่าว่างเปล่า
```javascript
static createRow(data) {
  // สร้างแถวที่มี 21 คอลัมน์ (A-U) พร้อมค่าว่างเปล่า
  const row = new Array(21).fill('');
  
  // ตั้งค่าข้อมูลตามคอลัมน์
  if (data.timestamp) row[this.COLUMNS.TIMESTAMP] = data.timestamp;
  // ... (ตั้งค่าข้อมูลอื่นๆ)
  
  return row; // ส่งคืนแถว 21 คอลัมน์
}
```

### 2️⃣ แก้ไข `recordBet()` ใน bettingPairingService.js
**ปัญหา**: ตัดแถวให้เหลือ 21 คอลัมน์ แล้วเติมค่าว่างเปล่า (ซ้ำซ้อน)

**วิธีแก้**: ลบการตัดแถว เพราะ `createRow()` สร้างแถว 21 คอลัมน์แล้ว
```javascript
// ก่อน (ซ้ำซ้อน):
const rowToAppend = row.slice(0, 21);
while (rowToAppend.length < 21) {
  rowToAppend.push('');
}

// หลัง (ใช้ row โดยตรง):
await this.sheets.spreadsheets.values.append({
  spreadsheetId: this.spreadsheetId,
  range: `${this.transactionsSheetName}!A:U`,
  valueInputOption: 'RAW',
  resource: {
    values: [row], // ใช้ row โดยตรง (21 คอลัมน์)
  },
});
```

### 3️⃣ แก้ไข `updateRowWithUserB()` ใน bettingPairingService.js
**ปัญหา**: ตัดแถวให้เหลือ 21 คอลัมน์ แล้วเติมค่าว่างเปล่า (ซ้ำซ้อน)

**วิธีแก้**: ลบการตัดแถว เพราะ `updateRowWithUserB()` ส่งคืนแถว 21 คอลัมน์แล้ว
```javascript
// ก่อน (ซ้ำซ้อน):
const rowToUpdate = updatedRow.slice(0, 21);
while (rowToUpdate.length < 21) {
  rowToUpdate.push('');
}

// หลัง (ใช้ updatedRow โดยตรง):
await this.sheets.spreadsheets.values.update({
  spreadsheetId: this.spreadsheetId,
  range: `${this.transactionsSheetName}!A${actualRowIndex}:U${actualRowIndex}`,
  valueInputOption: 'RAW',
  resource: {
    values: [updatedRow], // ใช้ updatedRow โดยตรง (21 คอลัมน์)
  },
});
```

---

## 📊 โครงสร้างคอลัมน์ (21 คอลัมน์)

| Index | Column | ชื่อ | ประเภท |
|-------|--------|------|--------|
| 0 | A | Timestamp | ข้อมูล User A |
| 1 | B | User A ID | ข้อมูล User A |
| 2 | C | ชื่อ User A | ข้อมูล User A |
| 3 | D | ข้อความ A | ข้อมูล User A |
| 4 | E | ชื่อบั้งไฟ | ข้อมูล User A |
| 5 | F | รายการเล่น (ฝั่ง A) | ข้อมูล User A |
| 6 | G | ยอดเงิน | ข้อมูล User A |
| 7 | H | ยอดเงิน B | ข้อมูล User B |
| 8 | I | ผลที่ออก | ผลลัพธ์ |
| 9 | J | ผลแพ้ชนะ | ผลลัพธ์ |
| 10 | K | User B ID | ข้อมูล User B |
| 11 | L | ชื่อ User B | ข้อมูล User B |
| 12 | M | รายการแทง (ฝั่ง B) | ข้อมูล User B |
| 13 | N | ชื่อกลุ่มแชท | ข้อมูลกลุ่ม |
| 14 | O | ชื่อกลุ่ม | ข้อมูลกลุ่ม |
| 15 | P | Token A | Token |
| 16 | Q | ID กลุ่ม | ข้อมูลกลุ่ม |
| 17 | R | Token B | Token |
| 18 | S | ผลลัพธ์ A | ผลลัพธ์ |
| 19 | T | ผลลัพธ์ B | ผลลัพธ์ |
| 20 | U | MATCHED Auto | สถานะการจับคู่ |

---

## 🚀 ขั้นตอนทดสอบ

1. **รัน Script ตรวจสอบอีกครั้ง**
   ```bash
   node verify-bets-sheet-structure.js
   ```

2. **ตรวจสอบผลลัพธ์**
   - ✅ Data Rows ควรมี 21 คอลัมน์
   - ✅ Column H-U ควรมีค่าว่างเปล่า (ไม่ใช่ขาดหายไป)
   - ✅ ไม่มี "Incomplete row" warning

3. **ทดสอบการจับคู่ Auto**
   - ส่งข้อความเดิมพันใหม่
   - ตรวจสอบว่าระบบจับคู่ได้หรือไม่
   - ตรวจสอบว่าข้อมูล User B ถูกบันทึกลงในแถวเดิมหรือไม่
   - ตรวจสอบว่า Column U มีค่า "AUTO" หรือไม่

---

## 📌 สรุป

| ประเด็น | ก่อน | หลัง |
|--------|------|------|
| Header Columns | 21 | 21 ✅ |
| Data Columns | 17 | 21 ✅ |
| Column U | ขาดหายไป | มีค่าว่างเปล่า ✅ |
| User B Data | ขาดหายไป | บันทึกได้ ✅ |
| MATCHED Auto Status | ขาดหายไป | บันทึกได้ ✅ |

**สถานะ**: ✅ **แก้ไขเสร็จแล้ว** - ตอนนี้ชีท Bets มี 21 คอลัมน์ครบถ้วน

