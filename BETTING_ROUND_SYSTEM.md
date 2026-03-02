# ระบบจัดการรอบการเล่นพนัน (Betting Round System)

## 📋 ภาพรวมระบบ

ระบบนี้ออกแบบมาเพื่อจัดการการเล่นพนันผ่าน LINE Bot โดยมีการควบคุมสถานะรอบการเล่น (OPEN/CLOSED/CALCULATING) และการจับคู่การเล่นอัตโนมัติ

## 🏗️ โครงสร้าง Services

### 1. BettingRoundStateService
จัดการสถานะรอบการเล่น

**สถานะ:**
- `OPEN` - เปิดรับการเล่น
- `CLOSED` - ปิดรับการเล่น
- `CALCULATING` - กำลังประมวลผลผลลัพธ์

**Methods:**
```javascript
await stateService.openRound(slipName)    // เปิดรอบ
await stateService.closeRound()           // ปิดรอบ
await stateService.startCalculating()     // เริ่มประมวลผล
stateService.getCurrentState()            // ดึงสถานะปัจจุบัน
stateService.canAcceptBets()              // ตรวจสอบว่าสามารถรับการเล่นได้หรือไม่
```

### 2. BettingMessageParserService
Parse ข้อความเล่นทั้ง 2 วิธี

**วิธีที่ 1 - ราคาช่าง:**
```
รูปแบบ: [ชื่อบั้งไฟ] [ชล./ชถ.] [ยอดเงิน]
ตัวอย่าง: ฟ้าหลังฝน ชล. 500
```

**วิธีที่ 2 - ราคาคะแนน:**
```
รูปแบบ: [ราคา] [ล./ย.] [ยอดเงิน] [ชื่อบั้งไฟ]
ตัวอย่าง: 0/3(300-330) ล. 500 ฟ้าหลังฝน
```

**Methods:**
```javascript
BettingMessageParserService.parseMessage(message)           // Parse ข้อความเล่น
BettingMessageParserService.parseAdminCommand(message)      // Parse คำสั่งแอดมิน
BettingMessageParserService.validateBet(parsedData)         // ตรวจสอบความถูกต้อง
```

### 3. BettingPairingService
จับคู่การเล่นและคำนวณยอดเงิน

**Methods:**
```javascript
await pairingService.recordBet(betData, userId, displayName)     // บันทึกการเล่น
await pairingService.getAllBets()                                // ดึงข้อมูลการเล่นทั้งหมด
pairingService.constructor.findPairs(bets)                       // จับคู่การเล่น
pairingService.constructor.calculateResult(pair, slipName, score) // คำนวณผลลัพธ์
await pairingService.updateUserBalance(userId, amount)           // อัปเดตยอดเงิน
await pairingService.getUserBalance(userId)                      // ดึงยอดเงินของ User
await pairingService.getAllBalances()                            // ดึงยอดเงินทั้งหมด
```

### 4. BettingRoundController
ประสานงานระหว่าง Services และจัดการ LINE webhook

**Methods:**
```javascript
await controller.initialize()           // เริ่มต้น Services
await controller.handleMessage(event)   // จัดการข้อความจาก LINE
```

## 🔄 ขั้นตอนการทำงาน

### ลูป 1-5 (Loop ทั้งรอบ)

#### 1️⃣ Admin เปิดรอบ
```
Admin: :เริ่ม ฟ้าหลังฝน
Bot: ✅ เปิดรอบการเล่น: ฟ้าหลังฝน
     รอบ ID: ROUND_1234567890
```

**สถานะ:** `OPEN`

#### 2️⃣ User ทำการเล่น
```
User: ฟ้าหลังฝน ชล. 500
Bot: ✅ บันทึกการเล่นสำเร็จ
     ชื่อ: Alice
     บั้งไฟ: ฟ้าหลังฝน
     ฝั่ง: ไล่
     จำนวนเงิน: 500 บาท
```

**ข้อมูลที่บันทึก:**
- Timestamp
- User ID
- Display Name
- Method (1 หรือ 2)
- Price (วิธีที่ 2 เท่านั้น)
- Side (ชล/ชถ/ล/ย)
- Amount
- Slip Name
- Status (OPEN)

#### 3️⃣ Admin ปิดรอบ
```
Admin: :หยุด
Bot: รอบนี้ปิดการทายแล้วคะ/ครับ
```

**สถานะ:** `CLOSED`

ใครพิมพ์มาหลังจากนี้จะได้ข้อความ: "รอบนี้ปิดการทายแล้วคะ/ครับ"

#### 4️⃣ Admin ประกาศผลแข่งขัน
```
Admin: :สรุป ฟ้าหลังฝน 315
```

**ระบบจะทำการ:**
1. เปลี่ยนสถานะเป็น `CALCULATING`
2. ดึงข้อมูลการเล่นทั้งหมด
3. จับคู่การเล่น (Pairing)
4. คำนวณผลลัพธ์
5. อัปเดตยอดเงิน
6. ส่งรายงานผลลัพธ์

#### 5️⃣ Bot ส่งรายงานผลลัพธ์
```
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

## 📊 ตัวอย่างการจับคู่ (Pairing)

### วิธีที่ 1 (ราคาช่าง)
```
User A: ฟ้าหลังฝน ชล. 500  → ฝั่ง: ไล่
User B: ฟ้าหลังฝน ชถ. 500  → ฝั่ง: ถอย

✅ Matched (บั้งไฟเดียวกัน, จำนวนเงินเดียวกัน, ฝั่งตรงข้าม)
```

### วิธีที่ 2 (ราคาคะแนน)
```
User C: 0/3(300-330) ล. 1000 ฟ้าหลังฝน  → ฝั่ง: ไล่
User D: 0/3(300-330) ย. 1000 ฟ้าหลังฝน  → ฝั่ง: ยั้ง

✅ Matched (บั้งไฟเดียวกัน, ราคาเดียวกัน, จำนวนเงินเดียวกัน, ฝั่งตรงข้าม)
```

## 🎯 ตรรกะการคำนวณผลลัพธ์

### วิธีที่ 1 (ราคาช่าง)
- ฝั่ง "ไล่" (ชล) **ชนะเสมอ**
- ฝั่ง "ถอย" (ชถ) **แพ้เสมอ**

### วิธีที่ 2 (ราคาคะแนน)
- ถ้าคะแนนอยู่ในเกณฑ์ราคา (เช่น 300-330) → ฝั่ง "ไล่" (ล) **ชนะ**
- ถ้าคะแนนไม่อยู่ในเกณฑ์ราคา → ฝั่ง "ยั้ง" (ย) **ชนะ**

**ตัวอย่าง:**
```
ราคา: 0/3(300-330)
คะแนนที่ออก: 315

315 อยู่ในช่วง 300-330 ✅
→ ฝั่ง "ไล่" (ล) ชนะ
```

## 🗄️ โครงสร้างฐานข้อมูล (Google Sheets)

### Sheet 1: RoundState
เก็บสถานะรอบการเล่นปัจจุบัน

| Column | ข้อมูล |
|--------|--------|
| A | State (OPEN/CLOSED/CALCULATING) |
| B | Round ID |
| C | Start Time |
| D | Slip Name |

### Sheet 2: Transactions
เก็บประวัติการเล่นรายบรรทัด

| Column | ข้อมูล |
|--------|--------|
| A | Timestamp |
| B | User ID |
| C | Display Name |
| D | Method (1/2) |
| E | Price |
| F | Side (ชล/ชถ/ล/ย) |
| G | Amount |
| H | Slip Name |
| I | Status (OPEN/MATCHED) |

### Sheet 3: UsersBalance
เก็บยอดเงินคงเหลือของแต่ละ User

| Column | ข้อมูล |
|--------|--------|
| A | User ID |
| B | Display Name |
| C | Balance |

## ⚙️ การตั้งค่า

### Environment Variables
```
GOOGLE_SHEETS_ID=your_spreadsheet_id
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret
```

### Initialize Services
```javascript
const bettingRoundController = require('./services/betting/bettingRoundController');

// เริ่มต้น Services
await bettingRoundController.initialize();
```

## 🧪 ทดสอบระบบ

รัน examples:
```bash
node examples/betting-round-example.js
```

## 📝 ข้อความแสดงข้อผิดพลาด

| ข้อผิดพลาด | สาเหตุ | วิธีแก้ |
|-----------|--------|--------|
| "รูปแบบผิดครับ" | ข้อความไม่ตรงรูปแบบ | ตรวจสอบการเว้นวรรค |
| "จำนวนเงินต้องมากกว่า 0" | จำนวนเงิน ≤ 0 | ใส่จำนวนเงินที่ถูกต้อง |
| "จำนวนเงินเกินขีดจำกัด" | จำนวนเงิน > 1,000,000 | ลดจำนวนเงิน |
| "รอบนี้ปิดการทายแล้ว" | สถานะเป็น CLOSED | รอให้แอดมินเปิดรอบใหม่ |

## 🔐 ความปลอดภัย

- ✅ ตรวจสอบสถานะรอบก่อนรับการเล่น
- ✅ Validate ข้อมูลการเล่นทั้งหมด
- ✅ บันทึก Timestamp ของทุกการเล่น
- ✅ ตรวจสอบความถูกต้องของคู่การเล่น
- ✅ อัปเดตยอดเงินอย่างปลอดภัย

## 📞 Support

หากมีปัญหา โปรดตรวจสอบ:
1. Google Sheets ID ถูกต้องหรือไม่
2. Credentials ถูกต้องหรือไม่
3. Sheet names ตรงกับการตั้งค่าหรือไม่
4. ข้อความเล่นตรงรูปแบบหรือไม่
