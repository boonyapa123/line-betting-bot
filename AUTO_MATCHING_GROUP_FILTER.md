# 🎯 การแก้ไขการจับคู่อัตโนมัติ - กรองตามกลุ่ม

## 📝 สรุปการเปลี่ยนแปลง

ระบบจับคู่อัตโนมัติได้รับการแก้ไขให้ **ค้นหาคู่เฉพาะในกลุ่มเดียวกัน** เท่านั้น

---

## 🔧 ไฟล์ที่แก้ไข

### 1. `services/betting/bettingPairingService.js`

**เพิ่มฟังก์ชันใหม่:**
```javascript
/**
 * ดึงข้อมูลการเล่นจากกลุ่มเฉพาะ
 * @param {string} groupId - ID ของกลุ่ม
 * @returns {array} ข้อมูลการเล่นในกลุ่มนั้น
 */
async getBetsByGroupId(groupId) {
  try {
    const allBets = await this.getAllBets();
    // กรองเฉพาะข้อมูลที่มี groupId ตรงกัน
    return allBets.filter(bet => bet.groupId === groupId);
  } catch (error) {
    console.error('Error getting bets by group ID:', error);
    return [];
  }
}
```

**ประโยชน์:**
- ✅ ดึงข้อมูลการเล่นเฉพาะในกลุ่มที่ระบุ
- ✅ ป้องกันการจับคู่ข้ามกลุ่ม
- ✅ ทำให้การจับคู่แม่นยำขึ้น

---

### 2. `services/betting/bettingRoundController.js`

**เปลี่ยนแปลง:**
```javascript
// ❌ เดิม
const allBets = await bettingPairingService.getAllBets();
const matchedPair = PriceRangeMatchingService.findMatchForNewBet(parsedBet, allBets);

// ✅ ใหม่
const groupBets = await bettingPairingService.getBetsByGroupId(source.groupId || '');
const matchedPair = PriceRangeMatchingService.findMatchForNewBet(parsedBet, groupBets);
```

**ประโยชน์:**
- ✅ ค้นหาคู่เฉพาะในกลุ่มเดียวกัน
- ✅ ป้องกันการจับคู่ข้ามกลุ่ม
- ✅ ทำให้ระบบทำงานถูกต้องตามที่ต้องการ

---

## 📊 ตัวอย่างการทำงาน

### ตัวอย่างที่ 1: จับคู่ในกลุ่มเดียวกัน ✅

```
กลุ่ม A:
  User A: "320-340 ล 100 คำไผ่"
  User B: "320-340 ย 100 คำไผ่"
  ↓
  ✅ จับคู่สำเร็จ (ทั้งคู่อยู่ในกลุ่ม A)

กลุ่ม B:
  User C: "320-340 ล 100 คำไผ่"
  ↓
  ⏳ รอการจับคู่ (ยังไม่มีคู่ในกลุ่ม B)
```

### ตัวอย่างที่ 2: ไม่จับคู่ข้ามกลุ่ม ❌

```
กลุ่ม A:
  User A: "320-340 ล 100 คำไผ่"

กลุ่ม B:
  User B: "320-340 ย 100 คำไผ่"
  ↓
  ❌ ไม่จับคู่ (ต่างกลุ่ม)
  ⏳ User B รอการจับคู่ในกลุ่ม B
```

---

## 🔍 เงื่อนไขการจับคู่ (อัปเดต)

1. ✅ ชื่อบั้งไฟเดียวกัน
2. ✅ ฝั่งตรงข้าม (ล ↔ ย)
3. ✅ ราคาเดียวกัน (สำหรับ Method 2)
4. ✅ ยอดเงินสามารถต่างกันได้ (ใช้ยอดน้อยกว่า)
5. ✅ **อยู่ในกลุ่มเดียวกัน (groupId ตรงกัน)** ← ใหม่
6. ✅ ยังไม่มีคู่ (status ≠ MATCHED)
7. ✅ ข้อความเป็น Direct (ไม่ใช่ Reply)

---

## 🚀 ขั้นตอนการทดสอบ

1. **สร้างกลุ่ม A และกลุ่ม B**

2. **ในกลุ่ม A:**
   ```
   Admin: ":เริ่ม คำไผ่"
   User A: "320-340 ล 100 คำไผ่"
   User B: "320-340 ย 100 คำไผ่"
   ```
   - ✅ ควรจับคู่สำเร็จ

3. **ในกลุ่ม B:**
   ```
   Admin: ":เริ่ม คำไผ่"
   User C: "320-340 ล 100 คำไผ่"
   User D: "320-340 ย 100 คำไผ่"
   ```
   - ✅ ควรจับคู่สำเร็จ (เฉพาะในกลุ่ม B)

4. **ตรวจสอบว่าไม่จับคู่ข้ามกลุ่ม**
   - ✅ User A (กลุ่ม A) ไม่ควรจับคู่กับ User D (กลุ่ม B)

---

## 📌 หมายเหตุ

- ระบบจะค้นหาคู่เฉพาะในกลุ่มเดียวกัน (groupId ตรงกัน)
- ถ้า groupId ว่างเปล่า ระบบจะค้นหาจากข้อมูลที่มี groupId ว่างเปล่าด้วย
- ระบบยังคงใช้ยอดเงินน้อยกว่าของทั้งสองฝั่ง
- ส่งแจ้งเตือนไปยัง LINE (ส่วนตัวและกลุ่ม)

