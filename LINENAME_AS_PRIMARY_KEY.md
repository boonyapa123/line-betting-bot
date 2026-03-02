# ปรับระบบให้ใช้ชื่อ LINE เป็นคีย์หลัก - LineName as Primary Key

## 📋 สรุปการเปลี่ยนแปลง

ระบบได้รับการปรับปรุงให้ใช้ **ชื่อ LINE (LineName)** เป็นคีย์หลักแทน **UserID** ในทุกชีท เพื่อให้ง่ายต่อการทำงาน

---

## 🔄 ไฟล์ที่ปรับปรุง

### 1. `services/betting/balanceCheckService.js`
**เปลี่ยนแปลง:**
- `checkBalance(lineName, requiredAmount)` - ใช้ lineName แทน userId
- `getUserBalance(lineName)` - ค้นหาจาก lineName
- `notifyInsufficientBalance(lineName, ...)` - ใช้ lineName
- `checkAndNotify(lineName, requiredAmount, userId)` - ใช้ lineName เป็นคีย์

### 2. `services/betting/bettingPairingService.js`
**เปลี่ยนแปลง:**
- `updateUserBalance(lineName, amount)` - ใช้ lineName แทน userId
- ค้นหา User จาก Column B (LineName) แทน Column A (UserID)

### 3. `services/betting/bettingRoundController.js`
**เปลี่ยนแปลง:**
- ส่ง `lineName` ไปยัง `balanceCheckService.checkAndNotify()`
- ส่ง `lineName` ไปยัง `updateUserBalance()` แทน `userId`

### 4. `scripts/update-usersbalance-schema.js` (ใหม่)
**ฟังก์ชัน:**
- ลบชีท UsersBalance เก่า
- สร้างชีท UsersBalance ใหม่
- เปลี่ยน Column A เป็น LineName (คีย์หลัก)

---

## 📊 Schema ใหม่

### ชีท UsersBalance (อัปเดต)

| Column | ข้อมูล | ประเภท |
|--------|--------|--------|
| A | LineName | String (คีย์หลัก) |
| B | DisplayName | String |
| C | Balance | Number |

**ตัวอย่าง:**
```
LineName | DisplayName | Balance
สมชาย | สมชาย | 1450
สมหญิง | สมหญิง | 500
สมศรี | สมศรี | 1450
```

---

## 🔄 ความสัมพันธ์ระหว่างชีท (อัปเดต)

### ก่อนหน้า (ใช้ UserID)
```
Players (UserID) → UsersBalance (UserID)
Bets (UserID) → UsersBalance (UserID)
Results (UserID) → UsersBalance (UserID)
```

### ปัจจุบัน (ใช้ LineName)
```
Players (LineName) → UsersBalance (LineName)
Bets (LineName) → UsersBalance (LineName)
Results (LineName) → UsersBalance (LineName)
```

---

## 🎯 ข้อดีของการใช้ LineName

1. **ง่ายต่อการติดตาม** - ชื่อ LINE ชัดเจนกว่า UserID
2. **ลดข้อผิดพลาด** - ไม่ต้องกังวล UserID ไม่ตรง
3. **ใช้งานง่าย** - ผู้ใช้เห็นชื่อ LINE ได้ทันที
4. **ลดความซับซ้อน** - ไม่ต้องแปลง UserID ↔ LineName

---

## 📝 ขั้นตอนการใช้งาน

### 1. อัปเดต UsersBalance Schema
```bash
npm run update:usersbalance
```

### 2. ตรวจสอบชีท UsersBalance
- Column A: LineName (คีย์หลัก)
- Column B: DisplayName
- Column C: Balance

### 3. ระบบจะใช้ LineName ในการ:
- ตรวจสอบยอดเงิน
- บันทึกการเล่น
- อัปเดตยอดเงิน
- ส่งข้อความแจ้งเตือน

---

## 🔍 ตัวอย่างการทำงาน

### ตัวอย่าง 1: ตรวจสอบยอดเงิน

**ก่อนหน้า:**
```javascript
balanceCheckService.checkBalance("U123", 500)
```

**ปัจจุบัน:**
```javascript
balanceCheckService.checkBalance("สมชาย", 500)
```

### ตัวอย่าง 2: อัปเดตยอดเงิน

**ก่อนหน้า:**
```javascript
bettingPairingService.updateUserBalance("U123", 450)
```

**ปัจจุบัน:**
```javascript
bettingPairingService.updateUserBalance("สมชาย", 450)
```

### ตัวอย่าง 3: ค้นหา User ในชีท

**ก่อนหน้า:**
```
ค้นหา Column A (UserID) = "U123"
```

**ปัจจุบัน:**
```
ค้นหา Column A (LineName) = "สมชาย"
```

---

## 📊 ตัวอย่างข้อมูลในชีท

### Players Sheet
```
UserID | LineName | Phone | Email | Balance | TotalDeposits | ...
U123 | สมชาย | 0812345678 | user@example.com | 1450 | 1000 | ...
U456 | สมหญิง | 0898765432 | user2@example.com | 500 | 1000 | ...
```

### UsersBalance Sheet (ใหม่)
```
LineName | DisplayName | Balance
สมชาย | สมชาย | 1450
สมหญิง | สมหญิง | 500
```

### Bets Sheet
```
Timestamp | UserID | DisplayName | LineName | Method | Side | Amount | SlipName | Status
2024-01-20 10:05 | U123 | สมชาย | สมชาย | 1 | ต | 500 | บั้งไฟ1 | OPEN
2024-01-20 10:06 | U456 | สมหญิง | สมหญิง | 1 | ล | 500 | บั้งไฟ1 | OPEN
```

### Results Sheet
```
Timestamp | SlipName | Score | Player1_ID | Player1_Name | Player1_LineName | ... | Winner_LineName | ...
2024-01-20 10:10 | บั้งไฟ1 | 50 | U123 | สมชาย | สมชาย | ... | สมชาย | ...
```

---

## ✅ ตรวจสอบการทำงาน

- ✅ ใช้ LineName เป็นคีย์หลักในทุกชีท
- ✅ ตรวจสอบยอดเงินจาก LineName
- ✅ บันทึกการเล่นด้วย LineName
- ✅ อัปเดตยอดเงินด้วย LineName
- ✅ ส่งข้อความแจ้งเตือนด้วย LineName

---

## 🎯 สรุป

ระบบปรับให้ใช้ **ชื่อ LINE (LineName)** เป็นคีย์หลักแทน **UserID** ในทุกชีท เพื่อให้ง่ายต่อการทำงาน

**ข้อดี:**
- ชัดเจนและง่ายต่อการติดตาม
- ลดข้อผิดพลาดจาก UserID ไม่ตรง
- ใช้งานง่ายสำหรับผู้ใช้

**ไฟล์ที่ปรับปรุง:**
- `balanceCheckService.js`
- `bettingPairingService.js`
- `bettingRoundController.js`
- `update-usersbalance-schema.js` (ใหม่)

---

## 📝 หมายเหตุ

- ชีท Players ยังคงเก็บ UserID เพื่อใช้ส่งข้อความ LINE
- ชีท Bets ยังคงเก็บ UserID เพื่อติดตามประวัติ
- ชีท Results ยังคงเก็บ UserID เพื่อติดตามประวัติ
- LineName ใช้เป็นคีย์หลักในการค้นหาและอัปเดตข้อมูล
