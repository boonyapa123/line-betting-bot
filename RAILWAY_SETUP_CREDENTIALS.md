# วิธี Setup Google Credentials บน Railway

## ปัญหา
ไฟล์ `credentials.json` ไม่สามารถ commit ไปยัง GitHub ได้ (เพราะ .gitignore) ดังนั้นต้องตั้งค่าบน Railway ผ่าน environment variables

## วิธีแก้ไข

### ขั้นตอนที่ 1: เตรียม credentials.json

1. ไปที่ Google Cloud Console: https://console.cloud.google.com
2. เลือก Project ของคุณ
3. ไปที่ "Service Accounts"
4. เลือก Service Account ของคุณ
5. ไปที่ "Keys" tab
6. Download JSON key file (credentials.json)

### ขั้นตอนที่ 2: Convert credentials.json เป็น Base64

ใน Terminal:
```bash
# macOS/Linux
cat credentials.json | base64

# Windows (PowerShell)
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("credentials.json")) | Set-Clipboard
```

Copy output ทั้งหมด

### ขั้นตอนที่ 3: ตั้งค่าบน Railway

1. ไปที่ Railway Dashboard: https://railway.app
2. เลือก Project ของคุณ
3. ไปที่ "Variables" tab
4. เพิ่ม variable ใหม่:
   - **Key**: `GOOGLE_CREDENTIALS_BASE64`
   - **Value**: Paste base64 string ที่ copy มา

### ขั้นตอนที่ 4: ปรับแต่ง Code

ต้องแก้ไข code เพื่ออ่าน credentials จาก environment variable

#### ตัวเลือก A: ใช้ Google Sheets Service

ถ้าคุณใช้ Google Sheets API ผ่าน `googleapis` library:

```javascript
// ใน src/config/googleSheets.js หรือที่ที่ใช้ credentials

const fs = require('fs');
const path = require('path');

function getGoogleCredentials() {
  // ถ้ามี GOOGLE_CREDENTIALS_BASE64 ใน environment
  if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    try {
      const credentialsJson = Buffer.from(
        process.env.GOOGLE_CREDENTIALS_BASE64,
        'base64'
      ).toString('utf-8');
      return JSON.parse(credentialsJson);
    } catch (error) {
      console.error('❌ Failed to parse GOOGLE_CREDENTIALS_BASE64:', error);
      throw error;
    }
  }
  
  // ถ้าไม่มี ให้อ่านจาก file (สำหรับ local development)
  const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';
  if (fs.existsSync(credentialsPath)) {
    return JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
  }
  
  throw new Error('Google credentials not found');
}

module.exports = { getGoogleCredentials };
```

#### ตัวเลือก B: ใช้ Google Auth Library

```javascript
// ใน src/config/googleAuth.js

const { google } = require('googleapis');
const fs = require('fs');

async function getGoogleAuthClient() {
  let credentials;
  
  // ถ้ามี GOOGLE_CREDENTIALS_BASE64
  if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    const credentialsJson = Buffer.from(
      process.env.GOOGLE_CREDENTIALS_BASE64,
      'base64'
    ).toString('utf-8');
    credentials = JSON.parse(credentialsJson);
  } else {
    // อ่านจาก file
    const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';
    credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  });
  
  return auth;
}

module.exports = { getGoogleAuthClient };
```

### ขั้นตอนที่ 5: ตั้งค่า Environment Variables อื่น ๆ บน Railway

ใน Railway Dashboard > Variables:

```
LINE_CHANNEL_ACCESS_TOKEN=your_token_here
LINE_CHANNEL_SECRET=your_secret_here
GOOGLE_SHEETS_ID=your_sheets_id_here
GOOGLE_CREDENTIALS_BASE64=base64_encoded_credentials_here
LIFF_ID=your_liff_id_here
PORT=3000
NODE_ENV=production
```

### ขั้นตอนที่ 6: ทดสอบ

1. Push code ไปยัง GitHub
2. Railway จะ auto-deploy
3. ดู Logs ใน Railway Dashboard
4. ทดสอบ `/health` endpoint

---

## Alternative: ใช้ Google Service Account JSON String

ถ้า base64 ยาวเกินไป สามารถใช้ JSON string โดยตรง:

### ขั้นตอนที่ 1: Copy credentials.json content

```bash
cat credentials.json
```

Copy ทั้ง JSON object

### ขั้นตอนที่ 2: ตั้งค่าบน Railway

- **Key**: `GOOGLE_CREDENTIALS_JSON`
- **Value**: Paste JSON string

### ขั้นตอนที่ 3: ปรับแต่ง Code

```javascript
function getGoogleCredentials() {
  // ถ้ามี GOOGLE_CREDENTIALS_JSON
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      return JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } catch (error) {
      console.error('❌ Failed to parse GOOGLE_CREDENTIALS_JSON:', error);
      throw error;
    }
  }
  
  // ถ้าไม่มี ให้อ่านจาก file
  const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';
  if (fs.existsSync(credentialsPath)) {
    return JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
  }
  
  throw new Error('Google credentials not found');
}
```

---

## Troubleshooting

### ปัญหา: "Google credentials not found"
**วิธีแก้:**
1. ตรวจสอบ GOOGLE_CREDENTIALS_BASE64 หรือ GOOGLE_CREDENTIALS_JSON ตั้งค่าบน Railway
2. ตรวจสอบ base64 encoding ถูกต้อง
3. ดู Logs ใน Railway Dashboard

### ปัญหา: "Invalid credentials"
**วิธีแก้:**
1. ตรวจสอบ credentials.json ถูกต้อง
2. ตรวจสอบ Service Account มี permissions ที่ถูกต้อง
3. ตรวจสอบ Google Sheets ID ถูกต้อง

### ปัญหา: "Permission denied"
**วิธีแก้:**
1. ตรวจสอบ Service Account มี access ไปยัง Google Sheets
2. ตรวจสอบ Google Sheets shared ให้ Service Account email
3. ตรวจสอบ scopes ถูกต้อง

---

## สรุป

✅ Convert credentials.json เป็น base64
✅ ตั้งค่า GOOGLE_CREDENTIALS_BASE64 บน Railway
✅ ปรับแต่ง code เพื่ออ่านจาก environment variable
✅ Deploy ไปยัง Railway
✅ ทดสอบ webhook
