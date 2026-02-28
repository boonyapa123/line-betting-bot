const express = require('express');
const Slip2GoVerificationService = require('../services/betting/slip2GoVerificationService');

/**
 * สร้าง Router สำหรับ API ตรวจเงิน
 */
function createSlipCheckApiRouter(slip2GoSecretKey) {
  const router = express.Router();
  const verificationService = new Slip2GoVerificationService(slip2GoSecretKey);

  /**
   * POST /api/slip/verify
   * ตรวจสอบสลิปจากรูปภาพ
   * 
   * Request:
   * - file: รูปภาพสลิป (multipart/form-data)
   * - checkDuplicate: boolean (optional, default: true)
   * - checkReceiver: JSON string (optional)
   * - checkAmount: JSON string (optional)
   * - checkDate: JSON string (optional)
   */
  router.post('/api/slip/verify', async (req, res) => {
    try {
      console.log(`\n📨 รับ request ตรวจสอบสลิป`);

      // ตรวจสอบว่ามีไฟล์หรือไม่
      if (!req.file) {
        console.log(`❌ ไม่มีไฟล์`);
        return res.status(400).json({
          success: false,
          message: 'ไม่มีไฟล์สลิป',
          code: 'NO_FILE',
        });
      }

      console.log(`   📸 ไฟล์: ${req.file.originalname} (${req.file.size} bytes)`);

      // ดึงเงื่อนไขการตรวจสอบ
      const checkDuplicate = req.body.checkDuplicate !== 'false';
      const checkReceiver = req.body.checkReceiver ? JSON.parse(req.body.checkReceiver) : [];
      const checkAmount = req.body.checkAmount ? JSON.parse(req.body.checkAmount) : {};
      const checkDate = req.body.checkDate ? JSON.parse(req.body.checkDate) : {};

      console.log(`   ⚙️  Options:`, {
        checkDuplicate,
        checkReceiver: checkReceiver.length > 0 ? `${checkReceiver.length} conditions` : 'none',
        checkAmount: Object.keys(checkAmount).length > 0 ? checkAmount : 'none',
        checkDate: Object.keys(checkDate).length > 0 ? checkDate : 'none',
      });

      // ตรวจสอบสลิป
      const result = await verificationService.verifySlipFromBuffer(req.file.buffer, {
        checkDuplicate,
        checkReceiver,
        checkAmount,
        checkDate,
      });

      // ส่ง response
      if (result.success) {
        console.log(`✅ ตรวจสอบสำเร็จ`);
        return res.status(200).json({
          success: true,
          code: result.code,
          message: result.message,
          data: result.data,
        });
      } else {
        console.log(`❌ ตรวจสอบไม่สำเร็จ: ${result.message}`);
        return res.status(200).json({
          success: false,
          code: result.code,
          message: result.message,
        });
      }
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      res.status(500).json({
        success: false,
        message: error.message,
        code: 'ERROR',
      });
    }
  });

  /**
   * GET /api/slip/health
   * ตรวจสอบสถานะ API
   */
  router.get('/api/slip/health', (req, res) => {
    console.log(`✅ Slip Check API health check`);
    res.status(200).json({
      status: 'ok',
      message: 'Slip Check API is running',
    });
  });

  return router;
}

module.exports = createSlipCheckApiRouter;
