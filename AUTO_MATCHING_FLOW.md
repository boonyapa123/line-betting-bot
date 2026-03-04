# 🎯 ขั้นตอนการจับคู่อัตโนมัติ (Auto Matching Flow)

## 📊 ภาพรวม

ระบบจับคู่อัตโนมัติทำงานเมื่อผู้เล่นส่งข้อความเดิมพัน โดยตรวจสอบว่ามีผู้เล่นอื่นที่มีฝั่งตรงข้ามและราคาเดียวกันหรือไม่

---

## 🔄 ขั้นตอนการทำงาน

### 1️⃣ **รับข้อความจาก User**
```
User A: "320-340 ล 100 คำไผ่"
```

**ข้อมูลที่ดึง:**
- `price`: "320-340"
- `sideCode`: "ล"
- `amount`: 100
- `slipName`: "คำไผ่"
- `userId`: "U51899d9b032327436b48ccb369a8505d"
- `displayName`: "ธา มือทอง"
- `groupId`: "C4e522277480703e5eddbf658666ba6a9"

---

### 2️⃣ **ตรวจสอบคำสั่งแอดมิน**
```javascript
const adminCommand = BettingMessageParserService.parseAdminCommand(message.text);
if (adminCommand.isCommand) {
  // ถ้าเป็นคำสั่ง ให้ประมวลผลคำสั่ง
  return await this.handleAdminCommand(adminCommand, userId);
}
```

**ตัวอย่างคำสั่ง:**
- `:เริ่ม คำไผ่` - เริ่มรอบใหม่
- `:หยุด` - หยุดการเดิมพัน
- `:สรุป คำไผ่ 320` - ประกาศผล

---

### 3️⃣ **ตรวจสอบสถานะการเดิมพัน**
```javascript
if (!bettingRoundStateService.canAcceptBets()) {
  return { type: 'text', text: 'รอบนี้ปิดการทายแล้ว' };
}
```

**สถานะที่ยอมรับ:**
- `OPEN` - เปิดการเดิมพัน ✅
- `CLOSED` - ปิดการเดิมพัน ❌
- `CALCULATING` - กำลังคำนวณผล ❌

---

### 4️⃣ **ตรวจสอบ Reply Method**
```javascript
const replyParsed = BettingMessageParserService.parseReplyMessage(message.text);
if (replyParsed.success) {
  // ถ้าเป็น Reply ให้ประมวลผล Reply
  // ...
}
```

**ตัวอย่าง Reply:**
- `ต` - ตอบรับ (ใช้ฝั่งตรงข้าม)
- `ต.` - ตอบรับ (ใช้ฝั่งตรงข้าม)

---

### 5️⃣ **Parse ข้อความเล่น (Direct Method)**
```javascript
const parsedBet = BettingMessageParserService.parseMessage(message.text);
```

**รูปแบบที่รองรับ:**
- `320-340 ล 100 คำไผ่` ✅ (Method 2 - ราคาคะแนน)
- `ชล 500 ฟ้าหลังฝน` ✅ (Method 1 - ราคาช่าง)

---

### 6️⃣ **ตรวจสอบความถูกต้อง**
```javascript
const validation = BettingMessageParserService.validateBet(parsedBet);
if (!validation.valid) {
  return { type: 'text', text: validation.error };
}
```

**ตรวจสอบ:**
- ✅ จำนวนเงิน > 0
- ✅ จำนวนเงิน <= 1,000,000
- ✅ ชื่อบั้งไฟไม่ว่าง

---

### 7️⃣ **ตรวจสอบยอดเงิน**
```javascript
const balanceCheck = await balanceCheckService.checkAndNotify(
  lineName,
  parsedBet.amount,
  userId,
  1, // Account 1
  groupId
);

if (!balanceCheck.registered) {
  return { type: 'text', text: '❌ ผู้เล่นไม่พบในระบบ' };
}

if (!balanceCheck.sufficient) {
  return { type: 'text', text: '❌ ยอดเงินไม่พอ' };
}
```

**ตรวจสอบ:**
- ✅ ผู้เล่นลงทะเบียนแล้ว
- ✅ ยอดเงินเพียงพอ

---

### 8️⃣ **บันทึกการเล่น**
```javascript
const recordResult = await bettingPairingService.recordBet(
  parsedBet,
  userId,
  displayName,
  lineName,
  '', // groupName
  '', // userToken
  source.groupId || ''
);
```

**บันทึกลงชีท Bets:**
- Column A: Timestamp
- Column B: User A ID
- Column C: ชื่อ User A
- Column D: ข้อความ A
- Column E: ชื่อบั้งไฟ
- Column F: ฝั่ง A
- Column G: ยอดเงิน
- ...

---

### 9️⃣ **ค้นหาคู่ที่จับคู่ได้ (เฉพาะในกลุ่มเดียวกัน)**
```javascript
const PriceRangeMatchingService = require('./priceRangeMatchingService');
const groupBets = await bettingPairingService.getBetsByGroupId(source.groupId || '');

const matchedPair = PriceRangeMatchingService.findMatchForNewBet(parsedBet, groupBets);
```

**เงื่อนไขการจับคู่:**
1. ✅ ชื่อบั้งไฟเดียวกัน
2. ✅ ฝั่งตรงข้าม (ล ↔ ย)
3. ✅ ราคาเดียวกัน (สำหรับ Method 2)
4. ✅ ยอดเงินสามารถต่างกันได้ (ใช้ยอดน้อยกว่า)
5. ✅ **อยู่ในกลุ่มเดียวกัน (groupId ตรงกัน)**
6. ✅ **ยังไม่มีคู่ (status ≠ MATCHED)**
7. ✅ **ข้อความเป็น Direct (ไม่ใช่ Reply)**

---

### 🔟 **บันทึกการจับคู่**
```javascript
if (matchedPair) {
  const recordResult = await PriceRangeMatchingService.recordToGoogleSheets(
    sheets,
    bettingPairingService.spreadsheetId,
    bettingPairingService.transactionsSheetName,
    matchedPair,
    matchedPair.existingBet.displayName,
    displayName,
    ''
  );
}
```

**บันทึกข้อมูลการจับคู่:**
- Column H: ยอดเงิน B
- Column K: User B ID
- Column L: ชื่อ User B
- Column M: ฝั่ง B
- Column Q: ID กลุ่ม

---

### 1️⃣1️⃣ **ส่งแจ้งเตือน**
```javascript
const { LineNotificationService } = require('../line/lineNotificationService');
const notificationService = new LineNotificationService(1);

// ส่งข้อความส่วนตัวให้ผู้เล่น A
await notificationService.sendPrivateMessage(
  matchedPair.existingBet.userId,
  messages.messageB
);

// ส่งข้อความส่วนตัวให้ผู้เล่น B
await notificationService.sendPrivateMessage(userId, messages.messageA);

// ส่งข้อความเข้ากลุ่ม
if (source.groupId) {
  await notificationService.sendGroupMessage(
    source.groupId,
    messages.groupMessage
  );
}
```

**ข้อความที่ส่ง:**
- ✅ ข้อความส่วนตัวให้ผู้เล่น A
- ✅ ข้อความส่วนตัวให้ผู้เล่น B
- ✅ ข้อความเข้ากลุ่ม (ถ้ามี groupId)

---

### 1️⃣2️⃣ **ส่งข้อความยืนยัน**
```javascript
return {
  type: 'text',
  text: `✅ จับคู่เล่นสำเร็จ\n\n` +
    `👤 คู่แข่ง: ${matchedPair.existingBet.displayName}\n` +
    `🎆 บั้งไฟ: ${parsedBet.slipName}\n` +
    `💹 ราคาของคุณ: ${parsedBet.price}\n` +
    `💹 ราคาคู่แข่ง: ${matchedPair.existingBet.price}\n` +
    `💰 ยอดเงิน: ${matchedPair.betAmount} บาท\n\n` +
    `⏳ รอการประกาศผล...`,
};
```

---

## 📋 ตัวอย่างการจับคู่

### ตัวอย่างที่ 1: จับคู่สำเร็จ ✅

```
User A: "320-340 ล 100 คำไผ่"
  ↓
[Parse] → price: "320-340", side: "ล", amount: 100, slip: "คำไผ่"
  ↓
[Validate] → ✅ ถูกต้อง
  ↓
[Check Balance] → ✅ เพียงพอ
  ↓
[Record Bet] → บันทึกลงชีท Bets
  ↓
[Find Match] → ค้นหาคู่ที่มีฝั่งตรงข้าม
  ↓
User B: "320-340 ย 100 คำไผ่" (ที่บันทึกไว้ก่อนหน้า)
  ↓
[Match Found] → ✅ พบคู่
  ↓
[Record Match] → บันทึกการจับคู่
  ↓
[Send Notifications] → ส่งแจ้งเตือน
  ↓
✅ จับคู่สำเร็จ
```

### ตัวอย่างที่ 2: ไม่พบคู่ ⏳

```
User A: "320-340 ล 100 คำไผ่"
  ↓
[Parse] → price: "320-340", side: "ล", amount: 100, slip: "คำไผ่"
  ↓
[Validate] → ✅ ถูกต้อง
  ↓
[Check Balance] → ✅ เพียงพอ
  ↓
[Record Bet] → บันทึกลงชีท Bets
  ↓
[Find Match] → ค้นหาคู่ที่มีฝั่งตรงข้าม
  ↓
[No Match Found] → ❌ ไม่พบคู่
  ↓
⏳ รอการจับคู่ (รอให้ User B ส่งข้อความ)
```

---

## 🔍 ฟังก์ชันที่เกี่ยวข้อง

| ฟังก์ชัน | ไฟล์ | หน้าที่ |
|---------|------|--------|
| `handleMessage()` | bettingRoundController.js | จัดการข้อความเข้ามา |
| `parseMessage()` | bettingMessageParserService.js | Parse ข้อความเล่น |
| `validateBet()` | bettingMessageParserService.js | ตรวจสอบความถูกต้อง |
| `checkAndNotify()` | balanceCheckService.js | ตรวจสอบยอดเงิน |
| `recordBet()` | bettingPairingService.js | บันทึกการเล่น |
| `getAllBets()` | bettingPairingService.js | ดึงข้อมูลการเล่นทั้งหมด |
| `findMatchForNewBet()` | priceRangeMatchingService.js | ค้นหาคู่ที่จับคู่ได้ |
| `recordToGoogleSheets()` | priceRangeMatchingService.js | บันทึกการจับคู่ |
| `sendPrivateMessage()` | lineNotificationService.js | ส่งข้อความส่วนตัว |
| `sendGroupMessage()` | lineNotificationService.js | ส่งข้อความเข้ากลุ่ม |

---

## 🚀 ขั้นตอนการทดสอบ

1. **เปิดรอบการเดิมพัน**
   ```
   Admin: ":เริ่ม คำไผ่"
   ```

2. **ผู้เล่น A ส่งข้อความเดิมพัน**
   ```
   User A: "320-340 ล 100 คำไผ่"
   ```
   - ✅ บันทึกลงชีท Bets
   - ⏳ รอการจับคู่

3. **ผู้เล่น B ส่งข้อความเดิมพัน**
   ```
   User B: "320-340 ย 100 คำไผ่"
   ```
   - ✅ บันทึกลงชีท Bets
   - ✅ ค้นหาคู่ → พบ User A
   - ✅ บันทึกการจับคู่
   - ✅ ส่งแจ้งเตือน

4. **ประกาศผล**
   ```
   Admin: ":สรุป คำไผ่ 320"
   ```
   - ✅ อัปเดตผลลัพธ์
   - ✅ คำนวณแพ้ชนะ
   - ✅ อัปเดตยอดเงิน

---

## 📌 หมายเหตุ

- ระบบจับคู่อัตโนมัติทำงานทันทีเมื่อผู้เล่น B ส่งข้อความ
- ใช้ยอดเงินน้อยกว่าของทั้งสองฝั่ง
- ส่งแจ้งเตือนไปยัง LINE (ส่วนตัวและกลุ่ม)
- บันทึกข้อมูลลงชีท Bets (20 คอลัมน์)
