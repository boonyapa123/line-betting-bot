# 📝 การปรับเปลี่ยน: บันทึก User B ID ที่คอลัมน์ R

## 🔄 การเปลี่ยนแปลง

### ก่อนหน้า (Old)
```
User B ID บันทึกที่: Column K (USER_B_ID)
```

### ปัจจุบัน (New)
```
User B ID บันทึกที่: Column R (TOKEN_B)
```

---

## 📊 ตารางเปรียบเทียบ

| ขั้นตอน | คอลัมน์ | ก่อนหน้า | ปัจจุบัน | หมายเหตุ |
|--------|--------|---------|---------|---------|
| User A บันทึก | K | (ว่างเปล่า) | (ว่างเปล่า) | ไม่เปลี่ยน |
| User B จับคู่ | K | User B ID | (ว่างเปล่า) | ❌ ไม่บันทึก |
| User B จับคู่ | R | (ว่างเปล่า) | User B ID | ✅ บันทึก |

---

## 🎯 ตัวอย่างการบันทึก

### ตัวอย่าง: Direct Method 1

```
User A: "ชล 500 ฟ้าหลังฝน"
User B: "ชถ 300 ฟ้าหลังฝน"
```

#### Step 1: User A บันทึก

```
Row 2:
  A: 05/03/2569 10:30:00
  B: U51899d9b032327436b48ccb369a8505d
  C: ธา มือทอง
  D: ชล 500 ฟ้าหลังฝน
  E: ฟ้าหลังฝน
  F: ชล
  G: 500
  K: (ว่างเปล่า)
  R: (ว่างเปล่า)
```

#### Step 2: User B จับคู่ (ปัจจุบัน)

```
Row 2 (อัปเดต):
  K: (ว่างเปล่า) ← ไม่บันทึก
  L: 💓Noon💓
  M: ชถ
  R: Uc2a009fe53d51946657363bdbb7d1374 ← บันทึก User B ID ที่นี่
  U: AUTO
```

---

## 📝 ไฟล์ที่แก้ไข

### 1. `services/betting/betsSheetColumns.js`

#### ฟังก์ชัน: `updateRowWithUserB()`

**ก่อนหน้า:**
```javascript
if (userBData.userId) row[this.COLUMNS.USER_B_ID] = userBData.userId;
if (userBData.tokenB) row[this.COLUMNS.TOKEN_B] = userBData.tokenB;
```

**ปัจจุบัน:**
```javascript
// ✅ บันทึก User B ID ที่คอลัมน์ R (TOKEN_B) แทนคอลัมน์ K (USER_B_ID)
if (userBData.userId) row[this.COLUMNS.TOKEN_B] = userBData.userId;
```

#### ฟังก์ชัน: `parseRow()`

**ก่อนหน้า:**
```javascript
userBId: row[this.COLUMNS.USER_B_ID],
```

**ปัจจุบัน:**
```javascript
userBId: row[this.COLUMNS.TOKEN_B], // ✅ ดึง User B ID จาก Column R (TOKEN_B) แทน Column K
```

---

## 🔍 ตรวจสอบการบันทึก

### ✅ ตรวจสอบ: User B จับคู่สำเร็จ

```
H: มีค่า (ยอดเงิน User B)
L: มีค่า (ชื่อ User B)
M: มีค่า (ฝั่ง User B)
R: มีค่า (User B ID) ← ตรวจสอบที่นี่
U: AUTO
```

---

## 📌 สรุป

### ก่อนหน้า
- User B ID บันทึกที่ Column K
- Column R ว่างเปล่า

### ปัจจุบัน
- User B ID บันทึกที่ Column R
- Column K ว่างเปล่า
- ทั้งการจับคู่ Auto และ Reply ใช้วิธีเดียวกัน

---

## 💾 ไฟล์ที่เกี่ยวข้อง

- `services/betting/betsSheetColumns.js` - updateRowWithUserB(), parseRow()
- `services/betting/bettingPairingService.js` - ใช้ betsSheetColumns.updateRowWithUserB()
- `services/betting/bettingResultService.js` - ใช้ Column L ในการค้นหา (ไม่ต้องปรับ)
