# ระบบตรวจสอบยอดเงิน - การนำไปใช้งาน

## ✅ สิ่งที่ได้ทำ

### 1. สร้าง BalanceCheckService
**ไฟล์:** `services/betting/balanceCheckService.js`

ฟังก์ชันหลัก:
- `checkBalance()` - ตรวจสอบยอดเงิน
- `getUserBalance()` - ดึงยอดเงินของ User
- `getUserLineName()` - ดึงชื่อ LINE
- `notifyInsufficientBalance()` - แจ้งเตือนเมื่อยอดเงินไม่พอ
- `checkAndNotify()` - ตรวจสอบและแจ้งเตือนในครั้งเดียว

### 2. ปรับปรุง BettingRoundController
**ไฟล์:** `services/betting/bettingRoundController.js`

- เพิ่ม import `balanceCheckService`
- เพิ่ม `balanceCheckService.initialize()` ในฟังก์ชัน `initialize()`
- เพิ่มการตรวจสอบยอดเงินก่อนบันทึกการเล่น (Direct Method)

### 3. เพิ่ม API Endpoints
**ไฟล์:** `routes/betting-webhook.js`

- `POST /betting/check-balance` - ตรวจสอบยอดเงิน
- `GET /betting/balance/:userId` - ดึงยอดเงิน (อัปเดต)

---

## 🔄 ขั้นตอนการทำงาน

### เมื่อผู้เล่นส่งข้อความเล่น

```
User: "ต 500"
    ↓
Parse message
    ↓
Validate format
    ↓
Check balance
    ├─ ดึงยอดเงินจากชีท
    ├─ เปรียบเทียบกับจำนวนเงิน
    └─ ตรวจสอบผลลัพธ์
    ↓
ถ้าเพียงพอ:
    ✅ บันทึกการเล่น
    ✅ ส่งข้อความยืนยัน
    
ถ้าไม่พอ:
    ❌ ไม่บันทึกการเล่น
    ⚠️ ส่งข้อความแจ้งเตือน
```

---

## 📱 ตัวอย่างการใช้งาน

### ตัวอย่าง 1: ยอดเงินเพียงพอ

```
User: "ต 500"

System Response:
✅ บันทึกการเล่นสำเร็จ

ชื่อ: สมชาย
บั้งไฟ: บั้งไฟ1
ฝั่ง: ต
จำนวนเงิน: 500 บาท
```

### ตัวอย่าง 2: ยอดเงินไม่พอ

```
User: "ต 500"

System Response:
❌ ยอดเงินไม่พอ

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

### ตัวอย่าง 3: ตรวจสอบยอดเงินผ่าน API

```bash
curl -X POST http://localhost:3001/betting/check-balance \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "U1234567890abcdef",
    "requiredAmount": 500
  }'
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

---

## 🔌 API Endpoints

### 1. ตรวจสอบยอดเงิน
```
POST /betting/check-balance
```

**Request:**
```json
{
  "userId": "U1234567890abcdef",
  "requiredAmount": 500
}
```

**Response (เพียงพอ):**
```json
{
  "sufficient": true,
  "currentBalance": 1000,
  "shortfall": 0,
  "message": "ยอดเงินเพียงพอ (1000 บาท)"
}
```

**Response (ไม่พอ):**
```json
{
  "sufficient": false,
  "currentBalance": 300,
  "shortfall": 200,
  "message": "ยอดเงินไม่พอ ขาด 200 บาท"
}
```

### 2. ดึงยอดเงิน
```
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
```
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

## 📊 ที่มาของยอดเงิน

ระบบตรวจสอบยอดเงินจากแหล่งต่อไปนี้:

1. **ชีท UsersBalance** (ยอดเงินคงเหลือปัจจุบัน)
   - ใช้สำหรับการเล่น
   - อัปเดตหลังจากสรุปผลการเล่น

2. **ชีท Players** (ยอดเงินทั้งหมด)
   - ใช้เป็นทางเลือกถ้าไม่พบในชีท UsersBalance
   - บันทึกจากการส่งสลิป

---

## ⚙️ การตั้งค่า

### ตรวจสอบ .env
```
GOOGLE_SHEET_ID=1rRVKOpYZbOFpRiZ2ym5b5AFcB4e_swQe8y9y9UlhDAQ
GOOGLE_SERVICE_ACCOUNT_KEY=credentials.json
LINE_CHANNEL_ACCESS_TOKEN=9cygoNoRSVshd+aNsiSeLR8srTmPAQ/...
```

### ตรวจสอบ credentials.json
```
ไฟล์ต้องอยู่ในโฟลเดอร์ root
```

---

## 🧪 การทดสอบ

### ทดสอบ 1: ยอดเงินเพียงพอ
```bash
# ส่งข้อความเล่น
User: "ต 500"

# ตรวจสอบผลลัพธ์
✅ บันทึกการเล่นสำเร็จ
```

### ทดสอบ 2: ยอดเงินไม่พอ
```bash
# ส่งข้อความเล่น
User: "ต 5000"

# ตรวจสอบผลลัพธ์
❌ ยอดเงินไม่พอ
⚠️ ส่งข้อความแจ้งเตือน
```

### ทดสอบ 3: ตรวจสอบยอดเงิน
```bash
curl -X POST http://localhost:3001/betting/check-balance \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "U1234567890abcdef",
    "requiredAmount": 500
  }'
```

---

## 🎯 สรุป

✅ **ระบบตรวจสอบยอดเงิน - เสร็จสิ้น**

- ✅ ตรวจสอบยอดเงินก่อนการเดิมพัน
- ✅ แจ้งเตือน LINE เมื่อยอดเงินไม่พอ
- ✅ ระบุยอดเงินที่ขาด
- ✅ ให้คำแนะนำวิธีแก้ไข
- ✅ ไม่บันทึกการเล่นถ้ายอดเงินไม่พอ
- ✅ API endpoints สำหรับตรวจสอบยอดเงิน

---

## 📝 หมายเหตุ

- ยอดเงินดึงจากชีท UsersBalance หรือ Players
- ตรวจสอบเกิดขึ้นอัตโนมัติก่อนบันทึกการเล่น
- แจ้งเตือนส่งไปยัง LINE ส่วนตัวของผู้เล่น
- ไม่มีการหักเงินจนกว่าการเล่นจะสำเร็จ
- ระบบใช้ LINE Notification Service เพื่อส่งข้อความ
