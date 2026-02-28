# Slip Check API Guide

## ภาพรวม

API นี้ใช้สำหรับตรวจสอบสลิปการโอนเงินจาก Slip2Go

## Endpoints

### 1. ตรวจสอบสลิป
**POST** `/api/slip/verify`

#### Request
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `file` (required): รูปภาพสลิป (JPEG/PNG, max 10MB)
  - `checkDuplicate` (optional): ตรวจสอบสลิปซ้ำ (true/false, default: true)
  - `checkReceiver` (optional): JSON string ของเงื่อนไขบัญชีผู้รับ
  - `checkAmount` (optional): JSON string ของเงื่อนไขจำนวนเงิน
  - `checkDate` (optional): JSON string ของเงื่อนไขวันที่

#### Response Success (200)
```json
{
  "success": true,
  "code": "200000",
  "message": "Slip found",
  "data": {
    "referenceId": "92887bd5-60d3-4744-9a98-b8574eaxxxxx-xx",
    "transRef": "184440173749COT08999",
    "dateTime": "2024-05-29T05:37:00.000Z",
    "amount": 1000,
    "receiver": {
      "account": {
        "name": "บริษัท สลิปทูโก จำกัด",
        "bank": {
          "account": "xxx-x-x1234-x"
        }
      },
      "bank": {
        "id": "002",
        "name": "ธนาคารกรุงเทพ"
      }
    },
    "sender": {
      "account": {
        "name": "นาย สมชาย อัธยาศัยดี",
        "bank": {
          "account": "xxx-x-x1234-x"
        }
      },
      "bank": {
        "id": "004",
        "name": "ธนาคารกสิกรไทย"
      }
    }
  }
}
```

#### Response Error
```json
{
  "success": false,
  "code": "200401",
  "message": "Recipient Account Not Match"
}
```

### 2. Health Check
**GET** `/api/slip/health`

#### Response
```json
{
  "status": "ok",
  "message": "Slip Check API is running"
}
```

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 200000 | Slip found | ข้อมูลสลิปแสดงในระบบธนาคารอย่างถูกต้อง |
| 200200 | Slip is Valid | ข้อมูลสลิปถูกต้อง |
| 200401 | Recipient Account Not Match | บัญชีผู้รับไม่ถูกต้อง |
| 200402 | Transfer Amount Not Match | ยอดโอนเงินไม่ตรงเงื่อนไข |
| 200403 | Transfer Date Not Match | วันที่โอนไม่ตรงเงื่อนไข |
| 200404 | Slip Not Found | ไม่พบข้อมูลสลิปในระบบธนาคาร |
| 200500 | Slip is Fraud | สลิปเสีย/สลิปปลอม |
| 200501 | Slip is Duplicated | สลิปซ้ำ |
| NO_FILE | - | ไม่มีไฟล์สลิป |
| ERROR | - | ข้อผิดพลาดอื่น ๆ |

## ตัวอย่างการใช้

### cURL
```bash
curl -X POST https://line-betting-bot.onrender.com/api/slip/verify \
  -F "file=@slip.jpg" \
  -F "checkDuplicate=true" \
  -F "checkReceiver=[{\"accountType\":\"01002\",\"accountNameTH\":\"บริษัท สลิปทูโก จำกัด\"}]" \
  -F "checkAmount={\"type\":\"gte\",\"amount\":\"1000\"}"
```

### JavaScript (Fetch)
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('checkDuplicate', 'true');
formData.append('checkReceiver', JSON.stringify([
  {
    accountType: '01002',
    accountNameTH: 'บริษัท สลิปทูโก จำกัด'
  }
]));
formData.append('checkAmount', JSON.stringify({
  type: 'gte',
  amount: '1000'
}));

const response = await fetch('https://line-betting-bot.onrender.com/api/slip/verify', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result);
```

### Python
```python
import requests
import json

url = 'https://line-betting-bot.onrender.com/api/slip/verify'

files = {
    'file': open('slip.jpg', 'rb')
}

data = {
    'checkDuplicate': 'true',
    'checkReceiver': json.dumps([
        {
            'accountType': '01002',
            'accountNameTH': 'บริษัท สลิปทูโก จำกัด'
        }
    ]),
    'checkAmount': json.dumps({
        'type': 'gte',
        'amount': '1000'
    })
}

response = requests.post(url, files=files, data=data)
print(response.json())
```

## Bank Codes

| Code | Bank Name |
|------|-----------|
| 01002 | ธนาคารกรุงเทพ (Bangkok Bank) |
| 01004 | ธนาคารกสิกรไทย (Kasikorn Bank) |
| 01006 | ธนาคารกรุงไทย (Krung Thai Bank) |
| 01011 | ธนาคารทหารไทยธนชาต (TMB Thanachart Bank) |
| 01014 | ธนาคารไทยพาณิชย์ (SCB) |
| 01025 | ธนาคารกรุงศรีอยุธยา (Krungsri Bank) |
| 01069 | ธนาคารเกียรตินาคินภัทร (Kiatnakin Bank) |
| 01022 | ธนาคารซีไอเอ็มบีไทย (CIMB Thai Bank) |
| 01067 | ธนาคารทิสโก้ (TISCO Bank) |
| 01024 | ธนาคารยูโอบี (UOB) |
| 01071 | ธนาคารไทยเครดิต (Thai Credit Bank) |
| 01073 | ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank) |
| 01070 | ธนาคารไอซีบีซี (ไทย) (ICBC Thai) |
| 01098 | ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อม (SME Bank) |
| 01034 | ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (BAAC) |
| 01035 | ธนาคารเพื่อการส่งออกและนำเข้า (EXIM Bank) |
| 01030 | ธนาคารออมสิน (GSB) |
| 01033 | ธนาคารอาคารสงเคราะห์ (GHB) |
| 01066 | ธนาคารอิสลามแห่งประเทศไทย (Islamic Bank) |
| 02001 | PromptPay เบอร์โทรศัพท์ |
| 02003 | PromptPay บัตรประชาชน/เลขประจำตัวผู้เสียภาษี |
| 02004 | PromptPay รหัส E-Wallet |
| 03000 | K+ Shop (KBANK), แม่มณี (SCB), Be Merchant NextGen (BBL), TTB Smart Shop (TTB) |
| 04000 | True Money Wallet |

## ทดสอบ API

```bash
# ทดสอบ health check
curl https://line-betting-bot.onrender.com/api/slip/health

# ทดสอบตรวจสอบสลิป (ต้องมีไฟล์ slip.jpg)
node test-slip-api.js slip.jpg
```
