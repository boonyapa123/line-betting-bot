# 📊 การเชื่อมต่อ Google Sheets

## 🎯 ภาพรวม

ระบบจะบันทึกข้อมูลสลิปที่ตรวจสอบสำเร็จลง Google Sheets โดยอัตโนมัติ

## 🔄 Workflow

```
ผู้ใช้ส่งรูปภาพสลิป
    ↓
ตรวจสอบสลิป
    ↓
ตรวจสอบสำเร็จ?
    ├─ ใช่ → บันทึกลง Google Sheets ✅
    └─ ไม่ → ส่งข้อความ error ❌
```

## 📝 ขั้นตอนการตั้งค่า

### 1. สร้าง Google Sheets

1. ไปที่ [Google Sheets](https://sheets.google.com)
2. คลิก "สร้างสเปรดชีตใหม่"
3. ตั้งชื่อ เช่น "Slip Verification Records"
4. คัดลอก Sheet ID จาก URL

### 2. ตั้งค่า Google Service Account

#### ขั้นที่ 1: สร้าง Project
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. สร้าง Project ใหม่

#### ขั้นที่ 2: สร้าง Service Account
1. ไปที่ "APIs & Services" > "Credentials"
2. คลิก "Create Credentials" > "Service Account"
3. ตั้งชื่อ Service Account
4. คลิก "Create and Continue"

#### ขั้นที่ 3: สร้าง Key
1. ไปที่ Service Account ที่สร้าง
2. ไปที่ "Keys" tab
3. คลิก "Add Key" > "Create new key"
4. เลือก "JSON"
5. ดาวน์โหลด JSON file
6. บันทึกไว้เป็น `credentials.json`

#### ขั้นที่ 4: เปิดใช้งาน Google Sheets API
1. ไปที่ "APIs & Services" > "Library"
2. ค้นหา "Google Sheets API"
3. คลิก "Enable"

### 3. แชร์ Google Sheets

1. เปิด Google Sheets ที่สร้าง
2. คลิก "Share"
3. ใส่ email ของ Service Account
4. ให้สิทธิ "Editor"
5. คลิก "Share"

### 4. ตั้งค่า Environment Variables

```env
GOOGLE_SHEET_ID=<your-sheet-id>
GOOGLE_SERVICE_ACCOUNT_KEY=credentials.json
GOOGLE_WORKSHEET_NAME=Slip Verification
```

## 🔌 การเชื่อมต่อใน index.js

ระบบจะเชื่อมต่อ Google Sheets โดยอัตโนมัติ:

```javascript
// ใน start() function
const slipVerificationRouter = createLineSlipVerificationRouter(
  process.env.SLIP2GO_SECRET_KEY,
  process.env.LINE_SLIP_VERIFICATION_ACCESS_TOKEN,
  process.env.LINE_SLIP_VERIFICATION_CHANNEL_SECRET,
  googleAuth,              // ← Google Auth object
  GOOGLE_SHEET_ID          // ← Sheet ID
);
```

## 📊 โครงสร้าง Google Sheets

### Worksheet: "Slip Verification"

| Column | ชื่อ | ประเภท | ตัวอย่าง |
|--------|------|--------|---------|
| A | วันที่บันทึก | DateTime | 26/02/2025 14:30:45 |
| B | Reference ID | Text | 92887bd5-60d3-4744-9a98-b8574eaxxxxx |
| C | Transaction Ref | Text | 015073144041ATF00999 |
| D | จำนวนเงิน | Number | 1000 |
| E | วันที่โอน | DateTime | 2025-10-05T14:48:00.000Z |
| F | ชื่อผู้ส่ง | Text | สมชาย สลิปทูโก |
| G | บัญชีผู้ส่ง | Text | xxx-x-x9866-x |
| H | ธนาคารผู้ส่ง | Text | ธนาคารกสิกรไทย |
| I | ชื่อผู้รับ | Text | บริษัท สลิปทูโก จำกัด |
| J | บัญชีผู้รับ | Text | xxx-x-x5366-x |
| K | ธนาคารผู้รับ | Text | ธนาคารกสิกรไทย |
| L | สถานะ | Text | verified |

## 🎯 ฟังก์ชันของ SlipRecordingService

### 1. บันทึกข้อมูลสลิป

```javascript
const slipData = {
  referenceId: '92887bd5-60d3-4744-9a98-b8574eaxxxxx',
  transRef: '015073144041ATF00999',
  amount: 1000,
  dateTime: '2025-10-05T14:48:00.000Z',
  senderName: 'สมชาย สลิปทูโก',
  senderAccount: 'xxx-x-x9866-x',
  senderBank: 'ธนาคารกสิกรไทย',
  receiverName: 'บริษัท สลิปทูโก จำกัด',
  receiverAccount: 'xxx-x-x5366-x',
  receiverBank: 'ธนาคารกสิกรไทย',
  status: 'verified'
};

await recordingService.recordSlip(slipData);
```

### 2. ดึงข้อมูลสลิปทั้งหมด

```javascript
const allSlips = await recordingService.getAllSlips();
console.log(allSlips);
```

### 3. ค้นหาข้อมูลสลิป

```javascript
// ค้นหาตามชื่อผู้ส่ง
const results = await recordingService.searchSlips('senderName', 'สมชาย สลิปทูโก');

// ค้นหาตามจำนวนเงิน
const results = await recordingService.searchSlips('amount', '1000');
```

### 4. ตรวจสอบสลิปซ้ำ

```javascript
const isDuplicate = await recordingService.isSlipDuplicate('92887bd5-60d3-4744-9a98-b8574eaxxxxx');

if (isDuplicate) {
  console.log('สลิปซ้ำ');
} else {
  console.log('สลิปไม่ซ้ำ');
}
```

## 🔐 ความปลอดภัย

### ✅ ทำ
- เก็บ `credentials.json` ใน `.gitignore`
- เก็บ `GOOGLE_SHEET_ID` ใน `.env`
- ใช้ Service Account แทน Personal Account
- ให้สิทธิ "Editor" เท่านั้น

### ❌ อย่าทำ
- Commit `credentials.json` ไปยัง Git
- ใช้ Personal Account
- ให้สิทธิ "Owner"
- แชร์ credentials กับคนอื่น

## 🐛 Troubleshooting

### ปัญหา: ไม่สามารถเชื่อมต่อ Google Sheets

**สาเหตุ:**
- credentials.json ไม่ถูกต้อง
- Google Sheets API ไม่เปิดใช้งาน
- Service Account ไม่มีสิทธิ์

**วิธีแก้:**
```bash
# ตรวจสอบ credentials.json
cat credentials.json

# ตรวจสอบ GOOGLE_SHEET_ID
echo $GOOGLE_SHEET_ID

# ตรวจสอบ logs
tail -f logs/error.log
```

### ปัญหา: Worksheet ไม่ถูกสร้าง

**สาเหตุ:**
- Service Account ไม่มีสิทธิ์
- Google Sheets API ไม่เปิดใช้งาน

**วิธีแก้:**
1. ตรวจสอบสิทธิ์ของ Service Account
2. ตรวจสอบว่า Google Sheets API เปิดใช้งาน
3. ตรวจสอบ logs

### ปัญหา: ข้อมูลไม่ถูกบันทึก

**สาเหตุ:**
- Network error
- Service Account ไม่มีสิทธิ์
- Google Sheets API ไม่เปิดใช้งาน

**วิธีแก้:**
```bash
# ตรวจสอบ network
ping google.com

# ตรวจสอบ logs
tail -f logs/error.log

# ทดสอบ service
node test-slip-verification.js
```

## 📚 ตัวอย่างการใช้งาน

### ตัวอย่างที่ 1: บันทึกข้อมูลสลิปอัตโนมัติ

```javascript
// ใน lineSlipVerificationWebhook.js
if (verificationResult.success) {
  const slipData = verificationService.extractSlipData(verificationResult);
  
  if (recordingService) {
    const result = await recordingService.recordSlip(slipData);
    if (result.success) {
      console.log('✅ บันทึกลง Google Sheets สำเร็จ');
    }
  }
}
```

### ตัวอย่างที่ 2: ตรวจสอบสลิปซ้ำก่อนบันทึก

```javascript
const isDuplicate = await recordingService.isSlipDuplicate(slipData.referenceId);

if (isDuplicate) {
  console.log('⚠️  สลิปซ้ำ - ไม่บันทึก');
} else {
  await recordingService.recordSlip(slipData);
}
```

### ตัวอย่างที่ 3: ดึงข้อมูลสลิปตามวันที่

```javascript
const allSlips = await recordingService.getAllSlips();

// กรองข้อมูลตามวันที่
const today = new Date().toLocaleDateString('th-TH');
const todaySlips = allSlips.filter(slip => 
  slip['วันที่บันทึก'].includes(today)
);

console.log(`สลิปวันนี้: ${todaySlips.length} รายการ`);
```

### ตัวอย่างที่ 4: ดึงข้อมูลสลิปตามจำนวนเงิน

```javascript
const slips = await recordingService.searchSlips('amount', '1000');

console.log(`สลิปจำนวน 1000 บาท: ${slips.length} รายการ`);
slips.forEach(slip => {
  console.log(`- ${slip['ชื่อผู้ส่ง']} → ${slip['ชื่อผู้รับ']}`);
});
```

## 📞 ติดต่อสอบถาม

หากมีปัญหาหรือข้อสงสัย โปรดติดต่อทีม Support

---

**Last Updated:** February 26, 2025
**Version:** 1.0.0
