# Railway.app - ทำให้ Webhook ทำงาน 24/7

## ✅ ที่ฉันทำให้แล้ว

Code ของคุณปรับแต่งแล้ว พร้อม deploy ไปยัง Railway

---

## 🚀 ขั้นตอนที่ 1: Push Code

```bash
git add .
git commit -m "Setup Railway deployment"
git push origin main
```

---

## 🚀 ขั้นตอนที่ 2: สมัคร Railway

1. ไปที่ https://railway.app
2. Click "Start Project"
3. Login ด้วย GitHub
4. Authorize Railway

---

## 🚀 ขั้นตอนที่ 3: Deploy

1. Click "New Project"
2. เลือก "Deploy from GitHub repo"
3. เลือก repository ของคุณ
4. Railway จะ auto-deploy

---

## 🚀 ขั้นตอนที่ 4: ตั้ง Environment Variables

ใน Railway Dashboard > Variables เพิ่ม:

| Key | Value |
|-----|-------|
| `LINE_CHANNEL_ACCESS_TOKEN` | ได้จาก LINE Developers |
| `LINE_CHANNEL_SECRET` | ได้จาก LINE Developers |
| `GOOGLE_SHEETS_ID` | ID ของ Google Sheets |
| `GOOGLE_CREDENTIALS_BASE64` | Base64 credentials (ดูด้านล่าง) |
| `LIFF_ID` | LIFF ID (ถ้ามี) |
| `PORT` | 3000 |
| `NODE_ENV` | production |

### Base64 Credentials ของคุณ:
```
ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAibGluZWJvdC00ODI1MTMiLAogICJwcml2YXRlX2tleV9pZCI6ICI2YWYzYmU0OWI2N2RmNDQ5YzhhNDY4ZjNhMzUxODJkYjJiYTZkMjMzIiwKICAicHJpdmF0ZV9rZXkiOiAiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXG5NSUlFdlFJQkFEQU5CZ2txaGtpRzl3MEJBUUVGQUFTQ0JLY3dnZ1NqQWdFQUFvSUJBUUMyUVNFbjNqU2E3NjhiXG5KOWhSWnZISWlYN1o4RnJUN1FIMC8vSVJoWWFSNEs0UVlIWlNpRkhWcldSaHkwZ3pVYUtPaU9sa3lOVGZsTlUrXG5raXhRZ0dKRmdHaWNBT0E5dXBXNG9CRmxBYXppL3RFNyttbDdXNXZDNzBYL0dvRUJrSVJGQkJ0TGZqV0ZjUHgzXG4zVVZmUGEzR3dhcXVRNmJJU3hYeHdJcWUzV094dnkvWTJkUU5PSlFKaWpCdEIzU3RSSC91M1NrRTQwUDVXaUlxXG5iNzU1Y254S2QyL21aRWwremtrcERUOEN4N1BpSmhzWnZ5dXNsYWJlRWpOeFdJQ0JiOGd4Z0Iwam9JZmZjaVUvXG56anRZaDgxMWptNFZxb05uM3VkSUtIQ2dtTEN0eEVDVDVxblowMld4clN6VWlZVXptT1dDUHVvYnY0VWpLVnBoXG4xS3ZpZXFDOUFnTUJBQUVDZ2dFQUZFb3I1c1JXRnVtWUZPM2FwelZPdFlTWkdxb25jbkJ3UjFZM0hMeEF2dnpFXG5aQTVaSGRjUFJUcUljbHF2THdkbmtYYXNoUXZXcHcxcXNBeVY0bUJva0ZRN1VTTEgxQmR4azV3K1U0QmNQdWtmXG5ZZzMrc0QwQ21qRUpHZDFaZjFNWFpwZU9jbGthbkVCMzJ1QkhXTk1GQlp1SjVOeWpOS2tuU0VLbkxBaDVrTkFIXG5odjlMM0tnSW92THhMVnZmZ1lIRDBub2pUaFM4ZXphRFc3UEFaWlBkdmIxOStFeGxQWnRCY2I1TmFLRVhHL2hZXG5DZGA2M3o4T2ZzN0N4UTF0QkNmYlJhbG5mK21rVmkvVTJIdUVCdXlUSUlrU21kSTlVNDhGU1JKakxENWVnNDRBXG5vWVZkempTMFFpZjdybFZadWVLRmFxMnFtVnlNUm9tOWVjS2pSV1YrQVFLQmdRRDFhbCtvOHNzSy8zZitBUjFzXG55a2dTSCtvVXhSckh1Y2dqQ3NabmtTN0hPQnJTSmFTTVVvQ2duYmVzOXJ5cWVxbGdFZFlwNGhIU0lOVHhZZ1B1XG5saXF5MkpVMFFVZ281U3lhK3gxSUxjQWlPaFE3aXBxdmJCSG8rdTJPTGpUQzIxK2NsdnlyY2ozQXVjelE4b0NqXG5hUlA0REFTMi9ETG5wQjFMMlI0VDh5eDI2d0tCZ1FDK0hXVkx6b0J2ODhVajBJSkgrb1U1Y3ZOd0Ird0xhSEtiXG5yWEoxZFFiMWs2YmZPK1Rnd0g4WVhtNU5VQWFOLzZXU2lJUEtBSjlyUlRINWdVblVxNmtJaGFweXFacDNyM1Z2XG5CM3hNNS9PcXhiZEh4bWFZUlhrSXJ6VFhSRTBZYThkTS9MUWZadTloNjZoTFlXL2x2MnhBRmg2QmVSK0JVVnpDXG5EM0kwMklxczl3S0JnQmFmSkl3MVBTUVpZbDBtaXlqUkNJMnJKVytlcjVaRGVNQktLUG00OXovajJ3ME43VG9HXG5ETmRCVW9IK0NHd0tmSHhmaUljNTBIeTNEQW5vQ0FiQkR0U0hoRkZaeHlZRjRmT3pQQUxBUE5xcTBkeWZMUjBJXG5jQ295bngwaEF6b0c4S3hGZXFydkQrUW8vRWt5WVVzdXoybG82akpYMHZWcE9rNFlpRjQ4WnhmYkFvR0FVMXpPXG5heFFzaTJxSHVqR1d2dnNoNmRQMjNOd01hK0FyeVFtZ0U5THg3ME1FUEFTbVVzcjFyL2pRUXdSaEsyaTY4R3I5XG41dGlwRHI5enIyVTZ1NDlkK2tlcU9zY1YzWDlKYmhzSkxTdlVVOENJb21kajIwY3pVRlNMUmcxRUJQNVZrUE9LXG5BKzc5N3FFSDFhM3ZBLzRRK0hUNmdXbGNJRGRPQmlZQnZSeHFpbmNDZ1lFQWhSR0JVUDVBZFR4RzdLUE9GMjNmXG4xTWd6eTF4WXpPVk5xcWVJNVlhWmN5VjVzV3NZb2x2Q2F4ZkplcjJ2S2xvZ2lxYTZaRlpMeGZ2bEk2TVZWYS9GXG5aQS91YVN5VklQUWdSd1BNSDZ6Yk5sSkVzU1lWZGJMcFVYSGoveEFnNXVKUFRVOXBmeWs2OUs3VGU3TE0xbHQ5XG5jeHJCRVd1YmJwZjlsdStyOVIvbjMzST1cbi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS1cbiIsCiAgImNsaWVudF9lbWFpbCI6ICJsaW5lLWJvdC1zaGVldHNAbGluZWJvdC00ODI1MTMuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJjbGllbnRfaWQiOiAiMTEwNzk5ODcxMTY3NDcyOTQ4MjY3IiwKICAiYXV0aF91cmkiOiAiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL2F1dGgiLAogICJ0b2tlbl91cmkiOiAiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLAogICJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YxL2NlcnRzIiwKICAiY2xpZW50X3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vcm9ib3QvdjEvbWV0YWRhdGEveDUwOS9saW5lLWJvdC1zaGVldHMlNDBsaW5lYm90LTQ4MjUxMy5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsCiAgInVuaXZlcnNlX2RvbWFpbiI6ICJnb29nbGVhcGlzLmNvbSIKfQo=
```

---

## 🚀 ขั้นตอนที่ 5: ได้ Public URL

1. ใน Railway Dashboard ไปที่ Deployments
2. ดู "Public URL" (เช่น `https://line-betting-bot-production.up.railway.app`)

---

## 🚀 ขั้นตอนที่ 6: ตั้ง Webhook ใน LINE

1. ไปที่ https://developers.line.biz/console/
2. เลือก Channel
3. ไปที่ "Messaging API" settings
4. ตั้ง "Webhook URL" เป็น:
   ```
   https://your-railway-url/webhook
   ```
5. Enable "Use webhook"
6. Click "Verify"

---

## ✅ ทดสอบ

```bash
# ทดสอบ health check
curl https://your-railway-url/health

# ทดสอบใน LINE
# พิมพ์ "สรุปยอดแทง"
```

---

## 🎉 เสร็จแล้ว!

Webhook ของคุณทำงาน 24/7 บน Railway.app โดยไม่ต้องรันเองบนเครื่อง

- ✅ ทำงาน 24/7
- ✅ Auto-deploy เมื่อ push code
- ✅ ราคา $5/เดือน
- ✅ ไม่ต้องจัดการ server
