# 📝 การแสดงข้อมูลการเล่น (Bet Info Formatting)

## 📋 ภาพรวม

ฟังก์ชัน `formatBetInfo()` ใช้สำหรับแสดงข้อมูลการเล่นในรูปแบบที่อ่านง่าย

---

## 🔄 ตัวอย่างการใช้งาน

### ข้อมูลที่ถอดออกมา

```javascript
const parsedBet = {
  success: true,
  method: 2,
  price: "320-340",
  side: "ยั้ง",
  sideCode: "ย",
  amount: 100,
  slipName: "คำไผ่",
  timestamp: "2026-03-04T..."
};
```

### เรียกใช้ฟังก์ชัน

```javascript
const BettingMessageParserService = require('./bettingMessageParserService');

const formattedInfo = BettingMessageParserService.formatBetInfo(parsedBet);
console.log(formattedInfo);
```

### ผลลัพธ์

```
ชื่อบั้งไฟ: คำไผ่ยอดเงิน: 100เดิมพัน: ยราคา: 320-340
```

---

## 📊 ตัวอย่างอื่นๆ

### ตัวอย่างที่ 1: วิธีที่ 1 (ราคาช่าง)

**ข้อมูล:**
```javascript
{
  success: true,
  method: 1,
  slipName: "ฟ้าหลังฝน",
  side: "ไล่",
  sideCode: "ชล",
  amount: 500,
  price: null,
  timestamp: "2026-03-04T..."
}
```

**ผลลัพธ์:**
```
ชื่อบั้งไฟ: ฟ้าหลังฝนยอดเงิน: 500เดิมพัน: ชล
```

---

### ตัวอย่างที่ 2: ข้อมูลไม่สำเร็จ

**ข้อมูล:**
```javascript
{
  success: false,
  error: "รูปแบบผิดครับ"
}
```

**ผลลัพธ์:**
```
(ข้อความว่างเปล่า)
```

---

## 🔧 โค้ดฟังก์ชัน

```javascript
/**
 * แสดงข้อมูลการเล่นในรูปแบบที่อ่านง่าย
 * @param {object} parsedBet - ข้อมูลการเล่นที่ถอดแล้ว
 * @returns {string} ข้อมูลในรูปแบบ "ชื่อบั้งไฟ: xxx ยอดเงิน: xxx เดิมพัน: xxx ราคา: xxx"
 */
static formatBetInfo(parsedBet) {
  if (!parsedBet.success) {
    return '';
  }

  let info = `ชื่อบั้งไฟ: ${parsedBet.slipName}`;
  info += `ยอดเงิน: ${parsedBet.amount}`;
  info += `เดิมพัน: ${parsedBet.sideCode}`;
  
  if (parsedBet.price) {
    info += `ราคา: ${parsedBet.price}`;
  }

  return info;
}
```

---

## 📌 ข้อมูลที่แสดง

| ข้อมูล | ตัวอย่าง | หมายเหตุ |
|--------|---------|---------|
| ชื่อบั้งไฟ | คำไผ่ | `slipName` |
| ยอดเงิน | 100 | `amount` |
| เดิมพัน | ย | `sideCode` |
| ราคา | 320-340 | `price` (ถ้ามี) |

---

## 🚀 ขั้นตอนการใช้งาน

### 1. Parse ข้อความ

```javascript
const message = "320-340 ย 100 คำไผ่";
const parsedBet = BettingMessageParserService.parseMessage(message);
```

### 2. แสดงข้อมูล

```javascript
const formattedInfo = BettingMessageParserService.formatBetInfo(parsedBet);
console.log(formattedInfo);
// ผลลัพธ์: ชื่อบั้งไฟ: คำไผ่ยอดเงิน: 100เดิมพัน: ยราคา: 320-340
```

### 3. ใช้ในข้อความยืนยัน

```javascript
const confirmMessage = `
✅ บันทึกการเล่นสำเร็จ

${BettingMessageParserService.formatBetInfo(parsedBet)}

⏳ รอการจับคู่...
`;
```

---

## 📝 หมายเหตุ

- ฟังก์ชันจะส่งข้อความว่างเปล่าถ้า `success` เป็น `false`
- ราคาจะแสดงเฉพาะเมื่อมีข้อมูล (วิธีที่ 2 เท่านั้น)
- ข้อมูลจะแสดงติดกันโดยไม่มีเว้นวรรค (ตามที่คุณต้องการ)

