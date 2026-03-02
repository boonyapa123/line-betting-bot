# 🔐 ระบบตรวจสอบสลิปแบบครอบคลุม

## 📋 ภาพรวม

ระบบตรวจสอบสลิปใหม่ได้รับการปรับปรุงเพื่อตรวจสอบสลิปอย่างครอบคลุม โดยตรวจสอบ:

1. **สลิปซ้ำ (Duplicate Check)** - ตรวจสอบว่าสลิปนี้เคยบันทึกไปแล้วหรือไม่
2. **สลิปปลอม (Fake Check)** - ตรวจสอบความถูกต้องของข้อมูลสลิป
3. **บัญชีตรงกันหรือไม่ (Receiver Account Check)** - ตรวจสอบว่าบัญชีผู้รับตรงกับบัญชีที่คาดหวัง
4. **จำนวนเงิน (Amount Check)** - ตรวจสอบว่าจำนวนเงินตรงกับที่คาดหวัง
5. **วันที่ (Date Check)** - ตรวจสอบว่าวันที่โอนตรงกับที่คาดหวัง

---

## 🔧 บริการใหม่

### SlipValidationService

ไฟล์: `services/betting/slipValidationService.js`

#### Constructor
```javascript
const validationService = new SlipValidationService(
  googleAuth,      // Google Auth object
  googleSheetId,   // Google Sheet ID
  worksheetName    // Worksheet name (default: 'Slip Verification')
);
```

#### Method: validateSlip()
```javascript
const result = await validationService.validateSlip(slipData, options);
```

**Parameters:**
- `slipData` (Object) - ข้อมูลสลิปจาก Slip2Go API
  - `referenceId` - Reference ID ของสลิป
  - `transRef` - Transaction Reference
  - `amount` - จำนวนเงิน
  - `dateTime` - วันที่โอน
  - `senderName` - ชื่อผู้ส่ง
  - `senderAccount` - บัญชีผู้ส่ง
  - `senderBank` - ธนาคารผู้ส่ง
  - `receiverName` - ชื่อผู้รับ
  - `receiverAccount` - บัญชีผู้รับ
  - `receiverBank` - ธนาคารผู้รับ

- `options` (Object) - ตัวเลือกการตรวจสอบ
  - `expectedReceiverAccount` - บัญชีผู้รับที่คาดหวัง (optional)
  - `expectedAmount` - จำนวนเงินที่คาดหวัง (optional)
  - `expectedDate` - วันที่ที่คาดหวัง (optional)

**Returns:**
```javascript
{
  isValid: boolean,           // ผลการตรวจสอบโดยรวม
  errors: [],                 // ข้อผิดพลาด (ถ้า isValid = false)
  warnings: [],               // คำเตือน (ไม่ส่งผลต่อ isValid)
  checks: {
    isDuplicate: boolean,     // สลิปซ้ำหรือไม่
    isFake: boolean,          // สลิปปลอมหรือไม่
    isReceiverMatched: boolean, // บัญชีตรงกันหรือไม่
    isAmountValid: boolean,   // จำนวนเงินตรงกันหรือไม่
    isDateValid: boolean      // วันที่ตรงกันหรือไม่
  }
}
```

---

## 📝 ตัวอย่างการใช้งาน

### ตัวอย่าง 1: ตรวจสอบสลิปแบบพื้นฐาน

```javascript
const validationService = new SlipValidationService(googleAuth, GOOGLE_SHEET_ID);

const result = await validationService.validateSlip(slipData);

if (result.isValid) {
  console.log('✅ สลิปถูกต้อง');
  // บันทึกข้อมูล
} else {
  console.log('❌ สลิปไม่ถูกต้อง');
  result.errors.forEach(error => console.log(`• ${error}`));
}
```

### ตัวอย่าง 2: ตรวจสอบสลิปพร้อมตรวจสอบบัญชี

```javascript
const result = await validationService.validateSlip(slipData, {
  expectedReceiverAccount: 'XXXXX5901X'
});

if (!result.checks.isReceiverMatched) {
  console.log('❌ บัญชีไม่ตรงกัน');
}
```

### ตัวอย่าง 3: ตรวจสอบสลิปแบบครอบคลุม

```javascript
const result = await validationService.validateSlip(slipData, {
  expectedReceiverAccount: 'XXXXX5901X',
  expectedAmount: 100,
  expectedDate: '2026-03-02'
});

if (result.isValid) {
  console.log('✅ สลิปถูกต้องทั้งหมด');
} else {
  console.log('❌ พบข้อผิดพลาด:');
  result.errors.forEach(error => console.log(`• ${error}`));
}

if (result.warnings.length > 0) {
  console.log('⚠️  คำเตือน:');
  result.warnings.forEach(warning => console.log(`• ${warning}`));
}
```

---

## 🔍 รายละเอียดการตรวจสอบแต่ละประเภท

### 1. ตรวจสอบสลิปซ้ำ (Duplicate Check)

ตรวจสอบว่าสลิปนี้เคยบันทึกไปแล้วหรือไม่ โดยค้นหา:
- Reference ID เดียวกัน
- Transaction Reference เดียวกัน

**ผลลัพธ์:**
- ✅ ไม่ใช่สลิปซ้ำ
- ❌ สลิปซ้ำ - พบสลิปซ้ำ X รายการ

### 2. ตรวจสอบสลิปปลอม (Fake Check)

ตรวจสอบความถูกต้องของข้อมูลสลิป:
- ข้อมูลพื้นฐาน (Reference ID, Transaction Ref, ชื่อผู้ส่ง, ชื่อผู้รับ)
- จำนวนเงิน (ต้องมากกว่า 0)
- วันที่โอน (ต้องไม่เป็นวันในอนาคต)
- วันที่เก่า (ไม่ควรเกิน 30 วัน)

**ผลลัพธ์:**
- ✅ ไม่ใช่สลิปปลอม
- ❌ สลิปปลอม - เหตุผล

### 3. ตรวจสอบบัญชีตรงกันหรือไม่ (Receiver Account Check)

ตรวจสอบว่าบัญชีผู้รับตรงกับบัญชีที่คาดหวัง:
- ตรวจสอบบัญชีเต็ม
- ตรวจสอบเลขท้าย 4 หลัก

**ผลลัพธ์:**
- ✅ บัญชีตรงกัน
- ❌ บัญชีไม่ตรงกัน - คาดหวัง: X, ได้รับ: Y

### 4. ตรวจสอบจำนวนเงิน (Amount Check)

ตรวจสอบว่าจำนวนเงินตรงกับที่คาดหวัง

**ผลลัพธ์:**
- ✅ จำนวนเงินตรงกัน
- ⚠️  จำนวนเงินไม่ตรงกัน - คาดหวัง: X บาท, ได้รับ: Y บาท

### 5. ตรวจสอบวันที่ (Date Check)

ตรวจสอบว่าวันที่โอนตรงกับที่คาดหวัง

**ผลลัพธ์:**
- ✅ วันที่ตรงกัน
- ⚠️  วันที่ไม่ตรงกัน - คาดหวัง: X, ได้รับ: Y

---

## 🔄 การไหลของข้อมูล

```
ผู้ใช้ส่งสลิป
    ↓
ดาวน์โหลดรูปภาพจาก LINE
    ↓
ตรวจสอบกับ Slip2Go API
    ↓
สกัดข้อมูลสลิป
    ↓
ตรวจสอบแบบครอบคลุม (SlipValidationService)
    ├─ ตรวจสอบสลิปซ้ำ
    ├─ ตรวจสอบสลิปปลอม
    ├─ ตรวจสอบบัญชีตรงกันหรือไม่
    ├─ ตรวจสอบจำนวนเงิน
    └─ ตรวจสอบวันที่
    ↓
ถ้าตรวจสอบสำเร็จ → บันทึกข้อมูล
ถ้าตรวจสอบไม่สำเร็จ → ส่งข้อความแจ้งเหตุผล
```

---

## 📊 ตัวอย่างข้อความตอบกลับ

### ✅ ตรวจสอบสำเร็จ

```
✅ ได้รับยอดเงินแล้ว

📊 รายละเอียดสลิป:
━━━━━━━━━━━━━━━━━━━━━━
💰 จำนวนเงิน: 100 บาท
👤 ผู้ส่ง: นาง ลดาวัลย์ ว
👥 ผู้รับ: น.ส.ชญาภา พ
📅 วันที่: 2/3/2569 09:57:09
🔖 เลขอ้างอิง: 2026030227nk4DEnoNH4T6PsU
━━━━━━━━━━━━━━━━━━━━━━

ขอบคุณที่ใช้บริการ 🙏
```

### ❌ ตรวจสอบไม่สำเร็จ

```
❌ ตรวจสอบสลิปไม่สำเร็จ

🚫 เหตุผล:
• ❌ สลิปซ้ำ: พบสลิปซ้ำ 1 รายการ (Reference ID: 1d850070-d4c6-4cfa-8a7c-46b40b8918bb-9901)
• ❌ บัญชีไม่ตรงกัน: บัญชีไม่ตรงกัน (คาดหวัง: XXXXX5901X, ได้รับ: XXXXX5902X)

⚠️  คำเตือน:
• ⚠️  จำนวนเงินไม่ตรงกัน: จำนวนเงินไม่ตรงกัน (คาดหวัง: 100 บาท, ได้รับ: 150 บาท)

📸 กรุณาส่งสลิปใหม่
```

---

## 🔧 ตัวแปร Environment

เพิ่มตัวแปรต่อไปนี้ใน `.env`:

```env
# Slip Validation
SLIP_CHECK_DUPLICATE=true          # ตรวจสอบสลิปซ้ำ
SLIP_CHECK_RECEIVER=true           # ตรวจสอบบัญชีผู้รับ
SLIP_CHECK_AMOUNT=false            # ตรวจสอบจำนวนเงิน (optional)
SLIP_CHECK_DATE=false              # ตรวจสอบวันที่ (optional)
```

---

## 📝 ไฟล์ที่เกี่ยวข้อง

- `services/betting/slipValidationService.js` - บริการตรวจสอบสลิป
- `services/betting/slip2GoImageVerificationService.js` - บริการตรวจสอบสลิปจาก Slip2Go API
- `index.js` - ไฟล์หลักที่เรียกใช้บริการ
- `examples/slip-validation-example.js` - ตัวอย่างการใช้งาน

---

## 🚀 การใช้งาน

ระบบตรวจสอบสลิปใหม่จะทำงานโดยอัตโนมัติเมื่อผู้ใช้ส่งรูปภาพสลิป:

1. ระบบจะดาวน์โหลดรูปภาพจาก LINE
2. ตรวจสอบกับ Slip2Go API
3. ตรวจสอบแบบครอบคลุมโดยใช้ SlipValidationService
4. ถ้าตรวจสอบสำเร็จ → บันทึกข้อมูล
5. ถ้าตรวจสอบไม่สำเร็จ → ส่งข้อความแจ้งเหตุผล

---

## 💡 เคล็ดลับ

1. **ตรวจสอบบัญชี**: ตั้งค่า `SLIP_CHECK_RECEIVER=true` เพื่อตรวจสอบว่าบัญชีผู้รับตรงกับบัญชีที่คาดหวัง
2. **ตรวจสอบจำนวนเงิน**: ใช้ `expectedAmount` ในตัวเลือกการตรวจสอบ
3. **ตรวจสอบวันที่**: ใช้ `expectedDate` ในตัวเลือกการตรวจสอบ
4. **ข้อมูลสลิป**: ตรวจสอบให้แน่ใจว่าข้อมูลสลิปจาก Slip2Go API มีข้อมูลครบถ้วน

---

## 🐛 Troubleshooting

### ปัญหา: สลิปถูกปฏิเสธแม้ว่าถูกต้อง

**วิธีแก้:**
1. ตรวจสอบว่าข้อมูลสลิปครบถ้วน
2. ตรวจสอบว่าบัญชีผู้รับตรงกัน (ลบช่องว่างและตัวพิมพ์)
3. ตรวจสอบว่าวันที่ไม่เก่าเกิน 30 วัน

### ปัญหา: สลิปซ้ำถูกตรวจสอบไม่ถูกต้อง

**วิธีแก้:**
1. ตรวจสอบว่า Reference ID และ Transaction Ref ถูกต้อง
2. ตรวจสอบว่า Google Sheets มีข้อมูลสลิปเก่า

### ปัญหา: บัญชีไม่ตรงกัน

**วิธีแก้:**
1. ตรวจสอบว่าบัญชีผู้รับถูกต้อง
2. ลบช่องว่างและตัวพิมพ์ใหญ่/เล็ก
3. ตรวจสอบเลขท้าย 4 หลัก

---

## 📞 ติดต่อ

หากมีปัญหาหรือข้อเสนอแนะ โปรดติดต่อทีมพัฒนา
