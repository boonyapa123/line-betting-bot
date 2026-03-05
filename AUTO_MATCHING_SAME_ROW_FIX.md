# 🔧 แก้ไข: Auto Matching บันทึกข้อมูลในแถวเดียวกัน

## ❌ ปัญหาเดิม

### Logic ผิด
```
User A: "340-400 ล 300 แอด"
  ↓ recordBet() → บันทึก Row 2
  ↓ ค้นหาคู่
  ↓ User B: "340-400 ย 300 แอด"
  ↓ recordBet() → บันทึก Row 3 (ผิด!)
  ↓ updateRowWithUserB() → อัปเดต Row 2 ด้วยข้อมูล User B
```

**ผลลัพธ์**: 
- ❌ Row 2: User A + User B (ถูกต้อง)
- ❌ Row 3: User B (ไม่ใช้)
- ❌ Error 400: Range A:T ไม่รองรับ Column U

---

## ✅ วิธีแก้ไข

### Logic ใหม่
```
User A: "340-400 ล 300 แอด"
  ↓ ค้นหาคู่ (ก่อนบันทึก)
  ↓ ไม่พบคู่
  ↓ recordBet() → บันทึก Row 2 (User A)
  ↓ ส่งข้อความยืนยัน

User B: "340-400 ย 300 แอด"
  ↓ ค้นหาคู่ (ก่อนบันทึก)
  ↓ พบคู่ (Row 2)
  ↓ updateRowWithUserB() → อัปเดต Row 2 ด้วยข้อมูล User B (ไม่บันทึก Row 3)
  ↓ ส่งแจ้งเตือน
  ↓ ส่งข้อความยืนยัน
```

**ผลลัพธ์**: 
- ✅ Row 2: User A + User B (ถูกต้อง)
- ✅ ไม่มี Row 3 (ไม่ต้องบันทึก)
- ✅ ไม่มี Error 400

---

## 📝 การเปลี่ยนแปลง

### ก่อน (ผิด)
```javascript
// Step 1: บันทึก User A
const recordResult = await bettingPairingService.recordBet(...);

// Step 2: ค้นหาคู่
const matchedPair = PriceRangeMatchingService.findMatchForNewBet(...);

// Step 3: ถ้าพบคู่ ให้อัปเดต
if (matchedPair) {
  await bettingPairingService.updateRowWithUserB(...);
}
```

### หลัง (ถูกต้อง)
```javascript
// Step 1: ค้นหาคู่ (ก่อนบันทึก)
const matchedPair = PriceRangeMatchingService.findMatchForNewBet(...);

// Step 2: ถ้าพบคู่ ให้อัปเดตแถว User A
if (matchedPair) {
  await bettingPairingService.updateRowWithUserB(...);
  // ส่งแจ้งเตือน
  // ส่งข้อความยืนยัน
  return;
}

// Step 3: ไม่พบคู่ ให้บันทึก User A
const recordResult = await bettingPairingService.recordBet(...);
// ส่งข้อความยืนยัน
```

---

## 🔄 ขั้นตอนการทำงาน (ใหม่)

### Scenario 1: Auto Matching สำเร็จ

```
User A: "340-400 ล 300 แอด"
  ↓
[Step 1] ค้นหาคู่ → ไม่พบ
[Step 2] บันทึก Row 2 (User A)
[Step 3] ส่งข้อความยืนยัน
  ↓
  ชีท Bets:
  Row 2: [User A data] [ว่างเปล่า...] [ว่างเปล่า]

User B: "340-400 ย 300 แอด"
  ↓
[Step 1] ค้นหาคู่ → พบ Row 2
[Step 2] อัปเดต Row 2 ด้วยข้อมูล User B
[Step 3] ส่งแจ้งเตือน
[Step 4] ส่งข้อความยืนยัน
  ↓
  ชีท Bets:
  Row 2: [User A data] [User B data] [AUTO]
```

### Scenario 2: ไม่พบคู่

```
User A: "340-400 ล 300 แอด"
  ↓
[Step 1] ค้นหาคู่ → ไม่พบ
[Step 2] บันทึก Row 2 (User A)
[Step 3] ส่งข้อความยืนยัน
  ↓
  ชีท Bets:
  Row 2: [User A data] [ว่างเปล่า...] [ว่างเปล่า]
  ⏳ รอการจับคู่
```

---

## 📊 ตัวอย่างข้อมูลในชีท Bets

### ก่อนแก้ไข (ผิด)
```
Row 2: [User A] [ว่างเปล่า...] [ว่างเปล่า]
Row 3: [User B] [ว่างเปล่า...] [ว่างเปล่า]  ← ไม่ใช้
```

### หลังแก้ไข (ถูกต้อง)
```
Row 2: [User A] [User B] [AUTO]  ← ข้อมูลอยู่ในแถวเดียวกัน
```

---

## ✅ ผลลัพธ์ที่คาดหวัง

| ประเด็น | ก่อน | หลัง |
|--------|------|------|
| บันทึก User A | Row 2 | Row 2 ✅ |
| บันทึก User B | Row 3 ❌ | Row 2 (อัปเดต) ✅ |
| Error 400 | มี ❌ | ไม่มี ✅ |
| ข้อมูลในแถวเดียวกัน | ไม่ ❌ | ใช่ ✅ |
| MATCHED Auto Status | ไม่บันทึก ❌ | บันทึก ✅ |

---

## 🚀 ขั้นตอนทดสอบ

1. **เปิดรอบการเดิมพัน**
   ```
   Admin: ":เริ่ม แอด"
   ```

2. **ผู้เล่น A ส่งข้อความเดิมพัน**
   ```
   User A: "340-400 ล 300 แอด"
   ```
   - ✅ ค้นหาคู่ → ไม่พบ
   - ✅ บันทึก Row 2
   - ✅ ส่งข้อความยืนยัน

3. **ผู้เล่น B ส่งข้อความเดิมพัน**
   ```
   User B: "340-400 ย 300 แอด"
   ```
   - ✅ ค้นหาคู่ → พบ Row 2
   - ✅ อัปเดต Row 2 ด้วยข้อมูล User B
   - ✅ ส่งแจ้งเตือน
   - ✅ ส่งข้อความยืนยัน

4. **ตรวจสอบชีท Bets**
   - ✅ Row 2: User A + User B (ข้อมูลอยู่ในแถวเดียวกัน)
   - ✅ Column U: "AUTO" (สถานะการจับคู่)
   - ✅ ไม่มี Row 3

---

## 📌 สรุป

**ก่อนแก้ไข**: บันทึก User B ลงแถวใหม่ (Row 3) แล้วอัปเดต Row 2 → Error 400

**หลังแก้ไข**: ค้นหาคู่ก่อนบันทึก → ถ้าพบให้อัปเดต Row 2 โดยตรง → ไม่บันทึก Row 3 → ไม่มี Error

**ผลลัพธ์**: ✅ ข้อมูล User A + User B อยู่ในแถวเดียวกัน (เหมือนจับคู่ด้วย Reply)

