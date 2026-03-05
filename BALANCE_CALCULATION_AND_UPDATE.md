# 💰 ระบบคำนวณและอัปเดตยอดเงิน

## 📊 ภาพรวม

เมื่อประกาศผลแพ้ชนะเสมอออก ระบบจะ:
1. **คำนวณผลลัพธ์** (ชนะ/แพ้/เสมอ + ค่าธรรมเนียม)
2. **อัปเดตยอดเงิน** ในชีท UsersBalance
3. **บันทึกธุรกรรม** ในชีท Transactions

---

## 🔢 ขั้นตอนการคำนวณ

### Step 1: คำนวณผลลัพธ์ (ใน bettingResultService.js)

```javascript
calculateResultWithFees(pair, slipName, score) {
  // ตรวจสอบว่าเป็นการออกกลาง (draw) หรือไม่
  
  // ถ้าออกกลาง (draw):
  // - หัก 5% ทั้งสองฝั่ง
  // - drawFee = ยอดเงิน × 5%
  // - winner.netAmount = -drawFee
  // - loser.netAmount = -drawFee
  
  // ถ้าชนะ-แพ้:
  // - หัก 10% จากยอดเงิน
  // - fee = ยอดเงิน × 10%
  // - winner.netAmount = ยอดเงิน - fee
  // - loser.netAmount = -ยอดเงิน
}
```

### ตัวอย่าง: ชนะ-แพ้

```
User A (ล): 350-370 | ยอดเงิน: 300 บาท
User B (ย): 350-410 | ยอดเงิน: 300 บาท
ประกาศผล: 370 (User A ชนะ)

คำนวณ:
- ค่าธรรมเนียม: 300 × 10% = 30 บาท
- User A (ชนะ): 300 - 30 = 270 บาท (netAmount)
- User B (แพ้): -300 บาท (netAmount)
```

### ตัวอย่าง: ออกกลาง (Draw)

```
User A (ล): 350-370 | ยอดเงิน: 300 บาท
User B (ย): 350-410 | ยอดเงิน: 300 บาท
ประกาศผล: 360 (ทั้งสองฝั่งอยู่ในเกณฑ์)

คำนวณ:
- ค่าธรรมเนียม: 300 × 5% = 15 บาท
- User A (เสมอ): -15 บาท (netAmount)
- User B (เสมอ): -15 บาท (netAmount)
```

---

## 📝 Step 2: อัปเดตยอดเงิน (ใน balanceUpdateService.js)

### ฟังก์ชัน: `updateBalancesForResult()`

```javascript
async updateBalancesForResult(result, slipName) {
  // 1. ดึงยอดเงินปัจจุบันของผู้ชนะ
  const winnerCurrentBalance = await getUserBalance(winner.displayName);
  
  // 2. คำนวณยอดเงินใหม่
  const winnerNewBalance = winnerCurrentBalance + winner.netAmount;
  
  // 3. อัปเดตในชีท UsersBalance
  await updateUserBalanceInSheet(winner.displayName, winnerNewBalance);
  
  // 4. บันทึกธุรกรรม
  await recordTransaction(winner.displayName, winner.netAmount, 'WIN', slipName);
  
  // 5. ทำเดียวกันกับผู้แพ้
  // ...
}
```

---

## 📊 ชีท Google Sheets

### 1. ชีท: **UsersBalance**

| Column | ชื่อ | ตัวอย่าง |
|--------|------|---------|
| A | User ID | Uc2a009fe53d51946657363bdbb7d1374 |
| B | Display Name (ชื่อ LINE) | 💓Noon💓 |
| C | Balance (ยอดเงินคงเหลือ) | 585 |

**ตัวอย่าง:**
```
A                                          | B              | C
Uc2a009fe53d51946657363bdbb7d1374         | 💓Noon💓       | 585
Uc2a009fe53d51946657363bdbb7d1375         | paa"BOY"       | 470
```

### 2. ชีท: **Transactions**

| Column | ชื่อ | ตัวอย่าง |
|--------|------|---------|
| A | Timestamp | 2026-03-05T05:10:10.000Z |
| B | Player Name (Display Name) | 💓Noon💓 |
| C | Transaction Type | WIN / LOSE / DRAW |
| D | Amount | 270 / -300 / -15 |
| E | Previous Balance | 315 |
| F | New Balance | 585 |
| G | Slip Name | ฟ้า |

**ตัวอย่าง:**
```
A                              | B          | C    | D   | E   | F   | G
2026-03-05T05:10:10.000Z      | 💓Noon💓   | WIN  | 270 | 315 | 585 | ฟ้า
2026-03-05T05:10:10.000Z      | paa"BOY"   | LOSE | -300| 770 | 470 | ฟ้า
```

---

## 🔄 ขั้นตอนการทำงาน

### 1. ประกาศผล
```
Admin: "ฟ้า 370"
```

### 2. ระบบประมวลผล
```
Step 1: บันทึกผลลัพธ์ (Bets sheet)
   - Column I: 370
   - Column J: ชนะ
   - Column S: ชนะ 270 บาท
   - Column T: แพ้ 300 บาท

Step 2: คำนวณผลลัพธ์
   - User A (ชนะ): netAmount = 270
   - User B (แพ้): netAmount = -300

Step 3: อัปเดตยอดเงิน (UsersBalance sheet)
   - User A: 500 + 270 = 770 บาท
   - User B: 315 + (-300) = 15 บาท

Step 4: บันทึกธุรกรรม (Transactions sheet)
   - User A: WIN | +270 | 500 → 770
   - User B: LOSE | -300 | 315 → 15
```

---

## 💡 ตัวอย่างการคำนวณแบบละเอียด

### สถานการณ์
```
User A (paa"BOY"): 350-370 ล 300 ฟ้า
User B (💓Noon💓): 350-410 ย 300 ฟ้า
ประกาศผล: ฟ้า 370

ยอดเงินเดิม:
- paa"BOY": 500 บาท
- 💓Noon💓: 315 บาท
```

### ขั้นตอนการคำนวณ

#### 1. ตรวจสอบผลลัพธ์
```
User A (350-370): 370 ✅ อยู่ในเกณฑ์
User B (350-410): 370 ✅ อยู่ในเกณฑ์

ผลลัพธ์: ไม่ใช่ออกกลาง (เพราะ User A ชนะ)
```

#### 2. คำนวณค่าธรรมเนียม
```
ยอดเงิน: 300 บาท
ค่าธรรมเนียม: 300 × 10% = 30 บาท
```

#### 3. คำนวณ Net Amount
```
User A (ชนะ):
  - Gross Amount: 300 บาท
  - Fee: 30 บาท
  - Net Amount: 300 - 30 = 270 บาท

User B (แพ้):
  - Gross Amount: -300 บาท
  - Fee: 0 บาท
  - Net Amount: -300 บาท
```

#### 4. อัปเดตยอดเงิน
```
paa"BOY":
  - ยอดเงินเดิม: 500 บาท
  - เปลี่ยนแปลง: +270 บาท
  - ยอดเงินใหม่: 770 บาท

💓Noon💓:
  - ยอดเงินเดิม: 315 บาท
  - เปลี่ยนแปลง: -300 บาท
  - ยอดเงินใหม่: 15 บาท
```

#### 5. บันทึกธุรกรรม
```
Transactions Sheet:
- paa"BOY": WIN | +270 | 500 → 770 | ฟ้า
- 💓Noon💓: LOSE | -300 | 315 → 15 | ฟ้า
```

---

## 🔍 ตรวจสอบการทำงาน

### ดูใน Console
```
✅ Result recorded for row 2
✅ อัปเดตสำเร็จ: 2 ผลลัพธ์
   🏆 paa"BOY"
      ยอดเงินเดิม: 500 บาท
      เปลี่ยนแปลง: +270 บาท
      ยอดเงินใหม่: 770 บาท
      ประเภท: WIN

   ❌ 💓Noon💓
      ยอดเงินเดิม: 315 บาท
      เปลี่ยนแปลง: -300 บาท
      ยอดเงินใหม่: 15 บาท
      ประเภท: LOSE
```

### ดูใน Google Sheets

#### UsersBalance Sheet
```
| User ID | Display Name | Balance |
|---------|--------------|---------|
| ...     | paa"BOY"     | 770     | ← อัปเดตแล้ว
| ...     | 💓Noon💓     | 15      | ← อัปเดตแล้ว
```

#### Transactions Sheet
```
| Timestamp | Player | Type | Amount | Previous | New | Slip |
|-----------|--------|------|--------|----------|-----|------|
| ...       | paa"BOY" | WIN | 270 | 500 | 770 | ฟ้า |
| ...       | 💓Noon💓 | LOSE | -300 | 315 | 15 | ฟ้า |
```

---

## ⚙️ Code Flow

### resultSettlementService.js
```javascript
async settleResult(announcementText, allBets, groupId) {
  // Step 1-4: แยก, ตรวจสอบ, จับคู่, คำนวณ
  
  // Step 5: บันทึกผลลัพธ์
  await recordResults(results, slipName, score);
  
  // Step 6: อัปเดตยอดเงิน ← ที่นี่
  await updateBalances(results, slipName);
  
  // Step 7: แจ้งเตือน LINE
  await notifyResults(results, slipName, score, groupId);
}
```

### balanceUpdateService.js
```javascript
async updateBalancesForResult(result, slipName) {
  // 1. ดึงยอดเงินปัจจุบัน
  const winnerBalance = await getUserBalance(winner.displayName);
  
  // 2. อัปเดตยอดเงิน
  await updateUserBalanceInSheet(winner.displayName, newBalance);
  
  // 3. บันทึกธุรกรรม
  await recordTransaction(winner.displayName, amount, type, slipName);
}
```

---

## 📋 ประเภทธุรกรรม

| ประเภท | ความหมาย | Amount |
|--------|---------|--------|
| WIN | ชนะ | บวก (ยอดเงิน - ค่าธรรมเนียม) |
| LOSE | แพ้ | ลบ (-ยอดเงิน) |
| DRAW | เสมอ | ลบ (-ค่าธรรมเนียม 5%) |
| DEPOSIT | ฝากเงิน | บวก |
| WITHDRAW | ถอนเงิน | ลบ |

---

## ⚠️ ข้อควรระวัง

### ✅ ระบบจะ:
- ใช้ Display Name (ชื่อ LINE) เป็นหลัก
- คำนวณค่าธรรมเนียมอัตโนมัติ
- อัปเดตยอดเงินทั้งสองฝั่ง
- บันทึกธุรกรรมทั้งหมด

### ❌ ระบบจะไม่:
- ลบแถวที่ไม่ได้จับคู่
- แก้ไขคอลัมน์อื่นในชีท Bets
- ส่งเงินจริง (เป็นระบบบันทึกเท่านั้น)

---

## 🔗 ไฟล์ที่เกี่ยวข้อง

- `services/betting/bettingResultService.js` - คำนวณผลลัพธ์
- `services/betting/resultSettlementService.js` - ประสานงานขั้นตอน
- `services/betting/balanceUpdateService.js` - อัปเดตยอดเงิน
- `RESULT_RECORDING_PROCESS.md` - ขั้นตอนการบันทึกผลลัพธ์

