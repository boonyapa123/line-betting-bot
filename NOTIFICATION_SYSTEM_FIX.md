# 📝 การแก้ไข: ระบบการแจ้งเตือน - ดึง User B ID จาก Column R

## ✅ การเปลี่ยนแปลง

### ปัญหา
```
ระบบแจ้งเตือนผู้เล่น B ไม่สามารถส่งข้อความได้
เพราะ User B ID ดึงจาก Column K ที่ว่างเปล่า
```

### วิธีแก้ไข
```
ดึง User B ID จาก Column R (TOKEN_B) แทน Column K (USER_B_ID)
```

---

## 📊 ตารางการแจ้งเตือน

### 1️⃣ แจ้งเตือนกลุ่ม

| ข้อมูล | ดึงจาก | ตำแหน่ง | สถานะ |
|--------|--------|--------|-------|
| groupId | handleCalculateCommand | source.groupId | ✅ ถูกต้อง |
| slipName | handleCalculateCommand | parameter | ✅ ถูกต้อง |
| score | handleCalculateCommand | parameter | ✅ ถูกต้อง |
| ข้อความ | buildResultMessage() | result object | ✅ ถูกต้อง |

**ฟังก์ชัน**: `notifyLineResult()` → `sendGroupMessage()`

---

### 2️⃣ แจ้งเตือนผู้เล่น A (ผู้ชนะ)

| ข้อมูล | ดึงจาก | ตำแหน่ง | สถานะ |
|--------|--------|--------|-------|
| userId | result.winner.userId | calculateResult() | ✅ ถูกต้อง |
| displayName | result.winner.displayName | calculateResult() | ✅ ถูกต้อง |
| slipName | handleCalculateCommand | parameter | ✅ ถูกต้อง |
| score | handleCalculateCommand | parameter | ✅ ถูกต้อง |
| ข้อความ | buildWinnerMessage() | result object | ✅ ถูกต้อง |

**ฟังก์ชัน**: `notifyLineResult()` → `sendPrivateMessage(winner.userId)`

---

### 3️⃣ แจ้งเตือนผู้เล่น B (ผู้แพ้)

| ข้อมูล | ดึงจาก | ตำแหน่ง | ก่อนหน้า | ปัจจุบัน |
|--------|--------|--------|---------|---------|
| userId | result.loser.userId | calculateResult() | ❌ Column K (ว่าง) | ✅ Column R |
| displayName | result.loser.displayName | calculateResult() | ✅ ถูกต้อง | ✅ ถูกต้อง |
| slipName | handleCalculateCommand | parameter | ✅ ถูกต้อง | ✅ ถูกต้อง |
| score | handleCalculateCommand | parameter | ✅ ถูกต้อง | ✅ ถูกต้อง |
| ข้อความ | buildLoserMessage() | result object | ✅ ถูกต้อง | ✅ ถูกต้อง |

**ฟังก์ชัน**: `notifyLineResult()` → `sendPrivateMessage(loser.userId)`

---

## 🔧 ไฟล์ที่แก้ไข

### `services/betting/betsSheetColumns.js`

#### ฟังก์ชัน: `parseRow()`

**ก่อนหน้า:**
```javascript
userBId: row[this.COLUMNS.USER_B_ID], // Column K
```

**ปัจจุบัน:**
```javascript
userBId: row[this.COLUMNS.TOKEN_B], // ✅ Column R (TOKEN_B)
```

---

## 🔄 ขั้นตอนการแจ้งเตือน (ปัจจุบัน)

```
ชีท Bets
  ├─ Column B: User A ID
  ├─ Column C: ชื่อ User A
  ├─ Column L: ชื่อ User B
  └─ Column R: User B ID ← ✅ ดึงจากที่นี่
  ↓
[getAllBets()]
  ↓
[parseRow()]
  ├─ userId = Column B (User A ID)
  ├─ displayName = Column C (ชื่อ User A)
  ├─ userBName = Column L (ชื่อ User B)
  └─ userBId = Column R (User B ID) ← ✅ ดึงจากที่นี่
  ↓
[calculateResult()]
  ├─ winner.userId = bet1.userId หรือ bet2.userId
  └─ loser.userId = bet1.userId หรือ bet2.userId ← ✅ ได้ค่าที่ถูกต้อง
  ↓
[notifyLineResult()]
  ├─ sendPrivateMessage(winner.userId) ✅
  ├─ sendPrivateMessage(loser.userId) ✅
  └─ sendGroupMessage(groupId) ✅
```

---

## ✅ ตรวจสอบการแจ้งเตือน

### ก่อนหน้า
```
❌ แจ้งเตือนผู้เล่น B ล้มเหลว
   เพราะ loser.userId = undefined (Column K ว่างเปล่า)
```

### ปัจจุบัน
```
✅ แจ้งเตือนผู้เล่น B สำเร็จ
   เพราะ loser.userId = "Uc2a009fe53d51946657363bdbb7d1374" (Column R)
```

---

## 📌 สรุป

### ก่อนหน้า
- User B ID บันทึกที่ Column R
- parseRow() ดึงจาก Column K (ว่างเปล่า)
- ❌ แจ้งเตือนผู้เล่น B ล้มเหลว

### ปัจจุบัน
- User B ID บันทึกที่ Column R
- parseRow() ดึงจาก Column R ✅
- ✅ แจ้งเตือนผู้เล่น B สำเร็จ

---

## 💾 ไฟล์ที่เกี่ยวข้อง

- `services/betting/betsSheetColumns.js` - parseRow() ✅ แก้ไขแล้ว
- `services/betting/bettingPairingService.js` - getAllBets() (ใช้ parseRow)
- `services/betting/bettingResultService.js` - notifyLineResult() (ไม่ต้องแก้ไข)
