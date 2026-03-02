# การไหลของข้อมูลทั้งระบบ - Complete Data Flow

## 📊 ภาพรวมการไหลของข้อมูล

ระบบมี 3 Phase หลัก:
1. **Phase 1: ฝากเงิน** (Deposit)
2. **Phase 2: เล่น** (Betting)
3. **Phase 3: สรุปผล** (Settlement)

---

## Phase 1: ฝากเงิน (Deposit)

### ขั้นตอน
```
1. ผู้เล่นส่งสลิป
   ↓
2. Slip2Go ตรวจสอบสลิป
   ↓
3. Slip2Go Webhook ส่งข้อมูล
   ↓
4. ระบบรับข้อมูล
   ↓
5. บันทึกลงชีท Players
   ↓
6. บันทึกลงชีท Transactions
   ↓
7. อัปเดตชีท UsersBalance
   ↓
8. ส่งข้อความยืนยัน LINE
```

### ข้อมูลที่ไหล

```
Slip2Go Webhook
├─ userId
├─ amount
├─ slipId
├─ status (verified)
└─ dateTime

    ↓

Players Sheet
├─ UserID (A)
├─ LineName (B)
├─ Balance (E) ← amount
├─ TotalDeposits (F) ← amount
└─ LastUpdated (J)

    ↓

Transactions Sheet
├─ Date (A)
├─ LineName (B)
├─ Type (C) = "deposit"
├─ Amount (D) ← amount
├─ SlipID (E) ← slipId
├─ Status (G) = "verified"
├─ BalanceBefore (I)
├─ BalanceAfter (J) ← Balance + amount
└─ DateTime (K)

    ↓

UsersBalance Sheet
├─ UserID (A)
├─ DisplayName (B)
└─ Balance (C) ← BalanceAfter
```

### ตัวอย่าง

```
Input: Slip2Go Webhook
{
  "userId": "U123",
  "amount": 1000,
  "slipId": "SLIP001",
  "status": "verified"
}

Output:
Players: U123 | สมชาย | ... | 1000 | 1000 | ...
Transactions: 2024-01-20 | สมชาย | deposit | 1000 | SLIP001 | verified | 0 | 1000 | ...
UsersBalance: U123 | สมชาย | 1000
```

---

## Phase 2: เล่น (Betting)

### ขั้นตอน
```
1. ผู้เล่นส่งข้อความเล่น
   ↓
2. ระบบ Parse ข้อความ
   ↓
3. ตรวจสอบ RoundState (OPEN?)
   ↓
4. ตรวจสอบ UsersBalance (เพียงพอ?)
   ↓
5. บันทึกลงชีท Bets
   ↓
6. ส่งข้อความยืนยัน LINE
```

### ข้อมูลที่ไหล

```
User Message
├─ userId
├─ displayName
├─ lineName
└─ message (ต 500)

    ↓

Parse Message
├─ method = 1
├─ side = "ต"
├─ amount = 500
└─ slipName (จาก RoundState)

    ↓

Check RoundState
├─ State = "OPEN" ✓
└─ SlipName = "บั้งไฟ1"

    ↓

Check UsersBalance
├─ Balance = 1000
├─ Required = 500
└─ Sufficient = true ✓

    ↓

Bets Sheet
├─ Timestamp (A) = now
├─ UserID (B) = U123
├─ DisplayName (C) = สมชาย
├─ LineName (D) = สมชาย
├─ Method (E) = 1
├─ Price (F) = ""
├─ Side (G) = "ต"
├─ Amount (H) = 500
├─ SlipName (I) = "บั้งไฟ1"
└─ Status (J) = "OPEN"
```

### ตัวอย่าง

```
Input: User Message
{
  "userId": "U123",
  "displayName": "สมชาย",
  "lineName": "สมชาย",
  "message": "ต 500"
}

Output:
Bets: 2024-01-20 10:05 | U123 | สมชาย | สมชาย | 1 | - | ต | 500 | บั้งไฟ1 | OPEN
```

---

## Phase 3: สรุปผล (Settlement)

### ขั้นตอน
```
1. Admin ใช้คำสั่ง :สรุป
   ↓
2. ดึงข้อมูลจาก Bets
   ↓
3. จับคู่การเล่น
   ↓
4. คำนวณผลลัพธ์
   ↓
5. บันทึกลงชีท Results
   ↓
6. อัปเดตชีท UsersBalance
   ↓
7. บันทึกลงชีท Transactions
   ↓
8. ส่งข้อความแจ้งเตือน LINE
```

### ข้อมูลที่ไหล

```
Admin Command
├─ command = "CALCULATE"
├─ slipName = "บั้งไฟ1"
└─ score = 50

    ↓

Bets Sheet (ดึงข้อมูล)
├─ Bet1: U123 | สมชาย | ต | 500
└─ Bet2: U456 | สมหญิง | ล | 500

    ↓

Calculate Result
├─ Winner: U123 (ต ชนะ)
├─ Loser: U456 (ล แพ้)
├─ GrossAmount: 500
├─ Fee: 50 (10%)
└─ NetAmount: 450

    ↓

Results Sheet
├─ Timestamp (A) = now
├─ SlipName (B) = "บั้งไฟ1"
├─ Score (C) = 50
├─ Player1_ID (D) = U123
├─ Player1_Name (E) = สมชาย
├─ Player1_LineName (F) = สมชาย
├─ Player1_Side (G) = ต
├─ Player1_Amount (H) = 500
├─ Player2_ID (I) = U456
├─ Player2_Name (J) = สมหญิง
├─ Player2_LineName (K) = สมหญิง
├─ Player2_Side (L) = ล
├─ Player2_Amount (M) = 500
├─ Winner_ID (N) = U123
├─ Winner_Name (O) = สมชาย
├─ Winner_LineName (P) = สมชาย
├─ Winner_GrossAmount (Q) = 500
├─ Winner_Fee (R) = 50
├─ Winner_NetAmount (S) = 450
├─ Loser_ID (T) = U456
├─ Loser_Name (U) = สมหญิง
├─ Loser_LineName (V) = สมหญิง
├─ Loser_GrossAmount (W) = -500
├─ Loser_Fee (X) = 0
├─ Loser_NetAmount (Y) = -500
└─ ResultType (Z) = "WIN"

    ↓

UsersBalance Sheet (อัปเดต)
├─ U123: 1000 + 450 = 1450
└─ U456: 1000 - 500 = 500

    ↓

Transactions Sheet (บันทึก)
├─ 2024-01-20 | สมชาย | win | 450 | verified
└─ 2024-01-20 | สมหญิง | lose | -500 | verified

    ↓

LINE Notification
├─ Private to U123: 🎉 ยินดีด้วย! คุณชนะ
├─ Private to U456: 😔 เสียใจด้วย คุณแพ้
└─ Group: 📊 ผลการเล่น
```

### ตัวอย่าง

```
Input: Admin Command
{
  "command": "CALCULATE",
  "slipName": "บั้งไฟ1",
  "score": 50
}

Output:
Results: 2024-01-20 10:10 | บั้งไฟ1 | 50 | U123 | สมชาย | สมชาย | ต | 500 | U456 | สมหญิง | สมหญิง | ล | 500 | U123 | สมชาย | สมชาย | 500 | 50 | 450 | U456 | สมหญิง | สมหญิง | -500 | 0 | -500 | WIN

UsersBalance: 
- U123 | สมชาย | 1450
- U456 | สมหญิง | 500

Transactions:
- 2024-01-20 | สมชาย | win | 450 | verified
- 2024-01-20 | สมหญิง | lose | -500 | verified
```

---

## 🔄 ความสัมพันธ์ระหว่าง Phase

### Phase 1 → Phase 2
```
Players (Balance)
    ↓
UsersBalance (Balance)
    ↓
Bets (ตรวจสอบ Balance)
```

### Phase 2 → Phase 3
```
Bets (ข้อมูลการเล่น)
    ↓
Results (บันทึกผลลัพธ์)
    ↓
UsersBalance (อัปเดต Balance)
```

---

## 📊 ตัวอย่างการไหลของข้อมูลทั้งหมด

### Scenario: ผู้เล่น 2 คน เล่น 1 รอบ

#### Step 1: ผู้เล่น U123 ส่งสลิป 1000 บาท
```
Input: Slip2Go Webhook
{
  "userId": "U123",
  "amount": 1000,
  "slipId": "SLIP001",
  "status": "verified"
}

Output:
Players: U123 | สมชาย | 0812345678 | user@example.com | 1000 | 1000 | 0 | active | 2024-01-20 | 2024-01-20 | token123
Transactions: 2024-01-20 | สมชาย | deposit | 1000 | SLIP001 | - | verified | Slip verification passed | 0 | 1000 | 2024-01-20 10:00 | token123
UsersBalance: U123 | สมชาย | 1000
```

#### Step 2: ผู้เล่น U456 ส่งสลิป 1000 บาท
```
Input: Slip2Go Webhook
{
  "userId": "U456",
  "amount": 1000,
  "slipId": "SLIP002",
  "status": "verified"
}

Output:
Players: U456 | สมหญิง | 0898765432 | user2@example.com | 1000 | 1000 | 0 | active | 2024-01-20 | 2024-01-20 | token456
Transactions: 2024-01-20 | สมหญิง | deposit | 1000 | SLIP002 | - | verified | Slip verification passed | 0 | 1000 | 2024-01-20 10:01 | token456
UsersBalance: U456 | สมหญิง | 1000
```

#### Step 3: Admin เปิดรอบ
```
Input: Admin Command
:เริ่ม บั้งไฟ1

Output:
RoundState: OPEN | ROUND_1705756800000 | 2024-01-20 10:05 | บั้งไฟ1
```

#### Step 4: ผู้เล่น U123 เล่น 500 บาท
```
Input: User Message
{
  "userId": "U123",
  "displayName": "สมชาย",
  "lineName": "สมชาย",
  "message": "ต 500"
}

Output:
Bets: 2024-01-20 10:05 | U123 | สมชาย | สมชาย | 1 | - | ต | 500 | บั้งไฟ1 | OPEN
```

#### Step 5: ผู้เล่น U456 เล่น 500 บาท
```
Input: User Message
{
  "userId": "U456",
  "displayName": "สมหญิง",
  "lineName": "สมหญิง",
  "message": "ล 500"
}

Output:
Bets: 2024-01-20 10:06 | U456 | สมหญิง | สมหญิง | 1 | - | ล | 500 | บั้งไฟ1 | OPEN
```

#### Step 6: Admin ปิดรอบ
```
Input: Admin Command
:หยุด

Output:
RoundState: CLOSED | ROUND_1705756800000 | 2024-01-20 10:05 | บั้งไฟ1
```

#### Step 7: Admin สรุปผล
```
Input: Admin Command
:สรุป บั้งไฟ1 50

Output:
Results: 2024-01-20 10:10 | บั้งไฟ1 | 50 | U123 | สมชาย | สมชาย | ต | 500 | U456 | สมหญิง | สมหญิง | ล | 500 | U123 | สมชาย | สมชาย | 500 | 50 | 450 | U456 | สมหญิง | สมหญิง | -500 | 0 | -500 | WIN

UsersBalance:
- U123 | สมชาย | 1450 (1000 + 450)
- U456 | สมหญิง | 500 (1000 - 500)

Transactions:
- 2024-01-20 | สมชาย | win | 450 | verified | 1000 | 1450 | 2024-01-20 10:10 | token123
- 2024-01-20 | สมหญิง | lose | -500 | verified | 1000 | 500 | 2024-01-20 10:10 | token456

LINE Notification:
- Private to U123: 🎉 ยินดีด้วย! คุณชนะ บั้งไฟ: บั้งไฟ1 คะแนนที่ออก: 50 เดิมพัน: 500 บาท หัก: 50 บาท (10%) ได้รับ: 450 บาท
- Private to U456: 😔 เสียใจด้วย คุณแพ้ บั้งไฟ: บั้งไฟ1 คะแนนที่ออก: 50 เดิมพัน: 500 บาท
- Group: 📊 ผลการเล่น บั้งไฟ: บั้งไฟ1 คะแนนที่ออก: 50 🏆 ชนะ: สมชาย (สมชาย) ฝั่ง: ต เดิมพัน: 500 บาท หัก: 50 บาท (10%) ได้รับ: 450 บาท ❌ แพ้: สมหญิง (สมหญิง) ฝั่ง: ล เดิมพัน: 500 บาท
```

---

## ✅ ตรวจสอบการไหลของข้อมูล

- ✅ ข้อมูลไหลจาก Phase 1 → Phase 2 → Phase 3
- ✅ ทุกชีทเชื่อมต่อกันผ่าน UserID และ SlipName
- ✅ ข้อมูลตรวจสอบก่อนบันทึก
- ✅ ข้อมูลอัปเดตอย่างถูกต้อง
- ✅ ข้อความแจ้งเตือนส่งไปยัง LINE

---

## 💡 หมายเหตุ

- ข้อมูลไหลแบบ One-way (ไม่มีการไหลย้อนกลับ)
- ทุกการเปลี่ยนแปลงบันทึกลงชีท
- ระบบตรวจสอบข้อมูลก่อนบันทึก
- ข้อมูลสามารถติดตามได้ผ่าน Timestamp
