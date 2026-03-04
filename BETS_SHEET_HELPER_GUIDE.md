# 📋 BetsSheetColumns Helper - คู่มือการใช้งาน

## 📌 ที่มา

ไฟล์ helper ใหม่: `services/betting/betsSheetColumns.js`

ช่วยจัดการคอลัมน์ของชีท Bets อย่างเป็นศูนย์กลาง ป้องกันการใช้คอลัมน์ผิดในหลายไฟล์

---

## 🎯 ประโยชน์

✅ **ป้องกันข้อผิดพลาด** - ไม่ต้องจำหมายเลขคอลัมน์
✅ **ใช้งานง่าย** - ใช้ชื่อคอลัมน์แทนหมายเลข
✅ **ศูนย์กลาง** - เปลี่ยนแปลงคอลัมน์ได้ที่เดียว
✅ **Debug ง่าย** - มีฟังก์ชัน logRow() สำหรับพิมพ์ข้อมูล

---

## 📊 โครงสร้างคอลัมน์

```javascript
BetsSheetColumns.COLUMNS = {
  TIMESTAMP: 0,           // A: Timestamp
  USER_A_ID: 1,           // B: User A ID
  USER_A_NAME: 2,         // C: ชื่อ User A
  MESSAGE_A: 3,           // D: ข้อความ A
  SLIP_NAME: 4,           // E: ชื่อบั้งไฟ
  SIDE_A: 5,              // F: รายการเล่น (ฝั่ง A)
  AMOUNT: 6,              // G: ยอดเงิน
  AMOUNT_B: 7,            // H: ยอดเงิน B
  RESULT: 8,              // I: ผลที่ออก
  RESULT_WIN_LOSE: 9,     // J: ผลแพ้ชนะ
  USER_B_ID: 10,          // K: User B ID
  USER_B_NAME: 11,        // L: ชื่อ User B
  SIDE_B: 12,             // M: รายการแทง (ฝั่ง B)
  GROUP_CHAT_NAME: 13,    // N: ชื่อกลุ่มแชท
  GROUP_NAME: 14,         // O: ชื่อกลุ่ม
  TOKEN_A: 15,            // P: Token A
  GROUP_ID: 16,           // Q: ID กลุ่ม
  TOKEN_B: 17,            // R: Token B
  RESULT_A: 18,           // S: ผลลัพธ์ A
  RESULT_B: 19,           // T: ผลลัพธ์ B
};
```

---

## 🔧 วิธีการใช้งาน

### 1. สร้างแถวข้อมูล

```javascript
const BetsSheetColumns = require('./betsSheetColumns');

// สร้างแถวใหม่
const row = BetsSheetColumns.createRow({
  timestamp: '03/04/2026, 15:50:31',
  userAId: 'U51899d9b032327436b48ccb369a8505d',
  userAName: 'ธา มือทอง',
  messageA: '320-340 ย 400 คำไผ่',
  slipName: '320-340',
  sideA: 'ย',
  amount: 400,
  groupName: 'ทดสอบระบบ บั้งไฟ เดิมพัน',
  groupId: 'C4e522277480703e5eddbf658666ba6a9',
});

// บันทึกลงชีท
await sheets.spreadsheets.values.append({
  spreadsheetId: GOOGLE_SHEET_ID,
  range: 'Bets!A:T',
  valueInputOption: 'RAW',
  resource: { values: [row] },
});
```

### 2. ดึงและแปลงข้อมูล

```javascript
// ดึงข้อมูลจากชีท
const response = await sheets.spreadsheets.values.get({
  spreadsheetId: GOOGLE_SHEET_ID,
  range: 'Bets!A2:T',
});

const rows = response.data.values || [];

// แปลงแต่ละแถว
const bets = rows.map(row => BetsSheetColumns.parseRow(row));

// ตอนนี้ bets มีข้อมูลที่ถูกต้อง
console.log(bets[0].slipName);  // "320-340"
console.log(bets[0].sideCode);  // "ย"
console.log(bets[0].amount);    // 400
```

### 3. ดึงคอลัมน์เฉพาะ

```javascript
// ดึงค่าจากแถว
const slipName = BetsSheetColumns.getColumn(row, 'SLIP_NAME');
const amount = BetsSheetColumns.getColumn(row, 'AMOUNT');

// ตั้งค่าคอลัมน์
BetsSheetColumns.setColumn(row, 'RESULT', 'ชล');
BetsSheetColumns.setColumn(row, 'RESULT_WIN_LOSE', 'ชนะ');
```

### 4. ดึงช่วงคอลัมน์

```javascript
// ดึงช่วงคอลัมน์ (A:T)
const range = BetsSheetColumns.getColumnRange(0, 19);
// ผลลัพธ์: "A:T"

// ดึงช่วงพร้อมแถว (A2:T100)
const range = BetsSheetColumns.getRange(2, 100, 0, 19);
// ผลลัพธ์: "A2:T100"

// ดึงช่วงจากแถว 2 ถึงสุดท้าย (A2:T)
const range = BetsSheetColumns.getRange(2, null, 0, 19);
// ผลลัพธ์: "A2:T"
```

### 5. พิมพ์ข้อมูลเพื่อ Debug

```javascript
// พิมพ์ข้อมูลแถว
BetsSheetColumns.logRow(row);

// ผลลัพธ์:
// 📊 Row Data:
// =====================================
//   [A] TIMESTAMP: 03/04/2026, 15:50:31
//   [B] USER_A_ID: U51899d9b032327436b48ccb369a8505d
//   [C] USER_A_NAME: ธา มือทอง
//   ...
```

---

## 📝 ตัวอย่างการใช้งานจริง

### ตัวอย่าง 1: บันทึกการเล่นใหม่

```javascript
// ในไฟล์ bettingPairingService.js
async recordBet(betData, userId, displayName, ...) {
  const BetsSheetColumns = require('./betsSheetColumns');

  const row = BetsSheetColumns.createRow({
    timestamp: new Date().toLocaleString('th-TH', {...}),
    userAId: userId,
    userAName: displayName,
    messageA: `${betData.price} ${betData.sideCode} ${betData.amount} ${betData.slipName}`,
    slipName: betData.slipName,
    sideA: betData.sideCode,
    amount: betData.amount,
    groupName: groupName,
    groupId: groupId,
  });

  await this.sheets.spreadsheets.values.append({
    spreadsheetId: this.spreadsheetId,
    range: `${this.transactionsSheetName}!A:T`,
    valueInputOption: 'RAW',
    resource: { values: [row] },
  });
}
```

### ตัวอย่าง 2: ดึงข้อมูลการเล่น

```javascript
// ในไฟล์ bettingPairingService.js
async getAllBets() {
  const BetsSheetColumns = require('./betsSheetColumns');

  const response = await this.sheets.spreadsheets.values.get({
    spreadsheetId: this.spreadsheetId,
    range: `${this.transactionsSheetName}!A2:T`,
  });

  const values = response.data.values || [];
  return values.map(row => BetsSheetColumns.parseRow(row));
}
```

### ตัวอย่าง 3: บันทึกการจับคู่

```javascript
// ในไฟล์ priceRangeMatchingService.js
static async recordToGoogleSheets(sheets, spreadsheetId, worksheetName, pair, userAName, userBName, groupName) {
  const BetsSheetColumns = require('./betsSheetColumns');

  const row = BetsSheetColumns.createRow({
    timestamp: new Date().toLocaleString('th-TH', {...}),
    userAId: pair.existingBet.userId,
    userAName: userAName,
    messageA: `${price} ${pair.existingBet.sideCode} ${pair.existingBet.amount} ${pair.slipName}`,
    slipName: pair.slipName,
    sideA: pair.existingBet.sideCode,
    amount: pair.betAmount,
    amountB: pair.betAmount,
    userBId: pair.newBet.userId,
    userBName: userBName,
    sideB: pair.newBet.sideCode,
    groupName: groupName,
    groupId: pair.newBet.groupId,
  });

  // บันทึกลงชีท
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${worksheetName}!A${nextRowIndex}:T${nextRowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}
```

---

## 🔍 ไฟล์ที่ได้รับการอัปเดต

✅ **services/betting/bettingPairingService.js**
- `recordBet()` - ใช้ `BetsSheetColumns.createRow()`
- `getAllBets()` - ใช้ `BetsSheetColumns.parseRow()`

✅ **services/betting/priceRangeMatchingService.js**
- `recordToGoogleSheets()` - ใช้ `BetsSheetColumns.createRow()` และ `logRow()`

---

## 📌 หมายเหตุ

- ไฟล์ helper ใช้ได้กับทุกไฟล์ที่ต้องการจัดการชีท Bets
- สามารถเพิ่มเมธอดใหม่ได้ตามต้องการ
- ทุกการเปลี่ยนแปลงคอลัมน์ต้องทำที่ไฟล์นี้เท่านั้น

---

## 🚀 ขั้นตอนถัดไป

1. ✅ ใช้ helper ในไฟล์อื่นๆ ที่เกี่ยวข้องกับชีท Bets
2. ✅ ทดสอบการบันทึกและดึงข้อมูล
3. ✅ ตรวจสอบว่าข้อมูลถูกบันทึกในคอลัมน์ที่ถูกต้อง
