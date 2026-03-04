# ✅ ตรวจสอบระบบจับคู่อัตโนมัติ

## 📋 สรุปการทำงาน

ระบบจับคู่อัตโนมัติทำงานตามขั้นตอนต่อไปนี้:

---

## 🔄 ขั้นตอนการทำงาน (ตรวจสอบแล้ว ✅)

### 1️⃣ รับข้อความจากแชท
```
User B: "320-340 ย 100 คำไผ่"
```
- ✅ ระบบรับข้อความจากแชท (กลุ่มหรือส่วนตัว)
- ✅ ดึง userId, displayName, groupId จาก source

---

### 2️⃣ ตรวจสอบคำสั่งแอดมิน
```javascript
const adminCommand = BettingMessageParserService.parseAdminCommand(message.text);
if (adminCommand.isCommand) {
  return await this.handleAdminCommand(adminCommand, userId);
}
```
- ✅ ตรวจสอบว่าเป็นคำสั่งแอดมิน (`:เริ่ม`, `:หยุด`, `:สรุป`)
- ✅ ถ้าเป็นคำสั่ง ให้ประมวลผลคำสั่ง

---

### 3️⃣ ตรวจสอบสถานะการเดิมพัน
```javascript
if (!bettingRoundStateService.canAcceptBets()) {
  return { type: 'text', text: 'รอบนี้ปิดการทายแล้วคะ/ครับ' };
}
```
- ✅ ตรวจสอบว่าสถานะเป็น `OPEN`
- ✅ ถ้าปิด ให้ส่งข้อความแจ้งเตือน

---

### 4️⃣ ตรวจสอบ Reply Method
```javascript
const replyParsed = BettingMessageParserService.parseReplyMessage(message.text);
if (replyParsed.success) {
  // ประมวลผล Reply Method
}
```
- ✅ ตรวจสอบว่าเป็นการตอบรับ (`ต`, `ต.`)
- ✅ ถ้าใช่ ให้บันทึกการเล่นแบบ Reply

---

### 5️⃣ Parse ข้อความเล่น (Direct Method)
```javascript
const parsedBet = BettingMessageParserService.parseMessage(message.text);
```
- ✅ แยกข้อมูล: ราคา, ฝั่ง, จำนวนเงิน, ชื่อบั้งไฟ
- ✅ ตรวจสอบรูปแบบข้อความ

---

### 6️⃣ ตรวจสอบความถูกต้อง
```javascript
const validation = BettingMessageParserService.validateBet(parsedBet);
if (!validation.valid) {
  return { type: 'text', text: validation.error };
}
```
- ✅ ตรวจสอบจำนวนเงิน > 0 และ <= 1,000,000
- ✅ ตรวจสอบชื่อบั้งไฟไม่ว่าง

---

### 7️⃣ ตรวจสอบยอดเงิน
```javascript
const balanceCheck = await balanceCheckService.checkAndNotify(
  lineName,
  parsedBet.amount,
  userId,
  1,
  groupId
);

if (!balanceCheck.registered) {
  return { type: 'text', text: '❌ ผู้เล่นไม่พบในระบบ' };
}

if (!balanceCheck.sufficient) {
  return { type: 'text', text: '❌ ยอดเงินไม่พอ' };
}
```
- ✅ ตรวจสอบผู้เล่นลงทะเบียนแล้ว
- ✅ ตรวจสอบยอดเงินเพียงพอ

---

### 8️⃣ บันทึกการเล่น
```javascript
const recordResult = await bettingPairingService.recordBet(
  parsedBet,
  userId,
  displayName,
  lineName,
  '',
  '',
  source.groupId || ''
);
```
- ✅ บันทึกข้อมูลการเล่นลงชีท Bets
- ✅ บันทึก 20 คอลัมน์ (A-T)

---

### 9️⃣ ค้นหาคู่ที่จับคู่ได้ (เฉพาะในกลุ่มเดียวกัน)
```javascript
const groupBets = await bettingPairingService.getBetsByGroupId(source.groupId || '');
const matchedPair = PriceRangeMatchingService.findMatchForNewBet(parsedBet, groupBets);
```
- ✅ ดึงข้อมูลการเล่นจากกลุ่มเดียวกัน
- ✅ ค้นหาคู่ที่มีฝั่งตรงข้าม

**เงื่อนไขการจับคู่:**
1. ✅ ชื่อบั้งไฟเดียวกัน
2. ✅ ฝั่งตรงข้าม (ล ↔ ย)
3. ✅ ราคาเดียวกัน (สำหรับ Method 2)
4. ✅ ยอดเงินสามารถต่างกันได้ (ใช้ยอดน้อยกว่า)
5. ✅ อยู่ในกลุ่มเดียวกัน (groupId ตรงกัน)
6. ✅ ยังไม่มีคู่ (status ≠ MATCHED)

---

### 🔟 บันทึกการจับคู่ลงชีท
```javascript
const recordResult = await PriceRangeMatchingService.recordToGoogleSheets(
  sheets,
  bettingPairingService.spreadsheetId,
  bettingPairingService.transactionsSheetName,
  matchedPair,
  matchedPair.existingBet.displayName,
  displayName,
  ''
);
```
- ✅ บันทึกข้อมูลการจับคู่ลงชีท Bets
- ✅ อัปเดตคอลัมน์ User B, ฝั่ง B, ยอดเงิน B

---

### 1️⃣1️⃣ ส่งแจ้งเตือน
```javascript
const notificationService = new LineNotificationService(1);

// ส่งข้อความส่วนตัวให้ผู้เล่น A (ผู้เล่นเดิม)
await notificationService.sendPrivateMessage(
  matchedPair.existingBet.userId,
  messages.messageB
);

// ส่งข้อความส่วนตัวให้ผู้เล่น B (ผู้เล่นใหม่)
await notificationService.sendPrivateMessage(userId, messages.messageA);

// ส่งข้อความเข้ากลุ่ม (ถ้ามี groupId)
if (source.groupId) {
  await notificationService.sendGroupMessage(
    source.groupId,
    messages.groupMessage
  );
}
```
- ✅ ส่งข้อความส่วนตัวให้ผู้เล่น A
- ✅ ส่งข้อความส่วนตัวให้ผู้เล่น B
- ✅ ส่งข้อความเข้ากลุ่ม (ถ้ามี groupId)

---

### 1️⃣2️⃣ ส่งข้อความยืนยัน
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
- ✅ ส่งข้อความยืนยันการจับคู่สำเร็จ

---

## 📊 ตัวอย่างการทำงาน

### ตัวอย่างที่ 1: จับคู่สำเร็จ ✅

```
กลุ่ม A:
  User A: "320-340 ล 100 คำไผ่"
    ↓
    [Parse] → price: "320-340", side: "ล", amount: 100, slip: "คำไผ่"
    [Validate] → ✅ ถูกต้อง
    [Check Balance] → ✅ เพียงพอ
    [Record Bet] → บันทึกลงชีท Bets (แถว 1)
    [Find Match] → ❌ ไม่พบคู่
    ⏳ รอการจับคู่

  User B: "320-340 ย 100 คำไผ่"
    ↓
    [Parse] → price: "320-340", side: "ย", amount: 100, slip: "คำไผ่"
    [Validate] → ✅ ถูกต้อง
    [Check Balance] → ✅ เพียงพอ
    [Record Bet] → บันทึกลงชีท Bets (แถว 2)
    [Find Match] → ✅ พบ User A
    [Record Match] → อัปเดตแถว 1 (User B, ฝั่ง B, ยอดเงิน B)
    [Send Notifications]
      ├─ 📤 ส่งข้อความส่วนตัวให้ User A
      ├─ 📤 ส่งข้อความส่วนตัวให้ User B
      └─ 📢 ส่งข้อความเข้ากลุ่ม A
    ✅ จับคู่สำเร็จ
```

### ตัวอย่างที่ 2: ไม่พบคู่ ⏳

```
กลุ่ม A:
  User A: "320-340 ล 100 คำไผ่"
    ↓
    [Parse] → ✅ ถูกต้อง
    [Check Balance] → ✅ เพียงพอ
    [Record Bet] → บันทึกลงชีท Bets
    [Find Match] → ❌ ไม่พบคู่
    ⏳ รอการจับคู่
```

### ตัวอย่างที่ 3: ไม่จับคู่ข้ามกลุ่ม ❌

```
กลุ่ม A:
  User A: "320-340 ล 100 คำไผ่"

กลุ่ม B:
  User B: "320-340 ย 100 คำไผ่"
    ↓
    [Find Match] → ❌ ไม่พบคู่ (ต่างกลุ่ม)
    ⏳ User B รอการจับคู่ในกลุ่ม B
```

---

## ✅ ตรวจสอบการทำงาน

| ขั้นตอน | สถานะ | หมายเหตุ |
|--------|------|---------|
| 1. รับข้อความจากแชท | ✅ | ระบบรับข้อความจากแชท |
| 2. ตรวจสอบคำสั่งแอดมิน | ✅ | ตรวจสอบว่าเป็นคำสั่ง |
| 3. ตรวจสอบสถานะการเดิมพัน | ✅ | ตรวจสอบว่าเป็น OPEN |
| 4. ตรวจสอบ Reply Method | ✅ | ตรวจสอบว่าเป็นการตอบรับ |
| 5. Parse ข้อความเล่น | ✅ | แยกข้อมูล |
| 6. ตรวจสอบความถูกต้อง | ✅ | ตรวจสอบจำนวนเงิน |
| 7. ตรวจสอบยอดเงิน | ✅ | ตรวจสอบยอดเงินเพียงพอ |
| 8. บันทึกการเล่น | ✅ | บันทึกลงชีท Bets |
| 9. ค้นหาคู่ (เฉพาะในกลุ่ม) | ✅ | ค้นหาเฉพาะในกลุ่มเดียวกัน |
| 10. บันทึกการจับคู่ | ✅ | บันทึกลงชีท Bets |
| 11. ส่งแจ้งเตือน | ✅ | ส่งข้อความส่วนตัวและกลุ่ม |
| 12. ส่งข้อความยืนยัน | ✅ | ส่งข้อความยืนยัน |

---

## 🎯 ฟีเจอร์ที่ได้ปรับปรุง

1. ✅ ค้นหาคู่เฉพาะในกลุ่มเดียวกัน (groupId ตรงกัน)
2. ✅ ป้องกันการจับคู่ข้ามกลุ่ม
3. ✅ แสดงราคาของทั้งสองฝั่ง (ถ้าต่างกัน)
4. ✅ ส่งแจ้งเตือนไปยัง LINE (ส่วนตัวและกลุ่ม)
5. ✅ บันทึกข้อมูลการจับคู่ลงชีท Bets

---

## 📌 สรุป

ระบบจับคู่อัตโนมัติทำงานถูกต้องตามที่ต้องการ:

1. ✅ **ตรวจสอบข้อความในแชท** - ระบบรับข้อความและ parse ข้อมูล
2. ✅ **จับคู่ Auto** - ค้นหาคู่เฉพาะในกลุ่มเดียวกัน
3. ✅ **บันทึกลงชีท** - บันทึกข้อมูลการจับคู่ลงชีท Bets
4. ✅ **ส่งแจ้งเตือน** - ส่งข้อความแจ้งเตือนไปยัง LINE

