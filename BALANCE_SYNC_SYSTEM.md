# ระบบ Sync ยอดเงิน - Balance Synchronization System

## 🎯 ปัญหาปัจจุบัน

ชีท **Transactions** ไม่ได้ถูกใช้เพื่ออัปเดตยอดเงิน ทำให้:
1. ยอดเงินใน Players และ UsersBalance ไม่ตรงกัน
2. ไม่มีบันทึกการเปลี่ยนแปลงยอดเงิน
3. ไม่สามารถติดตามประวัติการเงินได้

---

## ✅ วิธีแก้ไข

### 1. ชีท Transactions ควรบันทึก:
- **Type: deposit** - เมื่อผู้เล่นส่งสลิป
- **Type: bet** - เมื่อผู้เล่นเล่น
- **Type: win** - เมื่อผู้เล่นชนะ
- **Type: lose** - เมื่อผู้เล่นแพ้

### 2. ชีท Players ควรอัปเดต:
- Balance = ยอดเงินปัจจุบัน
- TotalDeposits = ยอดเงินฝากทั้งหมด
- TotalWithdrawals = ยอดเงินถอนทั้งหมด

### 3. ชีท UsersBalance ควรอัปเดต:
- Balance = ยอดเงินปัจจุบัน (sync จาก Players)

---

## 🔄 ขั้นตอนการทำงาน

### Phase 1: ผู้เล่นส่งสลิป (Deposit)
```
1. Slip2Go Webhook ตรวจสอบสลิป
2. บันทึกลงชีท Transactions (Type: deposit)
3. อัปเดตชีท Players (Balance += Amount)
4. Sync ไปยังชีท UsersBalance
```

### Phase 2: ผู้เล่นเล่น (Bet)
```
1. ผู้เล่นส่งข้อความเล่น
2. ตรวจสอบยอดเงินจาก UsersBalance
3. บันทึกลงชีท Bets
4. บันทึกลงชีท Transactions (Type: bet)
5. อัปเดตชีท Players (Balance -= Amount)
6. Sync ไปยังชีท UsersBalance
```

### Phase 3: สรุปผล (Win/Lose)
```
1. Admin: :สรุป
2. คำนวณผลลัพธ์
3. บันทึกลงชีท Results
4. บันทึกลงชีท Transactions (Type: win/lose)
5. อัปเดตชีท Players (Balance += NetAmount)
6. Sync ไปยังชีท UsersBalance
```

---

## 📊 ตัวอย่างการทำงาน

### ตัวอย่าง: ผู้เล่น "สมชาย" เล่น 1 รอบ

#### Step 1: ส่งสลิป 1000 บาท
```
Transactions:
- Date: 2024-01-20
- LineName: สมชาย
- Type: deposit
- Amount: 1000
- Status: verified
- BalanceBefore: 0
- BalanceAfter: 1000

Players:
- LineName: สมชาย
- Balance: 1000 (0 + 1000)
- TotalDeposits: 1000

UsersBalance:
- DisplayName: สมชาย
- Balance: 1000 (sync จาก Players)
```

#### Step 2: เล่น 500 บาท
```
Bets:
- Timestamp: 2024-01-20 10:05
- LineName: สมชาย
- Side: ต
- Amount: 500
- SlipName: บั้งไฟ1
- Status: OPEN

Transactions:
- Date: 2024-01-20
- LineName: สมชาย
- Type: bet
- Amount: -500
- Status: verified
- BalanceBefore: 1000
- BalanceAfter: 500

Players:
- LineName: สมชาย
- Balance: 500 (1000 - 500)

UsersBalance:
- DisplayName: สมชาย
- Balance: 500 (sync จาก Players)
```

#### Step 3: ชนะ 450 บาท
```
Results:
- SlipName: บั้งไฟ1
- Winner_LineName: สมชาย
- Winner_NetAmount: 450

Transactions:
- Date: 2024-01-20
- LineName: สมชาย
- Type: win
- Amount: 450
- Status: verified
- BalanceBefore: 500
- BalanceAfter: 950

Players:
- LineName: สมชาย
- Balance: 950 (500 + 450)

UsersBalance:
- DisplayName: สมชาย
- Balance: 950 (sync จาก Players)
```

---

## 🛠️ Implementation

### ไฟล์ที่ต้องแก้ไข:

1. **services/betting/slip2GoImageVerificationService.js**
   - เพิ่มการบันทึก Transactions (Type: deposit)
   - อัปเดต Players Balance

2. **services/betting/bettingPairingService.js**
   - เพิ่มการบันทึก Transactions (Type: bet)
   - อัปเดต Players Balance

3. **services/betting/resultSettlementService.js**
   - เพิ่มการบันทึก Transactions (Type: win/lose)
   - อัปเดต Players Balance

4. **services/betting/balanceCheckService.js**
   - Sync UsersBalance จาก Players

---

## 📋 Transactions Sheet Structure

| Column | ข้อมูล | ตัวอย่าง |
|--------|--------|---------|
| Timestamp | วันเวลา | 2024-01-20T10:05:00Z |
| LineName | ชื่อ LINE | สมชาย |
| Type | ประเภท | deposit/bet/win/lose |
| Amount | จำนวนเงิน | 1000 |
| SlipID | ID สลิป | SLIP_123 |
| Reference | อ้างอิง | บั้งไฟ1 |
| Status | สถานะ | verified/pending |
| Description | รายละเอียด | ส่งสลิป/เล่น/ชนะ |
| BalanceBefore | ยอดเงินก่อน | 0 |
| BalanceAfter | ยอดเงินหลัง | 1000 |

---

## ✅ ตรวจสอบ

- [ ] Transactions บันทึกทุกการเปลี่ยนแปลงยอดเงิน
- [ ] Players Balance อัปเดตตามการเปลี่ยนแปลง
- [ ] UsersBalance Sync จาก Players
- [ ] ยอดเงินตรงกันทั้ง 3 ชีท
- [ ] ประวัติการเงินสมบูรณ์

