# ✅ แก้ไข index.js - ใช้ bettingRoundController

## 📋 ปัญหาที่แก้ไข

### ❌ ปัญหาเดิม
1. **ค้นหาคู่จาก Google Sheets ผิด** - ใช้ Column J (row[9]) แทน Column I (row[8]) สำหรับ RESULT
2. **ไม่ตรวจสอบ groupId** - ไม่มีการตรวจสอบว่าผู้เล่นอยู่ในกลุ่มเดียวกัน
3. **ไม่ตรวจสอบราคา** - ไม่มี price range matching
4. **เก็บลงหน่วยความจำแต่ไม่ค้นหา** - ใช้ messageMap แต่ไม่มีการค้นหาที่ถูกต้อง

### ✅ วิธีแก้ไข
แทนที่ส่วนเก่าที่ใช้ Column J ผิด ด้วย **bettingRoundController** ที่ทำงานถูกต้องแล้ว

## 🔧 การเปลี่ยนแปลง

### ตำแหน่ง: ไฟล์ index.js บรรทัด ~1950-2200

**ก่อน:**
```javascript
// ❌ ส่วนเก่าที่ใช้ Column J ผิด
const betAmount = extractBetAmount(message.content);

if (betAmount > 0) {
  // ตรวจสอบยอดเงินของผู้เล่น
  const playerBalanceData = await getPlayerBalance(message.userId, userName);
  
  // 🎯 AUTO MATCHING: ตรวจชื่อบั้งไฟต้องตรงกัน
  const response = await sheets.spreadsheets.values.get({
    auth: googleAuth,
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${GOOGLE_WORKSHEET_NAME}!A:O`,
  });
  
  const rows = response.data.values || [];
  
  // ❌ ค้นหาการเดิมพันที่ยังไม่มีผลลัพธ์
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowResultA = row[9] || ''; // ❌ Column J ผิด!
    const rowResultB = row[10] || ''; // ❌ Column K ผิด!
    
    if (!rowResultA && !rowResultB && ...) {
      // ค้นหาคู่
    }
  }
}
```

**หลังจาก:**
```javascript
// ✅ ใช้ bettingRoundController ที่ทำงานถูกต้องแล้ว
console.log(`🎯 Using bettingRoundController for message processing`);

try {
  const bettingRoundController = require('./services/betting/bettingRoundController');
  
  // เตรียมข้อมูลสำหรับ bettingRoundController
  const result = await bettingRoundController.handleMessage({
    message: {
      text: message.content
    },
    source: {
      userId: message.userId,
      displayName: await getLineUserProfile(message.userId, accessToken),
      groupId: message.groupId
    }
  });
  
  console.log(`✅ bettingRoundController processed successfully`);
  console.log(`   Result:`, result);
  
} catch (controllerError) {
  console.error(`❌ bettingRoundController error: ${controllerError.message}`);
  console.error(controllerError.stack);
}
```

## 🎯 ประโยชน์ของการแก้ไข

### bettingRoundController ทำงาน:
✅ **บันทึกข้อมูลลง Google Sheets** - ถูกต้องตามคอลัมน์ที่กำหนด
✅ **ค้นหาคู่จาก Google Sheets** - ใช้ Column I (row[8]) ที่ถูกต้อง
✅ **ตรวจสอบ groupId** - ตรวจสอบว่าผู้เล่นอยู่ในกลุ่มเดียวกัน
✅ **ตรวจสอบราคา** - ใช้ price range matching ที่ถูกต้อง
✅ **ส่งแจ้งเตือน** - ส่งข้อความแจ้งเตือนให้ผู้เล่นทั้งสองฝั่ง

## 📊 คอลัมน์ที่ถูกต้อง (จาก betsSheetColumns.js)

| Column | Index | ชื่อ | ใช้สำหรับ |
|--------|-------|------|---------|
| A | 0 | Timestamp | เวลาบันทึก |
| B | 1 | User A ID | ID ผู้เล่น A |
| C | 2 | ชื่อ User A | ชื่อผู้เล่น A |
| D | 3 | ข้อความ A | ข้อความแทง A |
| E | 4 | ชื่อบั้งไฟ | ชื่อบั้งไฟ |
| F | 5 | รายการเล่น (ฝั่ง A) | ประเภทแทง A |
| G | 6 | ยอดเงิน | ยอดเงิน A |
| H | 7 | ยอดเงิน B | ยอดเงิน B |
| **I** | **8** | **ผลที่ออก** | **ผลลัพธ์** ✅ |
| J | 9 | ผลแพ้ชนะ | ผลแพ้ชนะ |
| K | 10 | User B ID | ID ผู้เล่น B |
| L | 11 | ชื่อ User B | ชื่อผู้เล่น B |
| M | 12 | รายการแทง (ฝั่ง B) | ประเภทแทง B |
| N | 13 | ชื่อกลุ่มแชท | ชื่อกลุ่ม |
| O | 14 | ชื่อกลุ่ม | ชื่อกลุ่ม |

## ✅ ตรวจสอบแล้ว

- ✅ ไฟล์ index.js ไม่มี syntax errors
- ✅ ลบส่วนเก่าที่ใช้ Column J ผิด
- ✅ เพิ่ม bettingRoundController ที่ถูกต้อง
- ✅ ยังคงเก็บส่วน detectPair สำหรับ reply matching

## 📝 หมายเหตุ

- bettingRoundController จะจัดการทั้งหมด:
  - ✅ ตรวจสอบยอดเงิน
  - ✅ ตรวจสอบ groupId
  - ✅ ตรวจสอบราคา
  - ✅ ค้นหาคู่ที่ถูกต้อง
  - ✅ บันทึกลง Google Sheets
  - ✅ ส่งแจ้งเตือน

- ส่วน detectPair ยังคงใช้สำหรับ reply matching (ตอบกลับข้อความ)
