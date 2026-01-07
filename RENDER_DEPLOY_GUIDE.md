# Deploy ไป Render - ทีละขั้นตอน

## ขั้นตอนที่ 1: สร้าง Web Service ใน Render

1. ไปที่ Render Dashboard: https://dashboard.render.com/
2. Click **"+ New"** > **"Web Service"**
3. เลือก **"Deploy from a Git repository"**
4. Click **"Connect GitHub"** (ถ้ายังไม่ได้เชื่อมต่อ)
5. เลือก repository: **`boonyapa123/line-betting-bot`**
6. Click **"Connect"**

---

## ขั้นตอนที่ 2: ตั้งค่า Web Service

ในหน้า "Create a new Web Service" ให้ตั้งค่า:

| ฟิลด์ | ค่า |
|------|-----|
| **Name** | `line-betting-bot` |
| **Environment** | `Node` |
| **Region** | `Singapore` (หรือ `Tokyo`) |
| **Branch** | `main` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | `Free` |

---

## ขั้นตอนที่ 3: ตั้ง Environment Variables

1. Scroll ลงไปหา **"Environment"** section
2. Click **"Add Environment Variable"**
3. เพิ่ม variables เหล่านี้:

```
LINE_CHANNEL_ACCESS_TOKEN=your_token_here
LINE_CHANNEL_SECRET=your_secret_here
GOOGLE_SHEETS_ID=your_sheets_id_here
GOOGLE_CREDENTIALS_BASE64=ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAibGluZWJvdC00ODI1MTMiLAogICJwcml2YXRlX2tleV9pZCI6ICI2YWYzYmU0OWI2N2RmNDQ5YzhhNDY4ZjNhMzUxODJkYjJiYTZkMjMzIiwKICAicHJpdmF0ZV9rZXkiOiAiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXG5NSUlFdlFJQkFEQU5CZ2txaGtpRzl3MEJBUUVGQUFTQ0JLY3dnZ1NqQWdFQUFvSUJBUUMyUVNFbjNqU2E3NjhiXG5KOWhSWnZISWlYN1o4RnJUN1FIMC8vSVJoWWFSNEs0UVlIWlNpRkhWcldSaHkwZ3pVYUtPaU9sa3lOVGZsTlUrXG5raXhRZ0dKRmdHaWNBT0E5dXBXNG9CRmxBYXppL3RFNyttbDdXNXZDNzBYL0dvRUJrSVJGQkJ0TGZqV0ZjUHgzXG4zVVZmUGEzR3dhcXVRNmJJU3hYeHdJcWUzV094dnkvWTJkUU5PSlFKaWpCdEIzU3RSSC91M1NrRTQwUDVXaUlxXG5iNzU1Y254S2QyL21aRWwremtrcERUOEN4N1BpSmhzWnZ5dXNsYWJlRWpOeFdJQ0JiOGd4Z0Iwam9JZmZjaVUvXG56anRZaDgxMWptNFZxb05uM3VkSUtIQ2dtTEN0eEVDVDVxblowMld4clN6VWlZVXptT1dDUHVvYnY0VWpLVnBoXG4xS3ZpZXFDOUFnTUJBQUVDZ2dFQUZFb3I1c1JXRnVtWUZPM2FwelZPdFlTWkdxb25jbkJ3UjFZM0hMeEF2dnpFXG5aQTVaSGRjUFJUcUljbHF2THdkbmtYYXNoUXZXcHcxcXNBeVY0bUJva0ZRN1VTTEgxQmR4azV3K1U0QmNQdWtmXG5ZZzMrc0QwQ21qRUpHZDFaZjFNWFpwZU9jbGthbkVCMzJ1QkhXTk1GQlp1SjVOeWpOS2tuU0VLbkxBaDVrTkFIXG5odjlMM0tnSW92THhMVnZmZ1lIRDBub2pUaFM4ZXphRFc3UEFaWlBkdmIxOStFeGxQWnRCY2I1TmFLRVhHL2hZXG5DZGA2M3o4T2ZzN0N4UTF0QkNmYlJhbG5mK21rVmkvVTJIdUVCdXlUSUlrU21kSTlVNDhGU1JKakxENWVnNDRBXG5vWVZkempTMFFpZjdybFZadWVLRmFxMnFtVnlNUm9tOWVjS2pSV1YrQVFLQmdRRDFhbCtvOHNzSy8zZitBUjFzXG55a2dTSCtvVXhSckh1Y2dqQ3NabmtTN0hPQnJTSmFTTVVvQ2duYmVzOXJ5cWVxbGdFZFlwNGhIU0lOVHhZZ1B1XG5saXF5MkpVMFFVZ281U3lhK3gxSUxjQWlPaFE3aXBxdmJCSG8rdTJPTGpUQzIxK2NsdnlyY2ozQXVjelE4b0NqXG5hUlA0REFTMi9ETG5wQjFMMlI0VDh5eDI2d0tCZ1FDK0hXVkx6b0J2ODhVajBJSkgrb1U1Y3ZOd0Ird0xhSEtiXG5yWEoxZFFiMWs2YmZPK1Rnd0g4WVhtNU5VQWFOLzZXU2lJUEtBSjlyUlRINWdVblVxNmtJaGFweXFacDNyM1Z2XG5CM3hNNS9PcXhiZEh4bWFZUlhrSXJ6VFhSRTBZYThkTS9MUWZadTloNjZoTFlXL2x2MnhBRmg2QmVSK0JVVnpDXG5EM0kwMklxczl3S0JnQmFmSkl3MVBTUVpZbDBtaXlqUkNJMnJKVytlcjVaRGVNQktLUG00OXovajJ3ME43VG9HXG5ETmRCVW9IK0NHd0tmSHhmaUljNTBIeTNEQW5vQ0FiQkR0U0hoRkZaeHlZRjRmT3pQQUxBUE5xcTBkeWZMUjBJXG5jQ295bngweEF6b0c4S3hGZXFydkQrUW8vRWt5WVVzdXoybG82akpYMHZWcE9rNFlpRjQ4WnhmYkFvR0FVMXpPXG5heFFzaTJxSHVqR1d2dnNoNmRQMjNOd01hK0FyeVFtZ0U5THg3ME1FUEFTbVVzcjFyL2pRUXdSaEsyaTY4R3I5XG41dGlwRHI5enIyVTZ1NDlkK2tlcU9zY1YzWDlKYmhzSkxTdlVVOENJb21kajIwY3pVRlNMUmcxRUJQNVZrUE9LXG5BKzc5N3FFSDFhM3ZBLzRRK0hUNmdXbGNJRGRPQmlZQnZSeHFpbmNDZ1lFQWhSR0JVUDVBZFR4RzdLUE9GMjNmXG4xTWd6eTF4WXpPVk5xcWVJNVlhWmN5VjVzV3NZb2x2Q2F4ZkplcjJ2S2xvZ2lxYTZaRlpMeGZ2bEk2TVZWYS9GXG5aQS91YVN5VklQUWdSd1BNSDZ6Yk5sSkVzU1lWZGJMcFVYSGoveEFnNXVKUFRVOXBmeWs2OUs3VGU3TE0xbHQ5XG5jeHJCRVd1YmJwZjlsdStyOVIvbjMzST1cbi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS1cbiIsCiAgImNsaWVudF9lbWFpbCI6ICJsaW5lLWJvdC1zaGVldHNAbGluZWJvdC00ODI1MTMuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJjbGllbnRfaWQiOiAiMTEwNzk5ODcxMTY3NDcyOTQ4MjY3IiwKICAiYXV0aF91cmkiOiAiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL2F1dGgiLAogICJ0b2tlbl91cmkiOiAiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLAogICJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YxL2NlcnRzIiwKICAiY2xpZW50X3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vcm9ib3QvdjEvbWV0YWRhdGEveDUwOS9saW5lLWJvdC1zaGVldHMlNDBsaW5lYm90LTQ4MjUxMy5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsCiAgInVuaXZlcnNlX2RvbWFpbiI6ICJnb29nbGVhcGlzLmNvbSIKfQo=
LIFF_ID=2008804422-62jHzZOo
LIFF_ID_OPEN_BETTING=2008804502-EXS0MfDl
LIFF_ID_RESULT_SUMMARY=2008804176-fRBZFNrq
PORT=3000
NODE_ENV=production
```

---

## ขั้นตอนที่ 4: Deploy

1. Click **"Create Web Service"**
2. Render จะ auto-deploy จาก GitHub
3. รอ 2-5 นาที ให้ deploy เสร็จ
4. ดู logs เพื่อตรวจสอบว่า deploy สำเร็จไหม

---

## ขั้นตอนที่ 5: ได้ Public URL

1. ไปที่ Render Dashboard
2. Click ที่ service `line-betting-bot`
3. ดู **"URL"** ที่ด้านบน (เช่น `https://line-betting-bot-xxxx.onrender.com`)
4. Copy URL นี้

---

## ขั้นตอนที่ 6: ตั้ง Webhook ใน LINE

1. ไปที่ LINE Developers Console: https://developers.line.biz/console/
2. เลือก Channel ของคุณ
3. ไปที่ **"Messaging API"** settings
4. ตั้ง **"Webhook URL"** เป็น:
   ```
   https://your-render-url/webhook
   ```
   
   **ตัวอย่าง:**
   ```
   https://line-betting-bot-xxxx.onrender.com/webhook
   ```

5. Click **"Verify"**
6. Enable **"Use webhook"** toggle

---

## ✅ เสร็จแล้ว!

Webhook ของคุณทำงาน 24/7 บน Render

- ✅ ทำงาน 24/7 โดยอัตโนมัติ
- ✅ Auto-deploy เมื่อ push code ไปยัง GitHub
- ✅ ฟรี (ไม่มีค่าใช้งาน)
- ✅ ไม่ต้องรันเองบนเครื่อง

---

## 🔧 Troubleshooting

### Deploy ล้มเหลว
- ดู Logs ใน Render Dashboard
- ตรวจสอบ environment variables ครบไหม
- ตรวจสอบ code ไม่มี syntax error

### Webhook ไม่ทำงาน
- ตรวจสอบ Webhook URL ถูกต้องไหม
- ตรวจสอบ "Use webhook" เปิดไหม
- ดู Logs ใน Render Dashboard

### Service ขึ้นแล้วลงเรื่อย ๆ
- ตรวจสอบ environment variables ครบไหม
- ตรวจสอบ Google Sheets credentials ถูกต้องไหม
- ดู Logs เพื่อดูว่า error อะไร

