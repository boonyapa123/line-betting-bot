# ระบบตรวจสอบยอดเงิน - Balance Check System

## 📋 ภาพรวม

ระบบตรวจสอบยอดเงินคงเหลือของผู้เล่นก่อนการเดิมพัน หากยอดเงินไม่พอจะแจ้งเตือนผ่าน LINE ว่า:
- ยอดเงินปัจจุบัน
- จำนวนเงินที่ต้องการเดิมพัน
- ยอดเงินที่ขาด
- วิธีแก้ไข (โอนเงินเพิ่มเติม)

---

## 🔧 ไฟล์ที่เพิ่มเติม

### `services/betting/balanceCheckService.js`
บริหารจัดการการตรวจสอบยอดเงิน

**ฟังก์ชันหลัก:**

#### `initialize()`
- เตรียมการเชื่อมต่อ Google Sheets API

#### `checkBalance(userId, requiredAmount)`
- ตรวจสอบว่ายอดเงินเพียงพอหรือไม่
- **Return:**
  ```javascript
  {
    sufficient: true/false,
    currentBalance: 1000,
    shortfall: 0,
    message: "ยอดเงินเพียงพอ"
  }
  ```

#### `getUserBalance(userId)`
- ดึงยอดเงินคงเหลือของ User
- ค้นหาจากชีท UsersBalance ก่อน
- ถ้าไม่พบให้ค้นหาจากชีท Players

#### `getUserLineName(userId)`
- ดึงชื่อ LINE ของ User

#### `notifyInsufficientBalance(userId, currentBalance, requiredAmount, shortfall)`
- ส่งข้อความแจ้งเตือนเมื่อยอดเงินไม่พอ

#### `checkAndNotify(userId, requiredAmount)`
- ตรวจสอบและแจ้งเตือนในครั้งเดียว

#### `getAllBalances()`
- ดึงข้อมูลยอดเงินทั้งหมด

---

## 🔄 ขั้นตอนการทำงาน

### 1. ผู้เล่นส่งข้อความเล่น
```
User: "ต 500"
```

### 2. ระบบตรวจสอบ
```
Parse message → "ต 500"
    ↓
Validate format → OK
    ↓
Check balance
    ├─ ดึงยอดเงินจากชีท
    ├─ เปรียบเทียบกับจำนวนเงินที่ต้องการ
    └─ ตรวจสอบผลลัพธ์
```

### 3. ถ้ายอดเงินเพียงพอ
```
✅ บันทึกการเล่น
✅ ส่งข้อความยืนยัน
```

### 4. ถ้ายอดเงินไม่พอ
```
❌ ไม่บันทึกการเล่น
❌ ส่งข้อความแจ้งเตือน
    ├─ ยอดเงินปัจจุบัน
    ├─ จำนวนเงินที่ต้องการ
    ├─ ยอดเงินที่ขาด
    └─ วิธีแก้ไข
```

---

## 📱 ตัวอย่างข้อความแจ้งเตือน

### ยอดเงินไม่พอ
```
⚠️ ยอดเงินไม่พอสำหรับการเดิมพัน

ชื่อ: สมชาย
ยอดเงินปัจจุบัน: 300 บาท
จำนวนเงินที่ต้องการเดิมพัน: 500 บาท
ขาด: 200 บาท

💡 วิธีแก้ไข:
1. โอนเงินเพิ่มอย่างน้อย 200 บาท
2. ส่งสลิปการโอนเงินให้ระบบตรวจสอบ
3. รอการยืนยันจากระบบ
4. ลองเดิมพันใหม่อีกครั้ง

📱 ติดต่อแอดมิน หากมีปัญหา
```

---

## 🔌 API Endpoints

### 1. ตรวจสอบยอดเงิน
```bash
POST /betting/check-balance
Content-Type: application/json

{
  "userId": "U1234567890abcdef",
  "requiredAmount": 500
}
```

**Response:**
```json
{
  "sufficient": false,
  "currentBalance": 300,
  "shortfall": 200,
  "message": "ยอดเงินไม่พอ ขาด 200 บาท"
}
```

### 2. ดึงยอดเงิน
```bash
GET /betting/balance/:userId
```

**Response:**
```json
{
  "userId": "U1234567890abcdef",
  "balance": 1000
}
```

### 3. ดึงยอดเงินทั้งหมด
```bash
GET /betting/balances
```

**Response:**
```json
{
  "count": 5,
  "balances": [
    {
      "userId": "U123",
      "displayName": "สมชาย",
      "balance": 1000
    },
    {
      "userId": "U456",
      "displayName": "สมหญิง",
      "balance": 500
    }
  ]
}
```

---

## 🔍 ตัวอย่างการใช้งาน

### ตัวอย่าง 1: ยอดเงินเพียงพอ
```
User: "ต 500"
System: ✅ ยอดเงินเพียงพอ (1000 บาท)
System: ✅ บันทึกการเล่นสำเร็จ
```

### ตัวอย่าง 2: ยอดเงินไม่พอ
```
User: "ต 500"
System: ❌ ยอดเงินไม่พอ
System: ⚠️ ส่งข้อความแจ้งเตือน
System: ❌ ไม่บันทึกการเล่น
```

### ตัวอย่าง 3: ตรวจสอบยอดเงิน
```bash
curl -X POST http://localhost:3001/betting/check-balance \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "U1234567890abcdef",
    "requiredAmount": 500
  }'
```

---

## 📊 ที่มาของยอดเงิน

ระบบตรวจสอบยอดเงินจากแหล่งต่อไปนี้ (ตามลำดับ):

1. **ชีท UsersBalance** (ยอดเงินคงเหลือปัจจุบัน)
   - ใช้สำหรับการเล่น
   - อัปเดตหลังจากสรุปผลการเล่น

2. **ชีท Players** (ยอดเงินทั้งหมด)
   - ใช้เป็นทางเลือกถ้าไม่พบในชีท UsersBalance
   - บันทึกจากการส่งสลิป

---

## ⚙️ การตั้งค่า

### ตรวจสอบว่า balanceCheckService ถูก initialize
```javascript
// ใน bettingRoundController.js
async initialize() {
  await balanceCheckService.initialize();
}
```

### ตรวจสอบว่า Google Sheets API ถูกตั้งค่า
```
GOOGLE_SHEET_ID=1rRVKOpYZbOFpRiZ2ym5b5AFcB4e_swQe8y9y9UlhDAQ
GOOGLE_SERVICE_ACCOUNT_KEY=credentials.json
```

---

## 🎯 สรุป

- ✅ ตรวจสอบยอดเงินก่อนการเดิมพัน
- ✅ แจ้งเตือน LINE เมื่อยอดเงินไม่พอ
- ✅ ระบุยอดเงินที่ขาด
- ✅ ให้คำแนะนำวิธีแก้ไข
- ✅ ไม่บันทึกการเล่นถ้ายอดเงินไม่พอ

---

## 📝 หมายเหตุ

- ยอดเงินดึงจากชีท UsersBalance หรือ Players
- ตรวจสอบเกิดขึ้นอัตโนมัติก่อนบันทึกการเล่น
- แจ้งเตือนส่งไปยัง LINE ส่วนตัวของผู้เล่น
- ไม่มีการหักเงินจนกว่าการเล่นจะสำเร็จ
