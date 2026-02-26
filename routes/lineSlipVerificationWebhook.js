const express = require('express');
const LineSlipVerificationService = require('../services/betting/lineSlipVerificationService');
const SlipRecordingService = require('../services/betting/slipRecordingService');

/**
 * สร้าง Router สำหรับรับและตรวจสอบสลิปจาก LINE OA
 */
function createLineSlipVerificationRouter(slip2GoSecretKey, lineAccessToken, lineChannelSecret, googleAuth, googleSheetId) {
  const router = express.Router();
  const verificationService = new LineSlipVerificationService(slip2GoSecretKey);
  const recordingService = googleAuth && googleSheetId ? new SlipRecordingService(googleAuth, googleSheetId, 'Slip Verification') : null;

  /**
   * POST /webhook/line-slip-verification
   * รับ Webhook จาก LINE OA เมื่อมีการส่งรูปภาพสลิป
   */
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

  /**
   * จัดการ LINE Event
   * @private
   */
  async function _handleLineEvent(event) {
    try {
      console.log(`\n📌 Event Type: ${event.type}`);
      console.log(`   User ID: ${event.source.userId}`);

      // ตรวจสอบว่าเป็น Message Event
      if (event.type !== 'message') {
        console.log(`   ⏭️  ข้ามการประมวลผล (ไม่ใช่ message event)`);
        return;
      }

      // ตรวจสอบว่าเป็นรูปภาพ
      if (event.message.type !== 'image') {
        console.log(`   ⏭️  ข้ามการประมวลผล (ไม่ใช่รูปภาพ)`);
        return;
      }

      const messageId = event.message.id;
      const userId = event.source.userId;
      const groupId = event.source.groupId || event.source.roomId;

      console.log(`   📸 รับรูปภาพ Message ID: ${messageId}`);

      // ดาวน์โหลดรูปภาพจาก LINE
      const imageUrl = await _getLineImageUrl(messageId);
      console.log(`   🔗 Image URL: ${imageUrl}`);

      // ตรวจสอบสลิป
      const verificationResult = await verificationService.verifySlipFromLineImage(imageUrl);

      // สร้างข้อความตอบกลับ
      const replyMessage = verificationService.createLineMessage(verificationResult);

      // ส่งข้อความตอบกลับไปยัง LINE
      await _sendLineMessage(userId, replyMessage, groupId);

      // บันทึกข้อมูลสลิป (ถ้าตรวจสอบสำเร็จ)
      if (verificationResult.success) {
        const slipData = verificationService.extractSlipData(verificationResult);
        console.log(`\n💾 บันทึกข้อมูลสลิป:`, slipData);
        
        // บันทึกลง Google Sheets ถ้ามี
        if (recordingService) {
          try {
            await recordingService.recordSlip(slipData);
          } catch (recordError) {
            console.error(`⚠️  ไม่สามารถบันทึกลง Google Sheets: ${recordError.message}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ ข้อผิดพลาดในการจัดการ Event: ${error.message}`);
    }
  }

  /**
   * ดาวน์โหลดรูปภาพจาก LINE
   * @private
   */
  async function _getLineImageUrl(messageId) {
    // LINE API endpoint สำหรับดาวน์โหลดรูปภาพ
    // ใช้ messageId เพื่อดึงรูปภาพ
    return `https://obs.line-scdn.net/..../message/${messageId}/image`;
  }

  /**
   * ส่งข้อความตอบกลับไปยัง LINE
   * @private
   */
  async function _sendLineMessage(userId, message, groupId) {
    try {
      const axios = require('axios');

      const payload = {
        to: userId,
        messages: [
          {
            type: 'text',
            text: message,
          },
        ],
      };

      // ถ้าเป็น Group ให้ส่งไปยัง Group แทน
      if (groupId) {
        payload.to = groupId;
      }

      const response = await axios.post('https://api.line.biz/v1/bot/message/push', payload, {
        headers: {
          'Authorization': `Bearer ${lineAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`   ✅ ส่งข้อความสำเร็จ`);
      return response.data;
    } catch (error) {
      console.error(`   ❌ ข้อผิดพลาดในการส่งข้อความ: ${error.message}`);
      throw error;
    }
  }

  return router;
}

module.exports = createLineSlipVerificationRouter;
