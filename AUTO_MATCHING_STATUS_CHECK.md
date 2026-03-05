# 🔧 แก้ไข: ตรวจสอบสถานะการจับคู่ (MATCHED Status)

## ❌ ปัญหาที่พบ

### Logic ผิด
```javascript
// ก่อน (ผิด)
status: row[this.COLUMNS.RESULT_WIN_LOSE] ? 'MATCHED' : '',
```

**ปัญหา**: 
- ตั้งค่า `status` จาก Column J (RESULT_WIN_LOSE) ซึ่งเป็นผลลัพธ์ของการประกาศผล
- ไม่ใช่สถานะการจับคู่
- ทำให้ระบบไม่สามารถตรวจสอบว่าแถวนั้นจับคู่ไปแล้วหรือไม่

### ผลกระทบ
```
User A: "340-400 ล 300 แอด" → Row 2 (ยังไม่จับคู่)
User B: "340-400 ย 300 แอด" → ค้นหาคู่ → พบ Row 2 → อัปเดต
User C: "340-400 ล 300 แอด" → ค้นหาคู่ → ❌ ยังคิดว่า Row 2 ว่างอยู่ → จับคู่กับ Row 2 อีกครั้ง (ผิด!)
```

---

## ✅ วิธีแก้ไข

### Logic ใหม่
```javascript
// หลัง (ถูกต้อง)
status: row[this.COLUMNS.MATCHED_AUTO] ? 'MATCHED' : '',
```

**ตั้งค่า `status` จาก Column U (MATCHED_AUTO)** ซึ่งเป็นสถานะการจับคู่

---

## 🔄 ขั้นตอนการทำงาน (ใหม่)

### Scenario: User C ส่งข้อความหลังจับคู่

```
User A: "340-400 ล 300 แอด"
  ↓ recordBet() → Row 2
  ↓ Column U: (ว่างเปล่า)
  ↓ status: '' (ว่างเปล่า)

User B: "340-400 ย 300 แอด"
  ↓ findMatchForNewBet() → พบ Row 2 (status = '')
  ↓ updateRowWithUserB() → Row 2
  ↓ Column U: 'AUTO' (อัปเดต)
  ↓ status: 'MATCHED' (อัปเดต)

User C: "340-400 ล 300 แอด"
  ↓ findMatchForNewBet() → ค้นหาคู่
  ↓ ตรวจสอบ Row 2: status = 'MATCHED' ✅
  ↓ Skip Row 2 (ข้ามไป)
  ↓ ไม่พบคู่อื่น
  ↓ recordBet() → Row 3 (User C)
  ↓ รอการจับคู่
```

---

## 📊 ตัวอย่างข้อมูล

### ก่อนแก้ไข (ผิด)

```
Row 2 (User A + User B):
  Column J (RESULT_WIN_LOSE): (ว่างเปล่า)
  Column U (MATCHED_AUTO): AUTO
  status: '' (ว่างเปล่า) ← ผิด! ไม่ตรวจสอบ Column U

User C ค้นหาคู่:
  ตรวจสอบ Row 2: status = '' → ไม่ skip
  ❌ จับคู่กับ Row 2 อีกครั้ง (ผิด!)
```

### หลังแก้ไข (ถูกต้อง)

```
Row 2 (User A + User B):
  Column J (RESULT_WIN_LOSE): (ว่างเปล่า)
  Column U (MATCHED_AUTO): AUTO
  status: 'MATCHED' ✅ (ถูกต้อง)

User C ค้นหาคู่:
  ตรวจสอบ Row 2: status = 'MATCHED' → skip ✅
  ไม่พบคู่อื่น
  recordBet() → Row 3 (User C)
```

---

## 🔍 Logic ในการค้นหาคู่

```javascript
// priceRangeMatchingService.js
static findMatchForNewBet(newBet, existingBets) {
  for (let i = 0; i < existingBets.length; i++) {
    const existingBet = existingBets[i];
    
    // ✅ ตรวจสอบสถานะการจับคู่
    if (existingBet.status === 'MATCHED' || !existingBet.price) continue;
    
    // ตรวจสอบการจับคู่
    if (this.isValidPriceRangePair(newBet, existingBet)) {
      return { existingBet, ... };
    }
  }
  return null;
}
```

**ขั้นตอน**:
1. ✅ ตรวจสอบ `status === 'MATCHED'` → ถ้าใช่ให้ skip
2. ✅ ตรวจสอบ `!existingBet.price` → ถ้าไม่มีราคาให้ skip
3. ✅ ตรวจสอบการจับคู่ (ชื่อบั้งไฟ, ฝั่ง, ราคา)

---

## 📋 ตัวอย่างการทำงาน

### ตัวอย่างที่ 1: จับคู่สำเร็จ

```
User A: "340-400 ล 300 แอด"
  ↓ recordBet() → Row 2
  ↓ Column U: (ว่างเปล่า)
  ↓ status: ''

User B: "340-400 ย 300 แอด"
  ↓ findMatchForNewBet()
  ↓ ตรวจสอบ Row 2: status = '' ✅ (ไม่ skip)
  ↓ ตรวจสอบการจับคู่: ✅ (ชื่อบั้งไฟ, ฝั่ง, ราคา ตรงกัน)
  ↓ updateRowWithUserB() → Row 2
  ↓ Column U: 'AUTO'
  ↓ status: 'MATCHED'
  ✅ จับคู่สำเร็จ
```

### ตัวอย่างที่ 2: ไม่จับคู่ (Row ที่จับคู่ไปแล้ว)

```
User A: "340-400 ล 300 แอด"
  ↓ recordBet() → Row 2
  ↓ Column U: (ว่างเปล่า)

User B: "340-400 ย 300 แอด"
  ↓ updateRowWithUserB() → Row 2
  ↓ Column U: 'AUTO'
  ↓ status: 'MATCHED'

User C: "340-400 ล 300 แอด"
  ↓ findMatchForNewBet()
  ↓ ตรวจสอบ Row 2: status = 'MATCHED' ❌ (skip)
  ↓ ไม่พบคู่อื่น
  ↓ recordBet() → Row 3
  ⏳ รอการจับคู่
```

### ตัวอย่างที่ 3: จับคู่กับคนอื่น

```
User A: "340-400 ล 300 แอด"
  ↓ recordBet() → Row 2

User B: "340-400 ย 300 แอด"
  ↓ updateRowWithUserB() → Row 2
  ↓ status: 'MATCHED'

User C: "340-400 ล 300 แอด"
  ↓ recordBet() → Row 3
  ↓ status: ''

User D: "340-400 ย 300 แอด"
  ↓ findMatchForNewBet()
  ↓ ตรวจสอบ Row 2: status = 'MATCHED' ❌ (skip)
  ↓ ตรวจสอบ Row 3: status = '' ✅ (ไม่ skip)
  ↓ ตรวจสอบการจับคู่: ✅ (ชื่อบั้งไฟ, ฝั่ง, ราคา ตรงกัน)
  ↓ updateRowWithUserB() → Row 3
  ✅ จับคู่สำเร็จ (User C + User D)
```

---

## ✅ ผลลัพธ์ที่คาดหวัง

| ประเด็น | ก่อน | หลัง |
|--------|------|------|
| ตรวจสอบสถานะ | Column J ❌ | Column U ✅ |
| Skip Row ที่จับคู่ | ไม่ได้ ❌ | ได้ ✅ |
| จับคู่ซ้ำ | มี ❌ | ไม่มี ✅ |
| จับคู่กับคนอื่น | ไม่ได้ ❌ | ได้ ✅ |

---

## 📌 สรุป

**ก่อนแก้ไข**: ตั้งค่า `status` จาก Column J (ผลลัพธ์) → ไม่สามารถตรวจสอบสถานะการจับคู่ → จับคู่ซ้ำ

**หลังแก้ไข**: ตั้งค่า `status` จาก Column U (MATCHED_AUTO) → สามารถตรวจสอบสถานะการจับคู่ → ไม่จับคู่ซ้ำ

**ผลลัพธ์**: ✅ User C จะรอจับคู่กับคนอื่นแทนที่จะจับคู่กับ Row ที่จับคู่ไปแล้ว

