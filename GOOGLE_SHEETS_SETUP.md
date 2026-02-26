# 📊 การตั้งค่า Google Sheets สำหรับบันทึกข้อมูลสลิป

## 📋 ภาพรวม

ระบบจะบันทึกข้อมูลสลิปที่ตรวจสอบสำเร็จลง Google Sheets โดยอัตโนมัติ

## 🔧 ขั้นตอนการตั้งค่า

### 1. สร้าง Google Sheets

1. ไปที่ [Google Sheets](https://sheets.google.com)
2. คลิก "สร้างสเปรดชีตใหม่"
3. ตั้งชื่อ เช่น "Slip Verification Records"
4. คัดลอก Sheet ID จาก URL:
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
   ```

### 2. ตั้งค่า Google Service Account

#### ขั้นที่ 1: สร้าง Service Account
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. สร้าง Project ใหม่
3. ไปที่ "APIs & Services" > "Credentials"
4. คลิก "Create Credentials" > "Service Account"
5. ตั้งชื่อ Service Account
6. คลิก "Create and Continue"

#### ขั้นที่ 2: สร้าง Key
1. ไปที่ Service Account ที่สร้าง
2. ไปที่ "Keys" tab
3. คลิก "Add Key" > "Create new key"
4. เลือก "JSON"
5. ดาวน์โหลด JSON file
6. บันทึกไว้เป็น `credentials.json` ในโปรเจกต์

#### ขั้นที่ 3: เปิดใช้งาน Google Sheets API
1. ไปที่ "APIs & Services" > "Library"
2. ค้นหา "Google Sheets API"
3. คลิก "Enable"

### 3. แชร์ Google Sheets กับ Service Account

1. เปิด Google Sheets ที่สร้าง
2. คลิก "Share"
3. ใส่ email ของ Service Account (จาก JSON file)
4. ให้สิทธิ "Editor"
5. คลิก "Share"

### 4. ตั้งค่า Environment Variables

ในไฟล์ `.env`:

```env
# Google Sheets Configuration
GOOGLE_SHEET_ID=<your-sheet-id>
GOOGLE_SERVICE_ACCOUNT_KEY=credentials.json
GOOGLE_WORKSHEET_NAME=Slip Verification
```

### 5. ตรวจสอบ credentials.json

ไฟล์ `credentials.json` ควรมีลักษณะดังนี้:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "service-account@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

## 📊 โครงสร้าง Google Sheets

ระบบจะสร้าง Worksheet ชื่อ "Slip Verification" โดยอัตโนมัติ พร้อม Header ดังนี้:

| Column | ชื่อ | ตัวอย่าง |
|--------|------|---------|
| A | วันที่บันทึก | 26/02/2025 14:30:45 |
| B | Reference ID | 92887bd5-60d3-4744-9a98-b8574eaxxxxx |
| C | Transaction Ref | 015073144041ATF00999 |
| D | จำนวนเงิน | 1000 |
| E | วันที่โอน | 2025-10-05T14:48:00.000Z |
| F | ชื่อผู้ส่ง | สมชาย สลิปทูโก |
| G | บัญชีผู้ส่ง | xxx-x-x9866-x |
| H | ธนาคารผู้ส่ง | ธนาคารกสิกรไทย |
| I | ชื่อผู้รับ | บริษัท สลิปทูโก จำกัด |
| J | บัญชีผู้รับ | xxx-x-x5366-x |
| K | ธนาคารผู้รับ | ธนาคารกสิกรไทย |
| L | สถานะ | verified |

## 🎯 ฟังก์ชันของ SlipRecordingService

### 1. บันทึกข้อมูลสลิป

```javascript
const recordingService = new SlipRecordingService(googleAuth, googleSheetId);

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

### 2. บันทึกข้อมูลสลิปหลายรายการ

```javascript
const slipsData = [
  { /* slip 1 */ },
  { /* slip 2 */ },
  { /* slip 3 */ }
];

await recordingService.recordMultipleSlips(slipsData);
```

### 3. ดึงข้อมูลสลิปทั้งหมด

```javascript
const allSlips = await recordingService.getAllSlips();
console.log(allSlips);
```

### 4. ค้นหาข้อมูลสลิป

```javascript
// ค้นหาตามชื่อผู้ส่ง
const results = await recordingService.searchSlips('senderName', 'สมชาย สลิปทูโก');

// ค้นหาตามจำนวนเงิน
const results = await recordingService.searchSlips('amount', '1000');
```

### 5. ตรวจสอบสลิปซ้ำ

```javascript
const isDuplicate = await recordingService.isSlipDuplicate('92887bd5-60d3-4744-9a98-b8574eaxxxxx');

if (isDuplicate) {
  console.log('สลิปซ้ำ');
} else {
  console.log('สลิปไม่ซ้ำ');
}
```

## 🔐 ความปลอดภัย

1. **credentials.json** - เก็บไว้ใน `.gitignore`
2. **GOOGLE_SHEET_ID** - เก็บไว้ใน `.env`
3. **ไม่ commit** credentials ไปยัง Git
4. **ใช้ Service Account** แทน Personal Account

## 🐛 Troubleshooting

### ปัญหา: ไม่สามารถเชื่อมต่อ Google Sheets

**สาเหตุ:**
- credentials.json ไม่ถูกต้อง
- Google Sheets API ไม่เปิดใช้งาน
- Service Account ไม่มีสิทธิ์

**วิธีแก้:**
1. ตรวจสอบ credentials.json
2. ตรวจสอบว่า Google Sheets API เปิดใช้งาน
3. ตรวจสอบว่า Service Account มีสิทธิ์ Editor

### ปัญหา: Worksheet ไม่ถูกสร้าง

**สาเหตุ:**
- Service Account ไม่มีสิทธิ์
- Google Sheets API ไม่เปิดใช้งาน

**วิธีแก้:**
1. ตรวจสอบสิทธิ์ของ Service Account
2. ตรวจสอบว่า Google Sheets API เปิดใช้งาน

### ปัญหา: ข้อมูลไม่ถูกบันทึก

**สาเหตุ:**
- Google Sheets API ไม่เปิดใช้งาน
- Service Account ไม่มีสิทธิ์
- Network error

**วิธีแก้:**
1. ตรวจสอบ Server Logs
2. ตรวจสอบ Network Connection
3. ตรวจสอบสิทธิ์ของ Service Account

## 📚 ตัวอย่างการใช้งาน

### ตัวอย่างที่ 1: บันทึกข้อมูลสลิปอัตโนมัติ

```javascript
// ใน lineSlipVerificationWebhook.js
if (verificationResult.success) {
  const slipData = verificationService.extractSlipData(verificationResult);
  
  if (recordingService) {
    await recordingService.recordSlip(slipData);
  }
}
```

### ตัวอย่างที่ 2: ตรวจสอบสลิปซ้ำ

```javascript
const isDuplicate = await recordingService.isSlipDuplicate(slipData.referenceId);

if (isDuplicate) {
  console.log('สลิปซ้ำ - ไม่บันทึก');
} else {
  await recordingService.recordSlip(slipData);
}
```

### ตัวอย่างที่ 3: ดึงข้อมูลสลิปตามวันที่

```javascript
const allSlips = await recordingService.getAllSlips();

// กรองข้อมูลตามวันที่
const today = new Date().toLocaleDateString('th-TH');
const todaySlips = allSlips.filter(slip => slip['วันที่บันทึก'].includes(today));

console.log(`สลิปวันนี้: ${todaySlips.length} รายการ`);
```

## 📞 ติดต่อสอบถาม

หากมีปัญหาหรือข้อสงสัย โปรดติดต่อทีม Support

---

**Last Updated:** February 26, 2025
**Version:** 1.0.0
