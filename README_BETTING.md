# 🎰 Betting Round System

ระบบจัดการรอบการเล่นพนันผ่าน LINE Bot พร้อมการจับคู่อัตโนมัติและคำนวณผลลัพธ์

## ✨ ฟีเจอร์

- ✅ **State Management** - OPEN/CLOSED/CALCULATING
- ✅ **2 Betting Methods** - ราคาช่าง & ราคาคะแนน
- ✅ **Automatic Pairing** - จับคู่อัตโนมัติ
- ✅ **Result Calculation** - คำนวณผลลัพธ์อัตโนมัติ
- ✅ **Balance Management** - จัดการยอดเงิน
- ✅ **Admin Commands** - :เริ่ม, :หยุด, :สรุป
- ✅ **Error Handling** - ตรวจสอบและแจ้งข้อผิดพลาด
- ✅ **Google Sheets Integration** - บันทึกข้อมูลอัตโนมัติ

## 🚀 Quick Start

### 1. ติดตั้ง
```bash
npm install googleapis
```

### 2. ตั้งค่า .env
```bash
GOOGLE_SHEETS_ID=your_spreadsheet_id
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret
```

### 3. ทดสอบ
```bash
node test-betting-round.js
```

### 4. เริ่มใช้งาน
```bash
node index.js
```

## 📱 วิธีใช้งาน

### Admin Commands
```
:เริ่ม ฟ้าหลังฝน    - เปิดรอบ
:หยุด              - ปิดรอบ
:สรุป ฟ้าหลังฝน 315 - สรุปผล
```

### User Betting

**วิธีที่ 1 (ราคาช่าง):**
```
ฟ้าหลังฝน ชล. 500
```

**วิธีที่ 2 (ราคาคะแนน):**
```
0/3(300-330) ล. 500 ฟ้าหลังฝน
```

## 📚 Documentation

| ไฟล์ | เนื้อหา |
|-----|--------|
| [BETTING_QUICK_START.md](./BETTING_QUICK_START.md) | เริ่มต้นอย่างรวดเร็ว |
| [BETTING_ROUND_SYSTEM.md](./BETTING_ROUND_SYSTEM.md) | เอกสารระบบ |
| [BETTING_ROUND_SETUP.md](./BETTING_ROUND_SETUP.md) | คู่มือการตั้งค่า |
| [BETTING_SETUP_CHECKLIST.md](./BETTING_SETUP_CHECKLIST.md) | Checklist |
| [BETTING_SYSTEM_SUMMARY.md](./BETTING_SYSTEM_SUMMARY.md) | สรุประบบ |
| [BETTING_FILES_INDEX.md](./BETTING_FILES_INDEX.md) | ดัชนีไฟล์ |

## 🏗️ Architecture

```
LINE Bot
   ↓
BettingRoundController
   ├─ StateService
   ├─ ParserService
   └─ PairingService
   ↓
Google Sheets
```

## 📊 ตัวอย่าง

```
1. Admin: :เริ่ม ฟ้าหลังฝน
   Bot: ✅ เปิดรอบการเล่น

2. Alice: ฟ้าหลังฝน ชล. 500
   Bot: ✅ บันทึกการเล่น

3. Bob: ฟ้าหลังฝน ชถ. 500
   Bot: ✅ บันทึกการเล่น

4. Admin: :หยุด
   Bot: รอบนี้ปิดการทายแล้ว

5. Admin: :สรุป ฟ้าหลังฝน 315
   Bot: 📊 สรุปผล
        🏆 Alice +500
        ❌ Bob -500
```

## 🧪 Testing

```bash
# ทดสอบทั้งระบบ
node test-betting-round.js

# ทดสอบตัวอย่าง
node examples/betting-round-example.js
```

## 🔌 API Endpoints

```
POST   /api/betting/webhook
GET    /api/betting/status
POST   /api/betting/admin/start
POST   /api/betting/admin/stop
POST   /api/betting/admin/calculate
GET    /api/betting/transactions
GET    /api/betting/balances
GET    /api/betting/balance/:userId
```

## 📁 ไฟล์

```
services/betting/
├── bettingRoundStateService.js
├── bettingMessageParserService.js
├── bettingPairingService.js
└── bettingRoundController.js

routes/
└── betting-webhook.js

examples/
├── betting-round-example.js
└── betting-integration-example.js

test-betting-round.js
```

## 🔒 Security

- ✅ State validation
- ✅ Input validation
- ✅ Timestamp logging
- ✅ Pair verification
- ✅ Balance integrity

## 🐛 Troubleshooting

### "credentials.json not found"
```bash
# ตรวจสอบไฟล์
ls -la credentials.json
```

### "Invalid message format"
```
✓ ถูก: ฟ้าหลังฝน ชล. 500
✗ ผิด: ฟ้าหลังฝนชล.500
```

### "GOOGLE_SHEETS_ID is not set"
```bash
# ตรวจสอบ .env
cat .env
```

## 📞 Support

1. อ่าน [BETTING_QUICK_START.md](./BETTING_QUICK_START.md)
2. ตรวจสอบ [BETTING_ROUND_SYSTEM.md](./BETTING_ROUND_SYSTEM.md)
3. รัน `test-betting-round.js`
4. ดู logs

## 📝 License

MIT

## 👨‍💻 Author

Created: 2024-03-02

---

**Ready to use! 🚀**
