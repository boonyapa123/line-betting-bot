# 🔴 ปัญหา: ระบบไม่ทำการจับคู่ Auto

## 📋 สรุปปัญหา

ระบบไม่ทำการจับคู่อัตโนมัติแม้ว่า:
- ✅ บั้งไฟตรงกัน (340-370)
- ✅ อยู่ฝั่งตรงข้าม (ย vs ล)
- ✅ ยอดเงินเพียงพอ

---

## 🔍 สาเหตุ

### ปัญหาหลัก: ใช้ In-Memory Storage แทน Google Sheets

**ข้อความที่ส่งมา:**
1. "340-370 ย 100 ศ." → บันทึกลงหน่วยความจำ
2. "340-370 ล 100 ศ." → บันทึกลงหน่วยความจำ
3. "340-370 ย 400 ศ." → บันทึกลงหน่วยความจำ

**Log ที่แสดง:**
```
⏭️  No matching bets found, storing in memory for future matching...
📦 Stored in memory: 340-370 ยั้ง 100 บาท
```

### ปัญหาย่อย

1. **`index.js` ไม่ใช้ `bettingRoundController`**
   - ควรใช้: `bettingRoundController.handleMessage()`
   - ใช้จริง: `AutoMatchingService` + in-memory storage

2. **ข้อมูลเก็บไว้ใน `messageMap` (in-memory)**
   - ไม่ได้บันทึกลง Google Sheets
   - ไม่ได้ค้นหาคู่จาก Google Sheets
   - ข้อมูลหายเมื่อ server restart

3. **ระบบค้นหาคู่ไม่ทำงาน**
   - ไม่มีการเรียกใช้ `findMatchForNewBet()`
   - ไม่มีการเรียกใช้ `getBetsByGroupId()`

---

## 📊 ตัวอย่างการทำงานปัจจุบัน

```
User A: "340-370 ย 100 ศ."
  ↓
[Parse] → ✅ ถูกต้อง
[Check Balance] → ✅ เพียงพอ
[Store in Memory] → ✅ บันทึกลงหน่วยความจำ
[Find Match] → ❌ ไม่ค้นหา (ไม่มีโค้ด)
⏭️  No pair detected

User B: "340-370 ล 100 ศ."
  ↓
[Parse] → ✅ ถูกต้อง
[Check Balance] → ✅ เพียงพอ
[Store in Memory] → ✅ บันทึกลงหน่วยความจำ
[Find Match] → ❌ ไม่ค้นหา (ไม่มีโค้ด)
⏭️  No pair detected
```

---

## ✅ วิธีแก้ไข

### ตัวเลือกที่ 1: ใช้ `bettingRoundController` (แนะนำ)

**ข้อดี:**
- ✅ ใช้ Google Sheets เก็บข้อมูล
- ✅ มีการค้นหาคู่อัตโนมัติ
- ✅ มีการส่งแจ้งเตือน
- ✅ ข้อมูลถาวร

**ขั้นตอน:**
1. Import `bettingRoundController` ใน `index.js`
2. เรียกใช้ `bettingRoundController.handleMessage(event)`
3. ลบ `AutoMatchingService` + in-memory storage

### ตัวเลือกที่ 2: แก้ไข `index.js` ให้ใช้ Google Sheets

**ขั้นตอน:**
1. เปลี่ยนจาก `messageMap` เป็น `bettingPairingService.recordBet()`
2. เปลี่ยนจาก in-memory search เป็น `bettingPairingService.getBetsByGroupId()`
3. เปลี่ยนจาก in-memory matching เป็น `PriceRangeMatchingService.findMatchForNewBet()`

---

## 🔧 โค้ดที่ต้องแก้ไข

### ไฟล์: `index.js`

**ปัจจุบัน (ผิด):**
```javascript
// เก็บไว้ในตัวแปร messageMap เพื่อรอการจับคู่
messageMap.set(message.messageId, {
  userId: message.userId,
  content: message.content,
  timestamp: message.timestamp,
  groupId: message.groupId,
  userName: userName,
  betAmount: betAmount,
  fireworkName: fireworkName,
  betType: betType
});

console.log(`   📦 Stored in memory: ${fireworkName} ${betType} ${betAmount} บาท`);
```

**ควรเป็น:**
```javascript
// ใช้ bettingRoundController
const bettingRoundController = require('./services/betting/bettingRoundController');

const result = await bettingRoundController.handleMessage({
  message: { text: message.content },
  source: {
    userId: message.userId,
    displayName: userName,
    groupId: message.groupId
  }
});

console.log(`   ✅ Message processed: ${result.text}`);
```

---

## 📌 สรุป

**ปัญหา:** ระบบใช้ in-memory storage แทน Google Sheets

**ผลกระทบ:**
- ❌ ไม่ทำการจับคู่อัตโนมัติ
- ❌ ไม่บันทึกข้อมูลลง Google Sheets
- ❌ ไม่ส่งแจ้งเตือน
- ❌ ข้อมูลหายเมื่อ server restart

**วิธีแก้:** ใช้ `bettingRoundController` แทน `AutoMatchingService`

