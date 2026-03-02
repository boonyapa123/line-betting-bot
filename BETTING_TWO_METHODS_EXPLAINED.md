# 🎰 Betting System - Two Methods Explained

## 📋 ระบบการเล่นสองแบบ

ระบบรองรับการเล่น 2 วิธี:

---

## 🔵 วิธีที่ 1: Reply Method (ตอบกลับข้อความ)

### วิธีการเล่น

```
Admin: ฟ้าหลังฝน (ส่งชื่อบั้งไฟ)
       ↓
User A: ต (reply ข้อความ)
       ↓
User B: ต (reply ข้อความ)
       ↓
ระบบ: จับคู่ User A ↔ User B อัตโนมัติ
```

### ตัวอย่าง

```
┌─────────────────────────────────────────┐
│ Admin: ฟ้าหลังฝน                        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ User A: ต (reply)                       │
│ → ระบบบันทึก: User A เล่น ฟ้าหลังฝน   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ User B: ต (reply)                       │
│ → ระบบบันทึก: User B เล่น ฟ้าหลังฝน   │
│ → ระบบจับคู่: User A ↔ User B ✅       │
└─────────────────────────────────────────┘
```

### ข้อมูลที่บันทึก

```
User A:
  - SlipName: ฟ้าหลังฝน
  - Side: ต (ตอบ)
  - Amount: (ตามที่กำหนด)
  - Status: OPEN → MATCHED

User B:
  - SlipName: ฟ้าหลังฝน
  - Side: ต (ตอบ)
  - Amount: (ตามที่กำหนด)
  - Status: OPEN → MATCHED
```

---

## 🟢 วิธีที่ 2: Direct Method (ลงเล่นตรง)

### วิธีการเล่น

```
User A: ฟ้าหลังฝน ชล. 500 (ลงเล่นตรง)
       ↓
ระบบ: บันทึก User A, รอคู่
       ↓
User B: ฟ้าหลังฝน ชถ. 500 (ลงเล่นตรง, ฝั่งตรงข้าม)
       ↓
ระบบ: จับคู่ User A ↔ User B อัตโนมัติ
```

### ตัวอย่าง

```
┌─────────────────────────────────────────┐
│ User A: ฟ้าหลังฝน ชล. 500              │
│ → ระบบบันทึก: User A เล่น ชล 500      │
│ → สถานะ: OPEN (รอคู่)                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ User B: ฟ้าหลังฝน ชถ. 500              │
│ → ระบบบันทึก: User B เล่น ชถ 500      │
│ → ระบบจับคู่: User A ↔ User B ✅       │
│ → สถานะ: MATCHED                       │
└─────────────────────────────────────────┘
```

### ข้อมูลที่บันทึก

```
User A:
  - SlipName: ฟ้าหลังฝน
  - Side: ชล (ไล่)
  - Amount: 500
  - Status: OPEN → MATCHED

User B:
  - SlipName: ฟ้าหลังฝน
  - Side: ชถ (ถอย)
  - Amount: 500
  - Status: OPEN → MATCHED
```

---

## 🔄 ตรรกะการจับคู่

### วิธีที่ 1 (Reply Method)

```javascript
// ตรวจสอบ 2 เงื่อนไข
1. ชื่อบั้งไฟเดียวกัน
   User A: ฟ้าหลังฝน = User B: ฟ้าหลังฝน ✅

2. ทั้งคู่ reply ข้อความ
   User A: reply = User B: reply ✅

ผลลัพธ์: MATCHED ✅
```

### วิธีที่ 2 (Direct Method)

```javascript
// ตรวจสอบ 4 เงื่อนไข
1. ชื่อบั้งไฟเดียวกัน
   User A: ฟ้าหลังฝน = User B: ฟ้าหลังฝน ✅

2. จำนวนเงินเดียวกัน
   User A: 500 = User B: 500 ✅

3. ฝั่งตรงข้าม
   User A: ชล (ไล่) ↔ User B: ชถ (ถอย) ✅

4. ราคาเดียวกัน (วิธีที่ 2 เท่านั้น)
   User A: 0/3(300-330) = User B: 0/3(300-330) ✅

ผลลัพธ์: MATCHED ✅
```

---

## 📊 ตัวอย่างการทำงานทั้งรอบ

### Scenario 1: Reply Method

```
1️⃣ Admin: :เริ่ม ฟ้าหลังฝน
   → RoundState: OPEN

2️⃣ Admin: ฟ้าหลังฝน (ส่งชื่อบั้งไฟ)
   → ผู้เล่นรู้ว่าเล่นบั้งไฟไหน

3️⃣ Alice: ต (reply)
   → Bets: Alice, ฟ้าหลังฝน, ต, OPEN

4️⃣ Bob: ต (reply)
   → Bets: Bob, ฟ้าหลังฝน, ต, OPEN
   → จับคู่: Alice ↔ Bob ✅

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
   → Bets: Alice, ฟ้าหลังฝน, ชล, 500, OPEN

3️⃣ Bob: ฟ้าหลังฝน ชถ. 500
   → Bets: Bob, ฟ้าหลังฝน, ชถ, 500, OPEN
   → จับคู่: Alice ↔ Bob ✅

4️⃣ Admin: :หยุด
   → RoundState: CLOSED

5️⃣ Admin: :สรุป ฟ้าหลังฝน 315
   → คำนวณผล
   → ประกาศผล
```

---

## 🎯 ตารางเปรียบเทียบ

| ลักษณะ | Reply Method | Direct Method |
|--------|-------------|---------------|
| วิธีเล่น | Reply ข้อความ | ลงเล่นตรง |
| ข้อมูลที่ส่ง | ต | ฟ้าหลังฝน ชล. 500 |
| ตรวจจับ | Reply pattern | Regex pattern |
| จับคู่ | ชื่อบั้งไฟ + reply | ชื่อบั้งไฟ + ราคา + ฝั่ง + จำนวนเงิน |
| ความยืดหยุ่น | ต่ำ | สูง |
| ความเร็ว | เร็ว | ปกติ |

---

## 💾 ข้อมูลในชีท "Bets"

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

## 🔍 ตรวจจับข้อความ

### Reply Method

```javascript
// ตรวจจับ reply
if (message === 'ต' || message === 'ต.') {
  return {
    type: 'REPLY',
    side: 'ต',
    slipName: getLastSlipName(), // ดึงชื่อบั้งไฟล่าสุด
  };
}
```

### Direct Method

```javascript
// ตรวจจับ direct
const method1Match = message.match(/^(.+?)\s+(ชล\.|ชถ\.)\s+(\d+)$/);
if (method1Match) {
  return {
    type: 'DIRECT',
    method: 1,
    slipName: method1Match[1],
    side: method1Match[2],
    amount: method1Match[3],
  };
}
```

---

## 🔗 ตรรกะการจับคู่

### Reply Method

```javascript
static isValidReplyPair(reply1, reply2) {
  // 1. ชื่อบั้งไฟเดียวกัน
  if (reply1.slipName !== reply2.slipName) return false;
  
  // 2. ทั้งคู่ reply
  if (reply1.type !== 'REPLY' || reply2.type !== 'REPLY') return false;
  
  return true;
}
```

### Direct Method

```javascript
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

---

## 📱 ข้อความที่ส่ง

### Reply Method

```
Admin: ฟ้าหลังฝน
       ↓
Bot: ✅ ส่งชื่อบั้งไฟ: ฟ้าหลังฝน
     กรุณา reply ข้อความนี้เพื่อเล่น

User A: ต (reply)
       ↓
Bot: ✅ บันทึกการเล่นสำเร็จ
     บั้งไฟ: ฟ้าหลังฝน
     ฝั่ง: ตอบ

User B: ต (reply)
       ↓
Bot: ✅ บันทึกการเล่นสำเร็จ
     บั้งไฟ: ฟ้าหลังฝน
     ฝั่ง: ตอบ
     (จับคู่ User A ↔ User B)
```

### Direct Method

```
User A: ฟ้าหลังฝน ชล. 500
       ↓
Bot: ✅ บันทึกการเล่นสำเร็จ
     บั้งไฟ: ฟ้าหลังฝน
     ฝั่ง: ไล่
     จำนวนเงิน: 500 บาท

User B: ฟ้าหลังฝน ชถ. 500
       ↓
Bot: ✅ บันทึกการเล่นสำเร็จ
     บั้งไฟ: ฟ้าหลังฝน
     ฝั่ง: ถอย
     จำนวนเงิน: 500 บาท
     (จับคู่ User A ↔ User B)
```

---

## 🎯 สรุป

| ขั้นตอน | Reply Method | Direct Method |
|--------|-------------|---------------|
| 1. ตรวจจับ | Reply pattern | Regex pattern |
| 2. ตรวจสอบ | ชื่อบั้งไฟ | ข้อมูลทั้งหมด |
| 3. จับคู่ | ชื่อบั้งไฟ + reply | ชื่อบั้งไฟ + ราคา + ฝั่ง + จำนวนเงิน |
| 4. บันทึก | Bets sheet | Bets sheet |
| 5. ประกาศ | ข้อความยืนยัน | ข้อความยืนยัน |

---

**ระบบรองรับทั้ง 2 วิธี และจับคู่อัตโนมัติ!** ✅
