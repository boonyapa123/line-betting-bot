# 🔧 แก้ไขปัญหา 404 Not Found Error

## ❌ ปัญหา

```
Error: The webhook returned an HTTP status code other than 200.(404 Not Found)
```

## 🔍 สาเหตุ

1. **Webhook handler ไม่ส่ง response 200 ทันที** - LINE ต้องได้รับ response 200 ภายใน 3 วินาที
2. **Webhook handler ไม่มีอยู่** - Route ไม่ถูกต้อง
3. **Server ไม่ online** - Server ไม่กำลัง running

## ✅ วิธีแก้ไข

### Step 1: ตรวจสอบว่า Server กำลัง running

```bash
# ทดสอบว่า Server ตอบสนอง
curl https://slip-verification.onrender.com

# ควรได้ response
```

### Step 2: ตรวจสอบว่า Webhook URL ถูกต้อง

```bash
# ทดสอบ Webhook URL
curl -X POST https://slip-verification.onrender.com/webhook/line-slip-verification \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'

# ควรได้ response 200 OK
# {"message":"OK"}
```

### Step 3: ตรวจสอบว่า Router ถูกต้อง

ในไฟล์ `index.js` ตรวจสอบว่า:

```javascript
// ✅ ถูกต้อง
const slipVerificationRouter = createLineSlipVerificationRouter(
  process.env.SLIP2GO_SECRET_KEY,
  process.env.LINE_SLIP_VERIFICATION_ACCESS_TOKEN,
  process.env.LINE_SLIP_VERIFICATION_CHANNEL_SECRET,
  googleAuth,
  GOOGLE_SHEET_ID
);
app.use('/', slipVerificationRouter);
```

### Step 4: ตรวจสอบว่า Webhook handler ส่ง response 200 ทันที

ในไฟล์ `routes/lineSlipVerificationWebhook.js`:

```javascript
// ✅ ถูกต้อง - ส่ง response 200 ทันที
router.post('/webhook/line-slip-verification', async (req, res) => {
  try {
    console.log(`\n📨 รับ Webhook จาก LINE`);
    
    const { events } = req.body;

    // ส่ง response 200 ทันที (ไม่รอให้ประมวลผลเสร็จ)
    res.status(200).json({ message: 'OK' });

    if (!events || events.length === 0) {
      console.log(`   ⏭️  ไม่มี events`);
      return;
    }

    // ประมวลผลแต่ละ Event แบบ async (ไม่รอให้เสร็จ)
    for (const event of events) {
      _handleLineEvent(event).catch(error => {
        console.error(`❌ ข้อผิดพลาดในการจัดการ Event: ${error.message}`);
      });
    }
  } catch (error) {
    console.error(`❌ ข้อผิดพลาด: ${error.message}`);
    res.status(200).json({ message: 'OK' });
  }
});
```

---

## 🔑 ประเด็นสำคัญ

### ❌ ผิด - รอให้ประมวลผลเสร็จ

```javascript
// ❌ ไม่ถูกต้อง - รอให้ประมวลผลเสร็จ
router.post('/webhook/line-slip-verification', async (req, res) => {
  const { events } = req.body;

  // ประมวลผลแต่ละ Event
  for (const event of events) {
    await _handleLineEvent(event);  // ← รอให้เสร็จ
  }

  res.status(200).json({ message: 'OK' });  // ← ส่ง response หลังจากเสร็จ
});
```

**ปัญหา:** LINE รอ response นานเกินไป → Timeout → 404 Error

### ✅ ถูก - ส่ง response ทันที

```javascript
// ✅ ถูกต้อง - ส่ง response ทันที
router.post('/webhook/line-slip-verification', async (req, res) => {
  const { events } = req.body;

  // ส่ง response 200 ทันที
  res.status(200).json({ message: 'OK' });

  // ประมวลผลแต่ละ Event แบบ async (ไม่รอให้เสร็จ)
  for (const event of events) {
    _handleLineEvent(event).catch(error => {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
    });
  }
});
```

**ข้อดี:** LINE ได้รับ response 200 ทันที → ไม่ Timeout → ✅ OK

---

## 📋 Checklist

- [ ] ตรวจสอบว่า Server กำลัง running
- [ ] ตรวจสอบว่า Webhook URL ถูกต้อง
- [ ] ตรวจสอบว่า Router ถูกต้อง
- [ ] ตรวจสอบว่า Webhook handler ส่ง response 200 ทันที
- [ ] ทดสอบ Webhook URL ด้วย curl
- [ ] ทดสอบส่งรูปภาพจาก LINE OA

---

## 🧪 ทดสอบ

### ทดสอบ Webhook URL

```bash
# ทดสอบ POST request
curl -X POST https://slip-verification.onrender.com/webhook/line-slip-verification \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'

# ควรได้ response:
# HTTP/1.1 200 OK
# {"message":"OK"}
```

### ทดสอบส่งรูปภาพจาก LINE OA

1. เพิ่ม LINE OA เป็น friend
2. ส่งรูปภาพสลิป
3. ตรวจสอบว่าได้รับข้อความตอบกลับ

---

## 📊 Timeline

```
LINE OA ส่ง Webhook
    ↓
Server รับ Webhook
    ↓
ส่ง response 200 ทันที ✅
    ↓
LINE OA ได้รับ response 200
    ↓
ประมวลผล Event แบบ async
    ↓
ส่งข้อความตอบกลับ
```

---

## 🔐 ความปลอดภัย

- ✅ ส่ง response 200 ทันที
- ✅ ประมวลผล Event แบบ async
- ✅ ไม่ block request

---

## 📞 ติดต่อสอบถาม

หากยังมีปัญหา:
1. ตรวจสอบ Server logs
2. ดู `TROUBLESHOOTING_GUIDE.md`
3. ติดต่อทีม Support

---

**Last Updated:** February 26, 2025
**Version:** 1.0.0
