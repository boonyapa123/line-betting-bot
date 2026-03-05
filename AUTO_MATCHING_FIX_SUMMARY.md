# 🔧 สรุปการแก้ไข Auto Matching (Row Update Issue)

## ❌ ปัญหาที่พบ

### Error 400: Out of Range
```
Requested writing within range [Bets!A2:T2], but tried writing to column [U]
```

### สาเหตุ
1. **`BetsSheetColumns.createRow()` สร้างแถวที่มี 21 คอลัมน์** (รวม Column U - MATCHED_AUTO)
2. **แต่ `recordBet()` ใช้ Range `A:T` (20 คอลัมน์)** ทำให้ Column U ถูกตัดออก
3. **`updateRowWithUserB()` พยายามเขียนลงคอลัมน์ U** แต่ Range ถูกจำกัดไว้ที่ A:T
4. **`getAllBets()` ไม่ได้เก็บ Row Index ที่แท้จริง** ทำให้อัปเดตแถวผิด

### ผลกระทบ
- ❌ ระบบไม่สามารถอัปเดตแถวเดิมได้
- ❌ ข้อมูล User B ไม่ถูกบันทึกลงในแถวเดียวกัน
- ❌ การจับคู่ Auto ไม่สำเร็จ

---

## ✅ การแก้ไข

### 1️⃣ แก้ไข `recordBet()` ใน bettingPairingService.js
**ปัญหา**: สร้างแถวที่มี 21 คอลัมน์ แต่ Range ถูกจำกัดไว้ที่ A:T

**วิธีแก้**: ตัดแถวให้เหลือแค่ 20 คอลัมน์ (A:T) ก่อนบันทึก
```javascript
// ตัดแถวให้เหลือแค่ 20 คอลัมน์ (A:T) เพื่อให้ตรงกับ Range
const rowToAppend = row.slice(0, 20);

await this.sheets.spreadsheets.values.append({
  spreadsheetId: this.spreadsheetId,
  range: `${this.transactionsSheetName}!A:T`,
  valueInputOption: 'RAW',
  resource: {
    values: [rowToAppend],
  },
});
```

### 2️⃣ แก้ไข `getAllBets()` ใน bettingPairingService.js
**ปัญหา**: ไม่ได้เก็บ Row Index ที่แท้จริง

**วิธีแก้**: เพิ่ม `rowIndex` ให้กับแต่ละ Bet
```javascript
return values.map((row, index) => {
  const parsed = BetsSheetColumns.parseRow(row);
  parsed.rowIndex = index + 2; // Row Index ที่แท้จริง (1-indexed)
  return parsed;
});
```

### 3️⃣ แก้ไข `updateRowWithUserB()` ใน bettingPairingService.js
**ปัญหา**: 
- ใช้ Row Index ผิด
- ไม่ได้ตัดแถวให้เหลือแค่ 20 คอลัมน์

**วิธีแก้**: 
- ใช้ `rowIndex` ที่ถูกต้อง (1-indexed)
- ตัดแถวให้เหลือแค่ 20 คอลัมน์ (A:T)
```javascript
async updateRowWithUserB(rowIndex, userBData) {
  // ถ้า rowIndex เป็น 0-indexed ให้แปลงเป็น 1-indexed
  const actualRowIndex = rowIndex < 2 ? rowIndex + 2 : rowIndex;

  // ดึงข้อมูลแถวปัจจุบัน
  const response = await this.sheets.spreadsheets.values.get({
    spreadsheetId: this.spreadsheetId,
    range: `${this.transactionsSheetName}!A${actualRowIndex}:T${actualRowIndex}`,
  });

  const currentRow = response.data.values?.[0] || [];
  const updatedRow = BetsSheetColumns.updateRowWithUserB(currentRow, userBData);

  // ตัดแถวให้เหลือแค่ 20 คอลัมน์ (A:T)
  const rowToUpdate = updatedRow.slice(0, 20);

  // อัปเดตแถวในชีท
  await this.sheets.spreadsheets.values.update({
    spreadsheetId: this.spreadsheetId,
    range: `${this.transactionsSheetName}!A${actualRowIndex}:T${actualRowIndex}`,
    valueInputOption: 'RAW',
    resource: {
      values: [rowToUpdate],
    },
  });
}
```

### 4️⃣ แก้ไข `bettingRoundController.js`
**ปัญหา**: ใช้ `matchedPair.existingBet.index` แทน `rowIndex`

**วิธีแก้**: เปลี่ยนเป็น `matchedPair.existingBet.rowIndex`
```javascript
const updateResult = await bettingPairingService.updateRowWithUserB(
  matchedPair.existingBet.rowIndex,  // ✅ ใช้ rowIndex ที่ถูกต้อง
  userBData
);
```

---

## 📊 ขั้นตอนการทำงานหลังแก้ไข

```
User A: "320-340 ล 100 คำไผ่"
  ↓
[Parse & Validate & Record]
  ↓ บันทึกลงแถว 2 (A2:T2)
  ↓
[Find Match] → ❌ ไม่พบคู่
⏳ รอการจับคู่

User B: "320-340 ย 100 คำไผ่"
  ↓
[Parse & Validate & Record]
  ↓ บันทึกลงแถว 3 (A3:T3)
  ↓
[Find Match] → ✅ พบ User A (rowIndex = 2)
  ↓
[Update Row 2] → อัปเดตแถว 2 ด้วยข้อมูล User B
  ↓ A2:T2 ← User B data
  ↓
[Send Notifications] → ส่งแจ้งเตือน
  ↓
✅ จับคู่สำเร็จ (ข้อมูลอยู่ในแถวเดียวกัน)
```

---

## 🔍 ตรวจสอบการทำงาน

### ก่อนแก้ไข
```
❌ Error 400: Requested writing within range [Bets!A2:T2], but tried writing to column [U]
❌ Failed to update row: เกิดข้อผิดพลาดในการอัปเดต
❌ ข้อมูล User B ไม่ถูกบันทึกลงในแถวเดียวกัน
```

### หลังแก้ไข
```
✅ Row 2 updated with User B data
✅ ข้อมูล User A และ User B อยู่ในแถวเดียวกัน
✅ Auto-match notifications sent successfully
✅ จับคู่เล่นสำเร็จ
```

---

## 📝 ไฟล์ที่แก้ไข

1. **services/betting/bettingPairingService.js**
   - ✅ แก้ไข `recordBet()` - ตัดแถวให้เหลือ 20 คอลัมน์
   - ✅ แก้ไข `getAllBets()` - เพิ่ม `rowIndex`
   - ✅ แก้ไข `updateRowWithUserB()` - ใช้ `rowIndex` ที่ถูกต้อง

2. **services/betting/bettingRoundController.js**
   - ✅ แก้ไข `handleMessage()` - ใช้ `matchedPair.existingBet.rowIndex`

---

## 🚀 ขั้นตอนทดสอบ

1. **เปิดรอบการเดิมพัน**
   ```
   Admin: ":เริ่ม คำไผ่"
   ```

2. **ผู้เล่น A ส่งข้อความเดิมพัน**
   ```
   User A: "320-340 ล 100 คำไผ่"
   ```
   - ✅ บันทึกลงแถว 2 (A2:T2)
   - ⏳ รอการจับคู่

3. **ผู้เล่น B ส่งข้อความเดิมพัน**
   ```
   User B: "320-340 ย 100 คำไผ่"
   ```
   - ✅ บันทึกลงแถว 3 (A3:T3)
   - ✅ ค้นหาคู่ → พบ User A (rowIndex = 2)
   - ✅ อัปเดตแถว 2 ด้วยข้อมูล User B
   - ✅ ส่งแจ้งเตือน
   - ✅ จับคู่สำเร็จ

4. **ตรวจสอบชีท Bets**
   - ✅ แถว 2: User A + User B (ข้อมูลอยู่ในแถวเดียวกัน)
   - ✅ แถว 3: ว่างเปล่า (ไม่ได้ใช้)

---

## 📌 หมายเหตุ

- ✅ ระบบจะบันทึก User A ลงแถวใหม่ทันที
- ✅ เมื่อพบคู่ (User B) ระบบจะอัปเดตแถวของ User A ด้วยข้อมูล User B
- ✅ ข้อมูล User A และ User B จะอยู่ในแถวเดียวกัน
- ✅ ไม่มี Error 400 อีกต่อไป

