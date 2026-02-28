const express = require('express');
const crypto = require('crypto');
const https = require('https');
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
   * POST /webhook
   * รับ Webhook จาก LINE OA เมื่อมีการส่งรูปภาพสลิป
   */
  router.post('/webhook', (req, res) => {
    try {
      console.log(`\n📨 รับ Webhook จาก LINE`);
      
      // ตรวจสอบ LINE signature
      const signature = req.headers['x-line-signature'];
      if (!_validateLineSignature(signature, req.rawBody || JSON.stringify(req.body), lineChannelSecret)) {
        console.log(`❌ Signature ไม่ถูกต้อง`);
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      const { events } = req.body;

      if (!events || events.length === 0) {
        console.log(`   ⏭️  ไม่มี events`);
        res.status(200).json({ message: 'OK' });
        return;
      }

      // ส่ง response 200 ทันที
      res.status(200).json({ message: 'OK' });

      // ประมวลผลแต่ละ Event แบบ async ในพื้นหลัง
      (async () => {
        for (const event of events) {
          try {
            await _handleLineEvent(event);
          } catch (error) {
            console.error(`❌ ข้อผิดพลาดในการจัดการ Event: ${error.message}`);
          }
        }
      })();
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      res.status(200).json({ message: 'OK' });
    }
  });

  /**
   * GET /webhook
   * Health check endpoint สำหรับ LINE verification
   */
  router.get('/webhook', (req, res) => {
    console.log(`✅ Webhook health check`);
    res.status(200).json({ status: 'ok', message: 'Webhook is running' });
  });

  /**
   * จัดการ LINE Event
   * @private
   */
  async function _handleLineEvent(event) {
    try {
      console.log(`\n📌 Processing Event Type: ${event.type}`);
      console.log(`   User ID: ${event.source?.userId}`);

      // ตรวจสอบว่าเป็น Message Event
      if (event.type !== 'message') {
        console.log(`   ⏭️  Skipping (not a message event)`);
        return;
      }

      console.log(`   Message Type: ${event.message?.type}`);

      // ตรวจสอบว่าเป็นรูปภาพ
      if (event.message?.type !== 'image') {
        console.log(`   ⏭️  Skipping (not an image)`);
        return;
      }

      const messageId = event.message.id;
      const userId = event.source.userId;
      const groupId = event.source.groupId || event.source.roomId;

      console.log(`   📸 Image Message ID: ${messageId}`);
      console.log(`   🔄 Starting slip verification...`);

      // ดาวน์โหลดรูปภาพจาก LINE
      const imageBuffer = await _downloadLineImage(messageId);
      console.log(`   ✅ Downloaded image (${imageBuffer.length} bytes)`);

      // ตรวจสอบสลิป
      console.log(`   🔍 Verifying slip...`);
      const verificationResult = await verificationService.verifySlipFromLineImage(imageBuffer);
      console.log(`   ✅ Verification result:`, verificationResult);

      // สร้างข้อความตอบกลับ
      const replyMessage = verificationService.createLineMessage(verificationResult);
      console.log(`   📝 Reply message created`);

      // ส่งข้อความตอบกลับไปยัง LINE
      console.log(`   📤 Sending reply to user...`);
      await _sendLineMessage(userId, replyMessage);

      // บันทึกข้อมูลสลิป (ถ้าตรวจสอบสำเร็จ)
      if (verificationResult.success) {
        const slipData = verificationService.extractSlipData(verificationResult);
        console.log(`\n💾 Recording slip data:`, slipData);
        
        // บันทึกลง Google Sheets ถ้ามี
        if (recordingService) {
          try {
            await recordingService.recordSlip(slipData);
            console.log(`   ✅ Recorded to Google Sheets`);
          } catch (recordError) {
            console.error(`   ⚠️  Failed to record to Google Sheets: ${recordError.message}`);
          }
        }
      }
      
      console.log(`\n✅ Event processing completed\n`);
    } catch (error) {
      console.error(`❌ ข้อผิดพลาดในการจัดการ Event: ${error.message}`);
    }
  }

  /**
   * ตรวจสอบ LINE Signature
   * @private
   */
  function _validateLineSignature(signature, body, secret) {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('base64');
    return signature === hash;
  }

  /**
   * ดาวน์โหลดรูปภาพจาก LINE
   * @private
   */
  async function _downloadLineImage(messageId) {
    return new Promise((resolve, reject) => {
      console.log(`   🌐 Downloading from LINE (messageId: ${messageId})...`);
      
      const timeout = setTimeout(() => {
        reject(new Error('Download timeout'));
      }, 10000); // 10 second timeout

      const options = {
        hostname: 'obs.line-scdn.net',
        path: `/message/${messageId}/image`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${lineAccessToken}`,
        },
      };

      https.request(options, (res) => {
        console.log(`   📡 Response status: ${res.statusCode}`);
        
        if (res.statusCode !== 200) {
          clearTimeout(timeout);
          reject(new Error(`Failed to download image: ${res.statusCode}`));
          return;
        }

        let data = Buffer.alloc(0);
        res.on('data', chunk => {
          data = Buffer.concat([data, chunk]);
        });
        res.on('end', () => {
          clearTimeout(timeout);
          console.log(`   ✅ Download complete (${data.length} bytes)`);
          resolve(data);
        });
      }).on('error', (err) => {
        clearTimeout(timeout);
        console.error(`   ❌ Download error: ${err.message}`);
        reject(err);
      }).end();
    });
  }

  /**
   * ส่งข้อความตอบกลับไปยัง LINE
   * @private
   */
  async function _sendLineMessage(userId, message) {
    return new Promise((resolve) => {
      console.log(`   📤 Sending message to user: ${userId}`);
      
      const body = JSON.stringify({
        to: userId,
        messages: [
          {
            type: 'text',
            text: message,
          },
        ],
      });

      const options = {
        hostname: 'api.line.me',
        path: '/v2/bot/message/push',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lineAccessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log(`   ✅ Message sent successfully`);
          } else {
            console.log(`   ⚠️  Message send status: ${res.statusCode}`);
          }
          resolve(true);
        });
      })
        .on('error', (err) => {
          console.log(`   ❌ Error sending message: ${err.message}`);
          resolve(false);
        })
        .write(body);
    });
  }

  return router;
}

module.exports = createLineSlipVerificationRouter;
