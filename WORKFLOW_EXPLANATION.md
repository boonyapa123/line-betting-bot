# การไหลของระบบเมื่อประกาศผลออก

## ตัวอย่าง: ประกาศผล "ฟ้า 340 ✅️"

---

## 1️⃣ LINE OA รับข้อความ (index.js - webhook handler)

```
ข้อความ: "ฟ้า 340 ✅️"
↓
parseResultMessage() → { 
  priceRange: null,
  fireworkName: "ฟ้า",
  resultNumber: 340,
  result: "✅️"
}
```

---

## 2️⃣ ค้นหาการแข่งขันที่จับคู่แล้ว (index.js - bettingRoundController)

```
ค้นหาแถวที่:
- ชื่อบั้งไฟ = "ฟ้า"
- มี User B ID (จับคู่แล้ว)
- ยังไม่มีผลลัพธ์

พบ 6 แถว:
Row 2: paa"BOY" vs นุช519 (300-320 ล 20)
Row 3: paa"BOY" vs นุช519 (300-340 ล 30)
Row 4: 💓Noon💓 vs ธา มือทอง (310-320 ย 20)
Row 5: paa"BOY" vs นุช519 (280-299 ล 10)
Row 6: paa"BOY" vs 💓Noon💓 (350-360 ล 15)
Row 7: paa"BOY" vs 💓Noon💓 (345-375 ล 13)
```

---

## 3️⃣ สำหรับแต่ละแถว: คำนวณผลลัพธ์ (bettingPairingService.calculateResult)

### Row 2: 300-320 ล, ผลออก 340

```
1. Parse price range: { min: 300, max: 320, side: "ล" }
2. ผลออก 340 > 320 (สูงกว่าช่วง)
3. ฝ่าย ล (สูง) ชนะ
4. ผลลัพธ์: A ชนะ (✅❌)
```

### Row 3: 300-340 ล, ผลออก 340

```
1. Parse price range: { min: 300, max: 340, side: "ล" }
2. ผลออก 340 อยู่ในช่วง 300-340
3. ผลลัพธ์: เสมอ (⛔️⛔️)
```

### Row 4: 310-320 ย, ผลออก 340

```
1. Parse price range: { min: 310, max: 320, side: "ย" }
2. ผลออก 340 > 320 (สูงกว่าช่วง)
3. ฝ่าย ย (ต่ำ) แพ้
4. ผลลัพธ์: B ชนะ (❌✅)
```

---

## 4️⃣ คำนวณยอดเงิน (bettingResultService.calculateResultWithFees)

### Row 2: A ชนะ, เดิมพัน 20 บาท

```
ค่าธรรมเนียม: 20 × 10% = 2 บาท
ยอดเงิน A: 20 - 2 = 18 บาท (ได้)
ยอดเงิน B: -20 บาท (เสีย)
```

### Row 3: เสมอ, เดิมพัน 30 บาท

```
ค่าธรรมเนียม: 30 × 5% = 2 บาท (ทั้งสองฝั่ง)
ยอดเงิน A: -2 บาท (เสีย)
ยอดเงิน B: -2 บาท (เสีย)
```

### Row 4: B ชนะ, เดิมพัน 20 บาท

```
ค่าธรรมเนียม: 20 × 10% = 2 บาท
ยอดเงิน A: -20 บาท (เสีย)
ยอดเงิน B: 20 - 2 = 18 บาท (ได้)
```

---

## 5️⃣ บันทึกผลลัพธ์ลงชีท (index.js - updateBetResult)

### Row 2 บันทึก:

```
Column I (ผลที่ออก): 340
Column J (ผลแพ้ชนะ A): ✅
Column K (ผลแพ้ชนะ B): ❌
Column R (User B ID): Uc2a009fe53d51946657363bdbb7d1374
Column S (ยอดเงิน A): 18
Column T (ยอดเงิน B): -20
```

### Row 3 บันทึก:

```
Column I (ผลที่ออก): 340
Column J (ผลแพ้ชนะ A): ⛔️
Column K (ผลแพ้ชนะ B): ⛔️
Column R (User B ID): Uc2a009fe53d51946657363bdbb7d1374
Column S (ยอดเงิน A): -2
Column T (ยอดเงิน B): -2
```

---

## 6️⃣ ส่งข้อความให้ผู้เล่น (index.js - sendLineMessageToUser)

### ส่งให้ paa"BOY" (Row 2):

```
✅ ชนะแล้ว

🎆 บั้งไฟ: ฟ้า
💰 เดิมพัน: 20 บาท
🏆 ได้รับ: 18 บาท
💵 ยอดคงเหลือ: 1000 บาท
👤 ผู้แพ้: นุช519

ยินดีด้วย! 🎉
```

### ส่งให้ นุช519 (Row 2):

```
❌ แพ้แล้ว

🎆 บั้งไฟ: ฟ้า
💰 เดิมพัน: 20 บาท
💸 เสีย: 20 บาท
💵 ยอดคงเหลือ: 1000 บาท
👤 ผู้ชนะ: paa"BOY"

ลองใหม่นะ 💪
```

---

## 7️⃣ ส่งแจ้งเตือนเข้ากลุ่ม (index.js - sendLineMessageToGroup)

```
📊 ประกาศผลแทง
🎆 บั้งไฟ: ฟ้า
ผลที่ออก: 340
═══════════════════

✅ paa"BOY" ชนะ
   เดิมพัน: 20 บาท
   ได้รับ: 18 บาท

❌ นุช519 แพ้
   เดิมพัน: 20 บาท
   เสีย: 20 บาท

═══════════════════
```

---

## 8️⃣ อัปเดตยอดเงินผู้เล่น (index.js - updatePlayerBalance)

```
paa"BOY": +18 บาท
นุช519: -20 บาท
```

---

## 📊 สรุปการไหล

```
ประกาศผล "ฟ้า 340 ✅️"
    ↓
parseResultMessage()
    ↓
ค้นหาแถวที่จับคู่แล้ว (6 แถว)
    ↓
สำหรับแต่ละแถว:
    ├─ bettingPairingService.calculateResult()
    │  └─ ใช้ PriceRangeCalculator
    │     ├─ parsePriceRange()
    │     └─ calculateResult()
    │
    ├─ bettingResultService.calculateResultWithFees()
    │  └─ คำนวณยอดเงิน
    │
    ├─ updateBetResult()
    │  ├─ บันทึก Column I, J, K, R, S, T
    │  ├─ ส่งข้อความให้ผู้เล่น A
    │  ├─ ส่งข้อความให้ผู้เล่น B
    │  ├─ ส่งแจ้งเตือนเข้ากลุ่ม
    │  └─ อัปเดตยอดเงินผู้เล่น
    │
    └─ ทำซ้ำสำหรับแถวถัดไป
```

---

## 🔑 Key Functions

### index.js
- `parseResultMessage()` - แยกข้อมูลผลลัพธ์
- `findMatchingBets()` - ค้นหาแถวที่จับคู่แล้ว
- `updateBetResult()` - อัปเดตผลลัพธ์และส่งข้อความ
- `sendLineMessageToUser()` - ส่งข้อความให้ผู้เล่น
- `sendLineMessageToGroup()` - ส่งแจ้งเตือนเข้ากลุ่ม
- `updatePlayerBalance()` - อัปเดตยอดเงิน

### bettingResultService.js
- `calculateResultWithFees()` - คำนวณผลลัพธ์และค่าธรรมเนียม
- `checkPriceRangeResult()` - ตรวจสอบผลลัพธ์ตามช่วงราคา
- `recordResult()` - บันทึกผลลัพธ์ลงชีท

### bettingPairingService.js
- `calculateResult()` - คำนวณผลลัพธ์ (ใช้ PriceRangeCalculator)

### priceRangeCalculator.js
- `parsePriceRange()` - แยก price range
- `calculateResult()` - คำนวณผลลัพธ์ตามกฎ
- `getResultSymbols()` - แปลง winner/loser เป็น symbols

---

## ✅ ผลลัพธ์สุดท้าย

```
ชีท Bets:
Row 2: 340 | ✅ | ❌ | 18 | -20
Row 3: 340 | ⛔️ | ⛔️ | -2 | -2
Row 4: 340 | ❌ | ✅ | -20 | 18
Row 5: 340 | ✅ | ❌ | 9 | -10
Row 6: 340 | ❌ | ✅ | -15 | 13
Row 7: 340 | ❌ | ✅ | -13 | 12

ผู้เล่นได้รับข้อความแจ้งผล
กลุ่มได้รับแจ้งเตือน
ยอดเงินอัปเดต
```
