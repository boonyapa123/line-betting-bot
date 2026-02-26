# 📊 วิธีการบันทึกข้อมูลสลิปลง Google Sheets

## 🎯 ภาพรวม

เมื่อสลิปถูกต้อง ระบบจะบันทึกข้อมูลลง Google Sheets โดยอัตโนมัติ

---

## 📍 ลงชีทไหน?

### Worksheet: "Slip Verification"

ระบบจะสร้าง Worksheet ชื่อ **"Slip Verification"** โดยอัตโนมัติ

```
Google Sheets
├─ Sheet 1 (Default)
├─ Sheet 2
└─ Slip Verification ← ข้อมูลสลิปบันทึกที่นี่
```

---

## 📋 ข้อมูลที่บันทึก

### Header (แถวแรก)

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

---

## 🔄 ขั้นตอนการบันทึก

### Step 1: ผู้ใช้ส่งรูปภาพสลิป

```
ผู้ใช้ → LINE OA → [ส่งรูปภาพสลิป]
```

### Step 2: Server ตรวจสอบสลิป

```
Server:
  1. สแกน QR Code ✅
  2. เรียก Slip2Go API ✅
  3. ได้ผลลัพธ์ ✅
```

### Step 3: ตรวจสอบว่าสลิปถูกต้อง

```
ผลลัพธ์:
  code: "200000" ✅ (สลิปถูกต้อง)
  
  ถ้า code = "200000" → บันทึกลง Google Sheets
  ถ้า code ≠ "200000" → ไม่บันทึก
```

### Step 4: ตรวจสอบสลิปซ้ำ

```
SlipRecordingService:
  1. ค้นหา referenceId ใน Google Sheets
  2. ถ้าพบ → สลิปซ้ำ ❌ (ไม่บันทึก)
  3. ถ้าไม่พบ → สลิปใหม่ ✅ (บันทึก)
```

### Step 5: บันทึกข้อมูลลง Google Sheets

```
SlipRecordingService.recordSlip(slipData)
  ↓
  1. ตรวจสอบ Worksheet มีอยู่หรือไม่
  2. ถ้าไม่มี → สร้าง Worksheet ใหม่
  3. เพิ่ม Header (ถ้าเป็นครั้งแรก)
  4. บันทึกข้อมูลแถวใหม่
  ↓
Google Sheets API
  ↓
Append values to sheet
```

---

## 📊 ตัวอย่างข้อมูลที่บันทึก

### Google Sheets

```
┌──────────────┬──────────────┬──────────────┬──────────┬──────────────┬──────────────┐
│ วันที่บันทึก │ Reference ID │ Transaction  │ จำนวนเงิน │ วันที่โอน    │ ชื่อผู้ส่ง    │
├──────────────┼──────────────┼──────────────┼──────────┼──────────────┼──────────────┤
│ 26/02/2025   │ 92887bd5-... │ 015073144... │ 1000     │ 2025-10-05   │ สมชาย        │
│ 26/02/2025   │ 92887bd6-... │ 015073144... │ 2000     │ 2025-10-05   │ สมชาย        │
│ 26/02/2025   │ 92887bd7-... │ 015073144... │ 500      │ 2025-10-05   │ สมชาย        │
└──────────────┴──────────────┴──────────────┴──────────┴──────────────┴──────────────┘
```

---

## 🔐 ตั้งค่า Google Sheets

### Step 1: สร้าง Google Sheets

1. ไปที่ https://sheets.google.com
2. สร้าง Spreadsheet ใหม่
3. ตั้งชื่อ เช่น "Slip Verification Records"
4. คัดลอก Sheet ID จาก URL

### Step 2: ตั้งค่า Google Service Account

1. ไปที่ Google Cloud Console
2. สร้าง Service Account
3. ดาวน์โหลด JSON credentials
4. บันทึกไว้เป็น `credentials.json`

### Step 3: แชร์ Google Sheets

1. เปิด Google Sheets
2. คลิก "Share"
3. ใส่ email ของ Service Account
4. ให้สิทธิ "Editor"

### Step 4: ตั้งค่า Environment Variables

```env
GOOGLE_SHEET_ID=<your-sheet-id>
GOOGLE_SERVICE_ACCOUNT_KEY=credentials.json
GOOGLE_WORKSHEET_NAME=Slip Verification
```

---

## 💻 Code ที่ทำการบันทึก

### ใน `routes/lineSlipVerificationWebhook.js`

```javascript
// ตรวจสอบว่าสลิปถูกต้อง
if (verificationResult.success) {
  const slipData = verificationService.extractSlipData(verificationResult);
  console.log(`\n💾 บันทึกข้อมูลสลิป:`, slipData);
  
  // บันทึกลง Google Sheets ถ้ามี
  if (recordingService) {
    try {
      await recordingService.recordSlip(slipData);
      console.log(`✅ บันทึกสำเร็จ`);
    } catch (recordError) {
      console.error(`⚠️  ไม่สามารถบันทึก: ${recordError.message}`);
    }
  }
}
```

### ใน `services/betting/slipRecordingService.js`

```javascript
async recordSlip(slipData) {
  try {
    console.log(`💾 บันทึกข้อมูลสลิป...`);

    // 1. ตรวจสอบ Worksheet มีอยู่หรือไม่
    await this._ensureWorksheetExists();

    // 2. เตรียมข้อมูลสำหรับบันทึก
    const row = this._prepareRowData(slipData);

    // 3. บันทึกลง Google Sheets
    const response = await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.googleSheetId,
      range: `${this.worksheetName}!A:L`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [row]
      }
    });

    console.log(`✅ บันทึกข้อมูลสำเร็จ`);
    return {
      success: true,
      updatedRange: response.data.updates.updatedRange,
      updatedRows: response.data.updates.updatedRows
    };
  } catch (error) {
    console.error(`❌ ข้อผิดพลาด: ${error.message}`);
    return {
      success: false,
      message: error.message
    };
  }
}
```

---

## 🎯 ตัวอย่างการทำงาน

### Scenario: ผู้ใช้ส่งรูปภาพสลิป 1000 บาท

```
⏰ 14:30:00 - ผู้ใช้ส่งรูปภาพสลิป
   ↓
⏰ 14:30:05 - Server ตรวจสอบสลิป
   ✅ QR Code ถูกต้อง
   ✅ สลิปไม่ซ้ำ
   ✅ บัญชีผู้รับถูกต้อง
   ✅ จำนวนเงินถูกต้อง
   ↓
⏰ 14:30:08 - บันทึกลง Google Sheets
   ✅ สร้าง Worksheet "Slip Verification"
   ✅ เพิ่ม Header
   ✅ บันทึกข้อมูลแถวใหม่
   ↓
⏰ 14:30:10 - ส่งข้อความตอบกลับ
   ✅ ได้รับยอดเงินแล้ว
   💰 จำนวนเงิน: 1,000 บาท
   👤 ผู้ส่ง: สมชาย สลิปทูโก
   👥 ผู้รับ: บริษัท สลิปทูโก จำกัด
```

---

## 📊 Google Sheets ที่บันทึก

```
Spreadsheet: Slip Verification Records
├─ Sheet 1 (Default)
└─ Slip Verification
   ├─ Header: วันที่บันทึก | Reference ID | Transaction Ref | ...
   ├─ Row 1: 26/02/2025 | 92887bd5-... | 015073144... | 1000 | ...
   ├─ Row 2: 26/02/2025 | 92887bd6-... | 015073144... | 2000 | ...
   └─ Row 3: 26/02/2025 | 92887bd7-... | 015073144... | 500 | ...
```

---

## 🔍 ตรวจสอบข้อมูลที่บันทึก

### ใน Google Sheets

1. เปิด Google Sheets ของคุณ
2. ไปที่ Worksheet "Slip Verification"
3. ดูข้อมูลที่บันทึก

```
┌──────────────┬──────────────┬──────────────┬──────────┐
│ วันที่บันทึก │ Reference ID │ Transaction  │ จำนวนเงิน │
├──────────────┼──────────────┼──────────────┼──────────┤
│ 26/02/2025   │ 92887bd5-... │ 015073144... │ 1000     │
│ 26/02/2025   │ 92887bd6-... │ 015073144... │ 2000     │
│ 26/02/2025   │ 92887bd7-... │ 015073144... │ 500      │
└──────────────┴──────────────┴──────────────┴──────────┘
```

---

## 🐛 Troubleshooting

### ปัญหา: ข้อมูลไม่ถูกบันทึก

**สาเหตุ:**
- Google Sheets credentials ไม่ถูกต้อง
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

---

## 📚 ไฟล์ที่เกี่ยวข้อง

- `GOOGLE_SHEETS_SETUP.md` - ตั้งค่า Google Sheets
- `GOOGLE_SHEETS_INTEGRATION.md` - เชื่อมต่อ Google Sheets
- `services/betting/slipRecordingService.js` - Code บันทึกข้อมูล

---

## 📞 ติดต่อสอบถาม

หากมีปัญหา:
1. ตรวจสอบ Server logs
2. ดู `GOOGLE_SHEETS_SETUP.md`
3. ดู `TROUBLESHOOTING_GUIDE.md`
4. ติดต่อทีม Support

---

**Last Updated:** February 26, 2025
**Version:** 1.0.0
