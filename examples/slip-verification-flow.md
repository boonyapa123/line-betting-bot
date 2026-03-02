# 📋 ตัวอย่างการไหลของการตรวจสอบสลิป

## 🔄 ขั้นตอนการตรวจสอบสลิป

### ขั้นตอนที่ 1: ผู้ใช้ส่งรูปภาพสลิป

```
ผู้ใช้ → ส่งรูปภาพสลิป → LINE OA (Account 3)
```

### ขั้นตอนที่ 2: ระบบดาวน์โหลดรูปภาพ

```javascript
const imageBuffer = await downloadLineImage(event.message.id, accessToken);
console.log(`✅ Downloaded (${imageBuffer.length} bytes)`);
```

### ขั้นตอนที่ 3: ส่งไปยัง Slip2Go API

```javascript
const checkCondition = {
  checkDuplicate: true,  // ตรวจสอบสลิปซ้ำ
  checkReceiver: [
    {
      accountType: '01004',
      accountNumber: 'XXXXX5901X'  // บัญชีที่ตั้งค่าไว้
    }
  ]
};

const verificationResult = await verificationService.verifySlipFromImage(
  imageBuffer,
  checkCondition
);
```

### ขั้นตอนที่ 4: ตรวจสอบ Response Code

```javascript
const code = verificationResult?.code;

console.log(`🔐 Slip2Go API Response Code: ${code}`);
console.log(`   Message: ${verificationService.getValidationMessage(verificationResult)}`);
```

---

## 📊 ตัวอย่างผลลัพธ์

### ✅ สลิปถูกต้อง (Code: 200000 หรือ 200200)

```javascript
{
  code: '200200',
  success: true,
  message: 'Slip verified successfully',
  data: {
    referenceId: '1d850070-d4c6-4cfa-8a7c-46b40b8918bb-9901',
    transRef: '2026030227nk4DEnoNH4T6PsU',
    amount: 100,
    dateTime: '2026-03-02T09:57:09+07:00',
    sender: {
      account: {
        name: 'นาง ลดาวัลย์ ว',
        bank: {
          account: 'xxxx-xx237-0'
        }
      },
      bank: {
        name: 'ธนาคารไทยพาณิชย์'
      }
    },
    receiver: {
      account: {
        name: 'น.ส.ชญาภา พ',
        bank: {
          account: 'XXXXX5901X'
        }
      },
      bank: {
        name: 'ธนาคารกรุงไทย'
      }
    }
  }
}
```

**การจัดการ:**
```javascript
if (verificationService.isVerified(verificationResult)) {
  // ✅ สลิปถูกต้อง
  // ✅ บัญชีตรงกัน
  // ✅ จำนวนเงินตรงกัน
  
  // บันทึกข้อมูล
  const slipData = verificationService.extractSlipData(verificationResult);
  // ... บันทึกลง Google Sheets
}
```

---

### ❌ สลิปซ้ำ (Code: 200100)

```javascript
{
  code: '200100',
  success: false,
  message: 'Duplicate slip detected',
  data: null
}
```

**การจัดการ:**
```javascript
if (verificationService.isDuplicate(verificationResult)) {
  console.log('❌ Duplicate slip detected');
  
  const errorMessage = `❌ ตรวจสอบสลิปไม่สำเร็จ\n\n` +
    `🚫 เหตุผล: สลิปซ้ำ (เคยบันทึกไปแล้ว)\n\n` +
    `📸 กรุณาส่งสลิปใหม่`;
  
  await sendLineMessageToUser(event.source.userId, errorMessage, accessToken);
}
```

---

### ❌ บัญชีไม่ตรงกัน (Code: 200300)

```javascript
{
  code: '200300',
  success: false,
  message: 'Receiver account does not match',
  data: null
}
```

**การจัดการ:**
```javascript
if (!verificationService.isReceiverMatched(verificationResult)) {
  console.log('❌ Receiver account not matched');
  
  const errorMessage = `❌ ตรวจสอบสลิปไม่สำเร็จ\n\n` +
    `🚫 เหตุผล: บัญชีผู้รับไม่ตรงกัน\n\n` +
    `📸 กรุณาส่งสลิปใหม่`;
  
  await sendLineMessageToUser(event.source.userId, errorMessage, accessToken);
}
```

---

### ❌ จำนวนเงินไม่ตรงกัน (Code: 200400)

```javascript
{
  code: '200400',
  success: false,
  message: 'Amount does not match',
  data: null
}
```

**การจัดการ:**
```javascript
if (!verificationService.isAmountMatched(verificationResult)) {
  console.log('❌ Amount not matched');
  
  const errorMessage = `❌ ตรวจสอบสลิปไม่สำเร็จ\n\n` +
    `🚫 เหตุผล: จำนวนเงินไม่ตรงกัน\n\n` +
    `📸 กรุณาส่งสลิปใหม่`;
  
  await sendLineMessageToUser(event.source.userId, errorMessage, accessToken);
}
```

---

## 🔍 ตัวอย่างการตรวจสอบแต่ละขั้นตอน

### 1. ตรวจสอบสลิปซ้ำ

```javascript
// ส่ง checkDuplicate: true ไปยัง Slip2Go API
const checkCondition = {
  checkDuplicate: true
};

// Slip2Go API จะตรวจสอบว่าสลิปนี้เคยบันทึกไปแล้วหรือไม่
// ถ้าซ้ำ → Code: 200100
// ถ้าไม่ซ้ำ → Code: 200000 หรือ 200200

if (verificationService.isDuplicate(verificationResult)) {
  console.log('❌ สลิปซ้ำ');
}
```

### 2. ตรวจสอบบัญชีตรงกันหรือไม่

```javascript
// ส่ง checkReceiver ไปยัง Slip2Go API
const checkCondition = {
  checkReceiver: [
    {
      accountType: '01004',
      accountNumber: 'XXXXX5901X'  // บัญชีที่ตั้งค่าไว้
    }
  ]
};

// Slip2Go API จะตรวจสอบว่าบัญชีผู้รับตรงกับบัญชีที่ตั้งค่าไว้หรือไม่
// ถ้าตรงกัน → Code: 200200
// ถ้าไม่ตรงกัน → Code: 200300
// ถ้าไม่ได้ตรวจสอบ → Code: 200000

if (!verificationService.isReceiverMatched(verificationResult)) {
  console.log('❌ บัญชีไม่ตรงกัน');
}
```

### 3. ตรวจสอบจำนวนเงิน

```javascript
// Slip2Go API จะตรวจสอบจำนวนเงินโดยอัตโนมัติ
// ถ้าจำนวนเงินตรงกัน → Code: 200000 หรือ 200200
// ถ้าจำนวนเงินไม่ตรงกัน → Code: 200400

if (!verificationService.isAmountMatched(verificationResult)) {
  console.log('❌ จำนวนเงินไม่ตรงกัน');
}
```

---

## 📝 ตัวอย่างโค้ดสมบูรณ์

```javascript
// ดาวน์โหลดรูปภาพ
const imageBuffer = await downloadLineImage(event.message.id, accessToken);

// ตั้งค่าการตรวจสอบ
const checkCondition = {
  checkDuplicate: true,
  checkReceiver: [
    {
      accountType: '01004',
      accountNumber: accountNumber
    }
  ]
};

// ส่งไปยัง Slip2Go API
const verificationResult = await verificationService.verifySlipFromImage(
  imageBuffer,
  checkCondition
);

// ตรวจสอบผลลัพธ์
const code = verificationResult?.code;
console.log(`🔐 Response Code: ${code}`);

// ตรวจสอบสลิปซ้ำ
if (verificationService.isDuplicate(verificationResult)) {
  console.log('❌ Duplicate slip detected');
  const errorMessage = `❌ ตรวจสอบสลิปไม่สำเร็จ\n\n🚫 เหตุผล: สลิปซ้ำ (เคยบันทึกไปแล้ว)\n\n📸 กรุณาส่งสลิปใหม่`;
  await sendLineMessageToUser(event.source.userId, errorMessage, accessToken);
  continue;
}

// ตรวจสอบบัญชีตรงกันหรือไม่
if (!verificationService.isReceiverMatched(verificationResult)) {
  console.log('❌ Receiver account not matched');
  const errorMessage = `❌ ตรวจสอบสลิปไม่สำเร็จ\n\n🚫 เหตุผล: บัญชีผู้รับไม่ตรงกัน\n\n📸 กรุณาส่งสลิปใหม่`;
  await sendLineMessageToUser(event.source.userId, errorMessage, accessToken);
  continue;
}

// ตรวจสอบจำนวนเงิน
if (!verificationService.isAmountMatched(verificationResult)) {
  console.log('❌ Amount not matched');
  const errorMessage = `❌ ตรวจสอบสลิปไม่สำเร็จ\n\n🚫 เหตุผล: จำนวนเงินไม่ตรงกัน\n\n📸 กรุณาส่งสลิปใหม่`;
  await sendLineMessageToUser(event.source.userId, errorMessage, accessToken);
  continue;
}

// ✅ ทั้งหมดตรวจสอบสำเร็จ บันทึกข้อมูล
console.log('✅ All validations passed');

const slipData = verificationService.extractSlipData(verificationResult);
const currentBalance = await getPlayerBalance(event.source.userId, lineUserName);

// บันทึกลง Google Sheets
await _recordTransactionToSheetFromSlip(
  googleAuth,
  GOOGLE_SHEET_ID,
  event.source.userId,
  lineUserName,
  accessToken,
  slipData,
  currentBalance
);

await _recordPlayerToSheetFromSlip(
  googleAuth,
  GOOGLE_SHEET_ID,
  event.source.userId,
  lineUserName,
  accessToken,
  verificationResult.data.amount
);

console.log('✅ Recorded to Google Sheets');
```

---

## 🎯 สรุป

ระบบตรวจสอบสลิปใหม่จะ:

1. ✅ ตรวจสอบสลิปซ้ำโดยอัตโนมัติ
2. ✅ ตรวจสอบบัญชีตรงกันหรือไม่โดยอัตโนมัติ
3. ✅ ตรวจสอบจำนวนเงินตรงกันหรือไม่โดยอัตโนมัติ
4. ✅ ส่งข้อความแจ้งเหตุผลหากตรวจสอบไม่สำเร็จ
5. ✅ บันทึกข้อมูลหากตรวจสอบสำเร็จ
