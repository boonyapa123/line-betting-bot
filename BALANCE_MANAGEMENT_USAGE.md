# คู่มือการใช้งาน Balance Management System

## ภาพรวมระบบ

ระบบจัดการยอดเงินเดิมพันได้รับการปรับปรุงเพื่อให้สามารถ:
1. ✅ ตรวจสอบยอดเงินคงเหลือ (รวมเงินค้าง)
2. ✅ หักเงินทันทีเมื่อจับคู่สำเร็จ
3. ✅ ป้องกันการเดิมพันเกินเงินที่มี
4. ✅ แจ้งเตือนผู้เล่นอย่างชัดเจน
5. ✅ ติดตามเงินค้างได้อย่างละเอียด

## ไฟล์ที่เพิ่มเติม

### 1. `services/betting/pendingBalanceService.js` (ใหม่)
บริการสำหรับตรวจสอบและจัดการเงินค้าง

**ฟังก์ชันหลัก**:
- `getPendingAmount(displayName)` - ดึงเงินค้างทั้งหมด
- `checkSufficientBalance(displayName, currentBalance, newBetAmount)` - ตรวจสอบยอดเงิน
- `getPendingBetsDetails(displayName)` - ดึงรายละเอียดเงินค้าง
- `buildInsufficientBalanceMessage(checkResult)` - สร้างข้อความแจ้งเตือน
- `buildPendingBetsMessage(pendingBets)` - สร้างข้อความรายละเอียดเงินค้าง

### 2. `services/betting/bettingMatchingService.js` (ใหม่)
บริการสำหรับจัดการการจับคู่เดิมพันและหักเงิน

**ฟังก์ชันหลัก**:
- `findPairsAndDeductBalance(bets)` - ค้นหาคู่และหักเงินทันที
- `checkBalanceBeforeMatching(displayName, betAmount)` - ตรวจสอบยอดเงินก่อนจับคู่
- `buildMatchingReport(matchingResult)` - สร้างรายงานการจับคู่

### 3. ไฟล์ที่อัปเดต

#### `services/betting/balanceCheckService.js`
- อัปเดต `checkBalance()` - ตอนนี้รวมการตรวจสอบเงินค้าง
- อัปเดต `buildInsufficientBalanceMessage()` - แสดงรายละเอียดเงินค้าง
- อัปเดต `notifyInsufficientBalance()` - แจ้งเตือนพร้อมรายละเอียดเงินค้าง

#### `services/betting/bettingPairingService.js`
- เพิ่ม `deductBetAmount(displayName, betAmount)` - หักเงินเดิมพัน
- เพิ่ม `getUserBalance(displayName)` - ดึงยอดเงิน (ใช้ DisplayName)
- เพิ่ม `findPairsAndDeductBalance(bets)` - ค้นหาคู่และหักเงิน

## วิธีการใช้งาน

### ตัวอย่างที่ 1: ตรวจสอบยอดเงิน (รวมเงินค้าง)

```javascript
const balanceCheckService = require('./services/betting/balanceCheckService');

// ตรวจสอบยอดเงินของ John สำหรับการเดิมพัน 300 บาท
const checkResult = await balanceCheckService.checkBalance('John', 300);

console.log(checkResult);
// Output:
// {
//   sufficient: true,
//   currentBalance: 1000,
//   pendingAmount: 500,
//   availableBalance: 500,
//   shortfall: 0,
//   registered: true,
//   message: 'ยอดเงินเพียงพอ (500 บาท หลังหักเงินค้าง)'
// }
```

### ตัวอย่างที่ 2: ดึงรายละเอียดเงินค้าง

```javascript
const pendingBalanceService = require('./services/betting/pendingBalanceService');

// ดึงรายละเอียดเงินค้างของ John
const pendingBets = await pendingBalanceService.getPendingBetsDetails('John');

console.log(pendingBets);
// Output:
// [
//   {
//     timestamp: '2024-03-04T10:30:00.000Z',
//     slipName: 'ฟ้าหลังฝน',
//     side: 'ชล',
//     amount: 500,
//     opponent: 'Jane',
//     opponentAmount: 300,
//     status: 'PENDING'
//   }
// ]
```

### ตัวอย่างที่ 3: หักเงินเดิมพัน

```javascript
const bettingPairingService = require('./services/betting/bettingPairingService');

// หักเงิน 300 บาทจาก John
const deductResult = await bettingPairingService.deductBetAmount('John', 300);

console.log(deductResult);
// Output:
// {
//   success: true,
//   displayName: 'John',
//   previousBalance: 1000,
//   deductedAmount: 300,
//   newBalance: 700
// }
```

### ตัวอย่างที่ 4: ค้นหาคู่เดิมพันและหักเงิน

```javascript
const bettingMatchingService = require('./services/betting/bettingMatchingService');

// ข้อมูลการเล่น
const bets = [
  {
    timestamp: new Date().toISOString(),
    userId: 'U001',
    displayName: 'John',
    method: 1,
    slipName: 'ฟ้าหลังฝน',
    side: 'ชล',
    sideCode: 'ชล',
    amount: 500,
    status: '',
  },
  {
    timestamp: new Date().toISOString(),
    userId: 'U002',
    displayName: 'Jane',
    method: 1,
    slipName: 'ฟ้าหลังฝน',
    side: 'ชถ',
    sideCode: 'ชถ',
    amount: 300,
    status: '',
  },
];

// ค้นหาคู่และหักเงิน
const matchingResult = await bettingMatchingService.findPairsAndDeductBalance(bets);

console.log(matchingResult);
// Output:
// {
//   success: true,
//   pairsFound: 1,
//   pairs: [...],
//   deductionResults: [...]
// }
```

### ตัวอย่างที่ 5: ตรวจสอบและแจ้งเตือนยอดเงิน

```javascript
const balanceCheckService = require('./services/betting/balanceCheckService');

// ตรวจสอบและแจ้งเตือน
const checkResult = await balanceCheckService.checkAndNotify(
  'John',
  500,
  'U001',
  1,
  'C123456789'
);

// ถ้ายอดเงินไม่พอ ระบบจะส่งการแจ้งเตือนไปยัง LINE
```

## การไหลของข้อมูลในระบบ

### ขั้นตอนการเดิมพัน

```
1. ผู้เล่นส่งข้อความเดิมพัน
   ↓
2. ระบบแยกข้อมูล (PARSING)
   ↓
3. ระบบตรวจสอบความถูกต้อง (VALIDATION)
   ↓
4. ระบบตรวจสอบยอดเงิน (BALANCE CHECK) ⭐ NEW
   - ดึงยอดเงินคงเหลือ
   - ดึงเงินค้าง
   - คำนวนเงินที่สามารถใช้ได้
   - ตรวจสอบว่าเพียงพอหรือไม่
   ↓
5. ถ้าเพียงพอ → บันทึกการเล่น (RECORDING)
   ถ้าไม่พอ → แจ้งเตือนและหยุด
   ↓
6. ระบบค้นหาคู่เดิมพัน (PAIRING)
   ↓
7. ถ้าจับคู่สำเร็จ → หักเงินทันที (DEDUCT) ⭐ NEW
   ↓
8. เมื่อออกผลลัพธ์ → ชำระเงิน (SETTLEMENT)
   ↓
9. อัปเดตยอดเงิน (BALANCE UPDATE)
```

## ตัวอย่างสถานการณ์

### สถานการณ์ 1: ผู้เล่นมีเงินเพียงพอ

```
User A: ยอดเงิน 1000 บาท, เงินค้าง 0 บาท
User B: ยอดเงิน 800 บาท, เงินค้าง 0 บาท

1. User A เดิมพัน 500 บาท
   - ตรวจสอบ: (1000 - 0) >= 500 ✅
   - บันทึก: ยอดเงิน A = 1000

2. User B เดิมพัน 300 บาท
   - ตรวจสอบ: (800 - 0) >= 300 ✅
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

## ข้อมูลที่เก็บใน Google Sheets

### Bets Sheet
```
Column A: Timestamp
Column B: User A ID
Column C: ชื่อ User A
Column D: ข้อความ A
Column E: ชื่อบั้งไฟ
Column F: รายการเล่น
Column G: ยอดเงิน A
Column H: ยอดเงิน B (ว่างเปล่า = ยังไม่จับคู่)
Column I: แสดงผล (ว่างเปล่า = ยังไม่มีผล)
Column J: แสดงผลชนะ
Column K: User B ID
Column L: ชื่อ User B
Column M: รายการเล่น B
Column N: ผลลัพธ์สุดท้าย
```

### UsersBalance Sheet
```
Column A: User ID
Column B: Display Name (ชื่อ LINE)
Column C: Balance (ยอดเงินคงเหลือ)
```

## การคำนวนเงินค้าง

ระบบจะตรวจสอบแถวใน Bets Sheet และหาการเล่นที่:
1. มีค่าในคอลัมน์ H (ยอดเงิน B) = จับคู่แล้ว
2. คอลัมน์ I (แสดงผล) ว่างเปล่า = ยังไม่มีผล

จากนั้นรวมจำนวนเงินของผู้เล่นนั้น

```javascript
// ตัวอย่างการคำนวน
let pendingAmount = 0;

for (const row of betsData) {
  const userAName = row[2];      // Column C
  const userBName = row[11];     // Column L
  const status = row[8] || '';   // Column I: แสดงผล
  const isMATCHED = row[7] !== undefined && row[7] !== ''; // Column H
  const hasNoResult = status === '' || status === undefined;

  if (isMATCHED && hasNoResult) {
    if (userAName === displayName) {
      pendingAmount += parseInt(row[6]) || 0; // Column G
    } else if (userBName === displayName) {
      pendingAmount += parseInt(row[7]) || 0; // Column H
    }
  }
}
```

## ข้อมูลการแจ้งเตือน

### เงินไม่พอ (รวมเงินค้าง)
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

### ไม่พบในระบบ
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

## การทดสอบ

### รันตัวอย่างทั้งหมด
```bash
node examples/balance-management-example.js
```

### รันตัวอย่างเฉพาะ
```javascript
const examples = require('./examples/balance-management-example');

// รันตัวอย่างที่ 1
await examples.example1_checkBalance();

// รันตัวอย่างที่ 2
await examples.example2_getPendingBetsDetails();

// เป็นต้น...
```

## สรุป

ระบบจัดการยอดเงินเดิมพันใหม่นี้ช่วยให้:
1. ✅ ตรวจสอบยอดเงินอย่างแม่นยำ (รวมเงินค้าง)
2. ✅ หักเงินทันทีเมื่อจับคู่สำเร็จ
3. ✅ ป้องกันการเดิมพันเกินเงินที่มี
4. ✅ แจ้งเตือนผู้เล่นอย่างชัดเจน
5. ✅ ติดตามเงินค้างได้อย่างละเอียด

ระบบนี้ช่วยให้การจัดการเงินเดิมพันมีความปลอดภัยและโปร่งใสมากขึ้น
