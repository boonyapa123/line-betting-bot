# Balance Management System - API Documentation

## PendingBalanceService

### getPendingAmount(displayName)
ดึงเงินค้างทั้งหมดของผู้เล่น

**Parameters:**
- `displayName` (string): ชื่อ LINE

**Returns:**
- (number): จำนวนเงินค้าง

**Example:**
```javascript
const pendingAmount = await pendingBalanceService.getPendingAmount('John');
console.log(pendingAmount); // 500
```

---

### checkSufficientBalance(displayName, currentBalance, newBetAmount)
ตรวจสอบว่ายอดเงินเพียงพอสำหรับการเดิมพันใหม่หรือไม่

**Parameters:**
- `displayName` (string): ชื่อ LINE
- `currentBalance` (number): ยอดเงินคงเหลือปัจจุบัน
- `newBetAmount` (number): จำนวนเงินเดิมพันใหม่

**Returns:**
```javascript
{
  success: boolean,
  isSufficient: boolean,
  currentBalance: number,
  pendingAmount: number,
  availableBalance: number,
  requiredAmount: number,
  shortfall: number,
  error?: string
}
```

**Example:**
```javascript
const result = await pendingBalanceService.checkSufficientBalance('John', 1000, 300);
console.log(result);
// {
//   success: true,
//   isSufficient: true,
//   currentBalance: 1000,
//   pendingAmount: 500,
//   availableBalance: 500,
//   requiredAmount: 300,
//   shortfall: 0
// }
```

---

### getPendingBetsDetails(displayName)
ดึงรายละเอียดเงินค้างของผู้เล่น

**Parameters:**
- `displayName` (string): ชื่อ LINE

**Returns:**
```javascript
[
  {
    timestamp: string,
    slipName: string,
    side: string,
    amount: number,
    opponent: string,
    opponentAmount: number,
    status: string
  }
]
```

**Example:**
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

---

### buildInsufficientBalanceMessage(checkResult)
สร้างข้อความแจ้งเตือนเงินไม่พอ

**Parameters:**
- `checkResult` (object): ผลการตรวจสอบจาก `checkSufficientBalance()`

**Returns:**
- (string): ข้อความแจ้งเตือน

**Example:**
```javascript
const message = pendingBalanceService.buildInsufficientBalanceMessage(checkResult);
console.log(message);
// ⚠️ ⚠️ ⚠️ ยอดเงินไม่พอสำหรับการเดิมพัน ⚠️ ⚠️ ⚠️
// ...
```

---

### buildPendingBetsMessage(pendingBets)
สร้างข้อความแสดงรายละเอียดเงินค้าง

**Parameters:**
- `pendingBets` (array): รายการเงินค้างจาก `getPendingBetsDetails()`

**Returns:**
- (string): ข้อความรายละเอียด

**Example:**
```javascript
const message = pendingBalanceService.buildPendingBetsMessage(pendingBets);
console.log(message);
// ⏳ รายการเงินค้างที่ยังไม่มีผล:
// ...
```

---

## BalanceCheckService

### checkBalance(lineName, requiredAmount)
ตรวจสอบยอดเงินคงเหลือ (รวมเงินค้าง)

**Parameters:**
- `lineName` (string): ชื่อ LINE
- `requiredAmount` (number): จำนวนเงินที่ต้องการ

**Returns:**
```javascript
{
  sufficient: boolean,
  currentBalance: number,
  shortfall: number,
  registered: boolean,
  pendingAmount: number,
  availableBalance: number,
  message: string,
  error?: string
}
```

**Example:**
```javascript
const result = await balanceCheckService.checkBalance('John', 300);
console.log(result);
// {
//   sufficient: true,
//   currentBalance: 1000,
//   shortfall: 0,
//   registered: true,
//   pendingAmount: 500,
//   availableBalance: 500,
//   message: 'ยอดเงินเพียงพอ (500 บาท หลังหักเงินค้าง)'
// }
```

---

### checkAndNotify(lineName, requiredAmount, userId, accountNumber, groupId)
ตรวจสอบและแจ้งเตือนยอดเงิน

**Parameters:**
- `lineName` (string): ชื่อ LINE
- `requiredAmount` (number): จำนวนเงินที่ต้องการ
- `userId` (string): LINE User ID
- `accountNumber` (number): LINE OA Account Number (1, 2, หรือ 3)
- `groupId` (string, optional): LINE Group ID

**Returns:**
```javascript
{
  sufficient: boolean,
  currentBalance: number,
  shortfall: number,
  registered: boolean,
  pendingAmount: number,
  availableBalance: number,
  message: string,
  error?: string
}
```

**Example:**
```javascript
const result = await balanceCheckService.checkAndNotify(
  'John',
  300,
  'U001',
  1,
  'C123456789'
);
```

---

## BettingPairingService

### deductBetAmount(displayName, betAmount)
หักเงินเดิมพันจากยอดคงเหลือ

**Parameters:**
- `displayName` (string): ชื่อ LINE
- `betAmount` (number): จำนวนเงินที่หัก

**Returns:**
```javascript
{
  success: boolean,
  displayName: string,
  previousBalance: number,
  deductedAmount: number,
  newBalance: number,
  error?: string
}
```

**Example:**
```javascript
const result = await bettingPairingService.deductBetAmount('John', 300);
console.log(result);
// {
//   success: true,
//   displayName: 'John',
//   previousBalance: 1000,
//   deductedAmount: 300,
//   newBalance: 700
// }
```

---

### getUserBalance(displayName)
ดึงยอดเงินคงเหลือของผู้เล่น

**Parameters:**
- `displayName` (string): ชื่อ LINE

**Returns:**
- (number): ยอดเงินคงเหลือ

**Example:**
```javascript
const balance = await bettingPairingService.getUserBalance('John');
console.log(balance); // 1000
```

---

### findPairsAndDeductBalance(bets)
ค้นหาคู่เดิมพันและหักเงินทันที

**Parameters:**
- `bets` (array): ข้อมูลการเล่นทั้งหมด

**Returns:**
```javascript
{
  success: boolean,
  pairsFound: number,
  pairs: array,
  deductionResults: array,
  error?: string
}
```

**Example:**
```javascript
const result = await bettingPairingService.findPairsAndDeductBalance(bets);
console.log(result);
// {
//   success: true,
//   pairsFound: 1,
//   pairs: [...],
//   deductionResults: [...]
// }
```

---

## BettingMatchingService

### findPairsAndDeductBalance(bets)
ค้นหาคู่เดิมพันและหักเงินทันที

**Parameters:**
- `bets` (array): ข้อมูลการเล่นทั้งหมด

**Returns:**
```javascript
{
  success: boolean,
  pairsFound: number,
  pairs: array,
  deductionResults: array,
  error?: string
}
```

**Example:**
```javascript
const result = await bettingMatchingService.findPairsAndDeductBalance(bets);
```

---

### checkBalanceBeforeMatching(displayName, betAmount)
ตรวจสอบยอดเงินก่อนจับคู่

**Parameters:**
- `displayName` (string): ชื่อ LINE
- `betAmount` (number): จำนวนเงินเดิมพัน

**Returns:**
```javascript
{
  success: boolean,
  isSufficient: boolean,
  currentBalance: number,
  pendingAmount: number,
  availableBalance: number,
  requiredAmount: number,
  shortfall: number,
  error?: string
}
```

**Example:**
```javascript
const result = await bettingMatchingService.checkBalanceBeforeMatching('John', 300);
console.log(result);
// {
//   success: true,
//   isSufficient: true,
//   currentBalance: 1000,
//   pendingAmount: 500,
//   availableBalance: 500,
//   requiredAmount: 300,
//   shortfall: 0
// }
```

---

### buildMatchingReport(matchingResult)
สร้างรายงานการจับคู่และหักเงิน

**Parameters:**
- `matchingResult` (object): ผลการจับคู่จาก `findPairsAndDeductBalance()`

**Returns:**
- (string): รายงาน

**Example:**
```javascript
const report = bettingMatchingService.buildMatchingReport(matchingResult);
console.log(report);
// ✅ รายงานการจับคู่และหักเงิน
// ...
```

---

## Error Handling

### ตัวอย่างการจัดการข้อผิดพลาด

```javascript
try {
  const result = await pendingBalanceService.checkSufficientBalance('John', 1000, 300);
  
  if (!result.success) {
    console.error('Error:', result.error);
    return;
  }
  
  if (!result.isSufficient) {
    console.log('Insufficient balance');
    console.log(`Shortfall: ${result.shortfall} บาท`);
    return;
  }
  
  console.log('Balance is sufficient');
} catch (error) {
  console.error('Exception:', error);
}
```

---

## Response Status Codes

### Success
- `success: true` - การดำเนินการสำเร็จ

### Failure
- `success: false` - การดำเนินการล้มเหลว
- `error: string` - ข้อความข้อผิดพลาด

---

## Data Types

### Bet Object
```javascript
{
  timestamp: string,           // ISO 8601 format
  userId: string,              // LINE User ID
  displayName: string,         // ชื่อ LINE
  method: number,              // 1 or 2 or 'REPLY'
  slipName: string,            // ชื่อบั้งไฟ
  side: string,                // ฝั่ง (ชล, ชถ, ล, ย, ต)
  sideCode: string,            // รหัสฝั่ง
  amount: number,              // จำนวนเงิน
  status: string               // สถานะ (MATCHED, PENDING, etc.)
}
```

### Balance Object
```javascript
{
  userId: string,              // LINE User ID
  displayName: string,         // ชื่อ LINE
  balance: number              // ยอดเงินคงเหลือ
}
```

### Pending Bet Object
```javascript
{
  timestamp: string,           // ISO 8601 format
  slipName: string,            // ชื่อบั้งไฟ
  side: string,                // ฝั่ง
  amount: number,              // จำนวนเงิน
  opponent: string,            // ชื่อคู่ต่อสู้
  opponentAmount: number,      // จำนวนเงินของคู่ต่อสู้
  status: string               // สถานะ (PENDING)
}
```

---

## Best Practices

### 1. ตรวจสอบยอดเงินก่อนเดิมพัน
```javascript
const checkResult = await balanceCheckService.checkBalance(displayName, betAmount);
if (!checkResult.sufficient) {
  // แจ้งเตือนผู้เล่น
  return;
}
```

### 2. หักเงินทันทีเมื่อจับคู่สำเร็จ
```javascript
const deductResult = await bettingPairingService.deductBetAmount(displayName, betAmount);
if (!deductResult.success) {
  // จัดการข้อผิดพลาด
  return;
}
```

### 3. ติดตามเงินค้าง
```javascript
const pendingBets = await pendingBalanceService.getPendingBetsDetails(displayName);
console.log(`Pending bets: ${pendingBets.length}`);
```

### 4. แจ้งเตือนผู้เล่นอย่างชัดเจน
```javascript
const checkResult = await balanceCheckService.checkAndNotify(
  displayName,
  betAmount,
  userId,
  accountNumber,
  groupId
);
```

---

## Troubleshooting

### ปัญหา: ยอดเงินไม่ถูกต้อง
**วิธีแก้:**
1. ตรวจสอบว่า Google Sheets มีข้อมูลถูกต้อง
2. ตรวจสอบว่า displayName ตรงกับชื่อใน UsersBalance sheet
3. ตรวจสอบว่าเงินค้างถูกคำนวนถูกต้อง

### ปัญหา: เงินค้างไม่ถูกคำนวน
**วิธีแก้:**
1. ตรวจสอบว่า Bets sheet มีข้อมูลถูกต้อง
2. ตรวจสอบว่าคอลัมน์ H (ยอดเงิน B) มีค่า (จับคู่แล้ว)
3. ตรวจสอบว่าคอลัมน์ I (แสดงผล) ว่างเปล่า (ยังไม่มีผล)

### ปัญหา: การหักเงินล้มเหลว
**วิธีแก้:**
1. ตรวจสอบว่า displayName ถูกต้อง
2. ตรวจสอบว่า Google Sheets API มีสิทธิ์เขียนข้อมูล
3. ตรวจสอบว่า credentials ถูกต้อง

---

## Performance Tips

1. **Cache ข้อมูลยอดเงิน** - ลดการเรียก API บ่อยเกินไป
2. **Batch operations** - ประมวลผลหลายรายการพร้อมกัน
3. **Monitor API usage** - ตรวจสอบการใช้ Google Sheets API

---

## Version History

### v1.0.0 (2024-03-04)
- Initial release
- Added PendingBalanceService
- Added BettingMatchingService
- Updated BalanceCheckService
- Updated BettingPairingService
