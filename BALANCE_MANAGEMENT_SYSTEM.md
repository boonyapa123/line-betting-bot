# ระบบจัดการยอดเงินเดิมพัน (Balance Management System)

## ภาพรวม

ระบบนี้ได้รับการปรับปรุงเพื่อให้สามารถตรวจสอบและจัดการยอดเงินคงเหลือของผู้เล่นได้อย่างแม่นยำ โดยคำนึงถึงเงินเดิมพันที่ค้างอยู่ (Pending Bets) ที่ยังไม่มีผลออก

## ขั้นตอนการทำงาน

### 1. PARSING (แยกข้อมูล)
- เมื่อผู้เล่นส่งข้อความ ระบบจะแยกข้อมูลเช่น "ชล 500 ฟ้าหลังฝน"
- ได้ค่า: amount = 500

### 2. VALIDATION (ตรวจสอบ)
- ตรวจสอบความถูกต้อง: 0 < amount ≤ 1,000,000

### 3. BALANCE CHECK (ตรวจสอบยอดเงิน) ⭐ NEW
- ตรวจสอบยอดเงินคงเหลือ
- **คำนวนเงินค้าง**: รวมเงินเดิมพันทั้งหมดที่จับคู่แล้วแต่ยังไม่มีผล
- **คำนวนเงินที่สามารถใช้ได้**: ยอดคงเหลือ - เงินค้าง
- **ตรวจสอบ**: เงินที่สามารถใช้ได้ >= เงินเดิมพันใหม่
- ถ้าไม่พอ: แจ้งเตือนและหยุดการเดิมพัน

### 4. RECORDING (บันทึก)
- บันทึกลง Google Sheets
- บันทึก amount ลงคอลัมน์ G ของ Bets sheet

### 5. PAIRING (จับคู่) ⭐ UPDATED
- เมื่อจับคู่เดิมพันสองฝั่ง
- ใช้ยอดเงินที่น้อยกว่า: betAmount = Math.min(bet1.amount, bet2.amount)
- **หักเงินทันที**: หักเงินเดิมพันจากยอดคงเหลือของทั้งสองฝั่ง
- ตัวอย่าง:
  - User A เดิมพัน 500 บาท → ยอดเงิน: 1000 → 500
  - User B เดิมพัน 300 บาท → ยอดเงิน: 800 → 500
  - ใช้เงิน 300 บาท (ยอดน้อยกว่า)

### 6. SETTLEMENT (ชำระเงิน)
- เมื่อออกผลลัพธ์
- ชนะ-แพ้: หัก 10% ค่าธรรมเนียม
  - ผู้ชนะ: 300 - 30 = 270 บาท
  - ผู้แพ้: เสีย 300 บาท
- ออกกลาง: หัก 5% ทั้งสองฝั่ง

### 7. BALANCE UPDATE (อัปเดตยอดเงิน)
- อัปเดตยอดคงเหลือตามผลลัพธ์
- ผู้ชนะ: +270 บาท
- ผู้แพ้: -300 บาท (หักไปแล้วในขั้นตอน 5)

## Services ที่เกี่ยวข้อง

### 1. PendingBalanceService (ใหม่)
**ไฟล์**: `services/betting/pendingBalanceService.js`

**ฟังก์ชันหลัก**:
- `getPendingAmount(displayName)` - ดึงเงินค้างทั้งหมดของผู้เล่น
- `checkSufficientBalance(displayName, currentBalance, newBetAmount)` - ตรวจสอบว่ายอดเงินเพียงพอหรือไม่
- `getPendingBetsDetails(displayName)` - ดึงรายละเอียดเงินค้าง
- `buildInsufficientBalanceMessage(checkResult)` - สร้างข้อความแจ้งเตือน

**ตัวอย่างการใช้**:
```javascript
const pendingBalanceService = require('./pendingBalanceService');

// ดึงเงินค้าง
const pendingAmount = await pendingBalanceService.getPendingAmount('John');
// Result: 500 (มีเงินค้าง 500 บาท)

// ตรวจสอบยอดเงิน
const checkResult = await pendingBalanceService.checkSufficientBalance(
  'John',
  1000,  // ยอดคงเหลือ
  300    // เงินเดิมพันใหม่
);
// Result: {
//   isSufficient: true,
//   currentBalance: 1000,
//   pendingAmount: 500,
//   availableBalance: 500,
//   requiredAmount: 300,
//   shortfall: 0
// }
```

### 2. BalanceCheckService (อัปเดต)
**ไฟล์**: `services/betting/balanceCheckService.js`

**การเปลี่ยนแปลง**:
- `checkBalance()` - ตอนนี้รวมการตรวจสอบเงินค้าง
- `buildInsufficientBalanceMessage()` - แสดงรายละเอียดเงินค้าง
- `notifyInsufficientBalance()` - แจ้งเตือนพร้อมรายละเอียดเงินค้าง

**ตัวอย่างการใช้**:
```javascript
const balanceCheckService = require('./balanceCheckService');

// ตรวจสอบยอดเงิน (รวมเงินค้าง)
const checkResult = await balanceCheckService.checkBalance('John', 300);
// Result: {
//   sufficient: true,
//   currentBalance: 1000,
//   pendingAmount: 500,
//   availableBalance: 500,
//   shortfall: 0,
//   registered: true,
//   message: 'ยอดเงินเพียงพอ (500 บาท หลังหักเงินค้าง)'
// }
```

### 3. BettingPairingService (อัปเดต)
**ไฟล์**: `services/betting/bettingPairingService.js`

**ฟังก์ชันใหม่**:
- `deductBetAmount(displayName, betAmount)` - หักเงินเดิมพันจากยอดคงเหลือ
- `getUserBalance(displayName)` - ดึงยอดเงินคงเหลือ (ใช้ DisplayName)

**ตัวอย่างการใช้**:
```javascript
const bettingPairingService = require('./bettingPairingService');

// หักเงินเดิมพัน
const deductResult = await bettingPairingService.deductBetAmount('John', 300);
// Result: {
//   success: true,
//   displayName: 'John',
//   previousBalance: 1000,
//   deductedAmount: 300,
//   newBalance: 700
// }
```

### 4. BettingMatchingService (ใหม่)
**ไฟล์**: `services/betting/bettingMatchingService.js`

**ฟังก์ชันหลัก**:
- `findPairsAndDeductBalance(bets)` - ค้นหาคู่เดิมพันและหักเงินทันที
- `checkBalanceBeforeMatching(displayName, betAmount)` - ตรวจสอบยอดเงินก่อนจับคู่
- `buildMatchingReport(matchingResult)` - สร้างรายงานการจับคู่

**ตัวอย่างการใช้**:
```javascript
const bettingMatchingService = require('./bettingMatchingService');

// ค้นหาคู่และหักเงิน
const matchingResult = await bettingMatchingService.findPairsAndDeductBalance(bets);
// Result: {
//   success: true,
//   pairsFound: 2,
//   pairs: [...],
//   deductionResults: [...]
// }

// ตรวจสอบยอดเงินก่อนจับคู่
const checkResult = await bettingMatchingService.checkBalanceBeforeMatching('John', 300);
// Result: {
//   success: true,
//   isSufficient: true,
//   currentBalance: 1000,
//   pendingAmount: 500,
//   availableBalance: 500,
//   requiredAmount: 300,
//   shortfall: 0
// }
```

## ตัวอย่างการไหลของข้อมูล

### สถานการณ์ 1: ผู้เล่นมีเงินเพียงพอ
```
User A: ยอดเงิน 1000 บาท
User B: ยอดเงิน 800 บาท

1. User A เดิมพัน 500 บาท
   - ตรวจสอบ: 1000 >= 500 ✅
   - บันทึก: ยอดเงิน A = 1000

2. User B เดิมพัน 300 บาท
   - ตรวจสอบ: 800 >= 300 ✅
   - บันทึก: ยอดเงิน B = 800

3. จับคู่สำเร็จ (ใช้ 300 บาท)
   - หักเงิน A: 1000 - 300 = 700 บาท
   - หักเงิน B: 800 - 300 = 500 บาท

4. ออกผลลัพธ์: A ชนะ
   - A ได้: 300 - 30 = 270 บาท → 700 + 270 = 970 บาท
   - B เสีย: 300 บาท → 500 บาท (หักไปแล้ว)
```

### สถานการณ์ 2: ผู้เล่นมีเงินค้างอยู่
```
User A: ยอดเงิน 1000 บาท, เงินค้าง 500 บาท
User B: ยอดเงิน 800 บาท, เงินค้าง 0 บาท

1. User A ต้องการเดิมพัน 600 บาท
   - ตรวจสอบ: (1000 - 500) >= 600 ?
   - เงินที่สามารถใช้ได้: 500 บาท
   - ไม่พอ ❌
   - แจ้งเตือน: "ยอดเงินไม่พอ ขาด 100 บาท (หลังหักเงินค้าง)"

2. User A ต้องการเดิมพัน 400 บาท
   - ตรวจสอบ: (1000 - 500) >= 400 ?
   - เงินที่สามารถใช้ได้: 500 บาท
   - พอ ✅
   - บันทึก: ยอดเงิน A = 1000
```

### สถานการณ์ 3: ผู้เล่นไม่พบในระบบ
```
User C: ไม่พบในระบบ

1. User C ต้องการเดิมพัน 100 บาท
   - ตรวจสอบ: ไม่พบในระบบ ❌
   - แจ้งเตือน: "ยังไม่ได้ลงทะเบียนในระบบ"
```

## การแจ้งเตือน

### 1. เงินไม่พอ (รวมเงินค้าง)
```
⚠️ ⚠️ ⚠️ ยอดเงินไม่พอสำหรับการเดิมพัน ⚠️ ⚠️ ⚠️
👤 John
💰 ยอดเงินคงเหลือ: 1000 บาท
⏳ เงินค้างที่ยังไม่มีผล: 500 บาท
✅ เงินที่สามารถใช้ได้: 500 บาท
❌ ต้องการเงิน: 600 บาท
📉 เงินขาด: 100 บาท

กรุณารอผลการเล่นก่อนหน้า หรือเติมเงินเพิ่มเติม
```

### 2. ไม่พบในระบบ
```
❌ ❌ ❌ ยังไม่ได้ลงทะเบียนในระบบ ❌ ❌ ❌

👤 John

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  คุณยังไม่ได้ลงทะเบียนในระบบ

💡 วิธีแก้ไข (เติมเงินเพื่อลงทะเบียน):
1️⃣  โอนเงินเข้าระบบ
2️⃣  ส่งสลิปการโอนให้ระบบตรวจสอบ
3️⃣  รอการยืนยันจากระบบ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 ติดต่อแอดมิน หากมีปัญหา
🔗 เข้าร่วมกลุ่ม: https://lin.ee/JO6X7FE
```

## ข้อมูลเพิ่มเติม

### Google Sheets Schema
**Bets Sheet**:
- Column A: Timestamp
- Column B: User A ID
- Column C: ชื่อ User A
- Column D: ข้อความ A
- Column E: ชื่อบั้งไฟ
- Column F: รายการเล่น
- Column G: ยอดเงิน A
- Column H: ยอดเงิน B (ว่างเปล่า = ยังไม่จับคู่)
- Column I: แสดงผล (ว่างเปล่า = ยังไม่มีผล)
- Column J: แสดงผลชนะ
- Column K: User B ID
- Column L: ชื่อ User B
- Column M: รายการเล่น B
- Column N: ผลลัพธ์สุดท้าย

**UsersBalance Sheet**:
- Column A: User ID
- Column B: Display Name (ชื่อ LINE)
- Column C: Balance (ยอดเงินคงเหลือ)

### การคำนวนเงินค้าง
```javascript
// ตรวจสอบแถวใน Bets Sheet
for (const row of betsData) {
  const userAName = row[2];      // Column C
  const userBName = row[11];     // Column L
  const status = row[8] || '';   // Column I: แสดงผล
  const isMATCHED = row[7] !== undefined && row[7] !== ''; // Column H
  const hasNoResult = status === '' || status === undefined;

  if (isMATCHED && hasNoResult) {
    // เป็นการเล่นที่จับคู่แล้วแต่ยังไม่มีผล
    if (userAName === displayName) {
      pendingAmount += parseInt(row[6]) || 0; // Column G
    } else if (userBName === displayName) {
      pendingAmount += parseInt(row[7]) || 0; // Column H
    }
  }
}
```

## สรุป

ระบบจัดการยอดเงินเดิมพันใหม่นี้ช่วยให้:
1. ✅ ตรวจสอบยอดเงินอย่างแม่นยำ (รวมเงินค้าง)
2. ✅ หักเงินทันทีเมื่อจับคู่สำเร็จ
3. ✅ ป้องกันการเดิมพันเกินเงินที่มี
4. ✅ แจ้งเตือนผู้เล่นอย่างชัดเจน
5. ✅ ติดตามเงินค้างได้อย่างละเอียด
