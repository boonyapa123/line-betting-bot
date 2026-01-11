# วิธีตั้งค่า Google Credentials ใน Render

## ปัญหา
Environment variable มีข้อจำกัดความยาว ทำให้ JSON credentials ถูก truncate

## วิธีแก้: ใช้ Credentials File

### ขั้นตอนที่ 1: Upload Credentials File ไปยัง Render

1. ไปที่ Render Dashboard
2. เปิด Project
3. ไปที่ **Settings** → **Environment**
4. เพิ่ม environment variable ใหม่:
   - **Key:** `GOOGLE_CREDENTIALS_PATH`
   - **Value:** `/etc/secrets/google-credentials.json`

### ขั้นตอนที่ 2: Upload Credentials File

1. ไปที่ **Settings** → **Environment** → **Secret Files**
2. คลิก **Add Secret File**
3. ตั้งค่า:
   - **Filename:** `google-credentials.json`
   - **Content:** (copy ทั้งหมดจาก `linebot-482513-5e72ad3d3232.json`)
4. **Save**

### ขั้นตอนที่ 3: Redeploy

1. ไปที่ **Deployments**
2. คลิก **Redeploy** บน latest deployment
3. รอให้ deploy เสร็จ

## ตรวจสอบ

หลังจาก redeploy ให้:
1. เพิ่ม OA เข้ากลุ่ม
2. ตรวจสอบ logs ว่า credentials load ได้หรือไม่
3. ตรวจสอบชีท Groups ว่ามีข้อมูลปรากฏขึ้นหรือไม่

## หมายเหตุ

- ไม่ต้องใส่ `GOOGLE_CREDENTIALS_JSON` environment variable อีกต่อไป
- System จะอ่าน credentials จาก `/etc/secrets/google-credentials.json` โดยอัตโนมัติ
