# 🔐 การตั้งค่าระบบตรวจสอบสลิป

## 📋 ภาพรวม

ระบบตรวจสอบสลิปจะดึงข้อมูลบัญชีผู้รับจาก **environment variable** (`.env`) เพื่อตรวจสอบกับสลิป

---

## 🔧 ตัวแปร Environment

### Slip2Go Configuration

```env
# Slip2Go API
SLIP2GO_SECRET_KEY=your_secret_key
SLIP2GO_API_URL=https://api.slip2go.com
```

### Slip Verification Bank Accounts

```env
# บัญชีผู้รับสำหรับตรวจสอบสลิป (ตั้งค่าบัญชีจริงที่ต้องการตรวจสอบ)
SLIP_RECEIVER_ACCOUNT_1=XXXXX5901X    # Account 1 (Primary)
SLIP_RECEIVER_ACCOUNT_2=XXXXX5902X    # Account 2 (Secondary)
SLIP_RECEIVER_ACCOUNT_3=XXXXX5903X    # Account 3 (Slip Verification)
```

---

## 📝 ตัวอย่าง `.env`

```env
# LINE Accounts
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_access_token
LINE_CHANNEL_ID=your_channel_id

LINE_CHANNEL_SECRET_2=your_channel_secret_2
LINE_CHANNEL_ACCESS_TOKEN_2=your_access_token_2
LINE_CHANNEL_ID_2=your_channel_id_2

LINE_CHANNEL_SECRET_3=your_channel_secret_3
LINE_CHANNEL_ACCESS_TOKEN_3=your_access_token_3
LINE_CHANNEL_ID_3=your_channel_id_3

# Google Sheets
GOOGLE_SHEET_ID=your_sheet_id

# Slip2Go API
SLIP2GO_SECRET_KEY=your_slip2go_secret_key
SLIP2GO_API_URL=https://api.slip2go.com

# Slip Verification Bank Accounts
SLIP_RECEIVER_ACCOUNT_1=XXXXX5901X
SLIP_RECEIVER_ACCOUNT_2=XXXXX5902X
SLIP_RECEIVER_ACCOUNT_3=XXXXX5903X
```

---

## 🔄 การไหลของข้อมูล

```
ผู้ใช้ส่งสลิป
    ↓
ระบบดึงบัญชีผู้รับจาก environment variable
    ↓
ส่งไปยัง Slip2Go API พร้อม checkCondition:
  - checkDuplicate: true
  - checkReceiver: [{ accountType, accountNumber }]
    ↓
Slip2Go API ตรวจสอบ:
  1. สลิปซ้ำหรือไม่
  2. บัญชีผู้รับตรงกับบัญชีที่ตั้งค่าไว้หรือไม่
    ↓
ได้รับ Response Code:
  - 200000 = ✅ สลิปถูกต้อง
  - 200200 = ✅ สลิปถูกต้อง + บัญชีตรงกัน
  - 200100 = ❌ สลิปซ้ำ
  - 200300 = ❌ บัญชีไม่ตรงกัน
    ↓
ถ้า 200000 หรือ 200200 → บันทึกข้อมูล
ถ้า 200100 หรือ 200300 → ปฏิเสธและแจ้งเหตุผล
```

---

## 📊 ตัวอย่างการตรวจสอบ

### ✅ สลิปถูกต้อง + บัญชีตรงกัน (Code: 200200)

```
ผู้ใช้ส่งสลิป
    ↓
ระบบดึงบัญชี: XXXXX5901X (จาก SLIP_RECEIVER_ACCOUNT_1)
    ↓
ส่งไปยัง Slip2Go API:
  - checkDuplicate: true
  - checkReceiver: [{ accountType: '01004', accountNumber: 'XXXXX5901X' }]
    ↓
Slip2Go API ตรวจสอบ:
  - สลิปไม่ซ้ำ ✅
  - บัญชีผู้รับตรงกัน ✅
    ↓
Response Code: 200200
    ↓
✅ บันทึกข้อมูล
```

### ❌ บัญชีไม่ตรงกัน (Code: 200300)

```
ผู้ใช้ส่งสลิป
    ↓
ระบบดึงบัญชี: XXXXX5901X (จาก SLIP_RECEIVER_ACCOUNT_1)
    ↓
ส่งไปยัง Slip2Go API:
  - checkDuplicate: true
  - checkReceiver: [{ accountType: '01004', accountNumber: 'XXXXX5901X' }]
    ↓
Slip2Go API ตรวจสอบ:
  - สลิปไม่ซ้ำ ✅
  - บัญชีผู้รับไม่ตรงกัน ❌ (สลิปโอนไปบัญชี XXXXX5902X)
    ↓
Response Code: 200300
    ↓
❌ ปฏิเสธและแจ้ง "บัญชีผู้รับไม่ตรงกัน"
```

---

## 🔍 วิธีการตั้งค่า

### ขั้นตอนที่ 1: ดึงบัญชีจาก Slip2Go

1. เข้าไปที่ Slip2Go Dashboard
2. ค้นหาบัญชีที่ต้องการตรวจสอบ
3. คัดลอกเลขบัญชี (เช่น: XXXXX5901X)

### ขั้นตอนที่ 2: ตั้งค่า `.env`

```env
# ตั้งค่าบัญชีสำหรับแต่ละ Account
SLIP_RECEIVER_ACCOUNT_1=XXXXX5901X    # Account 1
SLIP_RECEIVER_ACCOUNT_2=XXXXX5902X    # Account 2
SLIP_RECEIVER_ACCOUNT_3=XXXXX5903X    # Account 3
```

### ขั้นตอนที่ 3: รีสตาร์ท Server

```bash
npm start
```

---

## ✅ ตรวจสอบการตั้งค่า

### ตรวจสอบจากบันทึก

เมื่อผู้ใช้ส่งสลิป ให้ดูบันทึกว่า:

```
💳 Receiver account: XXXXX5901X
📤 Sending request to Slip2Go API...
Payload: {
  checkDuplicate: true,
  checkReceiver: [
    {
      accountType: '01004',
      accountNumber: 'XXXXX5901X'
    }
  ]
}
```

---

## 🐛 Troubleshooting

### ปัญหา: บัญชีไม่ตรงกัน

**วิธีแก้:**
1. ตรวจสอบว่า `SLIP_RECEIVER_ACCOUNT_X` ถูกตั้งค่าถูกต้อง
2. ตรวจสอบว่าบัญชีตรงกับบัญชีใน Slip2Go
3. ตรวจสอบว่าไม่มีช่องว่างหรือตัวอักษรพิเศษ

### ปัญหา: ระบบไม่ดึงบัญชี

**วิธีแก้:**
1. ตรวจสอบว่า `.env` มีตัวแปร `SLIP_RECEIVER_ACCOUNT_X`
2. ตรวจสอบว่า Server ได้รีสตาร์ทแล้ว
3. ตรวจสอบบันทึกว่า `Receiver account:` แสดงค่าอะไร

---

## 📞 ติดต่อ

หากมีปัญหาหรือข้อเสนอแนะ โปรดติดต่อทีมพัฒนา
