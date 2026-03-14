# การทำงานปัจจุบันของระบบ

## 📋 ตัวอย่างการทำงาน: ไล่/360-400/20เป็ด

### 🔄 Flow ที่ 1: User A ส่งข้อความ

```
User A: ไล่/360-400/20เป็ด
         ↓
[BettingMessageParserService.parseMessage()]
         ↓
{
  slipName: "เป็ด",
  price: "360-400",
  sideCode: "ล",
  amount: 20
}
         ↓
[BetsSheetColumns.createRow()]
         ↓
บันทึกลงชีท Bets:
┌─────────────────────────────────────────┐
│ Column D: ไล่/360-400/20เป็ด             │
│ Column E: เป็ด ✅                        │
│ Column F: 360-400 ล                     │
│ Column G: 20                            │
│ Column L: (ว่าง)                        │
└─────────────────────────────────────────┘
```

---

### 🔄 Flow ที่ 2: User B Reply ข้อความ

```
User B: ไล่/360-400/20เป็ด (reply to User A)
         ↓
[ตรวจสอบ isReply = true]
         ↓
[ค้นหา pending bet ของ User A]
         ↓
[ดึงข้อมูล User A จากชีท]
         ↓
{
  slipName: "เป็ด",
  price: "360-400",
  sideCode: "ล",
  amount: 20
}
         ↓
[คำนวณฝั่งตรงข้าม: ล → ต]
         ↓
[สร้าง Price B: 360-400 ต]
         ↓
[สร้าง userBData]
{
  userId: "U789012",
  displayName: "💓Noon💓",
  sideCode: "ต",
  amount: 20,
  price: "360-400",
  priceB: "360-400 ต",
  slipName: "เป็ด" ✅ (ใช้ pendingBet.slipName)
}
         ↓
[BetsSheetColumns.updateRowWithUserB()]
         ↓
[แก้ไข slip name ถ้ามีรูปแบบ "ราคา ชื่อบั้งไฟ"]
         ↓
บันทึกลงชีท Bets (อัปเดตแถวเดิม):
┌─────────────────────────────────────────┐
│ Column D: ไล่/360-400/20เป็ด             │
│ Column E: เป็ด ✅ (ไม่เปลี่ยน)           │
│ Column F: 360-400 ล                     │
│ Column G: 20                            │
│ Column H: 20 (User B amount)            │
│ Column L: 💓Noon💓                       │
│ Column M: 360-400 ต                     │
│ Column U: AUTO                          │
└─────────────────────────────────────────┘
```

---

## ✅ ส่วนที่แก้ไขแล้ว

### 1. **getOppositeSide() Method** ✅
- เพิ่มเป็น static method ใน `BetsSheetColumns`
- ใช้ในการคำนวณฝั่งตรงข้าม

### 2. **Slip Name Preservation** ✅
- ใช้ `pendingBet.slipName` แทน `parsedBet.slipName` เมื่อ reply
- แก้ไข slip name ถ้ามีรูปแบบ "ราคา ชื่อบั้งไฟ" ใน `updateRowWithUserB()`

### 3. **Confirmation Messages** ✅
- ใช้ `pendingBet.slipName` ในข้อความยืนยัน (reply section)
- ใช้ `parsedBet.slipName` ในข้อความยืนยัน (direct method section)

---

## 📊 ตารางเปรียบเทียบ

| ขั้นตอน | ก่อนแก้ไข | หลังแก้ไข |
|--------|----------|----------|
| User A ส่ง | ✅ ถูก | ✅ ถูก |
| บันทึก User A | ✅ ถูก | ✅ ถูก |
| User B reply | ❌ Slip name เปลี่ยน | ✅ Slip name เหมือนเดิม |
| บันทึก User B | ❌ `360-400 เป็ด` | ✅ `เป็ด` |

---

## 🔍 ตัวอย่างการทำงาน (Detailed)

### User A: ไล่/360-400/20เป็ด

**Parse:**
```javascript
{
  success: true,
  method: 2,
  slipName: "เป็ด",      // ✅ ถูก
  price: "360-400",
  sideCode: "ล",
  amount: 20
}
```

**Sheet Row:**
```
D: ไล่/360-400/20เป็ด
E: เป็ด ✅
F: 360-400 ล
G: 20
```

---

### User B: ไล่/360-400/20เป็ด (reply)

**ระบบทำงาน:**
1. ตรวจสอบ isReply = true ✅
2. ค้นหา pending bet ✅
3. ดึง pendingBet.slipName = "เป็ด" ✅
4. สร้าง userBData.slipName = "เป็ด" ✅
5. เรียก updateRowWithUserB() ✅
6. แก้ไข slip name ถ้าจำเป็น ✅

**Sheet Row (Updated):**
```
D: ไล่/360-400/20เป็ด
E: เป็ด ✅ (ไม่เปลี่ยน)
F: 360-400 ล
G: 20
H: 20
L: 💓Noon💓
M: 360-400 ต
U: AUTO
```

---

## 🎯 สรุป

✅ **ระบบทำงานถูกต้องแล้ว:**
- Slip name ถูกถอดจากข้อความ
- Slip name ถูกบันทึกลงชีท
- เมื่อ User B reply ใช้ slip name เดียวกับ User A
- ไม่มีการเปลี่ยนแปลง slip name เมื่อจับคู่

✅ **ส่วนที่ได้รับการแก้ไข:**
1. เพิ่ม `getOppositeSide()` static method
2. ใช้ `pendingBet.slipName` ในส่วน reply
3. แก้ไข slip name ใน `updateRowWithUserB()` ถ้ามีรูปแบบผิด
