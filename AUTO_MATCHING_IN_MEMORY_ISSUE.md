# 🔴 ปัญหา: AutoMatchingService + In-Memory ไม่ทำงาน

## 📋 สรุปปัญหา

ระบบไม่ทำการจับคู่อัตโนมัติแม้ว่า:
- ✅ บั้งไฟตรงกัน (340-370)
- ✅ อยู่ฝั่งตรงข้าม (ย vs ล)
- ✅ ยอดเงินเพียงพอ

---

## 🔍 สาเหตุ

### ปัญหา 1: ค้นหาคู่จาก Google Sheets ไม่ได้

**โค้ดปัจจุบัน (ผิด):**
```javascript
// ดึงข้อมูลการเดิมพันทั้งหมดจาก Google Sheets
const response = await sheets.spreadsheets.values.get({
  auth: googleAuth,
  spreadsheetId: GOOGLE_SHEET_ID,
  range: `${GOOGLE_WORKSHEET_NAME}!A:O`,
});

const rows = response.data.values || [];
const matchingBets = [];

// ค้นหาการเดิมพันที่ยังไม่มีผลลัพธ์ และเล่นบั้งไฟเดียวกัน
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row) continue;
  
  const rowFireworkName = row[4] || ''; // Column E
  const rowResultA = row[9] || ''; // Column J
  const rowResultB = row[10] || ''; // Column K
  const rowUserA = row[1] || ''; // Column B
  const rowUserB = row[11] || ''; // Column L
  const rowBetTypeA = row[5] || ''; // Column F
  
  // ตรวจสอบว่าเป็นการเดิมพันที่ยังไม่มีผลลัพธ์ และเล่นบั้งไฟเดียวกัน
  if (!rowResultA && !rowResultB && 
      rowFireworkName === fireworkName &&
      rowUserA !== message.userId && rowUserB !== message.userId) {
    
    // ตรวจสอบว่าประเภทเดิมพันตรงข้ามกันหรือไม่
    const isOpposite = (typeA, typeB) => {
      const opposites = {
        '✅': '❌',
        '❌': '✅',
        'ต่ำ/ยั่ง': 'สูง/ไล่',
        'สูง/ไล่': 'ต่ำ/ยั่ง',
        'ถอย': 'ยั้ง',
        'ยั้ง': 'ถอย',
        'ล่าง': 'บน',
        'บน': 'ล่าง'
      };
      return opposites[typeA] === typeB;
    };
    
    if (isOpposite(rowBetTypeA, betType)) {
      matchingBets.push({...});
    }
  }
}
```

**ปัญหา:**
1. ❌ ค้นหาจาก Column J (ผลลัพธ์ User A) แต่ควรค้นหาจาก Column I (ผลแพ้ชนะ)
2. ❌ ตรวจสอบ `rowUserB !== message.userId` แต่ rowUserB ยังว่างเปล่า (ยังไม่มี User B)
3. ❌ ไม่ได้ตรวจสอบ groupId (อาจจับคู่ข้ามกลุ่ม)
4. ❌ ไม่ได้ตรวจสอบราคา (สำหรับ Method 2)

---

### ปัญหา 2: เก็บข้อมูลลงหน่วยความจำแต่ไม่ค้นหา

**โค้ดปัจจุบัน:**
```javascript
if (matchingBets.length === 0) {
  console.log(`⏭️  No matching bets found, storing in memory for future matching...`);
  
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
}
```

**ปัญหา:**
- ✅ บันทึกข้อมูลลงหน่วยความจำ
- ❌ **ไม่มีการค้นหาคู่จากหน่วยความจำ**
- ❌ ข้อมูลหายเมื่อ server restart

---

### ปัญหา 3: ไม่มีการค้นหาคู่จากหน่วยความจำ

**ไม่มีโค้ดที่:**
```javascript
// ค้นหาคู่จากหน่วยความจำ
for (const [messageId, storedBet] of messageMap.entries()) {
  if (storedBet.fireworkName === fireworkName &&
      storedBet.groupId === message.groupId &&
      isOpposite(storedBet.betType, betType)) {
    // พบคู่! ทำการจับคู่
  }
}
```

---

## 📊 ตัวอย่างการทำงานปัจจุบัน

```
User A: "340-370 ย 100 ศ."
  ↓
[Parse] → ✅ ถูกต้อง
[Check Balance] → ✅ เพียงพอ
[Find Match in Sheets] → ❌ ไม่พบ (โค้ดผิด)
[Store in Memory] → ✅ บันทึก
⏭️  No pair detected

User B: "340-370 ล 100 ศ."
  ↓
[Parse] → ✅ ถูกต้อง
[Check Balance] → ✅ เพียงพอ
[Find Match in Sheets] → ❌ ไม่พบ (โค้ดผิด)
[Find Match in Memory] → ❌ ไม่มีโค้ด!
[Store in Memory] → ✅ บันทึก
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
- ✅ โค้ดทดสอบแล้ว

**ขั้นตอน:**
```javascript
const bettingRoundController = require('./services/betting/bettingRoundController');

const result = await bettingRoundController.handleMessage({
  message: { text: message.content },
  source: {
    userId: message.userId,
    displayName: userName,
    groupId: message.groupId
  }
});
```

### ตัวเลือกที่ 2: แก้ไข `index.js` ให้ค้นหาคู่จากหน่วยความจำ

**ขั้นตอน:**
1. เพิ่มโค้ดค้นหาคู่จาก `messageMap`
2. ตรวจสอบ groupId
3. ตรวจสอบราคา (สำหรับ Method 2)
4. ตรวจสอบฝั่งตรงข้าม

---

## 📌 สรุป

**ปัญหา:** 
- ❌ ค้นหาคู่จาก Google Sheets ผิด
- ❌ ไม่มีการค้นหาคู่จากหน่วยความจำ

**ผลกระทบ:**
- ❌ ไม่ทำการจับคู่อัตโนมัติ
- ❌ ไม่บันทึกข้อมูลลง Google Sheets
- ❌ ไม่ส่งแจ้งเตือน

**วิธีแก้:** ใช้ `bettingRoundController` แทน

