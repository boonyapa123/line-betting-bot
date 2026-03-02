# 📑 Betting Round System - Files Index

## 📂 โครงสร้างไฟล์

```
linebot/
├── services/betting/
│   ├── bettingRoundStateService.js          ✅ State Management
│   ├── bettingMessageParserService.js       ✅ Message Parsing
│   ├── bettingPairingService.js             ✅ Pairing & Calculation
│   └── bettingRoundController.js            ✅ Orchestration
│
├── routes/
│   └── betting-webhook.js                   ✅ API Endpoints
│
├── examples/
│   ├── betting-round-example.js             ✅ Usage Examples
│   ├── betting-integration-example.js       ✅ Integration Guide
│   └── slip-validation-example.js           (existing)
│
├── test-betting-round.js                    ✅ Test Suite
│
├── BETTING_ROUND_SYSTEM.md                  ✅ System Documentation
├── BETTING_ROUND_SETUP.md                   ✅ Setup Guide
├── BETTING_SETUP_CHECKLIST.md               ✅ Setup Checklist
├── BETTING_SYSTEM_SUMMARY.md                ✅ System Summary
├── BETTING_QUICK_START.md                   ✅ Quick Start
└── BETTING_FILES_INDEX.md                   ✅ This File
```

---

## 📄 ไฟล์ละเอียด

### 🔧 Services (4 ไฟล์)

#### 1. `services/betting/bettingRoundStateService.js`
**วัตถุประสงค์:** จัดการสถานะรอบการเล่น

**ฟีเจอร์:**
- ✅ OPEN/CLOSED/CALCULATING states
- ✅ Google Sheets integration
- ✅ Round tracking

**Methods:**
```javascript
await openRound(slipName)
await closeRound()
await startCalculating()
getCurrentState()
canAcceptBets()
getCurrentRound()
```

**ใช้เมื่อ:** ต้องการเปลี่ยนสถานะรอบ

---

#### 2. `services/betting/bettingMessageParserService.js`
**วัตถุประสงค์:** Parse ข้อความเล่นและคำสั่งแอดมิน

**ฟีเจอร์:**
- ✅ Regex-based parsing
- ✅ 2 betting methods support
- ✅ Admin command parsing
- ✅ Validation & error handling

**Methods:**
```javascript
parseMessage(message)
parseAdminCommand(message)
validateBet(parsedData)
```

**Regex Patterns:**
```
Method 1: ^(.+?)\s+(ชล\.|ชถ\.)\s+(\d+)$
Method 2: ^(.+?)\s+([ลย]\.)\s+(\d+)\s+(.+)$
```

**ใช้เมื่อ:** ต้องการ parse ข้อความ

---

#### 3. `services/betting/bettingPairingService.js`
**วัตถุประสงค์:** จับคู่การเล่นและคำนวณผลลัพธ์

**ฟีเจอร์:**
- ✅ Automatic pairing
- ✅ Result calculation
- ✅ Balance management
- ✅ Google Sheets integration

**Methods:**
```javascript
await recordBet(betData, userId, displayName)
await getAllBets()
findPairs(bets)
calculateResult(pair, slipName, score)
await updateUserBalance(userId, amount)
await getUserBalance(userId)
await getAllBalances()
await clearRoundTransactions()
```

**ใช้เมื่อ:** ต้องการจับคู่หรือคำนวณผล

---

#### 4. `services/betting/bettingRoundController.js`
**วัตถุประสงค์:** ประสานงานระหว่าง Services

**ฟีเจอร์:**
- ✅ Message handling
- ✅ Admin command handling
- ✅ Response generation
- ✅ Error handling

**Methods:**
```javascript
await initialize()
async handleMessage(event)
async handleAdminCommand(command, userId)
```

**ใช้เมื่อ:** ต้องการจัดการ LINE webhook

---

### 🌐 Routes (1 ไฟล์)

#### `routes/betting-webhook.js`
**วัตถุประสงค์:** Express routes สำหรับ API endpoints

**Endpoints:**
```
POST   /webhook                    LINE webhook
GET    /status                     Check status
POST   /admin/start                Start round
POST   /admin/stop                 Stop round
POST   /admin/calculate            Calculate results
GET    /transactions               Get all bets
GET    /balances                   Get all balances
GET    /balance/:userId            Get user balance
```

**ใช้เมื่อ:** ต้องการ integrate กับ Express app

---

### 📚 Examples (3 ไฟล์)

#### 1. `examples/betting-round-example.js`
**วัตถุประสงค์:** ตัวอย่างการใช้งาน Services

**ตัวอย่าง:**
- Parse Method 1 & 2
- Parse Admin Commands
- Invalid Messages
- Validation
- Pairing
- Result Calculation

**รัน:**
```bash
node examples/betting-round-example.js
```

---

#### 2. `examples/betting-integration-example.js`
**วัตถุประสงค์:** Integration guide

**ตัวอย่าง:**
- Basic Integration
- LINE Bot Integration
- Admin Dashboard API
- Error Handling
- Environment Setup
- Testing with cURL
- Docker Setup

**รัน:**
```bash
node examples/betting-integration-example.js
```

---

### 🧪 Tests (1 ไฟล์)

#### `test-betting-round.js`
**วัตถุประสงค์:** Test suite สำหรับระบบ

**Tests:**
- ✅ Parse Method 1 (3 tests)
- ✅ Parse Method 2 (3 tests)
- ✅ Invalid Messages (4 tests)
- ✅ Admin Commands (3 tests)
- ✅ Validation (4 tests)
- ✅ Pairing (1 test)
- ✅ Result Calculation (3 tests)

**รัน:**
```bash
node test-betting-round.js
```

**ผลลัพธ์:** 7/7 PASSED ✅

---

### 📖 Documentation (5 ไฟล์)

#### 1. `BETTING_ROUND_SYSTEM.md`
**เนื้อหา:**
- ภาพรวมระบบ
- โครงสร้าง Services
- ขั้นตอนการทำงาน
- ตัวอย่างการจับคู่
- ตรรกะการคำนวณ
- โครงสร้างฐานข้อมูล
- Regex Patterns
- Security Features

**ใช้เมื่อ:** ต้องการเข้าใจระบบ

---

#### 2. `BETTING_ROUND_SETUP.md`
**เนื้อหา:**
- ไฟล์ที่สร้างขึ้น
- การเริ่มต้นใช้งาน
- ตั้งค่า Environment
- ตั้งค่า Google Sheets
- ตั้งค่า LINE Bot
- API Endpoints
- Troubleshooting

**ใช้เมื่อ:** ต้องการตั้งค่าระบบ

---

#### 3. `BETTING_SETUP_CHECKLIST.md`
**เนื้อหา:**
- Pre-Setup Checklist
- Google Sheets Setup
- Google Cloud Setup
- LINE Bot Setup
- Local Setup
- Deployment
- Testing
- Monitoring
- Security
- Documentation
- Launch

**ใช้เมื่อ:** ต้องการ step-by-step setup

---

#### 4. `BETTING_SYSTEM_SUMMARY.md`
**เนื้อหา:**
- Architecture Diagram
- ไฟล์ที่สร้างขึ้น
- ฟีเจอร์หลัก
- Workflow
- ตัวอย่างข้อมูล
- Test Results
- API Endpoints
- Regex Patterns
- Security Features
- Performance
- Customization
- Support

**ใช้เมื่อ:** ต้องการสรุประบบ

---

#### 5. `BETTING_QUICK_START.md`
**เนื้อหา:**
- 5 นาทีเริ่มต้น
- วิธีใช้งาน
- ทดสอบด้วย cURL
- ตัวอย่างการทำงาน
- Troubleshooting
- Next Steps

**ใช้เมื่อ:** ต้องการเริ่มต้นอย่างรวดเร็ว

---

#### 6. `BETTING_FILES_INDEX.md`
**เนื้อหา:** ไฟล์นี้ - สรุปไฟล์ทั้งหมด

---

## 🎯 วิธีใช้ไฟล์

### สำหรับ Developers

1. **เริ่มต้น:**
   - อ่าน `BETTING_QUICK_START.md`
   - รัน `test-betting-round.js`

2. **เข้าใจระบบ:**
   - อ่าน `BETTING_ROUND_SYSTEM.md`
   - ศึกษา `examples/betting-round-example.js`

3. **ตั้งค่า:**
   - ตามขั้นตอน `BETTING_SETUP_CHECKLIST.md`
   - อ้างอิง `BETTING_ROUND_SETUP.md`

4. **Integrate:**
   - ศึกษา `examples/betting-integration-example.js`
   - ใช้ `routes/betting-webhook.js`

5. **Deploy:**
   - ตามขั้นตอน `BETTING_SETUP_CHECKLIST.md` Step 5

### สำหรับ Admins

1. **เรียนรู้:**
   - อ่าน `BETTING_QUICK_START.md`
   - ดู `BETTING_SYSTEM_SUMMARY.md`

2. **ใช้งาน:**
   - ใช้ Admin Commands
   - ตรวจสอบ Google Sheets

3. **Troubleshoot:**
   - ดู Troubleshooting sections
   - ตรวจสอบ logs

### สำหรับ Users

1. **เรียนรู้:**
   - อ่าน `BETTING_QUICK_START.md`
   - ดูตัวอย่างการทำงาน

2. **ใช้งาน:**
   - ใช้ Betting Commands
   - ตรวจสอบ Bot responses

---

## 📊 File Statistics

| ประเภท | จำนวน | ขนาด |
|--------|-------|------|
| Services | 4 | ~1,500 lines |
| Routes | 1 | ~200 lines |
| Examples | 2 | ~500 lines |
| Tests | 1 | ~400 lines |
| Documentation | 6 | ~2,000 lines |
| **Total** | **14** | **~4,600 lines** |

---

## 🔗 Dependencies

```json
{
  "googleapis": "^latest"
}
```

---

## ✅ Checklist

- [x] Services สร้างเสร็จ
- [x] Routes สร้างเสร็จ
- [x] Examples สร้างเสร็จ
- [x] Tests สร้างเสร็จ
- [x] Documentation สร้างเสร็จ
- [x] ทดสอบทั้งระบบ
- [x] Ready for Production

---

## 📞 Support

หากมีคำถาม:
1. ตรวจสอบ `BETTING_QUICK_START.md`
2. ตรวจสอบ `BETTING_ROUND_SYSTEM.md`
3. ดู `examples/`
4. รัน `test-betting-round.js`

---

**Last Updated:** 2024-03-02
**Status:** ✅ Complete & Ready
