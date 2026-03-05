# 📢 ปรับปรุงระบบแจ้งเตือนกลุ่ม

## ปัญหาปัจจุบัน

ตอนนี้ระบบส่งแจ้งเตือนผลแพ้ชนะได้แล้ว แต่:
- ✅ ส่งข้อความส่วนตัวให้ผู้เล่นทั้งสองฝั่ง
- ✅ ส่งข้อความเข้ากลุ่มที่ประกาศผล
- ❌ **ไม่ส่งเข้าไปในกลุ่มของผู้เล่นแต่ละคน**

## วิธีแก้ไข

### 1. เก็บข้อมูล Group ID ของผู้เล่นแต่ละคน

**ปัจจุบัน:** เก็บเพียง `groupId` เดียว (กลุ่มที่ประกาศผล)

```javascript
// ❌ เดิม
const groupId = row[16] || '';  // Q = Group ID (เพียงกลุ่มเดียว)
```

**ต้องแก้ไข:** เก็บ `groupId` ของผู้เล่น A และ B แยกกัน

```javascript
// ✅ แก้ไข
const groupIdA = row[16] || '';  // Q = Group ID ของผู้เล่น A
const groupIdB = row[?] || '';   // ต้องเพิ่มคอลัมน์สำหรับ Group ID ของผู้เล่น B
```

### 2. เพิ่มคอลัมน์ใหม่ในชีท Bets

| คอลัมน์ | ชื่อ | ใช้สำหรับ |
|--------|------|---------|
| Q | Group ID A | ID กลุ่มของผู้เล่น A |
| V | Group ID B | ID กลุ่มของผู้เล่น B (ใหม่) |

### 3. บันทึก Group ID เมื่อจับคู่

เมื่อจับคู่สำเร็จ ต้องบันทึก:
- Group ID ของผู้เล่น A (ที่ประกาศผล)
- Group ID ของผู้เล่น B (ที่ตอบรับ)

```javascript
// เมื่อจับคู่สำเร็จ
const groupIdA = source.groupId;  // กลุ่มที่ประกาศผล
const groupIdB = userBGroupId;    // กลุ่มของผู้เล่น B (ต้องดึงมา)
```

### 4. ส่งแจ้งเตือนเข้าไปในกลุ่มของผู้เล่นทั้งสองฝั่ง

```javascript
// ✅ ส่งเข้ากลุ่มของผู้เล่น A
if (groupIdA) {
  await sendLineMessageToGroup(groupIdA, resultMessage, userAToken);
}

// ✅ ส่งเข้ากลุ่มของผู้เล่น B
if (groupIdB) {
  await sendLineMessageToGroup(groupIdB, resultMessage, userBToken);
}
```

---

## ขั้นตอนการแก้ไข

### Step 1: เพิ่มคอลัมน์ใหม่ในชีท

- เพิ่มคอลัมน์ V: "Group ID B"
- อัปเดต `betsSheetColumns.js` เพื่อรองรับคอลัมน์ใหม่

### Step 2: บันทึก Group ID ของผู้เล่น B

เมื่อจับคู่สำเร็จ:
```javascript
// ดึง Group ID ของผู้เล่น B จากข้อมูลที่เก็บไว้
const userBGroupId = await getUserGroupId(userBId);

// บันทึกลงชีท
row[V] = userBGroupId;  // Column V
```

### Step 3: ส่งแจ้งเตือนเข้ากลุ่มทั้งสองฝั่ง

```javascript
// ส่งเข้ากลุ่มของผู้เล่น A
if (groupIdA) {
  console.log(`📢 Sending to group A: ${groupIdA}`);
  await sendLineMessageToGroup(groupIdA, resultMessage, userAToken);
}

// ส่งเข้ากลุ่มของผู้เล่น B
if (groupIdB) {
  console.log(`📢 Sending to group B: ${groupIdB}`);
  await sendLineMessageToGroup(groupIdB, resultMessage, userBToken);
}
```

---

## ตัวอย่างการทำงาน

### ก่อนแก้ไข:
```
ประกาศผล: 350-410 ฟ้า 370⛔️

📤 ส่งข้อความส่วนตัว:
  ✅ paa"BOY" (User A)
  ✅ 💓Noon💓 (User B)

📢 ส่งเข้ากลุ่ม:
  ✅ กลุ่มที่ประกาศผล (C4e522277480703e5eddbf658666ba6a9)
  ❌ กลุ่มของผู้เล่น B (ไม่ส่ง)
```

### หลังแก้ไข:
```
ประกาศผล: 350-410 ฟ้า 370⛔️

📤 ส่งข้อความส่วนตัว:
  ✅ paa"BOY" (User A)
  ✅ 💓Noon💓 (User B)

📢 ส่งเข้ากลุ่ม:
  ✅ กลุ่มของผู้เล่น A (C4e522277480703e5eddbf658666ba6a9)
  ✅ กลุ่มของผู้เล่น B (C1234567890abcdef1234567890abcdef)
```

---

## ไฟล์ที่ต้องแก้ไข

1. **`services/betting/betsSheetColumns.js`**
   - เพิ่มคอลัมน์ V: GROUP_ID_B

2. **`index.js`**
   - ดึง groupIdB จากแถว
   - ส่งแจ้งเตือนเข้ากลุ่มของผู้เล่น B

3. **`services/betting/bettingPairingService.js`**
   - บันทึก groupIdB เมื่อจับคู่สำเร็จ

---

## ข้อมูลที่ต้องเก็บ

### เมื่อบันทึกการเล่นครั้งแรก (User A):
```javascript
{
  groupId: 'C4e522277480703e5eddbf658666ba6a9',  // กลุ่มของผู้เล่น A
  // ... ข้อมูลอื่น
}
```

### เมื่อจับคู่สำเร็จ (User B):
```javascript
{
  groupIdB: 'C1234567890abcdef1234567890abcdef',  // กลุ่มของผู้เล่น B
  // ... ข้อมูลอื่น
}
```

---

## ตรวจสอบการทำงาน

```bash
# ตรวจสอบว่าบันทึก groupIdB หรือไม่
node verify-group-notifications.js

# ติดตามการส่งแจ้งเตือน
node trace-group-notifications.js
```
