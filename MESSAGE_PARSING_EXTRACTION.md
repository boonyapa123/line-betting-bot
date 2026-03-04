# 📝 การถอดข้อความ "320-340 ย 100 คำไผ่"

## 📋 ข้อมูลที่ถอดออกมา

```
ชื่อบั้งไฟ: คำไผ่
ยอดเงิน: 100
เดิมพัน: ย
ราคา: 320-340
```

---

## 🔄 ขั้นตอนการถอดข้อความ

### ข้อความต้นฉบับ
```
"320-340 ย 100 คำไผ่"
```

### ขั้นตอน 1: ตรวจสอบรูปแบบ

ระบบจะตรวจสอบรูปแบบตามลำดับ:

```javascript
// Pattern ที่ 5: วิธีที่ 2 (ราคาคะแนน) - รูปแบบง่าย
const METHOD2_SIMPLE_PATTERN = /^(\d+-\d+)\s+([ลย])\s+(\d+)\s+(.+)$/;

// ข้อความตรงกับ pattern นี้
const match = "320-340 ย 100 คำไผ่".match(METHOD2_SIMPLE_PATTERN);
```

### ขั้นตอน 2: แยกข้อมูลจาก Match

```javascript
const [
  fullMatch,      // "320-340 ย 100 คำไผ่"
  price,          // "320-340"
  side,           // "ย"
  amount,         // "100"
  slipName        // "คำไผ่"
] = match;
```

### ขั้นตอน 3: แปลงข้อมูล

```javascript
const sideMap = {
  'ล': 'ไล่',
  'ย': 'ยั้ง',
};

const parsedBet = {
  success: true,
  method: 2,
  price: "320-340",           // ราคา
  side: sideMap['ย'] = "ยั้ง", // เดิมพัน (แปลงจาก ย)
  sideCode: "ย",              // เดิมพัน (ย่อ)
  amount: parseInt("100") = 100,  // ยอดเงิน
  slipName: "คำไผ่",          // ชื่อบั้งไฟ
  timestamp: "2026-03-04T..."
};
```

---

## 📊 ผลลัพธ์ที่ได้

| ข้อมูล | ค่า | หมายเหตุ |
|--------|-----|---------|
| **ชื่อบั้งไฟ** | คำไผ่ | `slipName` |
| **ยอดเงิน** | 100 | `amount` |
| **เดิมพัน** | ย | `sideCode` |
| **ราคา** | 320-340 | `price` |

---

## 🔍 ตัวอย่างการใช้ข้อมูล

### ในการบันทึกลงชีท

```javascript
const BetsSheetColumns = require('./betsSheetColumns');

const row = BetsSheetColumns.createRow({
  timestamp: parsedBet.timestamp,
  slipName: parsedBet.slipName,      // "คำไผ่"
  sideA: parsedBet.sideCode,         // "ย"
  amount: parsedBet.amount,          // 100
  message: "320-340 ย 100 คำไผ่",
  // ... ข้อมูลอื่นๆ
});
```

### ในการแสดงข้อความยืนยัน

```javascript
const confirmMessage = `
✅ บันทึกการเล่นสำเร็จ

🎆 บั้งไฟ: ${parsedBet.slipName}      // "คำไผ่"
💹 ราคา: ${parsedBet.price}          // "320-340"
💰 ยอดเงิน: ${parsedBet.amount} บาท  // 100
📍 เดิมพัน: ${parsedBet.sideCode}    // "ย"

⏳ รอการจับคู่...
`;
```

### ในการค้นหาคู่

```javascript
// ค้นหาคู่ที่มีฝั่งตรงข้าม
const oppositeMap = {
  'ล': 'ย',
  'ย': 'ล',
};

const oppositeCode = oppositeMap[parsedBet.sideCode]; // "ล"

// ค้นหาข้อมูลที่มี:
// - slipName เดียวกัน: "คำไผ่"
// - sideCode ตรงข้าม: "ล"
// - price เดียวกัน: "320-340"
```

---

## 🎯 Regex Pattern อธิบาย

```javascript
/^(\d+-\d+)\s+([ลย])\s+(\d+)\s+(.+)$/
```

| ส่วน | ความหมาย | ตัวอย่าง |
|------|---------|---------|
| `^` | เริ่มต้นของข้อความ | - |
| `(\d+-\d+)` | ตัวเลข-ตัวเลข (ราคา) | 320-340 |
| `\s+` | เว้นวรรค 1 ตัวขึ้นไป | (space) |
| `([ลย])` | ตัวอักษร ล หรือ ย (เดิมพัน) | ย |
| `\s+` | เว้นวรรค 1 ตัวขึ้นไป | (space) |
| `(\d+)` | ตัวเลข (ยอดเงิน) | 100 |
| `\s+` | เว้นวรรค 1 ตัวขึ้นไป | (space) |
| `(.+)` | ตัวอักษรใดๆ 1 ตัวขึ้นไป (ชื่อบั้งไฟ) | คำไผ่ |
| `$` | สิ้นสุดของข้อความ | - |

---

## 📝 โค้ดการถอดข้อความ

```javascript
// ไฟล์: services/betting/bettingMessageParserService.js

static parseMethod2Simple(match) {
  const [, price, side, amount, slipName] = match;

  const sideMap = {
    'ล': 'ไล่',
    'ย': 'ยั้ง',
  };

  return {
    success: true,
    method: 2,
    price: price.trim(),                    // "320-340"
    side: sideMap[side] || side,            // "ยั้ง"
    sideCode: side,                         // "ย"
    amount: parseInt(amount),               // 100
    slipName: slipName.trim(),              // "คำไผ่"
    timestamp: new Date().toISOString(),
  };
}
```

---

## 🚀 ขั้นตอนการใช้งาน

```javascript
// 1. Import Service
const BettingMessageParserService = require('./bettingMessageParserService');

// 2. Parse ข้อความ
const message = "320-340 ย 100 คำไผ่";
const parsedBet = BettingMessageParserService.parseMessage(message);

// 3. ตรวจสอบผลลัพธ์
if (parsedBet.success) {
  console.log('ชื่อบั้งไฟ:', parsedBet.slipName);    // "คำไผ่"
  console.log('ยอดเงิน:', parsedBet.amount);        // 100
  console.log('เดิมพัน:', parsedBet.sideCode);      // "ย"
  console.log('ราคา:', parsedBet.price);            // "320-340"
} else {
  console.log('ข้อผิดพลาด:', parsedBet.error);
}
```

---

## 📌 หมายเหตุ

- ข้อมูลที่ถอดออกมาจะถูกใช้ในการ:
  1. บันทึกลงชีท Bets
  2. ค้นหาคู่ที่จับคู่ได้
  3. ส่งแจ้งเตือน
  4. คำนวณผลลัพธ์

- ข้อมูลทั้งหมดจะถูกเก็บไว้ใน object `parsedBet`
- ระบบรองรับหลายรูปแบบของข้อความ
- ข้อมูลจะถูกตรวจสอบความถูกต้องก่อนใช้งาน

