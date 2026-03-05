# 📊 ระบบการแจ้งเตือน - ดึงข้อมูลจากไหน

## 🔄 ขั้นตอนการแจ้งเตือน

### ขั้นตอนที่ 1: ค้นหาคู่ (Matching)

```
ชีท Bets
  ↓
[bettingPairingService.getAllBets()]
  ↓
[bettingPairingService.findPairs()]
  ↓
pair = {
  bet1: { userId, displayName, amount, side, ... },
  bet2: { userId, displayName, amount, side, ... }
}
```

---

### ขั้นตอนที่ 2: คำนวณผลลัพธ์

```
pair
  ↓
[bettingPairingService.calculateResult()]
  ↓
result = {
  winner: {
    userId: bet1.userId หรือ bet2.userId,
    displayName: bet1.displayName หรือ bet2.displayName,
    ...
  },
  loser: {
    userId: bet1.userId หรือ bet2.userId,
    displayName: bet1.displayName หรือ bet2.displayName,
    ...
  }
}
```

---

### ขั้นตอนที่ 3: แจ้งเตือน

```
result
  ↓
[bettingResultService.notifyLineResult()]
  ├─ แจ้งเตือนผู้เล่น A (ผู้ชนะ)
  ├─ แจ้งเตือนผู้เล่น B (ผู้แพ้)
  └─ แจ้งเตือนกลุ่ม
```

---

## 📋 ตารางดึงข้อมูล

### 1️⃣ แจ้งเตือนกลุ่ม

| ข้อมูล | ดึงจาก | ตำแหน่ง | หมายเหตุ |
|--------|--------|--------|---------|
| groupId | handleCalculateCommand | source.groupId | ส่งมาจาก LINE webhook |
| slipName | handleCalculateCommand | parameter | ชื่อบั้งไฟ |
| score | handleCalculateCommand | parameter | คะแนนที่ออก |
| ข้อความ | buildResultMessage() | result object | สร้างจาก result |

**ฟังก์ชัน**: `notifyLineResult()` → `sendGroupMessage(groupId, resultMessage)`

---

### 2️⃣ แจ้งเตือนผู้เล่น A (ผู้ชนะ)

| ข้อมูล | ดึงจาก | ตำแหน่ง | หมายเหตุ |
|--------|--------|--------|---------|
| userId | result.winner.userId | calculateResult() | ✅ ดึงจาก bet1.userId หรือ bet2.userId |
| displayName | result.winner.displayName | calculateResult() | ชื่อผู้เล่น |
| slipName | handleCalculateCommand | parameter | ชื่อบั้งไฟ |
| score | handleCalculateCommand | parameter | คะแนนที่ออก |
| ข้อความ | buildWinnerMessage() | result object | สร้างจาก result |

**ฟังก์ชัน**: `notifyLineResult()` → `sendPrivateMessage(winner.userId, winnerMessage)`

---

### 3️⃣ แจ้งเตือนผู้เล่น B (ผู้แพ้)

| ข้อมูล | ดึงจาก | ตำแหน่ง | ปัจจุบัน | ต้องเปลี่ยน |
|--------|--------|--------|---------|-----------|
| userId | result.loser.userId | calculateResult() | ❌ ดึงจาก bet1.userId หรือ bet2.userId | ✅ ต้องเปลี่ยนมาดึงจาก Column R |
| displayName | result.loser.displayName | calculateResult() | ✅ ดึงจาก bet1.displayName หรือ bet2.displayName | ไม่เปลี่ยน |
| slipName | handleCalculateCommand | parameter | ✅ ชื่อบั้งไฟ | ไม่เปลี่ยน |
| score | handleCalculateCommand | parameter | ✅ คะแนนที่ออก | ไม่เปลี่ยน |
| ข้อความ | buildLoserMessage() | result object | ✅ สร้างจาก result | ไม่เปลี่ยน |

**ฟังก์ชัน**: `notifyLineResult()` → `sendPrivateMessage(loser.userId, loserMessage)`

---

## 🔍 ปัญหาปัจจุบัน

### ❌ ปัญหา: User B ID ดึงจาก bet object

```
result.loser.userId = bet1.userId หรือ bet2.userId
```

**ปัญหา:**
- bet object ดึงจาก pair ที่มาจากชีท Bets
- Column K (USER_B_ID) ว่างเปล่า
- ดังนั้น bet.userId อาจไม่ถูกต้อง

---

## ✅ วิธีแก้ไข

### ต้องเปลี่ยนให้ดึงจาก Column R แทน

**ขั้นตอน:**

1. **ดึงข้อมูลจากชีท Bets**
   ```
   ชีท Bets → Column R (Token B) = User B ID
   ```

2. **ส่งไปยัง calculateResult()**
   ```
   pair = {
     bet1: { userId, displayName, ... },
     bet2: { userId, displayName, ... }
   }
   ```

3. **ใช้ในการแจ้งเตือน**
   ```
   result.loser.userId = ดึงจาก Column R
   ```

---

## 📝 ไฟล์ที่ต้องแก้ไข

### 1. `services/betting/bettingPairingService.js`

**ฟังก์ชัน**: `getAllBets()` หรือ `parseRow()`

**ต้องแก้ไข:**
- ดึง User B ID จาก Column R (TOKEN_B) แทน Column K (USER_B_ID)

**ตัวอย่าง:**
```javascript
// ก่อนหน้า
userBId: row[10], // Column K

// ปัจจุบัน
userBId: row[17], // Column R (TOKEN_B)
```

### 2. `services/betting/bettingResultService.js`

**ฟังก์ชัน**: `notifyLineResult()`

**ปัจจุบัน:**
```javascript
if (loser.userId) {
  await notificationService.sendPrivateMessage(
    loser.userId,
    this.buildLoserMessage(loser, slipName, score, isDraw)
  );
}
```

**หลังแก้ไข:**
- ไม่ต้องเปลี่ยน (เพราะ loser.userId จะมาจาก Column R แล้ว)

---

## 🎯 สรุป

### ปัจจุบัน
```
ชีท Bets (Column K ว่างเปล่า)
  ↓
getAllBets() → userBId = undefined
  ↓
calculateResult() → loser.userId = undefined
  ↓
notifyLineResult() → ❌ ไม่สามารถส่งข้อความได้
```

### หลังแก้ไข
```
ชีท Bets (Column R = User B ID)
  ↓
getAllBets() → userBId = "Uc2a009fe53d51946657363bdbb7d1374"
  ↓
calculateResult() → loser.userId = "Uc2a009fe53d51946657363bdbb7d1374"
  ↓
notifyLineResult() → ✅ ส่งข้อความสำเร็จ
```

---

## 📌 หมายเหตุ

- **Column K (USER_B_ID)**: ว่างเปล่า (ไม่ใช้)
- **Column R (TOKEN_B)**: บันทึก User B ID
- ต้องแก้ไข `bettingPairingService.js` เพื่อดึง User B ID จาก Column R
- `bettingResultService.js` ไม่ต้องแก้ไข (เพราะจะได้ userId ที่ถูกต้องจาก bettingPairingService)
