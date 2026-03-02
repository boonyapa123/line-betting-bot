# 🔐 ระบบตรวจสอบสลิป - ดึงข้อมูลบัญชีจาก Slip2Go

## 📋 ภาพรวม

ระบบตรวจสอบสลิปตอนนี้จะ **ดึงข้อมูลบัญชีจาก Slip2Go API** แทนการใช้ environment variable

---

## 🔄 การไหลของข้อมูล

```
ผู้ใช้ส่งสลิป
    ↓
ระบบเรียก Slip2Go API เพื่อดึงข้อมูลบัญชี
    ↓
Slip2Go API ส่งคืนข้อมูลบัญชีทั้งหมด
    ↓
ระบบเลือกบัญชีแรก (หรือตามเงื่อนไข)
    ↓
ส่งไปยัง Slip2Go API เพื่อตรวจสอบสลิป พร้อม checkCondition:
  - checkDuplicate: true
  - checkReceiver: [{ accountType, accountNumber }]
    ↓
Slip2Go API ตรวจสอบ:
  1. สลิปซ้ำหรือไม่
  2. บัญชีผู้รับตรงกับบัญชีที่ดึงมาหรือไม่
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

## 🔧 Slip2GoAccountService

ไฟล์: `services/betting/slip2GoAccountService.js`

### Constructor
```javascript
const accountService = new Slip2GoAccountService(
  slip2GoSecretKey,
  slip2GoApiUrl
);
```

### Methods

#### 1. getAccounts()
ดึงข้อมูลบัญชีทั้งหมด

```javascript
const accounts = await accountService.getAccounts();
// ผลลัพธ์:
// [
//   {
//     accountNumber: 'XXXXX5901X',
//     name: 'บริษัท ABC จำกัด',
//     bank: 'ธนาคารกรุงไทย',
//     accountType: '01004',
//     status: 'active'
//   },
//   ...
// ]
```

#### 2. getAccountsByType(accountType)
ดึงข้อมูลบัญชีตามประเภท

```javascript
const accounts = await accountService.getAccountsByType('01004');
```

#### 3. getAccountByNumber(accountNumber)
ดึงข้อมูลบัญชีตามเลขบัญชี

```javascript
const account = await accountService.getAccountByNumber('XXXXX5901X');
// ผลลัพธ์:
// {
//   accountNumber: 'XXXXX5901X',
//   name: 'บริษัท ABC จำกัด',
//   bank: 'ธนาคารกรุงไทย',
//   accountType: '01004',
//   status: 'active'
// }
```

#### 4. getAccountsMap()
ดึงข้อมูลบัญชีทั้งหมดและจัดเรียง

```javascript
const accountMap = await accountService.getAccountsMap();
// ผลลัพธ์:
// {
//   'XXXXX5901X': { ... },
//   'XXXXX5902X': { ... },
//   ...
// }
```

#### 5. accountExists(accountNumber)
ตรวจสอบว่าบัญชีมีอยู่หรือไม่

```javascript
const exists = await accountService.accountExists('XXXXX5901X');
// ผลลัพธ์: true หรือ false
```

#### 6. validateAccountFromSlip(accountNumber, slipData)
ตรวจสอบว่าบัญชีตรงกับสลิปหรือไม่

```javascript
const result = await accountService.validateAccountFromSlip(
  'XXXXX5901X',
  slipData
);
// ผลลัพธ์:
// {
//   isMatched: true,
//   account: { ... },
//   slipData: { ... },
//   message: 'Account matched'
// }
```

---

## 📊 ตัวอย่างการใช้งาน

### ตัวอย่าง 1: ดึงข้อมูลบัญชีและตรวจสอบสลิป

```javascript
const Slip2GoAccountService = require('./services/betting/slip2GoAccountService');
const Slip2GoImageVerificationService = require('./services/betting/slip2GoImageVerificationService');

const accountService = new Slip2GoAccountService(
  process.env.SLIP2GO_SECRET_KEY,
  process.env.SLIP2GO_API_URL
);

const verificationService = new Slip2GoImageVerificationService(
  process.env.SLIP2GO_SECRET_KEY,
  process.env.SLIP2GO_API_URL
);

// ดึงข้อมูลบัญชี
const accounts = await accountService.getAccounts();
const receiverAccount = accounts[0].accountNumber;

console.log(`💳 Using receiver account: ${receiverAccount}`);

// ตรวจสอบสลิป
const checkCondition = {
  checkDuplicate: true,
  checkReceiver: [
    {
      accountType: '01004',
      accountNumber: receiverAccount
    }
  ]
};

const verificationResult = await verificationService.verifySlipFromImage(
  imageBuffer,
  checkCondition
);

// ตรวจสอบผลลัพธ์
if (verificationService.isVerified(verificationResult)) {
  console.log('✅ สลิปถูกต้อง');
  // บันทึกข้อมูล
} else {
  console.log('❌ สลิปไม่ถูกต้อง');
}
```

### ตัวอย่าง 2: ตรวจสอบบัญชีจากสลิป

```javascript
// ดึงข้อมูลบัญชี
const accounts = await accountService.getAccounts();

// ตรวจสอบแต่ละบัญชี
for (const account of accounts) {
  const result = await accountService.validateAccountFromSlip(
    account.accountNumber,
    slipData
  );
  
  if (result.isMatched) {
    console.log(`✅ บัญชี ${account.accountNumber} ตรงกับสลิป`);
    break;
  }
}
```

---

## 🔧 ตัวแปร Environment

```env
# Slip2Go API
SLIP2GO_SECRET_KEY=your_secret_key
SLIP2GO_API_URL=https://api.slip2go.com
```

---

## 📝 ไฟล์ที่เกี่ยวข้อง

- `services/betting/slip2GoAccountService.js` - บริการดึงข้อมูลบัญชี
- `services/betting/slip2GoImageVerificationService.js` - บริการตรวจสอบสลิป
- `index.js` - ไฟล์หลักที่เรียกใช้บริการ

---

## 🚀 การใช้งาน

ระบบตรวจสอบสลิปใหม่จะทำงานโดยอัตโนมัติเมื่อผู้ใช้ส่งรูปภาพสลิป:

1. ระบบจะดาวน์โหลดรูปภาพจาก LINE
2. เรียก Slip2Go API เพื่อดึงข้อมูลบัญชี
3. ส่งไปยัง Slip2Go API เพื่อตรวจสอบสลิป
4. Slip2Go API ตรวจสอบ:
   - สลิปซ้ำหรือไม่
   - บัญชีตรงกันหรือไม่
5. ถ้าตรวจสอบสำเร็จ → บันทึกข้อมูล
6. ถ้าตรวจสอบไม่สำเร็จ → ปฏิเสธและแจ้งเหตุผล

---

## ✅ ตรวจสอบการตั้งค่า

### ตรวจสอบจากบันทึก

เมื่อผู้ใช้ส่งสลิป ให้ดูบันทึกว่า:

```
📋 Fetching receiver accounts from Slip2Go...
🔍 Fetching accounts from Slip2Go API...
   ✅ Response received: [...]
   ✅ Using receiver account: XXXXX5901X
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

### ปัญหา: ไม่สามารถดึงข้อมูลบัญชี

**วิธีแก้:**
1. ตรวจสอบว่า `SLIP2GO_SECRET_KEY` ถูกต้อง
2. ตรวจสอบว่า `SLIP2GO_API_URL` ถูกต้อง
3. ตรวจสอบว่า Slip2Go API ทำงานปกติ

### ปัญหา: บัญชีไม่ตรงกัน

**วิธีแก้:**
1. ตรวจสอบว่าบัญชีใน Slip2Go ถูกต้อง
2. ตรวจสอบว่าสลิปโอนไปบัญชีที่ถูกต้อง
3. ตรวจสอบบันทึกว่าบัญชีไหนถูกใช้

---

## 📞 ติดต่อ

หากมีปัญหาหรือข้อเสนอแนะ โปรดติดต่อทีมพัฒนา
