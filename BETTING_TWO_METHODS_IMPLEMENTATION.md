# 🎰 Betting System - Two Methods Implementation

## ✅ ปรับปรุงที่ทำแล้ว

ระบบได้รับการปรับปรุงให้รองรับการเล่น 2 วิธี:

---

## 🔵 วิธีที่ 1: Reply Method

### วิธีการเล่น

```
Admin: ฟ้าหลังฝน (ส่งชื่อบั้งไฟ)
User A: ต (reply)
User B: ต (reply)
→ ระบบจับคู่อัตโนมัติ
```

### Code ที่เพิ่มเข้ามา

```javascript
// ตรวจสอบ Reply Method
static parseReplyMessage(message) {
  const trimmedMessage = message.trim();

  if (trimmedMessage === 'ต' || trimmedMessage === 'ต.') {
    return {
      success: true,
      type: 'REPLY',
      side: 'ต',
      timestamp: new Date().toISOString(),
    };
  }

  return {
    success: false,
    type: null,
    error: 'ไม่ใช่ reply ที่ถูกต้อง',
  };
}
```

### ตรรกะการจับคู่

```javascript
// ตรวจสอบว่าเป็นคู่ Reply ที่ถูกต้องหรือไม่
static isValidReplyPair(bet1, bet2) {
  // 1. ชื่อบั้งไฟเดียวกัน
  if (bet1.slipName !== bet2.slipName) return false;

  // 2. ทั้งคู่ต้อง reply
  if (bet1.method !== 'REPLY' || bet2.method !== 'REPLY') return false;

  return true;
}
```

### ตัวอย่าง

```
Admin: ฟ้าหลังฝน
       ↓
Alice: ต (reply)
       → บันทึก: Alice, ฟ้าหลังฝน, REPLY, OPEN

Bob: ต (reply)
     → บันทึก: Bob, ฟ้าหลังฝน, REPLY, OPEN
     → จับคู่: Alice ↔ Bob ✅
```

---

## 🟢 วิธีที่ 2: Direct Method

### วิธีการเล่น

```
User A: ฟ้าหลังฝน ชล. 500 (ลงเล่นตรง)
User B: ฟ้าหลังฝน ชถ. 500 (ลงเล่นตรง, ฝั่งตรงข้าม)
→ ระบบจับคู่อัตโนมัติ
```

### Code ที่ปรับปรุง

```javascript
// ตรวจสอบว่าเป็นคู่ Direct ที่ถูกต้องหรือไม่
static isValidDirectPair(bet1, bet2) {
  // 1. ชื่อบั้งไฟเดียวกัน
  if (bet1.slipName !== bet2.slipName) return false;

  // 2. จำนวนเงินเดียวกัน
  if (bet1.amount !== bet2.amount) return false;

  // 3. ฝั่งตรงข้าม
  const oppositeMap = {
    'ชล': 'ชถ',
    'ชถ': 'ชล',
    'ล': 'ย',
    'ย': 'ล',
  };
  if (oppositeMap[bet1.side] !== bet2.side) return false;

  // 4. ราคาเดียวกัน (วิธีที่ 2 เท่านั้น)
  if (bet1.method === 2 && bet2.method === 2) {
    if (bet1.price !== bet2.price) return false;
  }

  return true;
}
```

### ตัวอย่าง

```
Alice: ฟ้าหลังฝน ชล. 500
       → บันทึก: Alice, ฟ้าหลังฝน, ชล, 500, OPEN

Bob: ฟ้าหลังฝน ชถ. 500
     → บันทึก: Bob, ฟ้าหลังฝน, ชถ, 500, OPEN
     → จับคู่: Alice ↔ Bob ✅
```

---

## 🔄 ตรรกะการจับคู่ (Updated)

```javascript
static findPairs(bets) {
  const pairs = [];
  const processed = new Set();

  for (let i = 0; i < bets.length; i++) {
    if (processed.has(i)) continue;

    const bet1 = bets[i];
    if (bet1.status === 'MATCHED') continue;

    for (let j = i + 1; j < bets.length; j++) {
      if (processed.has(j)) continue;

      const bet2 = bets[j];
      if (bet2.status === 'MATCHED') continue;

      let isValid = false;

      // Reply Method: ตรวจสอบ 2 เงื่อนไข
      if (bet1.method === 'REPLY' && bet2.method === 'REPLY') {
        isValid = this.isValidReplyPair(bet1, bet2);
      }
      // Direct Method: ตรวจสอบ 4 เงื่อนไข
      else if (bet1.method !== 'REPLY' && bet2.method !== 'REPLY') {
        isValid = this.isValidDirectPair(bet1, bet2);
      }

      if (isValid) {
        pairs.push({
          bet1: { ...bet1, index: i },
          bet2: { ...bet2, index: j },
        });
        processed.add(i);
        processed.add(j);
        break;
      }
    }
  }

  return pairs;
}
```

---

## 📊 ข้อมูลในชีท "Bets"

### Reply Method
```
Timestamp | UserID | DisplayName | Method | Price | Side | Amount | SlipName | Status
2024-03-02T10:30:00Z | U001 | Alice | REPLY | | ต | | ฟ้าหลังฝน | OPEN
2024-03-02T10:31:00Z | U002 | Bob | REPLY | | ต | | ฟ้าหลังฝน | MATCHED
```

### Direct Method
```
Timestamp | UserID | DisplayName | Method | Price | Side | Amount | SlipName | Status
2024-03-02T10:30:00Z | U001 | Alice | 1 | | ชล | 500 | ฟ้าหลังฝน | OPEN
2024-03-02T10:31:00Z | U002 | Bob | 1 | | ชถ | 500 | ฟ้าหลังฝน | MATCHED
```

---

## 🎯 ตัวอย่างการทำงาน

### Scenario 1: Reply Method

```
1️⃣ Admin: :เริ่ม ฟ้าหลังฝน
   → RoundState: OPEN

2️⃣ Admin: ฟ้าหลังฝน (ส่งชื่อบั้งไฟ)
   → ผู้เล่นรู้ว่าเล่นบั้งไฟไหน

3️⃣ Alice: ต (reply)
   → parseReplyMessage('ต') ✅
   → บันทึก: Alice, ฟ้าหลังฝน, REPLY, OPEN

4️⃣ Bob: ต (reply)
   → parseReplyMessage('ต') ✅
   → บันทึก: Bob, ฟ้าหลังฝน, REPLY, OPEN
   → findPairs() → isValidReplyPair() ✅
   → จับคู่: Alice ↔ Bob

5️⃣ Admin: :หยุด
   → RoundState: CLOSED

6️⃣ Admin: :สรุป ฟ้าหลังฝน 315
   → คำนวณผล
   → ประกาศผล
```

### Scenario 2: Direct Method

```
1️⃣ Admin: :เริ่ม ฟ้าหลังฝน
   → RoundState: OPEN

2️⃣ Alice: ฟ้าหลังฝน ชล. 500
   → parseMessage('ฟ้าหลังฝน ชล. 500') ✅
   → บันทึก: Alice, ฟ้าหลังฝน, 1, ชล, 500, OPEN

3️⃣ Bob: ฟ้าหลังฝน ชถ. 500
   → parseMessage('ฟ้าหลังฝน ชถ. 500') ✅
   → บันทึก: Bob, ฟ้าหลังฝน, 1, ชถ, 500, OPEN
   → findPairs() → isValidDirectPair() ✅
   → จับคู่: Alice ↔ Bob

4️⃣ Admin: :หยุด
   → RoundState: CLOSED

5️⃣ Admin: :สรุป ฟ้าหลังฝน 315
   → คำนวณผล
   → ประกาศผล
```

---

## 📝 ตัวอย่างข้อมูลที่บันทึก

### Reply Method

```json
{
  "timestamp": "2024-03-02T10:30:00Z",
  "userId": "U001",
  "displayName": "Alice",
  "method": "REPLY",
  "price": null,
  "side": "ต",
  "amount": null,
  "slipName": "ฟ้าหลังฝน",
  "status": "OPEN"
}
```

### Direct Method

```json
{
  "timestamp": "2024-03-02T10:30:00Z",
  "userId": "U001",
  "displayName": "Alice",
  "method": 1,
  "price": null,
  "side": "ชล",
  "amount": 500,
  "slipName": "ฟ้าหลังฝน",
  "status": "OPEN"
}
```

---

## 🔍 ตรวจจับข้อความ

### Reply Method

```javascript
// ตรวจจับ reply
if (message === 'ต' || message === 'ต.') {
  return {
    success: true,
    type: 'REPLY',
    side: 'ต',
  };
}
```

### Direct Method

```javascript
// ตรวจจับ direct
const method1Match = message.match(/^(.+?)\s+(ชล\.|ชถ\.)\s+(\d+)$/);
if (method1Match) {
  return {
    success: true,
    method: 1,
    slipName: method1Match[1],
    side: method1Match[2],
    amount: method1Match[3],
  };
}
```

---

## 📱 ข้อความที่ส่ง

### Reply Method

```
Admin: ฟ้าหลังฝน
       ↓
Bot: ✅ ส่งชื่อบั้งไฟ: ฟ้าหลังฝน
     กรุณา reply ข้อความนี้เพื่อเล่น

Alice: ต (reply)
       ↓
Bot: ✅ บันทึกการเล่นสำเร็จ
     บั้งไฟ: ฟ้าหลังฝน
     ฝั่ง: ตอบ

Bob: ต (reply)
     ↓
Bot: ✅ บันทึกการเล่นสำเร็จ
     บั้งไฟ: ฟ้าหลังฝน
     ฝั่ง: ตอบ
     (จับคู่ Alice ↔ Bob)
```

### Direct Method

```
Alice: ฟ้าหลังฝน ชล. 500
       ↓
Bot: ✅ บันทึกการเล่นสำเร็จ
     บั้งไฟ: ฟ้าหลังฝน
     ฝั่ง: ไล่
     จำนวนเงิน: 500 บาท

Bob: ฟ้าหลังฝน ชถ. 500
     ↓
Bot: ✅ บันทึกการเล่นสำเร็จ
     บั้งไฟ: ฟ้าหลังฝน
     ฝั่ง: ถอย
     จำนวนเงิน: 500 บาท
     (จับคู่ Alice ↔ Bob)
```

---

## 🎯 สรุป

| ลักษณะ | Reply Method | Direct Method |
|--------|-------------|---------------|
| วิธีเล่น | Reply ข้อความ | ลงเล่นตรง |
| ข้อมูลที่ส่ง | ต | ฟ้าหลังฝน ชล. 500 |
| ตรวจจับ | parseReplyMessage() | parseMessage() |
| จับคู่ | isValidReplyPair() | isValidDirectPair() |
| เงื่อนไข | 2 | 4 |
| ความยืดหยุ่น | ต่ำ | สูง |

---

## ✅ ระบบพร้อมใช้งาน

ระบบได้รับการปรับปรุงให้รองรับการเล่น 2 วิธี:
- ✅ Reply Method (ตอบกลับข้อความ)
- ✅ Direct Method (ลงเล่นตรง)
- ✅ จับคู่อัตโนมัติ
- ✅ บันทึกข้อมูลลงชีท "Bets"
- ✅ ส่งข้อความยืนยันไปยัง LINE

**ระบบพร้อมใช้งานแล้ว!** 🎰
