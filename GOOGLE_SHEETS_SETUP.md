# 🔐 Google Sheets Setup - Service Account Access

## ปัญหา
ระบบแสดง "✅ Row appended successfully" แต่ข้อมูลไม่ได้บันทึกลงชีท

## สาเหตุ
Service Account ไม่มี access ไปยัง Google Sheet

## วิธีแก้ไข

### ขั้นตอนที่ 1: ได้ Service Account Email
จาก `credentials.json`:
```
line-bot-sheets@linebot-482513.iam.gserviceaccount.com
```

### ขั้นตอนที่ 2: Share Google Sheet กับ Service Account

1. ไปที่ Google Sheet:
   ```
   https://docs.google.com/spreadsheets/d/1rRVKOpYZbOFpRiZ2ym5b5AFcB4e_swQe8y9y9UlhDAQ
   ```

2. คลิก **Share** (ปุ่มสีน้ำเงิน ด้านบนขวา)

3. ใส่ Service Account Email:
   ```
   line-bot-sheets@linebot-482513.iam.gserviceaccount.com
   ```

4. เลือก **Editor** (ให้ permission เขียนข้อมูล)

5. คลิก **Share**

6. ปิด dialog

### ขั้นตอนที่ 3: ทดสอบใหม่

```bash
node test-local-webhook.js
```

**ผลลัพธ์ที่ควรเห็น:**
```
✅ Row appended successfully to row 2
✅ Pair recorded successfully
```

และข้อมูลจะปรากฏใน Google Sheet!

## ✅ ตรวจสอบ Google Sheet

1. ไปที่ Google Sheet
2. ดูว่า Row 2 มีข้อมูลหรือไม่
3. ตรวจสอบ:
   - Timestamp
   - User A ID
   - Message
   - Bet Type
   - Amount
   - User B ID

## 🔍 Troubleshooting

### ยังไม่เห็นข้อมูล
- ตรวจสอบว่า Service Account มี Editor access
- ลองรีเฟรช Google Sheet
- ลองรันเทสใหม่

### Permission Denied Error
- ตรวจสอบว่า email ถูกต้อง
- ตรวจสอบว่า permission เป็น Editor
- ลองลบและเพิ่มใหม่

### Sheet ไม่มี Worksheet "Bets"
- ตรวจสอบว่า Worksheet ชื่อ "Bets" มีอยู่
- ถ้าไม่มี ให้สร้างใหม่
- ตรวจสอบ `GOOGLE_WORKSHEET_NAME` ใน `.env`

---

**หลังจากทำเสร็จ ข้อมูลจะบันทึกลงชีทได้!** ✅
