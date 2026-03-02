# การตั้งค่าระบบจัดการรอบการเล่นพนัน

## 📦 ไฟล์ที่สร้างขึ้น

### Services
- `services/betting/bettingRoundStateService.js` - จัดการสถานะรอบ
- `services/betting/bettingMessageParserService.js` - Parse ข้อความเล่น
- `services/betting/bettingPairingService.js` - จับคู่และคำนวณผลลัพธ์
- `services/betting/bettingRoundController.js` - ประสานงาน Services

### Routes
- `routes/betting-webhook.js` - LINE webhook endpoints

### Examples & Tests
- `examples/betting-round-example.js` - ตัวอย่างการใช้งาน
- `test-betting-round.js` - Test suite

### Documentation
- `BETTING_ROUND_SYSTEM.md` - เอกสารระบบ
- `BETTING_ROUND_SETUP.md` - ไฟล์นี้

## 🚀 การเริ่มต้นใช้งาน

### 1. ตั้งค่า Environment Variables

```bash
# .env
GOOGLE_SHEETS_ID=your_spreadsheet_id
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret
```

### 2. สร้าง Google Sheets

สร้าง Spreadsheet ใหม่ที่มี 3 Sheet:

#### Sheet 1: RoundState
```
A1: State
B1: RoundID
C1: StartTime
D1: SlipName
```

#### Sheet 2: Transactions
```
A1: Timestamp
B1: UserID
C1: DisplayName
D1: Method
E1: Price
F1: Side
G1: Amount
H1: SlipName
I1: Status
```

#### Sheet 3: UsersBalance
```
A1: UserID
B1: DisplayName
C1: Balance
```

### 3. ตั้งค่า Google Sheets API

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้าง Project ใหม่
3. เปิด Google Sheets API
4. สร้าง Service Account
5. ดาวน์โหลด JSON credentials
6. บันทึกเป็น `credentials.json` ในโฟลเดอร์ root

### 4. ติดตั้ง Dependencies

```bash
npm install googleapis
```

### 5. Integrate กับ LINE Webhook

ใน `index.js` หรือไฟล์ main:

```javascript
const express = require('express');
const bettingRoutes = require('./routes/betting-webhook');

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/betting', bettingRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 6. ตั้งค่า LINE Bot Webhook

ใน LINE Developers Console:
1. ไปที่ Messaging API settings
2. ตั้ง Webhook URL: `https://your-domain.com/api/betting/webhook`
3. เปิด Webhook usage

## 📱 วิธีใช้งาน

### Admin Commands

#### เปิดรอบ
```
:เริ่ม ฟ้าหลังฝน
```

#### ปิดรอบ
```
:หยุด
```

#### สรุปผลลัพธ์
```
:สรุป ฟ้าหลังฝน 315
```

### User Betting

#### วิธีที่ 1 (ราคาช่าง)
```
ฟ้าหลังฝน ชล. 500
พายุ ชถ. 1000
```

#### วิธีที่ 2 (ราคาคะแนน)
```
0/3(300-330) ล. 500 ฟ้าหลังฝน
0/4(400-440) ย. 1000 พายุ
```

## 🧪 ทดสอบระบบ

### รัน Test Suite
```bash
node test-betting-round.js
```

### รัน Examples
```bash
node examples/betting-round-example.js
```

## 🔌 API Endpoints

### Webhook
```
POST /api/betting/webhook
```

### Admin Commands
```
POST /api/betting/admin/start
Body: { "slipName": "ฟ้าหลังฝน" }

POST /api/betting/admin/stop

POST /api/betting/admin/calculate
Body: { "slipName": "ฟ้าหลังฝน", "score": 315 }
```

### Query Data
```
GET /api/betting/status
GET /api/betting/transactions
GET /api/betting/balances
GET /api/betting/balance/:userId
```

## 📊 ตัวอย่างการทำงาน

### Scenario: รอบการเล่นเดียว

```
1. Admin: :เริ่ม ฟ้าหลังฝน
   Bot: ✅ เปิดรอบการเล่น: ฟ้าหลังฝน

2. Alice: ฟ้าหลังฝน ชล. 500
   Bot: ✅ บันทึกการเล่นสำเร็จ

3. Bob: ฟ้าหลังฝน ชถ. 500
   Bot: ✅ บันทึกการเล่นสำเร็จ

4. Admin: :หยุด
   Bot: รอบนี้ปิดการทายแล้วคะ/ครับ

5. Admin: :สรุป ฟ้าหลังฝน 315
   Bot: 📊 สรุปผลการเล่น
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

## 🐛 Troubleshooting

### ข้อผิดพลาด: "Cannot find module 'googleapis'"
```bash
npm install googleapis
```

### ข้อผิดพลาด: "credentials.json not found"
- ตรวจสอบว่า credentials.json อยู่ในโฟลเดอร์ root
- ตรวจสอบ path ใน service

### ข้อผิดพลาด: "Spreadsheet not found"
- ตรวจสอบ GOOGLE_SHEETS_ID ถูกต้องหรือไม่
- ตรวจสอบว่า Service Account มี access ถึง Spreadsheet

### ข้อผิดพลาด: "Invalid message format"
- ตรวจสอบการเว้นวรรค
- ตรวจสอบว่าใช้จุด (.) หลังตัวย่อ

## 📝 Notes

- ระบบจะบันทึก Timestamp ของทุกการเล่น
- ข้อมูลการเล่นจะถูกล้างหลังจากสรุปผลลัพธ์
- ยอดเงินจะถูกอัปเดตอัตโนมัติ
- ระบบรองรับการเล่นหลายบั้งไฟในรอบเดียว

## 🔐 Security

- ✅ ตรวจสอบสถานะรอบก่อนรับการเล่น
- ✅ Validate ข้อมูลการเล่นทั้งหมด
- ✅ ตรวจสอบความถูกต้องของคู่การเล่น
- ✅ บันทึก Timestamp ของทุกการเล่น
- ✅ อัปเดตยอดเงินอย่างปลอดภัย

## 📞 Support

หากมีปัญหา โปรดตรวจสอบ:
1. Environment variables ถูกต้องหรือไม่
2. Google Sheets API เปิดใช้งานหรือไม่
3. Service Account มี access ถึง Spreadsheet หรือไม่
4. ข้อความเล่นตรงรูปแบบหรือไม่
5. ดูไฟล์ log เพื่อหาข้อมูลเพิ่มเติม
