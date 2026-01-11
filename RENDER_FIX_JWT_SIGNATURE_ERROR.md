# 🔧 แก้ไข "Invalid JWT Signature" Error บน Render

## ปัญหา
```
❌ Error: invalid_grant: Invalid JWT Signature.
```

**สาเหตุ:** `GOOGLE_CREDENTIALS_BASE64` environment variable ถูก truncate (ตัดสั้น) เพราะ Render มีข้อจำกัดความยาว

## วิธีแก้: ใช้ Secret File แทน Base64

### ขั้นตอนที่ 1: ลบ GOOGLE_CREDENTIALS_BASE64

1. ไปที่ Render Dashboard: https://dashboard.render.com
2. เลือก **line-betting-bot** service
3. ไปที่ **Settings** → **Environment**
4. ค้นหา `GOOGLE_CREDENTIALS_BASE64`
5. คลิก **Delete** (ปุ่มถังขยะ)
6. ยืนยัน Delete

### ขั้นตอนที่ 2: เพิ่ม Secret File

1. ยังอยู่ใน **Environment** section
2. ค้นหา **Secret Files** section
3. คลิก **Add Secret File**
4. ตั้งค่า:
   - **Filename:** `google-credentials.json`
   - **Content:** (Copy ทั้งหมดจาก `linebot-482513-5e72ad3d3232.json`)
5. คลิก **Save**

### ขั้นตอนที่ 3: เพิ่ม Environment Variable

1. ยังอยู่ใน **Environment** section
2. ไปที่ **Environment Variables** section
3. คลิก **Add Environment Variable**
4. ตั้งค่า:
   - **Key:** `GOOGLE_CREDENTIALS_PATH`
   - **Value:** `/etc/secrets/google-credentials.json`
5. คลิก **Save**

### ขั้นตอนที่ 4: Redeploy

1. ไปที่ **Deployments**
2. คลิก **Redeploy** บน latest deployment
3. รอให้ deploy เสร็จ (2-3 นาที)

### ขั้นตอนที่ 5: ตรวจสอบ

ส่งข้อความในกลุ่ม LINE ใหม่ และตรวจสอบ Render logs:
- ไปที่ **Logs** tab
- ค้นหา "Error recording bet" หรือ "Invalid JWT"
- ถ้าไม่มี error = ✅ สำเร็จ!

## ทำไมต้องใช้ Secret File?

| วิธี | ข้อจำกัด | ปัญหา |
|-----|---------|------|
| **Base64 Environment Variable** | ~1000 characters | ❌ Truncate, Invalid JWT |
| **Secret File** | ไม่มีข้อจำกัด | ✅ ทำงานได้ดี |

## ⚠️ สำคัญ

- ❌ ห้ามใช้ `GOOGLE_CREDENTIALS_BASE64` อีกต่อไป
- ✅ ใช้ Secret File เท่านั้น
- 🔄 หลังจาก redeploy ให้รอ 2-3 นาทีให้เซิร์ฟเวอร์เริ่มต้นใหม่

