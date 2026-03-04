# Balance Management System - Installation Checklist

## ✅ ไฟล์ที่สร้างใหม่

### Services
- [x] `services/betting/pendingBalanceService.js` - บริการตรวจสอบเงินค้าง
- [x] `services/betting/bettingMatchingService.js` - บริการจัดการการจับคู่และหักเงิน

### Documentation
- [x] `BALANCE_MANAGEMENT_SYSTEM.md` - เอกสารอธิบายระบบ
- [x] `BALANCE_MANAGEMENT_USAGE.md` - คู่มือการใช้งาน
- [x] `BALANCE_MANAGEMENT_API.md` - API Documentation
- [x] `IMPLEMENTATION_SUMMARY.md` - สรุปการเปลี่ยนแปลง
- [x] `INSTALLATION_CHECKLIST.md` - Checklist การติดตั้ง

### Examples
- [x] `examples/balance-management-example.js` - ตัวอย่างการใช้งาน

---

## ✅ ไฟล์ที่อัปเดต

### Services
- [x] `services/betting/balanceCheckService.js` - อัปเดตการตรวจสอบยอดเงิน
- [x] `services/betting/bettingPairingService.js` - เพิ่มการหักเงิน

---

## 📋 Checklist การติดตั้ง

### 1. ตรวจสอบไฟล์
- [ ] ตรวจสอบว่า `pendingBalanceService.js` มีอยู่ใน `services/betting/`
- [ ] ตรวจสอบว่า `bettingMatchingService.js` มีอยู่ใน `services/betting/`
- [ ] ตรวจสอบว่า `balanceCheckService.js` ได้รับการอัปเดต
- [ ] ตรวจสอบว่า `bettingPairingService.js` ได้รับการอัปเดต

### 2. ตรวจสอบ Syntax
```bash
# ตรวจสอบ pendingBalanceService.js
node -c services/betting/pendingBalanceService.js

# ตรวจสอบ bettingMatchingService.js
node -c services/betting/bettingMatchingService.js

# ตรวจสอบ balanceCheckService.js
node -c services/betting/balanceCheckService.js

# ตรวจสอบ bettingPairingService.js
node -c services/betting/bettingPairingService.js
```

- [ ] ไม่มี Syntax Error

### 3. ตรวจสอบ Dependencies
- [ ] ตรวจสอบว่า `google-auth-library` ติดตั้งแล้ว
- [ ] ตรวจสอบว่า `googleapis` ติดตั้งแล้ว
- [ ] ตรวจสอบว่า `fs` และ `path` ติดตั้งแล้ว

### 4. ตรวจสอบ Environment Variables
- [ ] ตรวจสอบว่า `GOOGLE_SHEET_ID` ตั้งค่าแล้ว
- [ ] ตรวจสอบว่า `GOOGLE_WORKSHEET_NAME` ตั้งค่าแล้ว
- [ ] ตรวจสอบว่า `GOOGLE_CREDENTIALS_JSON` หรือ `GOOGLE_SERVICE_ACCOUNT_KEY` ตั้งค่าแล้ว

### 5. ตรวจสอบ Google Sheets Schema
- [ ] ตรวจสอบว่า Bets sheet มีคอลัมน์ที่ถูกต้อง (A-N)
- [ ] ตรวจสอบว่า UsersBalance sheet มีคอลัมน์ที่ถูกต้อง (A-C)
- [ ] ตรวจสอบว่า Transactions sheet มีคอลัมน์ที่ถูกต้อง (A-G)

### 6. ตรวจสอบ Google Sheets API
- [ ] ตรวจสอบว่า Google Sheets API เปิดใช้งาน
- [ ] ตรวจสอบว่า Service Account มีสิทธิ์เขียนข้อมูล
- [ ] ตรวจสอบว่า Spreadsheet ได้รับการแชร์กับ Service Account

### 7. ทดสอบ Services
```bash
# ทดสอบ pendingBalanceService
node -e "
const pendingBalanceService = require('./services/betting/pendingBalanceService');
pendingBalanceService.initialize().then(() => {
  console.log('✅ pendingBalanceService initialized');
}).catch(err => {
  console.error('❌ Error:', err.message);
});
"

# ทดสอบ bettingMatchingService
node -e "
const bettingMatchingService = require('./services/betting/bettingMatchingService');
console.log('✅ bettingMatchingService loaded');
"

# ทดสอบ balanceCheckService
node -e "
const balanceCheckService = require('./services/betting/balanceCheckService');
balanceCheckService.initialize().then(() => {
  console.log('✅ balanceCheckService initialized');
}).catch(err => {
  console.error('❌ Error:', err.message);
});
"

# ทดสอบ bettingPairingService
node -e "
const bettingPairingService = require('./services/betting/bettingPairingService');
bettingPairingService.initialize().then(() => {
  console.log('✅ bettingPairingService initialized');
}).catch(err => {
  console.error('❌ Error:', err.message);
});
"
```

- [ ] ทั้งหมด initialized สำเร็จ

### 8. ทดสอบฟังก์ชัน
```bash
# ทดสอบ getPendingAmount
node -e "
const pendingBalanceService = require('./services/betting/pendingBalanceService');
pendingBalanceService.initialize().then(async () => {
  const amount = await pendingBalanceService.getPendingAmount('TestUser');
  console.log('✅ getPendingAmount:', amount);
}).catch(err => {
  console.error('❌ Error:', err.message);
});
"

# ทดสอบ checkBalance
node -e "
const balanceCheckService = require('./services/betting/balanceCheckService');
balanceCheckService.initialize().then(async () => {
  const result = await balanceCheckService.checkBalance('TestUser', 100);
  console.log('✅ checkBalance:', result);
}).catch(err => {
  console.error('❌ Error:', err.message);
});
"
```

- [ ] ฟังก์ชันทำงานได้ถูกต้อง

### 9. ทดสอบตัวอย่าง
```bash
# ทดสอบตัวอย่างทั้งหมด
node examples/balance-management-example.js
```

- [ ] ตัวอย่างทั้งหมดทำงานได้

### 10. ตรวจสอบเอกสาร
- [ ] อ่าน `BALANCE_MANAGEMENT_SYSTEM.md`
- [ ] อ่าน `BALANCE_MANAGEMENT_USAGE.md`
- [ ] อ่าน `BALANCE_MANAGEMENT_API.md`
- [ ] อ่าน `IMPLEMENTATION_SUMMARY.md`

---

## 🔧 Troubleshooting

### ปัญหา: Syntax Error
**วิธีแก้:**
1. ตรวจสอบว่าไฟล์ถูกคัดลอกอย่างถูกต้อง
2. ตรวจสอบว่าไม่มีการแก้ไขไฟล์ที่ไม่ตั้งใจ
3. รันคำสั่ง `node -c` เพื่อตรวจสอบ syntax

### ปัญหา: Module Not Found
**วิทธีแก้:**
1. ตรวจสอบว่า `require()` path ถูกต้อง
2. ตรวจสอบว่าไฟล์มีอยู่ในตำแหน่งที่ถูกต้อง
3. ตรวจสอบว่า `node_modules` ติดตั้งแล้ว

### ปัญหา: Google Sheets API Error
**วิธีแก้:**
1. ตรวจสอบว่า credentials ถูกต้อง
2. ตรวจสอบว่า Spreadsheet ID ถูกต้อง
3. ตรวจสอบว่า Service Account มีสิทธิ์เขียนข้อมูล

### ปัญหา: ยอดเงินไม่ถูกต้อง
**วิธีแก้:**
1. ตรวจสอบว่า displayName ตรงกับชื่อใน UsersBalance sheet
2. ตรวจสอบว่า Bets sheet มีข้อมูลถูกต้อง
3. ตรวจสอบว่าเงินค้างถูกคำนวนถูกต้อง

---

## 📊 ตรวจสอบ Google Sheets Schema

### Bets Sheet
```
Row 1: Headers
A: Timestamp
B: User A ID
C: ชื่อ User A
D: ข้อความ A
E: ชื่อบั้งไฟ
F: รายการเล่น
G: ยอดเงิน A
H: ยอดเงิน B
I: แสดงผล
J: แสดงผลชนะ
K: User B ID
L: ชื่อ User B
M: รายการเล่น B
N: ผลลัพธ์สุดท้าย
```

- [ ] ตรวจสอบว่าคอลัมน์ทั้งหมดมีอยู่

### UsersBalance Sheet
```
Row 1: Headers
A: User ID
B: Display Name
C: Balance
```

- [ ] ตรวจสอบว่าคอลัมน์ทั้งหมดมีอยู่

### Transactions Sheet
```
Row 1: Headers
A: Timestamp
B: Player Name
C: Transaction Type
D: Amount
E: Previous Balance
F: New Balance
G: Slip Name
```

- [ ] ตรวจสอบว่าคอลัมน์ทั้งหมดมีอยู่

---

## 🚀 ขั้นตอนการใช้งาน

### 1. Initialize Services
```javascript
const balanceCheckService = require('./services/betting/balanceCheckService');
const pendingBalanceService = require('./services/betting/pendingBalanceService');
const bettingPairingService = require('./services/betting/bettingPairingService');
const bettingMatchingService = require('./services/betting/bettingMatchingService');

await balanceCheckService.initialize();
await pendingBalanceService.initialize();
await bettingPairingService.initialize();
```

- [ ] Services initialized สำเร็จ

### 2. ตรวจสอบยอดเงินก่อนเดิมพัน
```javascript
const checkResult = await balanceCheckService.checkBalance(displayName, betAmount);
if (!checkResult.sufficient) {
  // แจ้งเตือนผู้เล่น
  return;
}
```

- [ ] ตรวจสอบยอดเงินได้

### 3. บันทึกการเล่น
```javascript
await bettingPairingService.recordBet(betData, userId, displayName);
```

- [ ] บันทึกการเล่นได้

### 4. ค้นหาคู่และหักเงิน
```javascript
const matchingResult = await bettingMatchingService.findPairsAndDeductBalance(bets);
```

- [ ] ค้นหาคู่และหักเงินได้

### 5. ชำระเงินเมื่อมีผล
```javascript
await balanceUpdateService.updateBalancesForResult(result, slipName);
```

- [ ] ชำระเงินได้

---

## ✅ Final Verification

- [ ] ไฟล์ทั้งหมดถูกสร้าง
- [ ] ไฟล์ทั้งหมดไม่มี Syntax Error
- [ ] Services ทั้งหมด initialized สำเร็จ
- [ ] ฟังก์ชันทั้งหมดทำงานได้
- [ ] ตัวอย่างทั้งหมดทำงานได้
- [ ] Google Sheets Schema ถูกต้อง
- [ ] Environment Variables ตั้งค่าแล้ว
- [ ] เอกสารอ่านแล้ว

---

## 📞 Support

หากมีปัญหา โปรดตรวจสอบ:
1. `BALANCE_MANAGEMENT_SYSTEM.md` - ภาพรวมระบบ
2. `BALANCE_MANAGEMENT_USAGE.md` - คู่มือการใช้งาน
3. `BALANCE_MANAGEMENT_API.md` - API Documentation
4. `IMPLEMENTATION_SUMMARY.md` - สรุปการเปลี่ยนแปลง

---

## 📝 Notes

- ระบบนี้ต้องการ Google Sheets API
- ต้องมี Service Account credentials
- ต้องมี Spreadsheet ที่มี Bets, UsersBalance, และ Transactions sheets
- ต้องมี Node.js v12 ขึ้นไป

---

## ✨ Summary

ระบบจัดการยอดเงินเดิมพันใหม่นี้ช่วยให้:
1. ✅ ตรวจสอบยอดเงินอย่างแม่นยำ (รวมเงินค้าง)
2. ✅ หักเงินทันทีเมื่อจับคู่สำเร็จ
3. ✅ ป้องกันการเดิมพันเกินเงินที่มี
4. ✅ แจ้งเตือนผู้เล่นอย่างชัดเจน
5. ✅ ติดตามเงินค้างได้อย่างละเอียด

ระบบนี้ช่วยให้การจัดการเงินเดิมพันมีความปลอดภัยและโปร่งใสมากขึ้น
