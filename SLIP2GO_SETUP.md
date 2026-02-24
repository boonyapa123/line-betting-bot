# การตั้งค่า Slip2Go Webhook

## ขั้นตอนการตั้งค่า

### 1. ตรวจสอบ Webhook URL ของเรา
```
https://line-betting-bot.onrender.com/slip2go/slip-verified
```

### 2. ตั้งค่าใน Slip2Go Dashboard
1. เข้า Slip2Go Dashboard
2. ไปที่ Settings → Webhook
3. ตั้งค่า Webhook URL เป็น:
   ```
   https://line-betting-bot.onrender.com/slip2go/slip-verified
   ```
4. เลือก Events ที่ต้องการ:
   - ✅ Slip Verified
   - ✅ Slip Failed

### 3. ทดสอบ Webhook
```bash
curl -X GET https://line-betting-bot.onrender.com/slip2go/health
```

ควรได้ response:
```json
{
  "status": "ok",
  "message": "Slip2Go webhook is running"
}
```

### 4. ทดสอบการส่ง Webhook
```bash
curl -X POST https://line-betting-bot.onrender.com/slip2go/slip-verified \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "U1234567890abcdef1234567890abcdef",
    "slipId": "SLIP123456",
    "amount": 500,
    "status": "verified",
    "message": "Slip verified successfully",
    "referenceId": "REF123456",
    "transRef": "TRANS123456",
    "dateTime": "2026-02-24T18:00:00Z",
    "receiver": {
      "bank": {
        "name": "ธนาคารกรุงเทพ"
      }
    }
  }'
```

## ข้อมูลที่ Slip2Go ส่งมา

### Request Body Format
```json
{
  "userId": "LINE User ID",
  "slipId": "Slip ID from Slip2Go",
  "amount": 500,
  "status": "verified|failed",
  "message": "Status message",
  "referenceId": "Reference ID",
  "transRef": "Transaction Reference",
  "dateTime": "ISO 8601 datetime",
  "receiver": {
    "bank": {
      "name": "Bank name"
    }
  },
  "sender": {
    "bank": {
      "name": "Bank name"
    }
  }
}
```

## ระบบการทำงาน

### เมื่อสลิปตรวจสอบแล้ว (status = "verified")
1. ✅ บันทึกข้อมูลผู้เล่นลงชีท Players
   - User ID
   - ยอดเงินใหม่
   - ยอดเงินสะสม

2. ✅ บันทึกรายการเงินลงชีท Transactions
   - วันที่
   - ชื่อผู้เล่น
   - ประเภท (deposit)
   - จำนวนเงิน
   - Slip ID
   - สถานะ (verified)
   - ยอดเงินก่อนและหลัง

3. ✅ ส่งข้อความแจ้งเตือนไปยัง LINE OA
   ```
   ✅ ตรวจสอบสลิปสำเร็จ

   💰 เติมเงิน: 500 บาท
   💳 ยอดเงินใหม่: 1500 บาท
   📝 Reference ID: REF123456
   🏦 ธนาคารผู้รับ: ธนาคารกรุงเทพ

   🎉 พร้อมเล่นแล้ว!
   ```

### เมื่อสลิปไม่ถูกต้อง (status = "failed")
1. ✅ ส่งข้อความแจ้งเตือนไปยัง LINE OA
   ```
   ❌ สลิปไม่ถูกต้อง

   เหตุผล: [เหตุผลจาก Slip2Go]

   📸 กรุณาส่งสลิปใหม่
   ```

## Google Sheets Structure

### Players Sheet
| Column | Name | Description |
|--------|------|-------------|
| A | User ID | LINE User ID |
| B | Name | ชื่อผู้เล่น |
| C | Phone | เบอร์โทรศัพท์ |
| D | Email | อีเมล |
| E | Balance | ยอดเงินปัจจุบัน |
| F | Total Deposits | ยอดเงินสะสม |
| G | Total Withdrawals | ยอดถอนสะสม |
| H | Status | สถานะ (active/inactive) |
| I | Created At | วันที่สร้าง |
| J | Updated At | วันที่อัปเดต |

### Transactions Sheet
| Column | Name | Description |
|--------|------|-------------|
| A | Date | วันที่ |
| B | Player Name | ชื่อผู้เล่น |
| C | Type | ประเภท (deposit/withdraw) |
| D | Amount | จำนวนเงิน |
| E | Slip ID | Slip ID |
| F | Notes | หมายเหตุ |
| G | Status | สถานะ (verified/pending/failed) |
| H | Description | รายละเอียด |
| I | Balance Before | ยอดเงินก่อน |
| J | Balance After | ยอดเงินหลัง |
| K | Timestamp | เวลา |

## Troubleshooting

### Webhook ไม่ได้รับข้อมูล
1. ตรวจสอบ Webhook URL ใน Slip2Go Dashboard
2. ตรวจสอบ Logs ใน Render.com
3. ทดสอบ Health Check endpoint

### ข้อมูลไม่ถูกบันทึกลงชีท
1. ตรวจสอบ Google Sheets credentials
2. ตรวจสอบ GOOGLE_SHEET_ID ใน .env
3. ตรวจสอบ Logs ใน Render.com

### ไม่ได้รับข้อความ LINE
1. ตรวจสอบ LINE_CHANNEL_ACCESS_TOKEN_2
2. ตรวจสอบ LINE_CHANNEL_ID_2
3. ตรวจสอบ User ID ที่ส่งมาจาก Slip2Go

## Environment Variables

```env
# Slip2Go Configuration
SLIP2GO_SECRET_KEY=<your-secret-key>
SLIP2GO_API_URL=https://api.slip2go.com
SLIP2GO_WEBHOOK_URL=https://lisv.slip2go.com/api/line/webhook/<your-webhook-id>

# LINE Bot Configuration - Secondary Account
LINE_CHANNEL_ACCESS_TOKEN_2=<your-token>
LINE_CHANNEL_SECRET_2=<your-secret>
LINE_CHANNEL_ID_2=2009197430

# Google Sheets Configuration
GOOGLE_SHEET_ID=<your-sheet-id>
GOOGLE_CREDENTIALS_JSON=<base64-encoded-credentials>
```
