# ระบบตรวจสอบผลแพ้ชนะและการบันทึกผล

## 📋 ภาพรวม

ระบบตรวจสอบผลแพ้ชนะสำหรับการเล่นแบบร้องราคา (Price Range Betting) ประกอบด้วย 2 ส่วนหลัก:

1. **ตรวจสอบผลลัพธ์** - `bettingResultService.calculateResultWithFees()`
2. **บันทึกผลลัพธ์** - `updateBetResult()` ใน index.js

---

## 🔍 ส่วนที่ 1: ตรวจสอบผลลัพธ์

### ฟังก์ชัน: `checkPriceRangeResult(bet1, bet2, score)`

**ตำแหน่ง:** `services/betting/bettingResultService.js` (Line 178)

### ตรรกะการตรวจสอบ:

#### 1️⃣ **ตรวจสอบว่ามีช่วงราคาหรือไม่**
```javascript
const hasPriceRange1 = bet1.price && bet1.price.includes('-');
const hasPriceRange2 = bet2.price && bet2.price.includes('-');
```

#### 2️⃣ **กรณีที่ 1: ทั้งสองฝั่งมีช่วงราคา**
```
ตัวอย่าง: A เล่น 300-340 ล 30 vs B เล่น 310-350 ย 30
```

- **ผลออกในช่วงทั้งสองฝั่ง** → **⛔️ เสมอ**
  - ตัวอย่าง: ผลออก 320 (อยู่ใน 300-340 และ 310-350)

- **ผลออกในช่วง A เท่านั้น** → **A ชนะ**
  - ตัวอย่าง: ผลออก 305 (อยู่ใน 300-340 แต่ไม่อยู่ใน 310-350)

- **ผลออกในช่วง B เท่านั้น** → **B ชนะ**
  - ตัวอย่าง: ผลออก 355 (ไม่อยู่ใน 300-340 แต่อยู่ใน 310-350)

- **ผลออกนอกช่วงทั้งสองฝั่ง** → ตรวจสอบตามกฎ ย/ล
  - ถ้า A เป็น ย และผลต่ำกว่าช่วง → **A ชนะ**
  - ถ้า A เป็น ล และผลสูงกว่าช่วง → **A ชนะ**
  - ถ้า B เป็น ย และผลต่ำกว่าช่วง → **B ชนะ**
  - ถ้า B เป็น ล และผลสูงกว่าช่วง → **B ชนะ**

#### 3️⃣ **กรณีที่ 2: เฉพาะ bet1 มีช่วงราคา (bet2 เป็น reply)**
```
ตัวอย่าง: A เล่น 300-340 ล 30 vs B reply ล
```

- **ผลออกในช่วง** → **⛔️ เสมอ**
  - ตัวอย่าง: ผลออก 320 (อยู่ในช่วง 300-340)

- **ผลออกต่ำกว่าช่วง + A เป็น ย** → **A ชนะ**
  - ตัวอย่าง: ผลออก 290 (ต่ำกว่า 300-340) + A เป็น ย

- **ผลออกสูงกว่าช่วง + A เป็น ล** → **A ชนะ**
  - ตัวอย่าง: ผลออก 350 (สูงกว่า 300-340) + A เป็น ล

#### 4️⃣ **กรณีที่ 3: เฉพาะ bet2 มีช่วงราคา (bet1 เป็น reply)**
```
ตัวอย่าง: A reply ล vs B เล่น 300-340 ล 30
```

- ตรรกะเดียวกับกรณีที่ 2 แต่ใช้ bet2 แทน

---

## 💾 ส่วนที่ 2: บันทึกผลลัพธ์

### ฟังก์ชัน: `updateBetResult(rowIndex, resultNumber, resultSymbol, accessToken)`

**ตำแหน่ง:** `index.js` (Line 422)

### ขั้นตอนการบันทึก:

#### 1️⃣ **ดึงข้อมูลจากชีท**
```javascript
// ดึงข้อมูลแถวที่ rowIndex
const row = response.data.values?.[0] || [];

// ข้อมูลที่ดึง:
const userAId = row[1];           // Column B: User A ID
const userAName = row[2];         // Column C: User A Name
const priceA = row[3];            // Column D: Price A (ช่วงราคา)
const slipName = row[4];          // Column E: Slip Name
const betAmountA = row[6];        // Column G: Bet Amount A
const betAmountB = row[7];        // Column H: Bet Amount B
const userBId = row[10];          // Column K: User B ID
const userBName = row[11];        // Column L: User B Name
const priceB = row[12];           // Column M: Price B
```

#### 2️⃣ **สร้าง pair object**
```javascript
const pair = {
  bet1: {
    userId: userAId,
    displayName: userAName,
    userBName: userBName,
    amount: betAmount,
    price: priceA,
    method: priceA && priceA.includes('-') ? 2 : 1,  // 2=ร้องราคา, 1=ปกติ
  },
  bet2: {
    userId: userBId,
    displayName: userBName,
    userBName: userAName,
    amount: betAmount,
    price: priceB,
    method: priceB && priceB.includes('-') ? 2 : 1,
  },
};
```

#### 3️⃣ **คำนวณผลลัพธ์**
```javascript
const result = bettingResultService.calculateResultWithFees(
  pair,
  slipName,
  resultNumber
);

// ผลลัพธ์ที่ได้:
// result.isDraw          - boolean (true=เสมอ, false=ชนะ-แพ้)
// result.winner          - object {userId, displayName, netAmount, fee}
// result.loser           - object {userId, displayName, netAmount, fee}
```

#### 4️⃣ **กำหนด symbol ตามผลลัพธ์**
```javascript
let finalResultSymbol = result.isDraw ? '⛔️' : '✅';

if (result.isDraw) {
  userAResultText = '⛔️';
  userBResultText = '⛔️';
} else {
  if (result.winner.userId === userAId) {
    userAResultText = '✅';
    userBResultText = '❌';
    finalResultSymbol = '✅';
  } else {
    userAResultText = '❌';
    userBResultText = '✅';
    finalResultSymbol = '❌';
  }
}
```

#### 5️⃣ **บันทึกผลลัพธ์ลงชีท**

**อัปเดต Column I-K:**
```javascript
await sheets.spreadsheets.values.update({
  range: `${GOOGLE_WORKSHEET_NAME}!I${rowIndex}:K${rowIndex}`,
  requestBody: {
    values: [[resultNumber, userAResultText, userBResultText]],
  },
});
```

**อัปเดต Column S-T:**
```javascript
await sheets.spreadsheets.values.update({
  range: `${GOOGLE_WORKSHEET_NAME}!S${rowIndex}:T${rowIndex}`,
  requestBody: {
    values: [[userAResultText, userBResultText]],
  },
});
```

---

## 📊 ตารางคอลัมน์ที่บันทึกผล

| Column | Letter | ชื่อ | ค่าที่บันทึก | ตัวอย่าง |
|--------|--------|------|-----------|---------|
| 8 | I | ผลที่ออก | ตัวเลข | 320 |
| 9 | J | ผลแพ้ชนะ A | ✅/❌/⛔️ | ✅ |
| 10 | K | ผลแพ้ชนะ B | ✅/❌/⛔️ | ❌ |
| 18 | S | ผลลัพธ์ A | ✅/❌/⛔️ | ✅ |
| 19 | T | ผลลัพธ์ B | ✅/❌/⛔️ | ❌ |

---

## 💰 ค่าธรรมเนียมและการคำนวณ

### ชนะ-แพ้ (ไม่เสมอ):
```
ยอดเดิมพัน: 30 บาท
ค่าธรรมเนียม: 30 × 10% = 3 บาท
ผู้ชนะได้รับ: 30 - 3 = 27 บาท
ผู้แพ้เสีย: -30 บาท
```

### เสมอ (ออกกลาง):
```
ยอดเดิมพัน: 30 บาท
ค่าธรรมเนียม: 30 × 5% = 1.5 ≈ 2 บาท
ทั้งสองฝั่งเสีย: -2 บาท
```

---

## 🔄 ตัวอย่างการทำงาน

### ตัวอย่าง 1: ผลออกในช่วง (เสมอ)
```
Input:
- A: paa"BOY" เล่น 300-340 ล 30 ฟ้า
- B: นุช519 reply ล
- ผลออก: 320

Process:
1. ตรวจสอบ: 320 อยู่ในช่วง 300-340 ✓
2. ผลลัพธ์: isDraw = true
3. Symbol: ⛔️

Output:
- Column I: 320
- Column J: ⛔️
- Column S: ⛔️
- Column T: ⛔️
- A เสีย: -2 บาท
- B เสีย: -2 บาท
```

### ตัวอย่าง 2: ผลออกต่ำกว่าช่วง (ฝ่าย ย ชนะ)
```
Input:
- A: 💓Noon💓 เล่น 310-320 ย 20 ฟ้า
- B: ธา มือทอง reply ต
- ผลออก: 305

Process:
1. ตรวจสอบ: 305 < 310 (ต่ำกว่าช่วง)
2. A เป็น ย (ต่ำ) → A ชนะ
3. ผลลัพธ์: isDraw = false, winner = A

Output:
- Column I: 305
- Column J: ✅
- Column S: ✅
- Column T: ❌
- A ได้รับ: 18 บาท (20 - 2)
- B เสีย: -20 บาท
```

### ตัวอย่าง 3: ผลออกสูงกว่าช่วง (ฝ่าย ล ชนะ)
```
Input:
- A: paa"BOY" เล่น 300-340 ล 30 ฟ้า
- B: นุช519 reply ล
- ผลออก: 350

Process:
1. ตรวจสอบ: 350 > 340 (สูงกว่าช่วง)
2. A เป็น ล (สูง) → A ชนะ
3. ผลลัพธ์: isDraw = false, winner = A

Output:
- Column I: 350
- Column J: ✅
- Column S: ✅
- Column T: ❌
- A ได้รับ: 27 บาท (30 - 3)
- B เสีย: -30 บาท
```

---

## 🔧 ฟังก์ชันสำคัญ

### 1. `calculateResultWithFees(pair, slipName, score)`
- **ที่อยู่:** `services/betting/bettingResultService.js` Line 72
- **ทำงาน:** คำนวณผลลัพธ์และค่าธรรมเนียม
- **Return:** Object ที่มี isDraw, winner, loser, fee

### 2. `checkPriceRangeResult(bet1, bet2, score)`
- **ที่อยู่:** `services/betting/bettingResultService.js` Line 178
- **ทำงาน:** ตรวจสอบผลลัพธ์ของการเล่นแบบร้องราคา
- **Return:** Object ที่มี isDraw, winner, loser หรือ null

### 3. `updateBetResult(rowIndex, resultNumber, resultSymbol, accessToken)`
- **ที่อยู่:** `index.js` Line 422
- **ทำงาน:** บันทึกผลลัพธ์ลงชีท
- **Update:** Column I, J, S, T

---

## ⚙️ การตั้งค่า

### ค่าธรรมเนียม (ใน bettingResultService.js):
```javascript
this.FEE_PERCENTAGE = 0.10;        // 10% สำหรับชนะ-แพ้
this.DRAW_FEE_PERCENTAGE = 0.05;   // 5% สำหรับเสมอ
```

### ยอดเดิมพัน:
```javascript
// ใช้ยอดที่น้อยกว่า (ยอดที่จับคู่ได้จริง)
const winAmount = Math.min(bet1.amount || 0, bet2.amount || 0) 
                  || bet1.amount || bet2.amount || 0;
```

---

## 📝 สรุป

| ขั้นตอน | ฟังก์ชัน | ผลลัพธ์ |
|--------|---------|--------|
| 1. ตรวจสอบ | `checkPriceRangeResult()` | isDraw, winner, loser |
| 2. คำนวณ | `calculateResultWithFees()` | netAmount, fee |
| 3. บันทึก | `updateBetResult()` | Column I, J, K, S, T |
| 4. อัปเดต | `updatePlayerBalance()` | ยอดเงินผู้เล่น |
