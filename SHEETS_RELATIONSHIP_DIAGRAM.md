# ความสัมพันธ์ระหว่างชีท - Sheets Relationship Diagram

## 📊 ภาพรวมชีททั้งหมด

ระบบมีชีท 7 ชีท ที่ทำงานสัมพันธ์กัน:

1. **RoundState** - สถานะรอบการเล่น
2. **Players** - ข้อมูลผู้เล่น
3. **Transactions** - รายการเงิน (ฝาก/ถอน)
4. **Bets** - บันทึกการเล่น
5. **UsersBalance** - ยอดเงินคงเหลือ
6. **Results** - ผลลัพธ์การเล่น
7. **RoundState** - สถานะรอบ

---

## 🔄 ความสัมพันธ์ระหว่างชีท

### Diagram แบบ Flowchart

```
┌─────────────────────────────────────────────────────────────┐
│                    ผู้เล่นส่งสลิป                            │
│                  (Slip2Go Webhook)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   ตรวจสอบสลิป (verified)      │
        └────────────────┬───────────────┘
                         │
        ┌────────────────┴───────────────┐
        │                                │
        ▼                                ▼
   ┌─────────────┐            ┌──────────────────┐
   │   Players   │            │  Transactions    │
   │ (บันทึก)    │            │  (Type: deposit) │
   │ - UserID    │            │  - Amount        │
   │ - LineName  │            │  - Status        │
   │ - Balance   │            │  - BalanceBefore │
   │ - Deposits  │            │  - BalanceAfter  │
   └─────────────┘            └──────────────────┘
        │                              │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │   UsersBalance           │
        │ (ยอดเงินคงเหลือ)         │
        │ - UserID                 │
        │ - DisplayName            │
        │ - Balance                │
        └──────────────────────────┘
                       │
                       │ (ตรวจสอบยอดเงิน)
                       │
        ┌──────────────┴───────────────┐
        │                              │
        ▼                              ▼
   ┌─────────────┐            ┌──────────────────┐
   │  RoundState │            │  Bets            │
   │ (สถานะรอบ)  │            │ (บันทึกการเล่น)  │
   │ - State     │            │ - UserID         │
   │ - RoundID   │            │ - LineName       │
   │ - SlipName  │            │ - Method         │
   │ - StartTime │            │ - Side           │
   └─────────────┘            │ - Amount         │
        │                     │ - SlipName       │
        │                     │ - Status         │
        │                     └──────────────────┘
        │                              │
        │ (Admin: :สรุป)               │
        │                              │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │   Results                │
        │ (ผลลัพธ์การเล่น)         │
        │ - Player1 vs Player2     │
        │ - Winner/Loser           │
        │ - Amount                 │
        │ - Fee                    │
        │ - NetAmount              │
        └──────────────┬───────────┘
                       │
        ┌──────────────┴───────────────┐
        │                              │
        ▼                              ▼
   ┌─────────────┐            ┌──────────────────┐
   │ UsersBalance│            │  Transactions    │
   │ (อัปเดต)    │            │  (Type: win/lose)│
   │ - Balance   │            │  - Amount        │
   │ (ใหม่)      │            │  - Status        │
   └─────────────┘            └──────────────────┘
```

---

## 📋 รายละเอียดชีทแต่ละชีท

### 1. RoundState (สถานะรอบ)
**ใช้สำหรับ:** บันทึกสถานะรอบการเล่น

| Column | ข้อมูล |
|--------|--------|
| State | OPEN/CLOSED/CALCULATING |
| RoundID | ID รอบ |
| StartTime | เวลาเริ่มรอบ |
| SlipName | ชื่อบั้งไฟ |

**ความสัมพันธ์:**
- ← ได้รับ SlipName จาก Admin Command
- → ส่ง SlipName ไปยัง Bets
- → ส่ง State ไปยัง Bets (ตรวจสอบว่าสามารถรับการเล่นได้หรือไม่)

---

### 2. Players (ข้อมูลผู้เล่น)
**ใช้สำหรับ:** บันทึกข้อมูลผู้เล่นและยอดเงินทั้งหมด

| Column | ข้อมูล |
|--------|--------|
| UserID | ID ผู้เล่น |
| LineName | ชื่อ LINE |
| Phone | เบอร์โทร |
| Email | อีเมล |
| Balance | ยอดเงินปัจจุบัน |
| TotalDeposits | ยอดเงินฝากทั้งหมด |
| TotalWithdrawals | ยอดเงินถอนทั้งหมด |
| Status | active/inactive |
| CreatedDate | วันที่สร้าง |
| LastUpdated | วันที่อัปเดต |
| AccessToken | LINE Token |

**ความสัมพันธ์:**
- ← ได้รับข้อมูลจาก Slip2Go Webhook
- → ส่ง Balance ไปยัง UsersBalance
- → ส่ง LineName ไปยัง Bets
- → ส่ง Balance ไปยัง BalanceCheckService

---

### 3. Transactions (รายการเงิน)
**ใช้สำหรับ:** บันทึกรายการเงิน (ฝาก/ถอน)

| Column | ข้อมูล |
|--------|--------|
| Date | วันที่ |
| LineName | ชื่อ LINE |
| Type | deposit/withdraw/bet/win/lose |
| Amount | จำนวนเงิน |
| SlipID | ID สลิป |
| Reference | อ้างอิง |
| Status | verified/pending/failed |
| Description | รายละเอียด |
| BalanceBefore | ยอดเงินก่อน |
| BalanceAfter | ยอดเงินหลัง |
| DateTime | วันเวลา |
| AccessToken | LINE Token |

**ความสัมพันธ์:**
- ← ได้รับข้อมูลจาก Slip2Go Webhook (Type: deposit)
- ← ได้รับข้อมูลจาก Results (Type: win/lose)
- → ส่ง BalanceAfter ไปยัง UsersBalance

---

### 4. Bets (บันทึกการเล่น)
**ใช้สำหรับ:** บันทึกการเล่นแต่ละครั้ง

| Column | ข้อมูล |
|--------|--------|
| Timestamp | เวลา |
| UserID | ID ผู้เล่น |
| DisplayName | ชื่อผู้เล่น |
| LineName | ชื่อ LINE |
| Method | REPLY/1/2 |
| Price | ราคา |
| Side | ฝั่ง |
| Amount | จำนวนเงิน |
| SlipName | ชื่อบั้งไฟ |
| Status | OPEN |

**ความสัมพันธ์:**
- ← ได้รับ SlipName จาก RoundState
- ← ได้รับ LineName จาก Players
- ← ตรวจสอบ Balance จาก UsersBalance
- → ส่งข้อมูลไปยัง Results (เมื่อสรุปผล)

---

### 5. UsersBalance (ยอดเงินคงเหลือ)
**ใช้สำหรับ:** บันทึกยอดเงินคงเหลือปัจจุบัน

| Column | ข้อมูล |
|--------|--------|
| UserID | ID ผู้เล่น |
| DisplayName | ชื่อผู้เล่น |
| Balance | ยอดเงินคงเหลือ |

**ความสัมพันธ์:**
- ← ได้รับข้อมูลจาก Players (เมื่อส่งสลิป)
- ← ได้รับข้อมูลจาก Results (เมื่อสรุปผล)
- → ส่ง Balance ไปยัง BalanceCheckService (ตรวจสอบยอดเงิน)
- → ส่ง Balance ไปยัง Bets (ตรวจสอบก่อนบันทึก)

---

### 6. Results (ผลลัพธ์การเล่น)
**ใช้สำหรับ:** บันทึกผลลัพธ์การเล่น

| Column | ข้อมูล |
|--------|--------|
| Timestamp | เวลา |
| SlipName | ชื่อบั้งไฟ |
| Score | คะแนนที่ออก |
| Player1_ID | ID ผู้เล่น 1 |
| Player1_Name | ชื่อผู้เล่น 1 |
| Player1_LineName | ชื่อ LINE ผู้เล่น 1 |
| Player1_Side | ฝั่งผู้เล่น 1 |
| Player1_Amount | เดิมพันผู้เล่น 1 |
| Player2_ID | ID ผู้เล่น 2 |
| Player2_Name | ชื่อผู้เล่น 2 |
| Player2_LineName | ชื่อ LINE ผู้เล่น 2 |
| Player2_Side | ฝั่งผู้เล่น 2 |
| Player2_Amount | เดิมพันผู้เล่น 2 |
| Winner_ID | ID ผู้ชนะ |
| Winner_Name | ชื่อผู้ชนะ |
| Winner_LineName | ชื่อ LINE ผู้ชนะ |
| Winner_GrossAmount | เดิมพันผู้ชนะ |
| Winner_Fee | ค่าธรรมเนียมผู้ชนะ |
| Winner_NetAmount | ได้รับสุทธิผู้ชนะ |
| Loser_ID | ID ผู้แพ้ |
| Loser_Name | ชื่อผู้แพ้ |
| Loser_LineName | ชื่อ LINE ผู้แพ้ |
| Loser_GrossAmount | เดิมพันผู้แพ้ |
| Loser_Fee | ค่าธรรมเนียมผู้แพ้ |
| Loser_NetAmount | ได้รับสุทธิผู้แพ้ |
| ResultType | WIN/DRAW |

**ความสัมพันธ์:**
- ← ได้รับข้อมูลจาก Bets (เมื่อสรุปผล)
- → ส่ง Winner_NetAmount ไปยัง UsersBalance
- → ส่ง Loser_NetAmount ไปยัง UsersBalance
- → ส่งข้อมูลไปยัง Transactions (Type: win/lose)

---

## 🔄 ขั้นตอนการทำงานทั้งหมด

### Phase 1: ผู้เล่นส่งสลิป
```
Slip2Go Webhook
    ↓
Players (บันทึก)
    ↓
Transactions (Type: deposit)
    ↓
UsersBalance (อัปเดต)
```

### Phase 2: ผู้เล่นเล่น
```
User sends message
    ↓
RoundState (ตรวจสอบ State)
    ↓
UsersBalance (ตรวจสอบ Balance)
    ↓
Bets (บันทึก)
```

### Phase 3: สรุปผล
```
Admin: :สรุป
    ↓
Bets (ดึงข้อมูล)
    ↓
Results (บันทึก)
    ↓
UsersBalance (อัปเดต)
    ↓
Transactions (Type: win/lose)
```

---

## 📊 ตัวอย่างการทำงาน

### ตัวอย่าง: ผู้เล่น 2 คน เล่น 1 รอบ

#### Step 1: ผู้เล่นส่งสลิป
```
Players:
- U123 | สมชาย | 0 | 1000 | 1000 | 0

Transactions:
- 2024-01-20 | สมชาย | deposit | 1000 | verified

UsersBalance:
- U123 | สมชาย | 1000
```

#### Step 2: Admin เปิดรอบ
```
RoundState:
- OPEN | ROUND_123 | 2024-01-20 10:00 | บั้งไฟ1
```

#### Step 3: ผู้เล่นเล่น
```
Bets:
- 2024-01-20 10:05 | U123 | สมชาย | สมชาย | 1 | - | ต | 500 | บั้งไฟ1 | OPEN
- 2024-01-20 10:06 | U456 | สมหญิง | สมหญิง | 1 | - | ล | 500 | บั้งไฟ1 | OPEN
```

#### Step 4: Admin สรุปผล
```
Results:
- 2024-01-20 10:10 | บั้งไฟ1 | 50 | U123 | สมชาย | สมชาย | ต | 500 | U456 | สมหญิง | สมหญิง | ล | 500 | U123 | สมชาย | สมชาย | 500 | 50 | 450 | U456 | สมหญิง | สมหญิง | -500 | 0 | -500 | WIN

UsersBalance:
- U123 | สมชาย | 1450 (1000 + 450)
- U456 | สมหญิง | 500 (1000 - 500)

Transactions:
- 2024-01-20 | สมชาย | win | 450 | verified
- 2024-01-20 | สมหญิง | lose | -500 | verified
```

---

## 🎯 สรุปความสัมพันธ์

| ชีท | ได้รับจาก | ส่งไปยัง |
|-----|---------|---------|
| **RoundState** | Admin Command | Bets, BalanceCheckService |
| **Players** | Slip2Go Webhook | Transactions, UsersBalance, Bets |
| **Transactions** | Slip2Go, Results | UsersBalance |
| **Bets** | User Message | Results |
| **UsersBalance** | Players, Results | BalanceCheckService, Bets |
| **Results** | Bets | UsersBalance, Transactions |

---

## ✅ ตรวจสอบความสัมพันธ์

- ✅ RoundState ควบคุมการเล่น
- ✅ Players เป็นแหล่งข้อมูลผู้เล่น
- ✅ Transactions บันทึกรายการเงิน
- ✅ Bets บันทึกการเล่น
- ✅ UsersBalance ติดตามยอดเงิน
- ✅ Results บันทึกผลลัพธ์
- ✅ ทุกชีททำงานสัมพันธ์กัน

---

## 💡 หมายเหตุ

- ชีททั้งหมดเชื่อมต่อกันผ่าน UserID และ SlipName
- ข้อมูลไหลจากชีทหนึ่งไปยังอีกชีทหนึ่ง
- ทุกการเปลี่ยนแปลงบันทึกลงชีท
- ระบบตรวจสอบข้อมูลก่อนบันทึก
