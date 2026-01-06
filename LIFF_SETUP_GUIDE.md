# LIFF Setup Guide

## ขั้นตอนการตั้งค่า LIFF

### 1. สร้าง LIFF App ใน LINE Developers Console

1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. เลือก Provider ของคุณ
3. ไปที่ **LIFF** tab
4. คลิก **Create** เพื่อสร้าง LIFF app ใหม่

### 2. ตั้งค่า LIFF App

**ตั้งค่าพื้นฐาน:**
- **Name**: ตั้งชื่อ เช่น "Betting Bot LIFF"
- **LIFF URL**: ใส่ URL ของ LIFF app
  - ตัวอย่าง: `https://your-domain.com/liff-payment-form.html`
- **Size**: เลือก **Full** (เต็มหน้าจอ)
- **Permissions**: เลือก:
  - ✅ Profile
  - ✅ OpenID
  - ✅ Chat Message Window

**ตั้งค่าการเข้าถึง (Access Control):**
- ✅ **Allow all users** - ให้ทุก user สามารถเปิด LIFF app ได้ (ไม่ใช่เฉพาะ admin)
- ❌ ไม่ควรตั้ง "Restricted to specific users" เพราะจะทำให้ user อื่นๆ ไม่สามารถเปิดได้

### 3. ได้ LIFF ID

หลังจากสร้าง LIFF app แล้ว จะได้ LIFF ID ในรูปแบบ:
```
2008804502-EXS0MfDI
```

### 4. ตั้งค่า Environment Variables

ใน `.env` file ให้ตั้งค่า:

```env
# LIFF Configuration
LIFF_ID=2008804502-EXS0MfDI
LIFF_URL=https://liff.line.me
```

### 5. ตั้งค่า Webhook URL

1. ไปที่ **Messaging API** settings
2. ตั้ง **Webhook URL** เป็น:
   ```
   https://your-domain.com/webhook
   ```
3. Enable **Webhook**

### 6. ตั้งค่า Rich Menu

ใน Rich Menu ให้ตั้ง Button action เป็น postback:

```json
{
  "type": "postback",
  "label": "เปิดรับแทง",
  "data": "action=open_betting",
  "displayText": "เปิดรับแทง"
}
```

## LIFF Forms ที่ใช้ในระบบ

### 1. Payment Link Form
- **File**: `public/liff-payment-form.html`
- **Purpose**: ให้แอดมินกรอกข้อมูลการโอนเงิน
- **URL Parameter**: `form=payment`

### 2. Open Betting Form
- **File**: `public/liff-open-betting.html`
- **Purpose**: ให้แอดมินกรอกข้อมูลการเปิดรับแทง
- **URL Parameter**: `form=open-betting`

### 3. Result Summary Edit Form
- **File**: `public/liff-result-summary-edit.html`
- **Purpose**: ให้แอดมินแก้ไขและบันทึกผลแข่ง
- **URL Parameter**: `form=result-summary-edit`

## ตัวอย่าง LIFF URLs

```
# Payment Link Form
https://liff.line.me/2008804502-EXS0MfDI?groupId=Ce73f7032aa63204dcfc2d5685719565b&form=payment

# Open Betting Form
https://liff.line.me/2008804502-EXS0MfDI?groupId=Ce73f7032aa63204dcfc2d5685719565b&form=open-betting

# Result Summary Edit Form
https://liff.line.me/2008804502-EXS0MfDI?groupId=Ce73f7032aa63204dcfc2d5685719565b&form=result-summary-edit
```

## ข้อสำคัญ

- ✅ LIFF URL ต้องเป็น **HTTPS** (ไม่ใช่ HTTP)
- ✅ Domain ต้องเป็น **public domain** (ไม่ใช่ localhost)
- ✅ LIFF app ต้องเป็น **Full** size
- ✅ ต้อง **Enable Webhook** เพื่อให้บอทได้รับข้อความ
- ✅ ต้องตั้ง **Rich Menu** เพื่อให้ผู้ใช้กดปุ่มได้
- ✅ **ต้องตั้ง LIFF app ให้ "Allow all users"** เพื่อให้ทุก user สามารถเปิดได้ (ไม่ใช่เฉพาะ admin)
  - ถ้าตั้ง "Restricted to specific users" จะทำให้ user อื่นๆ ไม่สามารถเปิดได้ (404 Error)

## Troubleshooting

### LIFF ไม่เปิด (404 Error)
- ตรวจสอบว่า LIFF_ID ถูกต้อง
- ตรวจสอบว่า LIFF URL เป็น HTTPS
- ตรวจสอบว่า Domain เป็น public domain
- **ตรวจสอบว่า LIFF app ตั้งค่าให้ "Allow all users" ไม่ใช่ "Restricted to specific users"**
  - ถ้าตั้ง "Restricted" จะทำให้ user อื่นๆ ไม่สามารถเปิดได้ (404 Error)
  - ต้องไปที่ LINE Developers Console > LIFF > Edit > Access Control > เลือก "Allow all users"

### ไม่สามารถส่งข้อมูลได้
- ตรวจสอบว่า Webhook URL ถูกต้อง
- ตรวจสอบว่า Enable Webhook
- ตรวจสอบ console log เพื่อดูข้อผิดพลาด

### ไม่สามารถเข้าถึง Profile
- ตรวจสอบว่า Profile permission ถูกเลือก
- ตรวจสอบว่า OpenID permission ถูกเลือก
