# 📊 Betting System - Google Sheets Configuration

## ✅ ตั้งค่าแล้ว

ระบบของคุณได้ตั้งค่าให้ใช้ Google Sheets ตามที่คุณระบุ:

```
GOOGLE_SHEET_ID=1rRVKOpYZbOFpRiZ2ym5b5AFcB4e_swQe8y9y9UlhDAQ
GOOGLE_SERVICE_ACCOUNT_KEY=credentials.json
GOOGLE_WORKSHEET_NAME=Bets
```

---

## 📋 โครงสร้าง Google Sheets

### Sheet 1: **Bets** (ชีทหลักสำหรับบันทึกการเล่น)

ระบบจะบันทึกการเล่นทั้งหมดลงที่ชีทนี้

**Headers (แถวที่ 1):**
```
A: Timestamp
B: UserID
C: DisplayName
D: Method
E: Price
F: Side
G: Amount
H: SlipName
I: Status
```

**ตัวอย่างข้อมูล:**
```
2024-03-02T10:30:00Z | U001 | Alice | 1 | | ชล | 500 | ฟ้าหลังฝน | OPEN
2024-03-02T10:31:00Z | U002 | Bob   | 1 | | ชถ | 500 | ฟ้าหลังฝน | OPEN
```

### Sheet 2: **RoundState** (สถานะรอบการเล่น)

ระบบจะเก็บสถานะรอบปัจจุบัน

**Headers (แถวที่ 1):**
```
A: State
B: RoundID
C: StartTime
D: SlipName
```

**ตัวอย่างข้อมูล:**
```
OPEN | ROUND_1709443800000 | 2024-03-02T10:30:00Z | ฟ้าหลังฝน
```

### Sheet 3: **UsersBalance** (ยอดเงินคงเหลือ)

ระบบจะเก็บยอดเงินของแต่ละ User

**Headers (แถวที่ 1):**
```
A: UserID
B: DisplayName
C: Balance
```

**ตัวอย่างข้อมูล:**
```
U001 | Alice | 1500
U002 | Bob   | 500
```

---

## 🔄 ขั้นตอนการบันทึกข้อมูล

### 1. User ส่งข้อความเล่น
```
User: ฟ้าหลังฝน ชล. 500
```

### 2. ระบบ Parse ข้อความ
```javascript
{
  method: 1,
  slipName: "ฟ้าหลังฝน",
  side: "ชล",
  amount: 500
}
```

### 3. ระบบบันทึกลงชีท "Bets"
```
Timestamp: 2024-03-02T10:30:00Z
UserID: U001
DisplayName: Alice
Method: 1
Price: (ว่าง)
Side: ชล
Amount: 500
SlipName: ฟ้าหลังฝน
Status: OPEN
```

### 4. ระบบส่งข้อความยืนยัน
```
Bot: ✅ บันทึกการเล่นสำเร็จ
     ชื่อ: Alice
     บั้งไฟ: ฟ้าหลังฝน
     ฝั่ง: ไล่
     จำนวนเงิน: 500 บาท
```

---

## 📝 ตัวอย่างข้อมูลที่บันทึก

### วิธีที่ 1 (ราคาช่าง)
```
User: ฟ้าหลังฝน ชล. 500

บันทึกลงชีท:
Timestamp | UserID | DisplayName | Method | Price | Side | Amount | SlipName | Status
2024-03-02T10:30:00Z | U001 | Alice | 1 | | ชล | 500 | ฟ้าหลังฝน | OPEN
```

### วิธีที่ 2 (ราคาคะแนน)
```
User: 0/3(300-330) ล. 500 ฟ้าหลังฝน

บันทึกลงชีท:
Timestamp | UserID | DisplayName | Method | Price | Side | Amount | SlipName | Status
2024-03-02T10:31:00Z | U002 | Bob | 2 | 0/3(300-330) | ล | 500 | ฟ้าหลังฝน | OPEN
```

---

## 🔐 Permissions

ตรวจสอบว่า Service Account มี access ถึง Google Sheets:

1. ไปที่ Google Sheets
2. คลิก "Share"
3. ใส่ email จาก Service Account (ใน credentials.json)
4. ให้ **Editor** access

---

## 🧪 ทดสอบการบันทึก

### ทดสอบด้วย API
```bash
curl -X POST http://localhost:3001/api/betting/admin/start \
  -H "Content-Type: application/json" \
  -d '{"slipName": "ฟ้าหลังฝน"}'
```

### ตรวจสอบชีท "Bets"
1. ไปที่ Google Sheets
2. เปิดชีท "Bets"
3. ตรวจสอบว่ามีข้อมูลใหม่หรือไม่

---

## 🔧 Troubleshooting

### ❌ "Spreadsheet not found"
- ตรวจสอบ `GOOGLE_SHEET_ID` ถูกต้องหรือไม่
- ตรวจสอบว่า Service Account มี access

### ❌ "Sheet 'Bets' not found"
- ตรวจสอบว่าชีท "Bets" มีอยู่ในชีทนี้
- ตรวจสอบ `GOOGLE_WORKSHEET_NAME` ถูกต้องหรือไม่

### ❌ "credentials.json not found"
- ตรวจสอบว่า credentials.json อยู่ในโฟลเดอร์ root
- ตรวจสอบ `GOOGLE_SERVICE_ACCOUNT_KEY` ถูกต้องหรือไม่

### ❌ "Permission denied"
- ตรวจสอบว่า Service Account มี Editor access
- ตรวจสอบว่า Google Sheets API เปิดใช้งาน

---

## 📊 ตัวอย่างการทำงาน

### Scenario: รอบการเล่นเดียว

```
1. Admin: :เริ่ม ฟ้าหลังฝน
   → RoundState: OPEN | ROUND_xxx | 2024-03-02T10:30:00Z | ฟ้าหลังฝน

2. Alice: ฟ้าหลังฝน ชล. 500
   → Bets: 2024-03-02T10:30:00Z | U001 | Alice | 1 | | ชล | 500 | ฟ้าหลังฝน | OPEN

3. Bob: ฟ้าหลังฝน ชถ. 500
   → Bets: 2024-03-02T10:31:00Z | U002 | Bob | 1 | | ชถ | 500 | ฟ้าหลังฝน | OPEN

4. Admin: :หยุด
   → RoundState: CLOSED

5. Admin: :สรุป ฟ้าหลังฝน 315
   → UsersBalance: U001 | Alice | 1500
   → UsersBalance: U002 | Bob | 500
   → Bets: ล้างข้อมูล
```

---

## 📈 ข้อมูลที่บันทึก

### ต่อการเล่นหนึ่งครั้ง
- Timestamp
- User ID
- Display Name
- Method (1 หรือ 2)
- Price (วิธีที่ 2 เท่านั้น)
- Side (ชล/ชถ/ล/ย)
- Amount
- Slip Name
- Status

### ต่อรอบการเล่น
- Round ID
- Start Time
- Slip Name
- State (OPEN/CLOSED/CALCULATING)

### ต่อ User
- User ID
- Display Name
- Balance

---

## 🎯 Best Practices

1. **Backup ข้อมูล**
   - ทำ backup ของ Google Sheets เป็นประจำ
   - ใช้ Google Sheets version history

2. **Monitor ข้อมูล**
   - ตรวจสอบชีท "Bets" เป็นประจำ
   - ตรวจสอบ "UsersBalance" เพื่อความถูกต้อง

3. **Clean Up**
   - ล้างข้อมูลเก่าเป็นประจำ
   - Archive ข้อมูลรายเดือน

4. **Security**
   - ไม่ share credentials.json
   - ใช้ Service Account แทน personal account
   - ตรวจสอบ permissions เป็นประจำ

---

## 📞 Support

หากมีปัญหา:
1. ตรวจสอบ Google Sheets ID
2. ตรวจสอบ credentials.json
3. ตรวจสอบ sheet names
4. ดู logs & error messages

---

**Last Updated:** 2024-03-02
**Status:** ✅ Configured & Ready
