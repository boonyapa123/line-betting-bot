# 📊 การแมปคอลัมน์ Google Sheets (ตรวจสอบแล้ว)

## 📋 โครงสร้างชีท Bets

| Column | Index | Header | ใช้สำหรับ |
|--------|-------|--------|---------|
| **A** | 0 | Timestamp | เวลาที่บันทึก |
| **B** | 1 | User A ID | ID ของผู้เล่น A |
| **C** | 2 | ชื่อ User A | ชื่อ LINE ของผู้เล่น A |
| **D** | 3 | ข้อความ A | ข้อความเดิมพันของ A |
| **E** | 4 | ชื่อบั้งไฟ | ชื่อบั้งไฟ |
| **F** | 5 | รายการเล่น | ฝั่งของผู้เล่น A (ล/ย/ชล/ชถ) |
| **G** | 6 | ยอดเงิน | ยอดเงินของผู้เล่น A |
| **H** | 7 | ยอดเงิน B | ยอดเงินของผู้เล่น B |
| **I** | 8 | ผลที่ออก | ผลลัพธ์ (ว่างเปล่า = ยังไม่มีผล) |
| **J** | 9 | ผลแพ้ชนะ | ผลแพ้ชนะ (ว่างเปล่า = ยังไม่มีผล) |
| **K** | 10 | User B ID | ID ของผู้เล่น B |
| **L** | 11 | ชื่อ User B | ชื่อ LINE ของผู้เล่น B |
| **M** | 12 | รายการแทง | ฝั่งของผู้เล่น B (ล/ย/ชล/ชถ) |
| **N** | 13 | ชื่อกลุ่มแชท | ชื่อกลุ่ม LINE |
| **O** | 14 | ชื่อกลุ่ม | ชื่อกลุ่ม (สำรอง) |
| **P** | 15 | Token A | Token ของผู้เล่น A |
| **Q** | 16 | ID กลุ่ม | Group ID |
| **R** | 17 | Token B | Token ของผู้เล่น B |
| **S** | 18 | ผลลัพธ์ A | ผลลัพธ์ของผู้เล่น A |
| **T** | 19 | ผลลัพธ์ B | ผลลัพธ์ของผู้เล่น B |

---

## 🔍 ตรวจสอบการจับคู่ (Matching Logic)

### เงื่อนไขการจับคู่:

```javascript
// ค้นหาคู่จาก Google Sheets
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  
  // ✅ ตรวจสอบคอลัมน์ที่ถูกต้อง
  const userAName = row[2];        // Column C (index 2)
  const slipName = row[4];         // Column E (index 4)
  const sideA = row[5];            // Column F (index 5)
  const amountA = row[6];          // Column G (index 6)
  const amountB = row[7];          // Column H (index 7)
  const resultStatus = row[8];     // Column I (index 8) ← ตรวจสอบผลลัพธ์
  const userBName = row[11];       // Column L (index 11)
  const sideB = row[12];           // Column M (index 12)
  const groupId = row[16];         // Column Q (index 16)
  
  // ✅ เงื่อนไขการจับคู่
  if (
    // 1. ยังไม่มีผล (Column I ว่างเปล่า)
    !resultStatus &&
    // 2. มี User B (Column H มีค่า = MATCHED)
    amountB &&
    // 3. บั้งไฟตรงกัน
    slipName === newSlipName &&
    // 4. ฝั่งตรงข้าม
    isOpposite(sideA, newSide) &&
    // 5. ราคาตรงกัน (สำหรับ Method 2)
    priceA === newPrice &&
    // 6. groupId ตรงกัน
    groupId === newGroupId
  ) {
    // ✅ พบคู่!
  }
}
```

---

## ❌ ปัญหาใน index.js (ปัจจุบัน)

### ปัญหา 1: ตรวจสอบ Column ผิด

```javascript
// ❌ ผิด
const rowResultA = row[9] || '';  // Column J (index 9)
const rowResultB = row[10] || ''; // Column K (index 10)

// ✅ ถูก
const resultStatus = row[8] || ''; // Column I (index 8)
```

### ปัญหา 2: ตรวจสอบ rowUserB ผิด

```javascript
// ❌ ผิด
if (!rowResultA && !rowResultB && 
    rowFireworkName === fireworkName &&
    rowUserA !== message.userId && rowUserB !== message.userId) {
  // rowUserB ยังว่างเปล่า ไม่ควรตรวจสอบ
}

// ✅ ถูก
if (!resultStatus &&           // ยังไม่มีผล
    amountB &&                 // มี User B (MATCHED)
    slipName === fireworkName &&
    groupId === newGroupId) {
  // ✅ ถูกต้อง
}
```

### ปัญหา 3: ไม่ตรวจสอบ groupId

```javascript
// ❌ ผิด - ไม่มีการตรวจสอบ groupId
if (!rowResultA && !rowResultB && 
    rowFireworkName === fireworkName) {
  // อาจจับคู่ข้ามกลุ่ม
}

// ✅ ถูก
if (!resultStatus &&
    amountB &&
    slipName === fireworkName &&
    groupId === newGroupId) {  // ✅ ตรวจสอบ groupId
  // ✅ เฉพาะในกลุ่มเดียวกัน
}
```

### ปัญหา 4: ไม่ตรวจสอบราคา

```javascript
// ❌ ผิด - ไม่มีการตรวจสอบราคา
if (!rowResultA && !rowResultB && 
    rowFireworkName === fireworkName) {
  // ไม่ตรวจสอบราคา (Method 2)
}

// ✅ ถูก
if (!resultStatus &&
    amountB &&
    slipName === fireworkName &&
    priceA === newPrice &&     // ✅ ตรวจสอบราคา
    groupId === newGroupId) {
  // ✅ ราคาตรงกัน
}
```

---

## 📝 โค้ดที่ถูกต้อง

```javascript
// ค้นหาคู่จาก Google Sheets
const response = await sheets.spreadsheets.values.get({
  auth: googleAuth,
  spreadsheetId: GOOGLE_SHEET_ID,
  range: `${GOOGLE_WORKSHEET_NAME}!A:T`,
});

const rows = response.data.values || [];
const matchingBets = [];

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row) continue;
  
  // ✅ ดึงข้อมูลจากคอลัมน์ที่ถูกต้อง
  const userAName = row[2];        // Column C
  const slipName = row[4];         // Column E
  const sideA = row[5];            // Column F
  const amountA = parseInt(row[6]) || 0;  // Column G
  const amountB = parseInt(row[7]) || 0;  // Column H
  const resultStatus = row[8] || '';      // Column I ← ตรวจสอบผลลัพธ์
  const userBName = row[11];       // Column L
  const sideB = row[12];           // Column M
  const groupId = row[16];         // Column Q
  
  // ✅ เงื่อนไขการจับคู่ที่ถูกต้อง
  if (
    // 1. ยังไม่มีผล
    !resultStatus &&
    // 2. มี User B (MATCHED)
    amountB > 0 &&
    // 3. บั้งไฟตรงกัน
    slipName === newSlipName &&
    // 4. ฝั่งตรงข้าม
    isOpposite(sideA, newSide) &&
    // 5. ราคาตรงกัน (สำหรับ Method 2)
    priceA === newPrice &&
    // 6. groupId ตรงกัน
    groupId === newGroupId &&
    // 7. ไม่ใช่ผู้เล่นคนเดียวกัน
    userAName !== newUserName
  ) {
    matchingBets.push({
      rowIndex: i + 1,
      userAName,
      userBName,
      slipName,
      sideA,
      sideB,
      amountA,
      amountB,
      groupId
    });
  }
}
```

---

## 🎯 สรุป

| ปัญหา | ปัจจุบัน | ถูกต้อง |
|-------|---------|--------|
| ตรวจสอบผลลัพธ์ | Column J (index 9) | Column I (index 8) |
| ตรวจสอบ User B | rowUserB !== message.userId | amountB > 0 |
| ตรวจสอบ groupId | ❌ ไม่มี | ✅ groupId === newGroupId |
| ตรวจสอบราคา | ❌ ไม่มี | ✅ priceA === newPrice |
| ค้นหาจากหน่วยความจำ | ❌ ไม่มี | ✅ ใช้ bettingRoundController |

