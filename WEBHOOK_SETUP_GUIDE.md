# ตั้ง Webhook ใน LINE - ทีละขั้นตอน

## ขั้นตอนที่ 1: ได้ Public URL จาก Railway

1. ไปที่ https://railway.com/project/108be64c-6349-474c-8bb7-9bc3d6f8a1a5
2. ไปที่ **Deployments** tab
3. ดู deployment ล่าสุด
4. **Copy Public URL** (เช่น `https://line-betting-bot-production.up.railway.app`)

---

## ขั้นตอนที่ 2: ไปที่ LINE Developers Console

1. ไปที่ https://developers.line.biz/console/
2. Login ด้วย LINE account ของคุณ
3. เลือก **Channel** ของคุณ (line-betting-bot)

---

## ขั้นตอนที่ 3: ตั้ง Webhook URL

1. ไปที่ **Messaging API** settings
2. หา **"Webhook URL"** section
3. ใส่ URL ดังนี้:
   ```
   https://your-railway-url/webhook
   ```
   
   **ตัวอย่าง:**
   ```
   https://line-betting-bot-production.up.railway.app/webhook
   ```

4. Click **"Verify"** เพื่อทดสอบ
5. ถ้าสำเร็จ จะเห็น ✅ "Verified"

---

## ขั้นตอนที่ 4: Enable Webhook

1. ในหน้า Messaging API settings
2. หา **"Use webhook"** toggle
3. **Enable** มัน (เปลี่ยนเป็น ON)

---

## ✅ เสร็จแล้ว!

Webhook ของคุณตั้งค่าเสร็จแล้ว

### ทดสอบ
1. เพิ่ม Bot เป็นเพื่อน
2. พิมพ์ `สรุปยอดแทง`
3. ควรได้รับสรุปการแทง

### ดู Logs
ถ้ามีปัญหา ดู logs ใน Railway:
1. ไปที่ Railway Dashboard
2. ไปที่ Deployments
3. Click deployment ล่าสุด
4. ดู **Logs** tab

---

## 🔧 Troubleshooting

### "Verify failed"
- ตรวจสอบ URL ถูกต้องไหม
- ตรวจสอบ Railway deployment สำเร็จไหม
- ลองรอ 1-2 นาที แล้ว verify อีกครั้ง

### Bot ไม่ตอบ
- ตรวจสอบ Webhook URL ถูกต้องไหม
- ตรวจสอบ "Use webhook" เปิดไหม
- ดู Logs ใน Railway

### ต้องการ LINE Credentials
ถ้าต้องการ LINE Channel Access Token หรือ Channel Secret:
1. ไปที่ LINE Developers Console
2. ไปที่ **Messaging API** settings
3. ดู **"Channel access token"** และ **"Channel secret"**
4. Copy ไปใส่ใน Railway Environment Variables

