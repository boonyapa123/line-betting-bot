# ชีท Players และ Transactions - ภาพรวมการทำงาน

## 📊 ชีท Players
**ใช้สำหรับ:** บันทึกข้อมูลผู้เล่นและยอดเงินคงเหลือ

### Column ในชีท Players
| # | Column | ข้อมูล | ตัวอย่าง |
|---|--------|--------|---------|
| A | UserID | ID ผู้เล่นจาก LINE | U1234567890abcdef |
| B | LineName | ชื่อ LINE ของผู้เล่น | สมชาย |
| C | Phone | เบอร์โทรศัพท์ | 0812345678 |
| D | Email | อีเมล | user@example.com |
| E | Balance | ยอดเงินคงเหลือปัจจุบัน | 5000 |
| F | TotalDeposits | ยอดเงินที่ฝากทั้งหมด | 10000 |
| G | TotalWithdrawals | ยอดเงินที่ถอนทั้งหมด | 5000 |
| H | Status | สถานะ (active/inactive) | active |
| I | CreatedDate | วันที่สร้างบัญชี | 2024-01-15 10:30:45 |
| J | LastUpdated | วันที่อัปเดตล่าสุด | 2024-01-20 15:45:30 |
| K | AccessToken | LINE Access Token | 4T31zd9SH2Ze... |

### ตัวอย่างข้อมูล
```
UserID | LineName | Phone | Email | Balance | TotalDeposits | TotalWithdrawals | Status | CreatedDate | LastUpdated | AccessToken
U123 | สมชาย | 0812345678 | user@example.com | 5000 | 10000 | 5000 | active | 2024-01-15 | 2024-01-20 | token123
U456 | สมหญิง | 0898765432 | user2@example.com | 3000 | 8000 | 5000 | active | 2024-01-16 | 2024-01-21 | token456
```

---

## 📊 ชีท Transactions
**ใช้สำหรับ:** บันทึกรายการเงินทั้งหมด (ฝาก/ถอน/เล่น)

### Column ในชีท Transactions
| # | Column | ข้อมูล | ตัวอย่าง |
|---|--------|--------|---------|
| A | Date | วันที่ | 2024-01-20 |
| B | LineName | ชื่อ LINE | สมชาย |
| C | Type | ประเภท (deposit/withdraw/bet/win/lose) | deposit |
| D | Amount | จำนวนเงิน | 1000 |
| E | SlipID | ID สลิป | SLIP123 |
| F | Reference | อ้างอิง | - |
| G | Status | สถานะ (verified/pending/failed) | verified |
| H | Description | รายละเอียด | Slip verification passed |
| I | BalanceBefore | ยอดเงินก่อน | 4000 |
| J | BalanceAfter | ยอดเงินหลัง | 5000 |
| K | DateTime | วันเวลา | 2024-01-20 15:45:30 |
| L | AccessToken | LINE Access Token | token123 |

### ตัวอย่างข้อมูล
```
Date | LineName | Type | Amount | SlipID | Reference | Status | Description | BalanceBefore | BalanceAfter | DateTime | AccessToken
2024-01-20 | สมชาย | deposit | 1000 | SLIP123 | - | verified | Slip verification passed | 4000 | 5000 | 2024-01-20 15:45:30 | token123
2024-01-20 | สมหญิง | bet | 500 | - | - | open | Betting on slip1 | 3000 | 2500 | 2024-01-20 16:00:00 | token456
2024-01-20 | สมชาย | win | 450 | - | - | completed | Won betting round | 5000 | 5450 | 2024-01-20 16:15:00 | token123
```

---

## 🔄 ขั้นตอนการทำงาน

### 1. เมื่อผู้เล่นส่งสลิป (Slip2Go Webhook)

```
Slip2Go Webhook → /slip-verified
    ↓
ตรวจสอบสลิป (status = verified)
    ↓
ดึงข้อมูล LINE User Profile
    ↓
บันทึกลงชีท Players
    ├─ ถ้าผู้เล่นมีอยู่แล้ว → อัปเดต Balance และ TotalDeposits
    └─ ถ้าผู้เล่นใหม่ → สร้างแถวใหม่
    ↓
บันทึกลงชีท Transactions
    └─ Type: deposit
    └─ Status: verified
    └─ บันทึก BalanceBefore และ BalanceAfter
```

### 2. เมื่อผู้เล่นเล่น (Betting)

```
User sends message → /betting/webhook
    ↓
Parse message (ต 100)
    ↓
บันทึกลงชีท Bets (ไม่ใช่ Transactions)
    ├─ Timestamp
    ├─ UserID
    ├─ DisplayName
    ├─ LineName
    ├─ Method
    ├─ Side
    ├─ Amount
    └─ SlipName
```

### 3. เมื่อสรุปผลการเล่น (Calculate Result)

```
Admin: POST /betting/admin/calculate
    ↓
คำนวณผลลัพธ์
    ↓
บันทึกลงชีท Results
    ├─ Player1 vs Player2
    ├─ Winner/Loser
    ├─ Amount
    └─ Fee
    ↓
อัปเดต UsersBalance
    ├─ Winner: +NetAmount
    └─ Loser: -Amount
    ↓
บันทึกลงชีท Transactions (ถ้าต้องการ)
    ├─ Type: win/lose
    └─ Status: completed
```

---

## 📝 ฟังก์ชันที่เกี่ยวข้อง

### ในไฟล์ `routes/slip2GoWebhook.js`

#### `_recordPlayerToSheet()`
- **ใช้สำหรับ:** บันทึกข้อมูลผู้เล่นลงชีท Players
- **ทำงาน:**
  1. ค้นหาผู้เล่นในชีท Players
  2. ถ้ามีอยู่แล้ว → อัปเดต Balance และ TotalDeposits
  3. ถ้าไม่มี → สร้างแถวใหม่
  4. อัปเดต LastUpdated และ Status

#### `_recordTransactionToSheet()`
- **ใช้สำหรับ:** บันทึกรายการเงินลงชีท Transactions
- **ทำงาน:**
  1. ดึงจำนวนแถวปัจจุบัน
  2. ดึง BalanceBefore จากชีท Players
  3. คำนวณ BalanceAfter
  4. บันทึกรายการเงิน

### ในไฟล์ `services/betting/bettingPairingService.js`

#### `recordBet()`
- **ใช้สำหรับ:** บันทึกการเล่นลงชีท Bets
- **ทำงาน:**
  1. สร้างแถวใหม่ด้วยข้อมูลการเล่น
  2. เพิ่มลงชีท Bets

#### `updateUserBalance()`
- **ใช้สำหรับ:** อัปเดตยอดเงินในชีท UsersBalance
- **ทำงาน:**
  1. ค้นหา User ในชีท UsersBalance
  2. คำนวณ NewBalance
  3. อัปเดตยอดเงิน

---

## 🔗 ความสัมพันธ์ระหว่างชีท

```
Players (ข้อมูลผู้เล่น)
    ↓
    ├─→ Transactions (รายการเงิน)
    │
    ├─→ Bets (การเล่น)
    │   ↓
    │   └─→ Results (ผลลัพธ์)
    │       ↓
    │       └─→ UsersBalance (ยอดเงินคงเหลือ)
    │
    └─→ RoundState (สถานะรอบ)
```

---

## 💡 ตัวอย่างการใช้งาน

### ตัวอย่าง 1: ผู้เล่นส่งสลิป 1000 บาท

**ชีท Players:**
```
Before: Balance = 0, TotalDeposits = 0
After:  Balance = 1000, TotalDeposits = 1000
```

**ชีท Transactions:**
```
Date: 2024-01-20
LineName: สมชาย
Type: deposit
Amount: 1000
Status: verified
BalanceBefore: 0
BalanceAfter: 1000
```

### ตัวอย่าง 2: ผู้เล่นเล่น 500 บาท

**ชีท Bets:**
```
Timestamp: 2024-01-20 16:00:00
UserID: U123
DisplayName: สมชาย
LineName: สมชาย
Method: 1
Side: ต
Amount: 500
SlipName: บั้งไฟ1
Status: OPEN
```

**ชีท UsersBalance:**
```
Before: Balance = 1000
After:  Balance = 500 (ยังไม่รู้ผลลัพธ์)
```

### ตัวอย่าง 3: ผู้เล่นชนะ (หัก 10%)

**ชีท Results:**
```
Winner: สมชาย
Winner_GrossAmount: 500
Winner_Fee: 50 (10%)
Winner_NetAmount: 450

Loser: สมหญิง
Loser_GrossAmount: -500
Loser_Fee: 0
Loser_NetAmount: -500
```

**ชีท UsersBalance:**
```
สมชาย:  500 → 950 (+450)
สมหญิง: 1000 → 500 (-500)
```

---

## ⚠️ ข้อสังเกต

1. **ชีท Players** - ใช้สำหรับบันทึกข้อมูลผู้เล่นและยอดเงินทั้งหมด
2. **ชีท Transactions** - ใช้สำหรับบันทึกรายการเงิน (ฝาก/ถอน)
3. **ชีท Bets** - ใช้สำหรับบันทึกการเล่น (ไม่ใช่ Transactions)
4. **ชีท Results** - ใช้สำหรับบันทึกผลลัพธ์การเล่น
5. **ชีท UsersBalance** - ใช้สำหรับบันทึกยอดเงินคงเหลือปัจจุบัน

---

## 🎯 สรุป

- **Players:** ข้อมูลผู้เล่น + ยอดเงินทั้งหมด
- **Transactions:** รายการเงิน (ฝาก/ถอน)
- **Bets:** การเล่น
- **Results:** ผลลัพธ์การเล่น
- **UsersBalance:** ยอดเงินคงเหลือปัจจุบัน
- **RoundState:** สถานะรอบการเล่น
