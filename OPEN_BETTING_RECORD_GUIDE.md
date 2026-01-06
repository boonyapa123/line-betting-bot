# Open Betting Record Service Guide

## ภาพรวม

ระบบบันทึกข้อมูลการเปิดรับแทงลงใน Google Sheets เป็นรายวัน เพื่อให้สามารถนำข้อมูลมาทำรายงานได้

## วิธีการทำงาน

### 1. เมื่อแอดมินกดปุ่ม "เปิดรับแทง"

- ระบบจะส่ง LIFF form ให้แอดมินกรอกข้อมูล
- ข้อมูลที่ต้องกรอก:
  - **สนาม** (เช่น ต 310)
  - **บั้งไฟ** (เช่น 35)
  - **ลิงค์ห้องแข่ง** (ถ้ามี)
  - **หมายเหตุ** (ถ้ามี)

### 2. เมื่อแอดมินส่งข้อมูล

- ข้อมูลจะถูกส่งไปยังกลุ่มเป็น Flex Message
- ข้อมูลจะถูกบันทึกลงใน Google Sheets โดยอัตโนมัติ

### 3. โครงสร้าง Google Sheets

ระบบจะสร้าง sheet ใหม่สำหรับแต่ละวัน โดยใช้ชื่อ `YYYY-MM-DD`

**คอลัมน์:**
- A: เวลา (HH:MM:SS)
- B: สนาม
- C: บั้งไฟ
- D: ลิงค์ห้องแข่ง
- E: หมายเหตุ
- F: Admin ID

## API Endpoints

### 1. ส่งข้อมูลการเปิดรับแทง

```
POST /api/send-betting-message
```

**Request Body:**
```json
{
  "groupId": "C1234567890abcdef1234567890abcdef",
  "venue": "ต 310",
  "fireNumber": "35",
  "roomLink": "https://example.com/room",
  "note": "เปิดรับแทงแล้ว",
  "userId": "U1234567890abcdef1234567890abcdef"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Betting message sent successfully",
  "recorded": true
}
```

### 2. ดึงรายงานการเปิดรับแทง

```
GET /api/open-betting-report?date=2024-01-15
```

**Query Parameters:**
- `date` (optional): วันที่ในรูปแบบ `YYYY-MM-DD` (ถ้าไม่ระบุจะใช้วันนี้)

**Response:**
```json
{
  "success": true,
  "records": [
    {
      "date": "2024-01-15",
      "timestamp": "14:30:45",
      "venue": "ต 310",
      "fireNumber": "35",
      "roomLink": "https://example.com/room",
      "note": "เปิดรับแทงแล้ว",
      "adminId": "U1234567890abcdef1234567890abcdef"
    }
  ],
  "count": 1
}
```

### 3. ดึงสรุปการเปิดรับแทงของวันนี้

```
GET /api/open-betting-summary
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "date": "2024-01-15",
    "totalRecords": 5,
    "venues": [
      {
        "key": "ต 310-35",
        "venue": "ต 310",
        "fireNumber": "35",
        "count": 2,
        "records": [...]
      },
      {
        "key": "ต 311-40",
        "venue": "ต 311",
        "fireNumber": "40",
        "count": 3,
        "records": [...]
      }
    ]
  }
}
```

## การตั้งค่า

### 1. ตั้งค่า Environment Variables

```env
GOOGLE_SHEETS_ID=your_spreadsheet_id
GOOGLE_CREDENTIALS_PATH=./credentials.json
```

### 2. เตรียม Google Credentials

- ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
- สร้าง Service Account
- ดาวน์โหลด JSON credentials file
- วางไฟล์ที่ root directory หรือตำแหน่งที่ระบุใน `GOOGLE_CREDENTIALS_PATH`

### 3. Service จะเริ่มต้นโดยอัตโนมัติ

Service จะเริ่มต้นโดยอัตโนมัติเมื่อ app เริ่มต้น ไม่ต้องทำอะไรเพิ่มเติม

หรือถ้าต้องการเริ่มต้นด้วยตนเอง:

```bash
node src/scripts/initializeOpenBettingRecordService.js
```

## ตัวอย่างการใช้งาน

### ดึงข้อมูลรายงานของวันนี้

```bash
curl http://localhost:3000/api/open-betting-report
```

### ดึงข้อมูลรายงานของวันที่ 2024-01-15

```bash
curl http://localhost:3000/api/open-betting-report?date=2024-01-15
```

### ดึงสรุปการเปิดรับแทงของวันนี้

```bash
curl http://localhost:3000/api/open-betting-summary
```

## ข้อมูลที่บันทึก

ระบบจะบันทึกข้อมูลต่อไปนี้:

1. **เวลา**: เวลาที่ส่งข้อมูล (HH:MM:SS)
2. **สนาม**: ชื่อสนาม (เช่น ต 310)
3. **บั้งไฟ**: หมายเลขบั้งไฟ (เช่น 35)
4. **ลิงค์ห้องแข่ง**: URL ของห้องแข่ง (ถ้ามี)
5. **หมายเหตุ**: ข้อมูลเพิ่มเติม (ถ้ามี)
6. **Admin ID**: ID ของแอดมินที่ส่งข้อมูล

## ประโยชน์

- **ติดตามการเปิดรับแทง**: ดูว่าเปิดรับแทงสนามไหนบ้าง
- **วิเคราะห์ข้อมูล**: นำข้อมูลมาวิเคราะห์และทำรายงาน
- **ตรวจสอบประวัติ**: ดูประวัติการเปิดรับแทงของแต่ละวัน
- **จัดการแอดมิน**: ติดตามว่าแอดมินคนไหนเปิดรับแทง

## หมายเหตุ

- ระบบจะสร้าง sheet ใหม่โดยอัตโนมัติสำหรับแต่ละวัน
- ข้อมูลจะถูกบันทึกเป็นรายวัน ไม่ได้รวมข้อมูลจากวันอื่น
- สามารถดึงข้อมูลของวันที่ผ่านมาได้โดยระบุ `date` parameter
