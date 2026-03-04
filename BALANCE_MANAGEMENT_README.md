# Balance Management System - README

## 🎯 วัตถุประสงค์

ระบบจัดการยอดเงินเดิมพันได้รับการปรับปรุงเพื่อให้สามารถ:
1. ✅ ตรวจสอบยอดเงินคงเหลือ (รวมเงินค้าง)
2. ✅ หักเงินทันทีเมื่อจับคู่สำเร็จ
3. ✅ ป้องกันการเดิมพันเกินเงินที่มี
4. ✅ แจ้งเตือนผู้เล่นอย่างชัดเจน
5. ✅ ติดตามเงินค้างได้อย่างละเอียด

---

## 📦 ไฟล์ที่เพิ่มเติม

### Services (2 ไฟล์)
1. **`services/betting/pendingBalanceService.js`** - บริการตรวจสอบเงินค้าง
2. **`services/betting/bettingMatchingService.js`** - บริการจัดการการจับคู่และหักเงิน

### Documentation (5 ไฟล์)
1. **`BALANCE_MANAGEMENT_SYSTEM.md`** - เอกสารอธิบายระบบ
2. **`BALANCE_MANAGEMENT_USAGE.md`** - คู่มือการใช้งาน
3. **`BALANCE_MANAGEMENT_API.md`** - API Documentation
4. **`IMPLEMENTATION_SUMMARY.md`** - สรุปการเปลี่ยนแปลง
5. **`INSTALLATION_CHECKLIST.md`** - Checklist การติดตั้ง

### Examples (1 ไฟล์)
1. **`examples/balance-management-example.js`** - ตัวอย่างการใช้งาน 10 ตัวอย่าง

### Updated Services (2 ไฟล์)
1. **`services/betting/balanceCheckService.js`** - อัปเดตการตรวจสอบยอดเงิน
2. **`services/betting/bettingPairingService.js`** - เพิ่มการหักเงิน

---

## 🚀 Quick Start

### 1. Initialize Services
```javascript
const balanceCheckService = require('./services/betting/balanceCheckService');
const pendingBalanceService = require('./services/betting/pendingBalanceService');

await balanceCheckService.initialize();
await pendingBalanceService.initialize();
```

### 2. ตรวจสอบยอดเงิน
```javascript
const checkResult = await balanceCheckService.checkBalance('John', 300);
console.log(checkResult);
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

### 3. ดึงรายละเอียดเงินค้าง
```javascript
const pendingBets = await pendingBalanceService.getPendingBetsDetails('John');
console.log(pendingBets);
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

### 4. หักเงินเดิมพัน
```javascript
const deductResult = await bettingPairingService.deductBetAmount('John', 300);
console.log(deductResult);
// {
//   success: true,
//   displayName: 'John',
//   previousBalance: 1000,
//   deductedAmount: 300,
//   newBalance: 700
// }
```

---

## 📊 ตัวอย่างการไหลของข้อมูล

### สถานการณ์: ผู้เล่นมีเงินค้างอยู่

```
User A: ยอดเงิน 1000 บาท, เงินค้าง 500 บาท

1. User A ต้องการเดิมพัน 600 บาท
   ✓ ตรวจสอบยอดเงิน:
     - ยอดคงเหลือ: 1000 บาท
     - เงินค้าง: 500 บาท
     - เงินที่สามารถใช้ได้: 500 บาท
     - ต้องการเงิน: 600 บาท
     - ผลลัพธ์: ไม่พอ ❌
   
   ✓ แจ้งเตือน:
     "⚠️ ยอดเงินไม่พอ
      ยอดเงินคงเหลือ: 1000 บาท
      เงินค้าง: 500 บาท
      เงินที่สามารถใช้ได้: 500 บาท
      ต้องการเงิน: 600 บาท
      เงินขาด: 100 บาท"

2. User A ต้องการเดิมพัน 400 บาท
   ✓ ตรวจสอบยอดเงิน:
     - ยอดคงเหลือ: 1000 บาท
     - เงินค้าง: 500 บาท
     - เงินที่สามารถใช้ได้: 500 บาท
     - ต้องการเงิน: 400 บาท
     - ผลลัพธ์: พอ ✅
   
   ✓ บันทึกการเล่น
   ✓ จับคู่สำเร็จ (ใช้ 300 บาท)
   ✓ หักเงิน:
     - ยอดเงินเดิม: 1000 บาท
     - หักเงิน: 300 บาท
     - ยอดเงินใหม่: 700 บาท
```

---

## 🔍 ฟังก์ชันหลัก

### PendingBalanceService
- `getPendingAmount(displayName)` - ดึงเงินค้างทั้งหมด
- `checkSufficientBalance(displayName, currentBalance, newBetAmount)` - ตรวจสอบยอดเงิน
- `getPendingBetsDetails(displayName)` - ดึงรายละเอียดเงินค้าง
- `buildInsufficientBalanceMessage(checkResult)` - สร้างข้อความแจ้งเตือน

### BalanceCheckService (อัปเดต)
- `checkBalance(lineName, requiredAmount)` - ตรวจสอบยอดเงิน (รวมเงินค้าง)
- `checkAndNotify(lineName, requiredAmount, userId, accountNumber, groupId)` - ตรวจสอบและแจ้งเตือน

### BettingPairingService (อัปเดต)
- `deductBetAmount(displayName, betAmount)` - หักเงินเดิมพัน
- `getUserBalance(displayName)` - ดึงยอดเงิน (ใช้ DisplayName)
- `findPairsAndDeductBalance(bets)` - ค้นหาคู่และหักเงิน

### BettingMatchingService
- `findPairsAndDeductBalance(bets)` - ค้นหาคู่และหักเงิน
- `checkBalanceBeforeMatching(displayName, betAmount)` - ตรวจสอบยอดเงิน
- `buildMatchingReport(matchingResult)` - สร้างรายงาน

---

## 📚 เอกสาร

| ไฟล์ | วัตถุประสงค์ |
|-----|-----------|
| `BALANCE_MANAGEMENT_SYSTEM.md` | ภาพรวมระบบและขั้นตอนการทำงาน |
| `BALANCE_MANAGEMENT_USAGE.md` | คู่มือการใช้งานและตัวอย่าง |
| `BALANCE_MANAGEMENT_API.md` | API Documentation ทั้งหมด |
| `IMPLEMENTATION_SUMMARY.md` | สรุปการเปลี่ยนแปลงและการติดตั้ง |
| `INSTALLATION_CHECKLIST.md` | Checklist การติดตั้งและทดสอบ |

---

## 🧪 ทดสอบ

### รันตัวอย่างทั้งหมด
```bash
node examples/balance-management-example.js
```

### ตรวจสอบ Syntax
```bash
node -c services/betting/pendingBalanceService.js
node -c services/betting/bettingMatchingService.js
node -c services/betting/balanceCheckService.js
node -c services/betting/bettingPairingService.js
```

---

## ⚙️ Configuration

### Environment Variables
```bash
GOOGLE_SHEET_ID=your_spreadsheet_id
GOOGLE_WORKSHEET_NAME=Bets
GOOGLE_CREDENTIALS_JSON=your_credentials_json
# หรือ
GOOGLE_SERVICE_ACCOUNT_KEY=path/to/credentials.json
```

### Google Sheets Schema
**Bets Sheet**: Columns A-N
**UsersBalance Sheet**: Columns A-C
**Transactions Sheet**: Columns A-G

---

## 🎓 ตัวอย่างการใช้งาน

### ตัวอย่างที่ 1: ตรวจสอบยอดเงิน
```javascript
const result = await balanceCheckService.checkBalance('John', 300);
if (!result.sufficient) {
  console.log('Insufficient balance');
}
```

### ตัวอย่างที่ 2: ดึงรายละเอียดเงินค้าง
```javascript
const pendingBets = await pendingBalanceService.getPendingBetsDetails('John');
console.log(`Pending bets: ${pendingBets.length}`);
```

### ตัวอย่างที่ 3: หักเงินเดิมพัน
```javascript
const result = await bettingPairingService.deductBetAmount('John', 300);
if (result.success) {
  console.log(`New balance: ${result.newBalance}`);
}
```

### ตัวอย่างที่ 4: ค้นหาคู่และหักเงิน
```javascript
const result = await bettingMatchingService.findPairsAndDeductBalance(bets);
console.log(`Pairs found: ${result.pairsFound}`);
```

---

## 🔐 Security

- ✅ ตรวจสอบยอดเงินก่อนเดิมพัน
- ✅ หักเงินทันทีเมื่อจับคู่สำเร็จ
- ✅ ป้องกันการเดิมพันเกินเงินที่มี
- ✅ บันทึกธุรกรรมทั้งหมด
- ✅ แจ้งเตือนผู้เล่นอย่างชัดเจน

---

## 📈 Performance

- ✅ ใช้ Google Sheets API อย่างมีประสิทธิภาพ
- ✅ Cache ข้อมูลเมื่อเป็นไปได้
- ✅ Batch operations สำหรับหลายรายการ
- ✅ Monitor API usage

---

## 🐛 Troubleshooting

### ปัญหา: ยอดเงินไม่ถูกต้อง
**วิธีแก้:**
1. ตรวจสอบว่า displayName ตรงกับชื่อใน UsersBalance sheet
2. ตรวจสอบว่า Bets sheet มีข้อมูลถูกต้อง
3. ตรวจสอบว่าเงินค้างถูกคำนวนถูกต้อง

### ปัญหา: Google Sheets API Error
**วิธีแก้:**
1. ตรวจสอบว่า credentials ถูกต้อง
2. ตรวจสอบว่า Spreadsheet ID ถูกต้อง
3. ตรวจสอบว่า Service Account มีสิทธิ์เขียนข้อมูล

---

## 📞 Support

หากมีปัญหา โปรดตรวจสอบ:
1. `BALANCE_MANAGEMENT_SYSTEM.md` - ภาพรวมระบบ
2. `BALANCE_MANAGEMENT_USAGE.md` - คู่มือการใช้งาน
3. `BALANCE_MANAGEMENT_API.md` - API Documentation
4. `INSTALLATION_CHECKLIST.md` - Checklist การติดตั้ง

---

## 📝 Version

**Version**: 1.0.0
**Release Date**: 2024-03-04
**Status**: Production Ready

---

## ✨ Summary

ระบบจัดการยอดเงินเดิมพันใหม่นี้ช่วยให้:
1. ✅ ตรวจสอบยอดเงินอย่างแม่นยำ (รวมเงินค้าง)
2. ✅ หักเงินทันทีเมื่อจับคู่สำเร็จ
3. ✅ ป้องกันการเดิมพันเกินเงินที่มี
4. ✅ แจ้งเตือนผู้เล่นอย่างชัดเจน
5. ✅ ติดตามเงินค้างได้อย่างละเอียด

ระบบนี้ช่วยให้การจัดการเงินเดิมพันมีความปลอดภัยและโปร่งใสมากขึ้น

---

## 📄 License

ระบบนี้เป็นส่วนหนึ่งของโปรเจกต์เดิมพัน

---

## 🙏 Thank You

ขอบคุณที่ใช้ระบบจัดการยอดเงินเดิมพันใหม่นี้
