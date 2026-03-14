# Price Extraction Fix - ผลการแก้ไขการแยกช่วงราคา

## 🐛 ปัญหา (Problem)

เมื่อประกาศผลลัพธ์ (เช่น "เป็ด 410 ✅️") ระบบกำลังส่งข้อมูลผิด:

```
🔍 checkPriceRangeResult: bet1.price=ไล่/370-410/20เป็ด, hasPriceRange=true, score=410
💹 Price Range: 0-999, inRange=true
✅ Result in range → DRAW
```

**ปัญหา**: `bet1.price` ได้รับข้อความเต็ม `ไล่/370-410/20เป็ด` แทนที่จะเป็นเฉพาะช่วงราคา `370-410`

**ผลกระทบ**: 
- Regex `/(\d+[\-\.\/\*]\d+)/` ตรวจสอบข้อความเต็ม แล้วจับ `0-999` (ตัวเลขแรกและตัวเลขสุดท้าย)
- ทำให้ผลลัพธ์ออกมาผิด

---

## ✅ วิธีแก้ไข (Solution)

### ตำแหน่ง: `index.js` (Line ~490-510)

เพิ่มฟังก์ชัน `extractPriceRange()` เพื่อแยกช่วงราคาจากข้อความก่อนส่งไปยัง `checkPriceRangeResult()`:

```javascript
// ✅ แยกช่วงราคาจากข้อความ (เช่น "ไล่/370-410/20เป็ด" → "370-410")
const extractPriceRange = (message) => {
  if (!message) return null;
  // ตรวจสอบรูปแบบ slash: [ฝั่ง]/[ราคา]/[ยอดเงิน][ชื่อบั้งไฟ] หรือ [ฝั่ง]/[ราคา]/[ยอดเงิน]/[ชื่อบั้งไฟ]
  let match = message.match(/\/(\d+[\-\.\/\*]\d+)\//);
  if (match) return match[1];
  
  // ตรวจสอบรูปแบบปกติ: [ราคา] [ล/ย] [ยอดเงิน] [ชื่อบั้งไฟ]
  match = message.match(/^(\d+[\-\.\/\*]\d+)/);
  if (match) return match[1];
  
  return null;
};

const extractedPriceA = extractPriceRange(priceA);

// สร้าง pair object สำหรับ bettingResultService
const pair = {
  bet1: {
    ...
    price: extractedPriceA,  // ✅ ใช้ช่วงราคาที่แยกออกมา (เช่น "370-410")
    ...
  },
  ...
};
```

---

## 🔄 Flow หลังแก้ไข

### ก่อนแก้ไข:
```
Message: "ไล่/370-410/20เป็ด"
  ↓
pair.bet1.price = "ไล่/370-410/20เป็ด"  ❌ ข้อความเต็ม
  ↓
checkPriceRangeResult()
  ↓
Regex: /(\d+[\-\.\/\*]\d+)/ → จับ "0-999" ❌ ผิด
```

### หลังแก้ไข:
```
Message: "ไล่/370-410/20เป็ด"
  ↓
extractPriceRange() → "370-410" ✅
  ↓
pair.bet1.price = "370-410"  ✅ เฉพาะช่วงราคา
  ↓
checkPriceRangeResult()
  ↓
Regex: /(\d+[\-\.\/\*]\d+)/ → จับ "370-410" ✅ ถูก
```

---

## 📋 ตัวอย่างการทำงาน

### ตัวอย่าง 1: ไล่/370-410/20เป็ด - ผล 410
```
Message: "ไล่/370-410/20เป็ด"
Extracted Price: "370-410"
Score: 410

checkPriceRangeResult():
  - Price Range: 370-410
  - Score: 410 (อยู่ในช่วง)
  - Result: ⛔️ DRAW ✅ ถูก
```

### ตัวอย่าง 2: ไล่/360-400/20เป็ด - ผล 410
```
Message: "ไล่/360-400/20เป็ด"
Extracted Price: "360-400"
Score: 410

checkPriceRangeResult():
  - Price Range: 360-400
  - Score: 410 (สูงกว่าช่วง)
  - Result: ✅ ล ชนะ ✅ ถูก
```

### ตัวอย่าง 3: ไล่/360-400/20เป็ด - ผล 350
```
Message: "ไล่/360-400/20เป็ด"
Extracted Price: "360-400"
Score: 350

checkPriceRangeResult():
  - Price Range: 360-400
  - Score: 350 (ต่ำกว่าช่วง)
  - Result: ✅ ต ชนะ ✅ ถูก
```

---

## 🧪 Test Scripts

### 1. `test-price-extraction-fix.js`
ทดสอบว่าฟังก์ชัน `extractPriceRange()` ทำงานถูกต้องกับรูปแบบข้อความต่างๆ

### 2. `test-result-checking-flow.js`
ทดสอบว่าการตรวจสอบผลลัพธ์ทำงานถูกต้องหลังจากแก้ไข

---

## 📝 Git Commit

```
commit 7a82ad7
Author: Kiro
Date:   2026-03-14

    Fix price extraction in result checking - extract price range from full message before passing to checkPriceRangeResult
```

---

## ✨ สรุป

- ✅ แยกช่วงราคาจากข้อความก่อนส่งไปยัง `checkPriceRangeResult()`
- ✅ รองรับทั้งรูปแบบ slash และรูปแบบปกติ
- ✅ ผลลัพธ์ออกมาถูกต้องตามช่วงราคา
- ✅ ระบบทำงานตามที่คุยกัน
