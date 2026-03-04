# 💰 ระบบคำนวนเงินเล่นเกินเงินคงเหลือระหว่างรอผล

## 📋 ภาพรวม

ระบบตรวจสอบว่าผู้เล่นมีเงินเพียงพอสำหรับการเดิมพันใหม่โดยคำนึงถึง:
1. ✅ ยอดเงินคงเหลือปัจจุบัน
2. ✅ เงินค้างที่ยังไม่มีผล (เงินเดิมพันที่จับคู่แล้วแต่ยังไม่มีผลออก)

---

## 🔄 ขั้นตอนการทำงาน

### ขั้นตอน 1: ผู้เล่นส่งข้อความเดิมพัน

```
User A: "320-340 ล 100 คำไผ่"
```

### ขั้นตอน 2: ตรวจสอบยอดเงิน

```javascript
const checkResult = await balanceCheckService.checkBalance(
  lineName,
  requiredAmount
);
```

**โค้ด:**
```javascript
async checkBalance(lineName, requiredAmount) {
  // 1. ตรวจสอบว่าผู้เล่นลงทะเบียนแล้ว
  const isRegistered = await this.isPlayerRegistered(lineName);
  
  if (!isRegistered) {
    return { sufficient: false, registered: false };
  }

  // 2. ดึงยอดเงินคงเหลือปัจจุบัน
  const currentBalance = await this.getUserBalance(lineName);
  
  // 3. ดึงเงินค้างที่ยังไม่มีผล
  const pendingAmount = await pendingBalanceService.getPendingAmount(lineName);
  
  // 4. คำนวนเงินที่สามารถใช้ได้
  const availableBalance = currentBalance - pendingAmount;

  // 5. ตรวจสอบว่าเพียงพอหรือไม่
  if (availableBalance >= requiredAmount) {
    return { sufficient: true, ... };
  }

  return { sufficient: false, ... };
}
```

---

## 📊 ตัวอย่างการคำนวน

### ตัวอย่างที่ 1: เงินเพียงพอ ✅

```
ยอดเงินคงเหลือ: 500 บาท
เงินค้าง: 0 บาท
เงินที่สามารถใช้ได้: 500 - 0 = 500 บาท
เงินเดิมพันใหม่: 100 บาท

✅ 500 >= 100 → เพียงพอ
```

### ตัวอย่างที่ 2: มีเงินค้าง ⏳

```
ยอดเงินคงเหลือ: 500 บาท
เงินค้าง: 200 บาท (เดิมพัน 2 รายการ ที่จับคู่แล้วแต่ยังไม่มีผล)
เงินที่สามารถใช้ได้: 500 - 200 = 300 บาท
เงินเดิมพันใหม่: 100 บาท

✅ 300 >= 100 → เพียงพอ
```

### ตัวอย่างที่ 3: เงินไม่พอ ❌

```
ยอดเงินคงเหลือ: 500 บาท
เงินค้าง: 450 บาท (เดิมพัน 3 รายการ ที่จับคู่แล้วแต่ยังไม่มีผล)
เงินที่สามารถใช้ได้: 500 - 450 = 50 บาท
เงินเดิมพันใหม่: 100 บาท

❌ 50 < 100 → ไม่เพียงพอ (ขาด 50 บาท)
```

---

## 🔍 วิธีคำนวนเงินค้าง

### ฟังก์ชัน: `getPendingAmount(displayName)`

```javascript
async getPendingAmount(displayName) {
  const response = await this.sheets.spreadsheets.values.get({
    spreadsheetId: this.spreadsheetId,
    range: `${this.betsSheetName}!A2:N`,
  });

  const values = response.data.values || [];
  let totalPending = 0;

  for (const row of values) {
    const userAName = row[2]; // Column C: ชื่อ User A
    const userBName = row[11]; // Column L: ชื่อ User B
    const status = row[8] || ''; // Column I: แสดงผล
    const isMATCHED = row[7] !== undefined && row[7] !== ''; // Column H: ยอดเงิน B
    const hasNoResult = status === '' || status === undefined;

    // ตรวจสอบ: MATCHED แต่ยังไม่มีผล
    if (isMATCHED && hasNoResult) {
      if (userAName === displayName) {
        const amountA = parseInt(row[6]) || 0; // Column G: ยอดเงิน A
        totalPending += amountA;
      } else if (userBName === displayName) {
        const amountB = parseInt(row[7]) || 0; // Column H: ยอดเงิน B
        totalPending += amountB;
      }
    }
  }

  return totalPending;
}
```

**เงื่อนไขการนับเงินค้าง:**
1. ✅ Column H (ยอดเงิน B) มีค่า → MATCHED
2. ✅ Column I (แสดงผล) ว่างเปล่า → ยังไม่มีผล
3. ✅ ชื่อผู้เล่นตรงกับ User A หรือ User B

---

## 📋 ตัวอย่างข้อมูลใน Google Sheets

| A | B | C | D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Timestamp | User A ID | User A Name | Message A | Slip | Side A | Amount A | Amount B | Result | Result A | Result B | User B Name | Side B |
| 2026-03-04 16:42 | U123 | ธา | 320-340 ล 100 ศ. | ศ. | ล | 100 | 100 | | | | 💓Noon💓 | ย |

**ตรวจสอบเงินค้าง:**
- ✅ Column H (100) มีค่า → MATCHED
- ✅ Column I ว่างเปล่า → ยังไม่มีผล
- ✅ ชื่อ "ธา" ตรงกับ User A Name
- ✅ เงินค้าง = 100 บาท

---

## 🎯 ขั้นตอนการตรวจสอบยอดเงิน

```
User A: "320-340 ล 100 คำไผ่"
  ↓
[Parse] → ✅ ถูกต้อง
  ↓
[Check Balance]
  ├─ ดึงยอดเงินคงเหลือ: 500 บาท
  ├─ ดึงเงินค้าง: 200 บาท
  ├─ คำนวนเงินที่สามารถใช้ได้: 500 - 200 = 300 บาท
  └─ ตรวจสอบ: 300 >= 100 → ✅ เพียงพอ
  ↓
[Record Bet] → บันทึกลงชีท Bets
  ↓
[Find Match] → ค้นหาคู่
  ↓
✅ ดำเนินการต่อ
```

---

## 📌 ข้อมูลที่ส่งกลับ

```javascript
{
  sufficient: true,           // เพียงพอหรือไม่
  currentBalance: 500,        // ยอดเงินคงเหลือปัจจุบัน
  pendingAmount: 200,         // เงินค้างที่ยังไม่มีผล
  availableBalance: 300,      // เงินที่สามารถใช้ได้
  requiredAmount: 100,        // เงินที่ต้องการ
  shortfall: 0,               // เงินขาด (ถ้าไม่พอ)
  registered: true,           // ลงทะเบียนแล้ว
  message: "ยอดเงินเพียงพอ (300 บาท หลังหักเงินค้าง)"
}
```

---

## 🔧 ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|------|--------|
| `balanceCheckService.js` | ตรวจสอบยอดเงิน |
| `pendingBalanceService.js` | คำนวนเงินค้าง |
| `bettingRoundController.js` | เรียกใช้ balanceCheckService |

---

## 📝 หมายเหตุ

- เงินค้างจะถูกนับเฉพาะเมื่อ:
  - ✅ Column H (ยอดเงิน B) มีค่า (MATCHED)
  - ✅ Column I (แสดงผล) ว่างเปล่า (ยังไม่มีผล)

- ระบบจะตรวจสอบเงินค้างทุกครั้งที่ผู้เล่นส่งข้อความเดิมพันใหม่

- ถ้าเงินไม่พอ ระบบจะส่งข้อความแจ้งเตือนพร้อมรายละเอียด:
  - ยอดเงินคงเหลือ
  - เงินค้าง
  - เงินที่สามารถใช้ได้
  - เงินขาด

