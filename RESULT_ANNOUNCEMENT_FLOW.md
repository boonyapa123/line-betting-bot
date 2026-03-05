# 📊 ขั้นตอนการประกาศผลแพ้ชนะ

## 🔄 ขั้นตอนการทำงาน

### Admin ส่งคำสั่ง `:สรุป แอด 340`

```
Admin: ":สรุป แอด 340"
  ↓
[Step 1] Parse Command
  - slipName: "แอด"
  - score: 340
  ↓
[Step 2] handleCalculateCommand()
  - เปลี่ยนสถานะเป็น CALCULATING
  - ดึงข้อมูลการเล่นทั้งหมด (getAllBets)
  - กรองเฉพาะการเล่นของบั้งไฟ "แอด"
  ↓
[Step 3] จับคู่การเล่น (findPairs)
  - ค้นหาคู่ที่จับคู่ได้ (status = 'MATCHED')
  ↓
[Step 4] คำนวณผลลัพธ์ (calculateResultWithFees)
  - ตรวจสอบว่าใครชนะ/แพ้
  - คำนวณค่าธรรมเนียม (10% ชนะ, 5% ออกกลาง)
  ↓
[Step 5] บันทึกผลลัพธ์ (recordResult)
  - ❌ ยังไม่ได้บันทึกลงชีท Bets
  ↓
[Step 6] อัปเดตยอดเงิน (updateUserBalance)
  - อัปเดตยอดเงินผู้ชนะ
  - อัปเดตยอดเงินผู้แพ้
  ↓
[Step 7] แจ้งเตือน LINE (notifyLineResult)
  - ส่งข้อความส่วนตัวให้ผู้ชนะ
  - ส่งข้อความส่วนตัวให้ผู้แพ้
  - ส่งข้อความเข้ากลุ่ม
  ↓
[Step 8] ล้างข้อมูล (clearRoundTransactions)
  - ล้างข้อมูลการเล่นของรอบนี้
  ↓
[Step 9] ปิดรอบ (closeRound)
  - เปลี่ยนสถานะเป็น CLOSED
```

---

## 📝 ข้อมูลที่บันทึก

### ตัวอย่าง: User A ชนะ, User B แพ้

```
User A: "340-400 ล 300 แอด"
User B: "340-400 ย 300 แอด"
Score: 340 (ออกในเกณฑ์ User A)
```

### ผลลัพธ์ที่คำนวณ

```javascript
result = {
  pair: { bet1: {...}, bet2: {...} },
  isDraw: false,
  winAmount: 300,
  fee: 30, // 10% ของ 300
  winner: {
    userId: "U51899d9b032327436b48ccb369a8505d",
    displayName: "ธา มือทอง",
    side: "ล",
    grossAmount: 300,
    netAmount: 270, // 300 - 30
    fee: 30,
    feeType: "WIN"
  },
  loser: {
    userId: "Uc2a009fe53d51946657363bdbb7d1374",
    displayName: "💓Noon💓",
    side: "ย",
    grossAmount: -300,
    netAmount: -300,
    fee: 0,
    feeType: "LOSE"
  }
}
```

---

## 🔍 ปัญหาที่พบ

### ❌ `recordResult()` ไม่ได้บันทึกลงชีท Bets

```javascript
async recordResult(result, slipName, score) {
  try {
    const { bet1, bet2 } = result.pair;

    const row = [
      new Date().toISOString(),
      slipName,
      score,
      bet1.userId,
      // ... (ข้อมูลอื่นๆ)
    ];

    // ❌ ไม่ได้บันทึก!
    // await this.sheets.spreadsheets.values.append({...})

    return { success: true };
  } catch (error) {
    console.error('Error recording result:', error);
    return { success: false, error: error.message };
  }
}
```

**ปัญหา**: 
- ไม่ได้บันทึกผลลัพธ์ลงชีท Bets
- ไม่ได้อัปเดต Column I, J, S, T ของแถวที่จับคู่ไปแล้ว

---

## 📊 ข้อมูลที่ควรบันทึก

### ชีท Bets - อัปเดตแถวที่จับคู่ไปแล้ว

```
Row 2 (User A + User B):
  Column I (ผลที่ออก): 340
  Column J (ผลแพ้ชนะ): ชนะ (User A)
  Column S (ผลลัพธ์ A): ชนะ 270 บาท
  Column T (ผลลัพธ์ B): แพ้ 300 บาท
```

### ตัวอย่างแถวสมบูรณ์

```
A: 05/03/2569 02:49:23
B: U51899d9b032327436b48ccb369a8505d
C: ธา มือทอง
D: 340-400 ล 300 แอด
E: แอด
F: ล
G: 300
H: 300
I: 340 (อัปเดต)
J: ชนะ (อัปเดต)
K: Uc2a009fe53d51946657363bdbb7d1374
L: 💓Noon💓
M: ย
N: (ว่างเปล่า)
O: (ว่างเปล่า)
P: (ว่างเปล่า)
Q: C4e522277480703e5eddbf658666ba6a9
R: (ว่างเปล่า)
S: ชนะ 270 บาท (อัปเดต)
T: แพ้ 300 บาท (อัปเดต)
U: AUTO
```

---

## 🔄 ขั้นตอนการบันทึก (ควรเป็น)

### Step 1: ค้นหาแถวที่จับคู่ไปแล้ว

```javascript
// ค้นหาแถวที่มี User A + User B
const matchedRow = allBets.find(bet => 
  bet.slipName === slipName &&
  bet.userBId && // มี User B
  bet.matchedAuto === 'AUTO' // จับคู่อัตโนมัติ
);
```

### Step 2: อัปเดตผลลัพธ์

```javascript
// อัปเดตแถวด้วยผลลัพธ์
const updatedRow = {
  ...matchedRow,
  result: score, // Column I
  resultWinLose: isDraw ? 'เสมอ' : 'ชนะ/แพ้', // Column J
  resultA: winner.displayName === matchedRow.displayName 
    ? `ชนะ ${winner.netAmount} บาท`
    : `แพ้ ${Math.abs(loser.netAmount)} บาท`, // Column S
  resultB: loser.displayName === matchedRow.userBName
    ? `แพ้ ${Math.abs(loser.netAmount)} บาท`
    : `ชนะ ${winner.netAmount} บาท` // Column T
};

// บันทึกลงชีท
await sheets.update(matchedRow.rowIndex, updatedRow);
```

---

## 📋 ตัวอย่างการประกาศผล

### ตัวอย่างที่ 1: ชนะ-แพ้

```
Admin: ":สรุป แอด 340"

ผลลัพธ์:
- User A (ล 300): ชนะ 270 บาท (หัก 10%)
- User B (ย 300): แพ้ 300 บาท

ข้อความแจ้งเตือน:
- User A: "🎉 ยินดีด้วย! คุณชนะ\nเดิมพัน: 300 บาท\nหัก: 30 บาท (10%)\nได้รับ: 270 บาท"
- User B: "😔 เสียใจด้วย คุณแพ้\nเดิมพัน: 300 บาท"
- Group: "📊 ผลการเล่น บั้งไฟ: แอด\nคะแนนที่ออก: 340\n🏆 ชนะ: ธา มือทอง\n❌ แพ้: 💓Noon💓"
```

### ตัวอย่างที่ 2: ออกกลาง

```
Admin: ":สรุป แอด 370"

ผลลัพธ์:
- User A (ล 340-400): ออกกลาง หัก 15 บาท (5%)
- User B (ย 340-400): ออกกลาง หัก 15 บาท (5%)

ข้อความแจ้งเตือน:
- User A: "🤝 ออกกลาง\nเดิมพัน: 300 บาท\nหัก: 15 บาท (5%)"
- User B: "🤝 ออกกลาง\nเดิมพัน: 300 บาท\nหัก: 15 บาท (5%)"
- Group: "📊 ผลการเล่น บั้งไฟ: แอด\nคะแนนที่ออก: 370\n🤝 ออกกลาง"
```

---

## ✅ สิ่งที่ทำแล้ว

- ✅ Parse คำสั่ง `:สรุป`
- ✅ ค้นหาการเล่นของบั้งไฟ
- ✅ จับคู่การเล่น
- ✅ คำนวณผลลัพธ์และค่าธรรมเนียม
- ✅ อัปเดตยอดเงิน
- ✅ แจ้งเตือน LINE

## ❌ สิ่งที่ยังไม่ได้ทำ

- ❌ บันทึกผลลัพธ์ลงชีท Bets (Column I, J, S, T)
- ❌ บันทึกผลลัพธ์ลงชีท Results (ถ้ามี)

---

## 📌 สรุป

**ปัจจุบัน**: ระบบประกาศผลแพ้ชนะ แต่ **ไม่ได้บันทึกผลลัพธ์ลงชีท Bets**

**ต้องแก้ไข**: 
1. อัปเดต Column I (ผลที่ออก)
2. อัปเดต Column J (ผลแพ้ชนะ)
3. อัปเดต Column S (ผลลัพธ์ A)
4. อัปเดต Column T (ผลลัพธ์ B)

