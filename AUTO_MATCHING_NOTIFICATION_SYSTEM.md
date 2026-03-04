# 📢 ระบบแจ้งเตือนการจับคู่อัตโนมัติ

## 📝 สรุป

เมื่อระบบจับคู่เล่นได้สำเร็จ จะส่งแจ้งเตือนไปยัง:
1. ✅ ข้อความส่วนตัวให้ผู้เล่น A (ผู้เล่นเดิม)
2. ✅ ข้อความส่วนตัวให้ผู้เล่น B (ผู้เล่นใหม่)
3. ✅ ข้อความเข้ากลุ่ม LINE (ถ้ามี groupId)

---

## 🔄 ขั้นตอนการทำงาน

```
User B: "320-340 ย 100 คำไผ่"
    ↓
[Parse Message] → method: 2, side: ย, price: 320-340, amount: 100
    ↓
[Record Bet] → บันทึกลงชีท Bets
    ↓
[Check Balance] → ตรวจสอบยอดเงิน ✅
    ↓
[Find Match] → ค้นหาคู่ในกลุ่มเดียวกัน
    ↓
    ✅ พบ User A (ฝั่งตรงข้าม, บั้งไฟเดียวกัน)
    ↓
[Create Messages] → สร้างข้อความแจ้งเตือน
    ├─ messageA: ข้อความสำหรับ User B (ผู้เล่นใหม่)
    ├─ messageB: ข้อความสำหรับ User A (ผู้เล่นเดิม)
    └─ groupMessage: ข้อความสำหรับกลุ่ม
    ↓
[Send Notifications]
    ├─ 📤 ส่งข้อความส่วนตัวให้ User A
    ├─ 📤 ส่งข้อความส่วนตัวให้ User B
    └─ 📢 ส่งข้อความเข้ากลุ่ม (ถ้ามี groupId)
    ↓
✅ แจ้งเตือนสำเร็จ
```

---

## 📊 ตัวอย่างข้อความแจ้งเตือน

### ข้อความส่วนตัวผู้เล่น A (ผู้เล่นเดิม)

```
✅ จับคู่เล่นสำเร็จ (ร้องราคา)

👤 คุณ: ธา มือทอง
👤 คู่แข่ง: สมชาย ผู้ชนะ
🎆 บั้งไฟ: คำไผ่
💹 ราคาของคุณ: 320-340
💹 ราคาคู่แข่ง: 320-340
💰 ยอดเงิน: 100 บาท

⏳ รอการประกาศผล...
```

### ข้อความส่วนตัวผู้เล่น B (ผู้เล่นใหม่)

```
✅ จับคู่เล่นสำเร็จ (ร้องราคา)

👤 คุณ: สมชาย ผู้ชนะ
👤 คู่แข่ง: ธา มือทอง
🎆 บั้งไฟ: คำไผ่
💹 ราคาของคุณ: 320-340
💹 ราคาคู่แข่ง: 320-340
💰 ยอดเงิน: 100 บาท

⏳ รอการประกาศผล...
```

### ข้อความกลุ่ม LINE

```
✅ จับคู่เล่นสำเร็จ (ร้องราคา)

👤 ธา มือทอง vs สมชาย ผู้ชนะ
🎆 บั้งไฟ: คำไผ่
💹 ราคา A: 320-340
💹 ราคา B: 320-340
💰 ยอดเงิน: 100 บาท

⏳ รอการประกาศผล...
```

---

## 🔧 ไฟล์ที่เกี่ยวข้อง

### 1. `services/betting/bettingRoundController.js`

**ส่วนที่จัดการการจับคู่และส่งแจ้งเตือน:**

```javascript
// ค้นหาคู่ที่มีฝั่งตรงข้าม (เฉพาะในกลุ่มเดียวกัน)
const groupBets = await bettingPairingService.getBetsByGroupId(source.groupId || '');
const matchedPair = PriceRangeMatchingService.findMatchForNewBet(parsedBet, groupBets);

if (matchedPair) {
  // สร้างข้อความแจ้งการจับคู่
  const messages = PriceRangeMatchingService.createAutoMatchMessage(
    matchedPair,
    displayName,
    matchedPair.existingBet.displayName
  );
  
  // ส่งข้อความแจ้งเตือนส่วนตัวและกลุ่ม
  const notificationService = new LineNotificationService(1);
  
  // ส่งข้อความส่วนตัวให้ผู้เล่น A (ผู้เล่นเดิม)
  await notificationService.sendPrivateMessage(matchedPair.existingBet.userId, messages.messageB);
  
  // ส่งข้อความส่วนตัวให้ผู้เล่น B (ผู้เล่นใหม่)
  await notificationService.sendPrivateMessage(userId, messages.messageA);
  
  // ส่งข้อความเข้ากลุ่ม (ถ้ามี groupId)
  if (source.groupId) {
    await notificationService.sendGroupMessage(source.groupId, messages.groupMessage);
  }
}
```

### 2. `services/betting/priceRangeMatchingService.js`

**ฟังก์ชันสร้างข้อความแจ้งการจับคู่:**

```javascript
static createAutoMatchMessage(pair, userAName, userBName) {
  const { slipName, betAmount } = pair;
  const priceA = pair.newBet?.price || pair.price;
  const priceB = pair.existingBet?.price || pair.price;

  const messageA = `✅ จับคู่เล่นสำเร็จ (ร้องราคา)\n\n` +
    `👤 คุณ: ${userAName}\n` +
    `👤 คู่แข่ง: ${userBName}\n` +
    `🎆 บั้งไฟ: ${slipName}\n` +
    `💹 ราคาของคุณ: ${priceA}\n` +
    `💹 ราคาคู่แข่ง: ${priceB}\n` +
    `💰 ยอดเงิน: ${betAmount} บาท\n\n` +
    `⏳ รอการประกาศผล...`;

  const messageB = `✅ จับคู่เล่นสำเร็จ (ร้องราคา)\n\n` +
    `👤 คุณ: ${userBName}\n` +
    `👤 คู่แข่ง: ${userAName}\n` +
    `🎆 บั้งไฟ: ${slipName}\n` +
    `💹 ราคาของคุณ: ${priceB}\n` +
    `💹 ราคาคู่แข่ง: ${priceA}\n` +
    `💰 ยอดเงิน: ${betAmount} บาท\n\n` +
    `⏳ รอการประกาศผล...`;

  const groupMessage = `✅ จับคู่เล่นสำเร็จ (ร้องราคา)\n\n` +
    `👤 ${userAName} vs ${userBName}\n` +
    `🎆 บั้งไฟ: ${slipName}\n` +
    `💹 ราคา A: ${priceA}\n` +
    `💹 ราคา B: ${priceB}\n` +
    `💰 ยอดเงิน: ${betAmount} บาท\n\n` +
    `⏳ รอการประกาศผล...`;

  return { messageA, messageB, groupMessage };
}
```

### 3. `services/line/lineNotificationService.js`

**ฟังก์ชันส่งข้อความ:**

```javascript
// ส่งข้อความส่วนตัว
async sendPrivateMessage(userId, message) {
  // ส่งข้อความไปยัง userId ผ่าน LINE API
}

// ส่งข้อความกลุ่ม
async sendGroupMessage(groupId, message) {
  // ส่งข้อความไปยัง groupId ผ่าน LINE API
}
```

---

## 🎯 เงื่อนไขการส่งแจ้งเตือน

1. ✅ ระบบจับคู่เล่นได้สำเร็จ
2. ✅ ทั้งสองฝั่งมี userId ที่ถูกต้อง
3. ✅ มี LINE Channel Access Token ใน environment variables
4. ✅ ส่งข้อความส่วนตัวให้ผู้เล่น A และ B
5. ✅ ส่งข้อความเข้ากลุ่ม (ถ้ามี groupId)

---

## 📌 ข้อมูลที่แสดงในข้อความแจ้งเตือน

| ข้อมูล | ตัวอย่าง | หมายเหตุ |
|--------|---------|---------|
| ชื่อผู้เล่น | ธา มือทอง | ชื่อ LINE |
| ชื่อคู่แข่ง | สมชาย ผู้ชนะ | ชื่อ LINE ของคู่แข่ง |
| ชื่อบั้งไฟ | คำไผ่ | ชื่อบั้งไฟที่เล่น |
| ราคาของคุณ | 320-340 | ราคาที่ผู้เล่นเล่น |
| ราคาคู่แข่ง | 320-340 | ราคาที่คู่แข่งเล่น |
| ยอดเงิน | 100 บาท | ยอดเงินที่ใช้ (ยอดน้อยกว่า) |

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
   - ✅ ส่งแจ้งเตือน:
     - 📤 ข้อความส่วนตัวให้ User A
     - 📤 ข้อความส่วนตัวให้ User B
     - 📢 ข้อความเข้ากลุ่ม

4. **ตรวจสอบข้อความแจ้งเตือน**
   - ✅ User A ได้รับข้อความส่วนตัว
   - ✅ User B ได้รับข้อความส่วนตัว
   - ✅ กลุ่มได้รับข้อความแจ้งเตือน

---

## 📋 ตัวอย่างการทำงาน

### ตัวอย่างที่ 1: จับคู่สำเร็จ ✅

```
กลุ่ม A:
  User A: "320-340 ล 100 คำไผ่"
  User B: "320-340 ย 100 คำไผ่"
  ↓
  ✅ จับคู่สำเร็จ
  ↓
  📤 ส่งข้อความส่วนตัวให้ User A
  📤 ส่งข้อความส่วนตัวให้ User B
  📢 ส่งข้อความเข้ากลุ่ม A
```

### ตัวอย่างที่ 2: ไม่พบคู่ ⏳

```
กลุ่ม A:
  User A: "320-340 ล 100 คำไผ่"
  ↓
  ⏳ รอการจับคู่ (ยังไม่มีคู่)
```

---

## 🔍 การแก้ไขปัญหา

### ปัญหา: ไม่ได้รับข้อความแจ้งเตือน

**สาเหตุที่เป็นไปได้:**
1. ❌ LINE Channel Access Token ไม่ถูกต้อง
2. ❌ userId หรือ groupId ไม่ถูกต้อง
3. ❌ ระบบไม่พบคู่ที่ตรงกัน
4. ❌ ข้อความแจ้งเตือนมีความยาวเกิน 5000 ตัวอักษร

**วิธีแก้:**
1. ✅ ตรวจสอบ LINE Channel Access Token ใน `.env`
2. ✅ ตรวจสอบ userId และ groupId ใน console log
3. ✅ ตรวจสอบว่าระบบพบคู่หรือไม่ (ดูที่ console log)
4. ✅ ตรวจสอบความยาวของข้อความแจ้งเตือน

---

## 📌 หมายเหตุ

- ใช้ Account 1 สำหรับการส่งข้อความแจ้งเตือน
- ส่งข้อความส่วนตัวก่อน จากนั้นส่งข้อความกลุ่ม
- ถ้าส่งข้อความไม่สำเร็จ จะบันทึก error แต่ไม่หยุดการทำงาน
- ข้อความแจ้งเตือนจะแสดงราคาของทั้งสองฝั่ง (ถ้าต่างกัน)
- ยอดเงินที่แสดงคือยอดเงินน้อยกว่าของทั้งสองฝั่ง

