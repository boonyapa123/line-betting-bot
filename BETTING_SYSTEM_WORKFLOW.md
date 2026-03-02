# 🎰 Betting System - Complete Workflow

## 📋 ภาพรวมการทำงาน

ระบบ Betting Bot ทำงานตามขั้นตอนต่อไปนี้:

```
┌─────────────────────────────────────────────────────────────┐
│                    LINE Bot Workflow                         │
└─────────────────────────────────────────────────────────────┘

1. Admin ส่งคำสั่ง
   ↓
2. Bot ตรวจจับข้อความ
   ↓
3. Bot ประมวลผล
   ↓
4. Bot บันทึกข้อมูล
   ↓
5. Bot ส่งข้อความตอบกลับ
   ↓
6. Bot ประกาศผลลัพธ์
```

---

## 🔍 ขั้นตอนที่ 1: ตรวจจับข้อความ (Message Detection)

### วิธีการตรวจจับ

Bot ใช้ **Regex Pattern** เพื่อตรวจจับข้อความ:

#### 1.1 ตรวจจับคำสั่งแอดมิน

```javascript
// Pattern สำหรับคำสั่งแอดมิน
:เริ่ม [ชื่อบั้งไฟ]    → START command
:หยุด                 → STOP command
:สรุป [ชื่อบั้งไฟ] [คะแนน] → CALCULATE command
```

**ตัวอย่าง:**
```
Admin: :เริ่ม ฟ้าหลังฝน
Bot: ✅ ตรวจจับ START command
     ชื่อบั้งไฟ: ฟ้าหลังฝน
```

#### 1.2 ตรวจจับข้อความเล่น (วิธีที่ 1)

```regex
^(.+?)\s+(ชล\.|ชถ\.)\s+(\d+)$
```

**ตัวอย่าง:**
```
User: ฟ้าหลังฝน ชล. 500
Bot: ✅ ตรวจจับ Method 1
     Group 1 (ชื่อบั้งไฟ): ฟ้าหลังฝน
     Group 2 (ฝั่ง): ชล.
     Group 3 (จำนวนเงิน): 500
```

#### 1.3 ตรวจจับข้อความเล่น (วิธีที่ 2)

```regex
^(.+?)\s+([ลย]\.)\s+(\d+)\s+(.+)$
```

**ตัวอย่าง:**
```
User: 0/3(300-330) ล. 500 ฟ้าหลังฝน
Bot: ✅ ตรวจจับ Method 2
     Group 1 (ราคา): 0/3(300-330)
     Group 2 (ฝั่ง): ล.
     Group 3 (จำนวนเงิน): 500
     Group 4 (ชื่อบั้งไฟ): ฟ้าหลังฝน
```

### Code ที่ใช้

```javascript
// File: services/betting/bettingMessageParserService.js

static parseMessage(message) {
  const trimmedMessage = message.trim();

  // ตรวจสอบวิธีที่ 1
  const method1Match = trimmedMessage.match(this.METHOD1_PATTERN);
  if (method1Match) {
    return this.parseMethod1(method1Match);
  }

  // ตรวจสอบวิธีที่ 2
  const method2Match = trimmedMessage.match(this.METHOD2_PATTERN);
  if (method2Match) {
    return this.parseMethod2(method2Match);
  }

  // ไม่ตรงรูปแบบ
  return {
    success: false,
    error: 'รูปแบบผิดครับ กรุณาตรวจสอบการเว้นวรรค',
  };
}
```

---

## ✅ ขั้นตอนที่ 2: ตรวจสอบความถูกต้อง (Validation)

### ตรวจสอบอะไรบ้าง

```javascript
// 1. ตรวจสอบจำนวนเงิน
if (amount <= 0) {
  return { valid: false, error: 'จำนวนเงินต้องมากกว่า 0' };
}

if (amount > 1000000) {
  return { valid: false, error: 'จำนวนเงินเกินขีดจำกัด' };
}

// 2. ตรวจสอบชื่อบั้งไฟ
if (!slipName || slipName.length === 0) {
  return { valid: false, error: 'ชื่อบั้งไฟไม่ถูกต้อง' };
}

// 3. ตรวจสอบสถานะรอบ
if (!canAcceptBets()) {
  return { valid: false, error: 'รอบนี้ปิดการทายแล้ว' };
}
```

### ตัวอย่าง

```
User: ฟ้าหลังฝน ชล. 0
Bot: ❌ จำนวนเงินต้องมากกว่า 0

User: ฟ้าหลังฝน ชล. 2000000
Bot: ❌ จำนวนเงินเกินขีดจำกัด

User: ฟ้าหลังฝน ชล. 500 (เมื่อปิดรอบแล้ว)
Bot: ❌ รอบนี้ปิดการทายแล้ว
```

---

## 🔗 ขั้นตอนที่ 3: จับคู่การเล่น (Pairing)

### ตรรกะการจับคู่

Bot จะค้นหาคนที่เล่นบั้งไฟเดียวกัน ราคาเดียวกัน แต่ฝั่งตรงข้าม

```javascript
static isValidPair(bet1, bet2) {
  // 1. ต้องเป็นบั้งไฟเดียวกัน
  if (bet1.slipName !== bet2.slipName) return false;

  // 2. ต้องเป็นจำนวนเงินเดียวกัน
  if (bet1.amount !== bet2.amount) return false;

  // 3. ต้องเป็นฝั่งตรงข้าม
  const oppositeMap = {
    'ชล': 'ชถ',
    'ชถ': 'ชล',
    'ล': 'ย',
    'ย': 'ล',
  };
  if (oppositeMap[bet1.side] !== bet2.side) return false;

  // 4. วิธีที่ 2 ต้องมีราคาเดียวกัน
  if (bet1.method === 2 && bet2.method === 2) {
    if (bet1.price !== bet2.price) return false;
  }

  return true;
}
```

### ตัวอย่างการจับคู่

```
ข้อมูลการเล่น:
1. Alice - ฟ้าหลังฝน ชล. 500
2. Bob - ฟ้าหลังฝน ชถ. 500
3. Charlie - พายุ ล. 1000 (0/3(300-330))
4. David - พายุ ย. 1000 (0/3(300-330))
5. Eve - เมฆา ล. 500 (0/3(300-330))

จับคู่ได้:
✅ คู่ที่ 1: Alice (ชล) ↔ Bob (ชถ) - ฟ้าหลังฝน 500
✅ คู่ที่ 2: Charlie (ล) ↔ David (ย) - พายุ 1000 (0/3(300-330))
⏳ Eve รอคู่ (Pending)
```

---

## 💾 ขั้นตอนที่ 4: บันทึกข้อมูล (Data Recording)

### บันทึกลงชีท "Bets"

```javascript
async recordBet(betData, userId, displayName) {
  const row = [
    new Date().toISOString(),  // Timestamp
    userId,                     // User ID
    displayName,                // Display Name
    betData.method,             // Method (1/2)
    betData.price || '',        // Price
    betData.sideCode,           // Side (ชล/ชถ/ล/ย)
    betData.amount,             // Amount
    betData.slipName,           // Slip Name
    'OPEN',                     // Status
  ];

  await this.sheets.spreadsheets.values.append({
    spreadsheetId: this.spreadsheetId,
    range: `${this.transactionsSheetName}!A:I`,
    valueInputOption: 'RAW',
    resource: { values: [row] },
  });
}
```

### ตัวอย่างข้อมูลที่บันทึก

```
Timestamp | UserID | DisplayName | Method | Price | Side | Amount | SlipName | Status
2024-03-02T10:30:00Z | U001 | Alice | 1 | | ชล | 500 | ฟ้าหลังฝน | OPEN
2024-03-02T10:31:00Z | U002 | Bob | 1 | | ชถ | 500 | ฟ้าหลังฝน | OPEN
2024-03-02T10:32:00Z | U003 | Charlie | 2 | 0/3(300-330) | ล | 1000 | พายุ | OPEN
```

---

## 📢 ขั้นตอนที่ 5: ส่งข้อความตอบกลับ (Response)

### ข้อความยืนยันการเล่น

```javascript
buildConfirmationMessage(parsedBet, displayName) {
  let message = `✅ บันทึกการเล่นสำเร็จ\n\n`;
  message += `ชื่อ: ${displayName}\n`;
  message += `บั้งไฟ: ${parsedBet.slipName}\n`;
  
  if (parsedBet.method === 1) {
    message += `ฝั่ง: ${parsedBet.side}\n`;
  } else {
    message += `ราคา: ${parsedBet.price}\n`;
    message += `ฝั่ง: ${parsedBet.side}\n`;
  }
  
  message += `จำนวนเงิน: ${parsedBet.amount} บาท`;
  return message;
}
```

### ตัวอย่างข้อความตอบกลับ

```
User: ฟ้าหลังฝน ชล. 500

Bot:
✅ บันทึกการเล่นสำเร็จ

ชื่อ: Alice
บั้งไฟ: ฟ้าหลังฝน
ฝั่ง: ไล่
จำนวนเงิน: 500 บาท
```

---

## 🏆 ขั้นตอนที่ 6: ประกาศผลลัพธ์ (Result Announcement)

### ขั้นตอนการคำนวณผล

```javascript
static calculateResult(pair, slipName, score) {
  const { bet1, bet2 } = pair;
  let winner = null;
  let loser = null;

  if (bet1.method === 1) {
    // วิธีที่ 1: ฝั่ง "ไล่" (ชล) ชนะเสมอ
    winner = bet1.side === 'ชล' ? bet1 : bet2;
    loser = bet1.side === 'ชล' ? bet2 : bet1;
  } else if (bet1.method === 2) {
    // วิธีที่ 2: ตรวจสอบเกณฑ์ราคา
    const priceRange = this.parsePriceRange(bet1.price);
    const isInRange = score >= priceRange.min && score <= priceRange.max;

    if (isInRange) {
      // คะแนนอยู่ในเกณฑ์ → ฝั่ง "ไล่" (ล) ชนะ
      winner = bet1.side === 'ไล่' ? bet1 : bet2;
      loser = bet1.side === 'ไล่' ? bet2 : bet1;
    } else {
      // คะแนนไม่อยู่ในเกณฑ์ → ฝั่ง "ยั้ง" (ย) ชนะ
      winner = bet1.side === 'ยั้ง' ? bet1 : bet2;
      loser = bet1.side === 'ยั้ง' ? bet2 : bet1;
    }
  }

  return { winner, loser };
}
```

### ตัวอย่างการคำนวณผล

**วิธีที่ 1:**
```
Alice: ฟ้าหลังฝน ชล. 500 (ฝั่ง "ไล่")
Bob: ฟ้าหลังฝน ชถ. 500 (ฝั่ง "ถอย")

ผลลัพธ์:
🏆 Alice ชนะ +500 บาท
❌ Bob แพ้ -500 บาท
```

**วิธีที่ 2:**
```
Charlie: 0/3(300-330) ล. 1000 (ฝั่ง "ไล่")
David: 0/3(300-330) ย. 1000 (ฝั่ง "ยั้ง")

คะแนนที่ออก: 315

ตรวจสอบ: 315 อยู่ในช่วง 300-330 ✅

ผลลัพธ์:
🏆 Charlie ชนะ +1000 บาท
❌ David แพ้ -1000 บาท
```

---

## 📊 ขั้นตอนที่ 7: ประกาศผลลัพธ์เข้าห้องแชท

### ข้อความประกาศผลลัพธ์

```javascript
async buildResultReport(slipName, score, results) {
  let report = `📊 สรุปผลการเล่น\n`;
  report += `บั้งไฟ: ${slipName}\n`;
  report += `คะแนนที่ออก: ${score}\n`;
  report += `${'='.repeat(40)}\n\n`;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    report += `คู่ที่ ${i + 1}:\n`;
    report += `🏆 ชนะ: ${result.winner.displayName} +${result.winner.amount} บาท\n`;
    report += `❌ แพ้: ${result.loser.displayName} -${result.loser.amount} บาท\n\n`;
  }

  // ดึงยอดเงินคงเหลือ
  const balances = await bettingPairingService.getAllBalances();
  report += `${'='.repeat(40)}\n`;
  report += `💰 ยอดเงินคงเหลือ:\n\n`;

  for (const balance of balances) {
    report += `${balance.displayName}: ${balance.balance} บาท\n`;
  }

  return report;
}
```

### ตัวอย่างข้อความประกาศผล

```
📊 สรุปผลการเล่น
บั้งไฟ: ฟ้าหลังฝน
คะแนนที่ออก: 315
========================================

คู่ที่ 1:
🏆 ชนะ: Alice +500 บาท
❌ แพ้: Bob -500 บาท

คู่ที่ 2:
🏆 ชนะ: Charlie +1000 บาท
❌ แพ้: David -1000 บาท

========================================
💰 ยอดเงินคงเหลือ:

Alice: 1500 บาท
Bob: 500 บาท
Charlie: 2000 บาท
David: 1000 บาท
```

---

## 🔄 ตัวอย่างการทำงานทั้งรอบ

### Scenario: รอบการเล่นเดียว

```
1️⃣ Admin: :เริ่ม ฟ้าหลังฝน
   ├─ ตรวจจับ: START command
   ├─ ตรวจสอบ: ชื่อบั้งไฟ "ฟ้าหลังฝน"
   ├─ บันทึก: RoundState = OPEN
   └─ ส่งข้อความ: ✅ เปิดรอบการเล่น

2️⃣ Alice: ฟ้าหลังฝน ชล. 500
   ├─ ตรวจจับ: Method 1 pattern
   ├─ ตรวจสอบ: สถานะ OPEN, จำนวนเงิน 500
   ├─ บันทึก: Bets sheet
   └─ ส่งข้อความ: ✅ บันทึกการเล่นสำเร็จ

3️⃣ Bob: ฟ้าหลังฝน ชถ. 500
   ├─ ตรวจจับ: Method 1 pattern
   ├─ ตรวจสอบ: สถานะ OPEN, จำนวนเงิน 500
   ├─ บันทึก: Bets sheet
   ├─ จับคู่: Alice ↔ Bob ✅
   └─ ส่งข้อความ: ✅ บันทึกการเล่นสำเร็จ

4️⃣ Admin: :หยุด
   ├─ ตรวจจับ: STOP command
   ├─ บันทึก: RoundState = CLOSED
   └─ ส่งข้อความ: รอบนี้ปิดการทายแล้ว

5️⃣ Admin: :สรุป ฟ้าหลังฝน 315
   ├─ ตรวจจับ: CALCULATE command
   ├─ ดึงข้อมูล: Bets sheet
   ├─ จับคู่: Alice ↔ Bob
   ├─ คำนวณ: Alice ชนะ (ฝั่ง ชล)
   ├─ อัปเดต: UsersBalance
   ├─ ล้าง: Bets sheet
   └─ ส่งข้อความ: 📊 สรุปผลการเล่น
                  🏆 Alice +500
                  ❌ Bob -500
                  💰 ยอดเงิน...
```

---

## 📱 ข้อความที่ส่งเข้าห้องแชท

### ✅ ข้อความยืนยัน
```
✅ บันทึกการเล่นสำเร็จ
ชื่อ: Alice
บั้งไฟ: ฟ้าหลังฝน
ฝั่ง: ไล่
จำนวนเงิน: 500 บาท
```

### ❌ ข้อความข้อผิดพลาด
```
❌ รูปแบบผิดครับ กรุณาตรวจสอบการเว้นวรรค

วิธีที่ 1: [ชื่อบั้งไฟ] [ชล./ชถ.] [ยอดเงิน]
ตัวอย่าง: ฟ้าหลังฝน ชล. 500

วิธีที่ 2: [ราคา] [ล./ย.] [ยอดเงิน] [ชื่อบั้งไฟ]
ตัวอย่าง: 0/3(300-330) ล. 500 ฟ้าหลังฝน
```

### 📊 ข้อความประกาศผล
```
📊 สรุปผลการเล่น
บั้งไฟ: ฟ้าหลังฝน
คะแนนที่ออก: 315
========================================

คู่ที่ 1:
🏆 ชนะ: Alice +500 บาท
❌ แพ้: Bob -500 บาท

========================================
💰 ยอดเงินคงเหลือ:

Alice: 1500 บาท
Bob: 500 บาท
```

---

## 🎯 สรุป

| ขั้นตอน | วิธีการ | ผลลัพธ์ |
|--------|--------|--------|
| 1. ตรวจจับ | Regex Pattern | ได้ข้อมูลการเล่น |
| 2. ตรวจสอบ | Validation | ข้อมูลถูกต้อง |
| 3. จับคู่ | Pairing Algorithm | หาคู่ที่ตรงกัน |
| 4. บันทึก | Google Sheets API | บันทึกลงชีท "Bets" |
| 5. ตอบกลับ | LINE Message API | ส่งข้อความยืนยัน |
| 6. คำนวณ | Result Calculation | หาผู้ชนะ/แพ้ |
| 7. ประกาศ | LINE Message API | ส่งผลลัพธ์เข้าห้องแชท |

---

**ใช่ครับ! ระบบจะประกาศผลลัพธ์เข้าห้องแชทนั้นๆด้วย** ✅

ทุกขั้นตอนจะมีข้อความส่งกลับไปยัง LINE ห้องแชทเดียวกัน เพื่อให้ผู้เล่นทราบสถานะการเล่นและผลลัพธ์ทันที
