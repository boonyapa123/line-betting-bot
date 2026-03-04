# Balance Management System - Implementation Summary

## ภาพรวม

ระบบจัดการยอดเงินเดิมพันได้รับการปรับปรุงเพื่อให้สามารถตรวจสอบและจัดการยอดเงินคงเหลือของผู้เล่นได้อย่างแม่นยำ โดยคำนึงถึงเงินเดิมพันที่ค้างอยู่ (Pending Bets) ที่ยังไม่มีผลออก

## ไฟล์ที่เพิ่มเติม

### 1. `services/betting/pendingBalanceService.js` (ใหม่)
**วัตถุประสงค์**: จัดการการตรวจสอบและคำนวนเงินค้าง

**ฟังก์ชันหลัก**:
- `getPendingAmount(displayName)` - ดึงเงินค้างทั้งหมด
- `checkSufficientBalance(displayName, currentBalance, newBetAmount)` - ตรวจสอบยอดเงิน
- `getPendingBetsDetails(displayName)` - ดึงรายละเอียดเงินค้าง
- `buildInsufficientBalanceMessage(checkResult)` - สร้างข้อความแจ้งเตือน
- `buildPendingBetsMessage(pendingBets)` - สร้างข้อความรายละเอียด

**ขนาด**: ~250 บรรทัด

---

### 2. `services/betting/bettingMatchingService.js` (ใหม่)
**วัตถุประสงค์**: จัดการการจับคู่เดิมพันและหักเงินทันที

**ฟังก์ชันหลัก**:
- `findPairsAndDeductBalance(bets)` - ค้นหาคู่และหักเงิน
- `checkBalanceBeforeMatching(displayName, betAmount)` - ตรวจสอบยอดเงิน
- `buildMatchingReport(matchingResult)` - สร้างรายงาน

**ขนาด**: ~150 บรรทัด

---

### 3. `BALANCE_MANAGEMENT_SYSTEM.md` (ใหม่)
**วัตถุประสงค์**: เอกสารอธิบายระบบจัดการยอดเงิน

**เนื้อหา**:
- ภาพรวมระบบ
- ขั้นตอนการทำงาน
- Services ที่เกี่ยวข้อง
- ตัวอย่างการไหลของข้อมูล
- ข้อมูลการแจ้งเตือน
- ข้อมูลที่เก็บใน Google Sheets

---

### 4. `BALANCE_MANAGEMENT_USAGE.md` (ใหม่)
**วัตถุประสงค์**: คู่มือการใช้งาน

**เนื้อหา**:
- ภาพรวมระบบ
- ไฟล์ที่เพิ่มเติม
- วิธีการใช้งาน
- ตัวอย่างสถานการณ์
- ข้อมูลที่เก็บใน Google Sheets
- การทดสอบ

---

### 5. `BALANCE_MANAGEMENT_API.md` (ใหม่)
**วัตถุประสงค์**: API Documentation

**เนื้อหา**:
- PendingBalanceService API
- BalanceCheckService API
- BettingPairingService API
- BettingMatchingService API
- Error Handling
- Data Types
- Best Practices
- Troubleshooting

---

### 6. `examples/balance-management-example.js` (ใหม่)
**วัตถุประสงค์**: ตัวอย่างการใช้งาน

**ตัวอย่าง**:
- ตัวอย่างที่ 1: ตรวจสอบยอดเงิน
- ตัวอย่างที่ 2: ดึงรายละเอียดเงินค้าง
- ตัวอย่างที่ 3: ตรวจสอบยอดเงินก่อนจับคู่
- ตัวอย่างที่ 4: หักเงินเดิมพัน
- ตัวอย่างที่ 5: ค้นหาคู่และหักเงิน
- ตัวอย่างที่ 6: ตรวจสอบและแจ้งเตือน
- ตัวอย่างที่ 7: สร้างข้อความแจ้งเตือน
- ตัวอย่างที่ 8: ดึงเงินค้างทั้งหมด
- ตัวอย่างที่ 9: ตรวจสอบยอดเงินเพียงพอ
- ตัวอย่างที่ 10: สร้างรายงานการจับคู่

---

## ไฟล์ที่อัปเดต

### 1. `services/betting/balanceCheckService.js`
**การเปลี่ยนแปลง**:
- เพิ่ม import `pendingBalanceService`
- อัปเดต `checkBalance()` - ตอนนี้รวมการตรวจสอบเงินค้าง
- อัปเดต `buildInsufficientBalanceMessage()` - แสดงรายละเอียดเงินค้าง
- อัปเดต `notifyInsufficientBalance()` - แจ้งเตือนพร้อมรายละเอียดเงินค้าง
- อัปเดต `checkAndNotify()` - ส่งข้อมูลเงินค้างไปยังการแจ้งเตือน

**บรรทัดที่เปลี่ยน**: ~50 บรรทัด

---

### 2. `services/betting/bettingPairingService.js`
**การเปลี่ยนแปลง**:
- เพิ่ม import `balanceUpdateService`
- เพิ่มฟังก์ชัน `deductBetAmount(displayName, betAmount)` - หักเงินเดิมพัน
- เพิ่มฟังก์ชัน `getUserBalance(displayName)` - ดึงยอดเงิน (ใช้ DisplayName)
- เพิ่มฟังก์ชัน `findPairsAndDeductBalance(bets)` - ค้นหาคู่และหักเงิน
- เปลี่ยนชื่อ `getUserBalance(userId)` เป็น `getUserBalanceByUserId(userId)`

**บรรทัดที่เพิ่ม**: ~100 บรรทัด

---

## การเปลี่ยนแปลงในการไหลของข้อมูล

### ก่อนการปรับปรุง
```
1. PARSING → 2. VALIDATION → 3. RECORDING → 4. PAIRING → 5. SETTLEMENT → 6. BALANCE UPDATE
```

### หลังการปรับปรุง
```
1. PARSING → 2. VALIDATION → 3. BALANCE CHECK (NEW) → 4. RECORDING → 5. PAIRING → 6. DEDUCT (NEW) → 7. SETTLEMENT → 8. BALANCE UPDATE
```

## ฟีเจอร์ใหม่

### 1. ตรวจสอบเงินค้าง
- ระบบจะคำนวนเงินเดิมพันที่จับคู่แล้วแต่ยังไม่มีผล
- ใช้ข้อมูลจาก Bets sheet (Column H มีค่า + Column I ว่างเปล่า)

### 2. ตรวจสอบยอดเงินที่สามารถใช้ได้
- ยอดเงินที่สามารถใช้ได้ = ยอดคงเหลือ - เงินค้าง
- ตรวจสอบว่า: ยอดเงินที่สามารถใช้ได้ >= เงินเดิมพันใหม่

### 3. หักเงินทันทีเมื่อจับคู่สำเร็จ
- เมื่อจับคู่เดิมพันสำเร็จ ระบบจะหักเงินจากยอดคงเหลือทันที
- ใช้ยอดเงินที่น้อยกว่า: betAmount = Math.min(bet1.amount, bet2.amount)

### 4. แจ้งเตือนที่ละเอียด
- แจ้งเตือนจะแสดงรายละเอียดเงินค้าง
- แสดงเงินที่สามารถใช้ได้และเงินขาด

## ตัวอย่างการทำงาน

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

## การทดสอบ

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

## สรุปการเปลี่ยนแปลง

| ประเภท | จำนวน | หมายเหตุ |
|--------|-------|---------|
| ไฟล์ใหม่ | 6 | pendingBalanceService, bettingMatchingService, เอกสาร 4 ไฟล์ |
| ไฟล์อัปเดต | 2 | balanceCheckService, bettingPairingService |
| บรรทัดโค้ดใหม่ | ~500 | ประมาณ 500 บรรทัด |
| ฟังก์ชันใหม่ | 10+ | ฟังก์ชันใหม่ 10+ ตัว |
| เอกสาร | 4 | เอกสารอธิบายระบบ 4 ไฟล์ |

## ประโยชน์

1. ✅ ตรวจสอบยอดเงินอย่างแม่นยำ (รวมเงินค้าง)
2. ✅ หักเงินทันทีเมื่อจับคู่สำเร็จ
3. ✅ ป้องกันการเดิมพันเกินเงินที่มี
4. ✅ แจ้งเตือนผู้เล่นอย่างชัดเจน
5. ✅ ติดตามเงินค้างได้อย่างละเอียด
6. ✅ ลดความเสี่ยงในการจัดการเงิน
7. ✅ เพิ่มความโปร่งใสในระบบ

## ข้อควรระวัง

1. ⚠️ ตรวจสอบว่า Google Sheets API มีสิทธิ์เขียนข้อมูล
2. ⚠️ ตรวจสอบว่า displayName ตรงกับชื่อใน UsersBalance sheet
3. ⚠️ ตรวจสอบว่า Bets sheet มีคอลัมน์ที่ถูกต้อง
4. ⚠️ ตรวจสอบว่า credentials ถูกต้อง

## ขั้นตอนการติดตั้ง

1. ✅ คัดลอกไฟล์ `pendingBalanceService.js` ไปยัง `services/betting/`
2. ✅ คัดลอกไฟล์ `bettingMatchingService.js` ไปยัง `services/betting/`
3. ✅ อัปเดตไฟล์ `balanceCheckService.js`
4. ✅ อัปเดตไฟล์ `bettingPairingService.js`
5. ✅ ทดสอบระบบ
6. ✅ ตรวจสอบ Google Sheets schema

## ขั้นตอนการใช้งาน

1. ✅ Initialize services
   ```javascript
   await balanceCheckService.initialize();
   await pendingBalanceService.initialize();
   await bettingPairingService.initialize();
   ```

2. ✅ ตรวจสอบยอดเงินก่อนเดิมพัน
   ```javascript
   const checkResult = await balanceCheckService.checkBalance(displayName, betAmount);
   ```

3. ✅ บันทึกการเล่น
   ```javascript
   await bettingPairingService.recordBet(betData, userId, displayName);
   ```

4. ✅ ค้นหาคู่และหักเงิน
   ```javascript
   const matchingResult = await bettingMatchingService.findPairsAndDeductBalance(bets);
   ```

5. ✅ ชำระเงินเมื่อมีผล
   ```javascript
   await balanceUpdateService.updateBalancesForResult(result, slipName);
   ```

## สรุป

ระบบจัดการยอดเงินเดิมพันใหม่นี้ช่วยให้การจัดการเงินเดิมพันมีความปลอดภัยและโปร่งใสมากขึ้น โดยการตรวจสอบยอดเงินอย่างแม่นยำ หักเงินทันที และแจ้งเตือนผู้เล่นอย่างชัดเจน
