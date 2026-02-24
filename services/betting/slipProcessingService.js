const { google } = require('googleapis');
const https = require('https');
const Slip2GoQRVerificationService = require('./slip2GoQRVerificationService');

/**
 * ประมวลผลสลิปจาก LINE
 */
async function processSlipVerification(userId, messageId, accessToken, googleAuth, googleSheetId, slip2GoSecretKey) {
  try {
    console.log(`\n🔄 Processing slip verification`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Message ID: ${messageId}`);

    // ดาวน์โหลดรูปภาพสลิป
    console.log(`📥 Downloading slip image...`);
    const imageBuffer = await downloadSlipImageFromLine(messageId, accessToken);
    console.log(`✅ Image downloaded: ${imageBuffer.length} bytes`);

    // ตรวจสอบสลิปโดยใช้ Slip2Go API
    console.log(`🔍 Verifying slip with Slip2Go API...`);
    const slip2GoService = new Slip2GoQRVerificationService(slip2GoSecretKey);
    
    // TODO: Extract QR Code from image
    // For now, we'll assume the QR code is provided separately
    // const qrCode = await extractQRCodeFromImage(imageBuffer);
    
    // ตัวอย่าง: ใช้ QR code จากข้อความ
    // const result = await slip2GoService.verifySlipFromQRCode(qrCode, {
    //   checkDuplicate: true,
    // });

    // if (!result.success) {
    //   console.log(`❌ Slip verification failed: ${result.message}`);
    //   await sendLineMessage(userId, `❌ สลิปไม่ถูกต้อง\n\nเหตุผล: ${result.message}`, accessToken);
    //   return;
    // }

    // const slipInfo = slip2GoService.extractSlipInfo(result.data);
    // console.log(`✅ Slip verified:`, slipInfo);

    // // บันทึกข้อมูลผู้เล่น
    // console.log(`📝 Recording player data...`);
    // const playerResult = await recordPlayerToSheet(googleAuth, googleSheetId, userId, slipInfo.amount);

    // // บันทึกรายการเงิน
    // console.log(`📝 Recording transaction...`);
    // await recordTransactionToSheet(googleAuth, googleSheetId, userId, slipInfo.amount, slipInfo.referenceId);

    // // ส่งข้อความยืนยัน
    // console.log(`📤 Sending confirmation message...`);
    // const message = `✅ ตรวจสอบสลิปสำเร็จ\n\n💰 เติมเงิน: ${slipInfo.amount} บาท\n💳 ยอดเงินใหม่: ${playerResult.newBalance} บาท\n🎉 พร้อมเล่นแล้ว!`;
    // await sendLineMessage(userId, message, accessToken);

    console.log(`✅ Slip processing completed`);
  } catch (error) {
    console.error(`❌ Slip processing error: ${error.message}`);
    console.error(`   Stack:`, error.stack);
  }
}

/**
 * ดาวน์โหลดรูปภาพจาก LINE
 */
async function downloadSlipImageFromLine(messageId, accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'obs.line-scdn.net',
      path: `/web${messageId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    };

    https.request(options, (res) => {
      let data = '';
      res.setEncoding('binary');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(Buffer.from(data, 'binary'));
      });
    }).on('error', (err) => {
      reject(err);
    }).end();
  });
}

/**
 * ส่งข้อความ LINE
 */
async function sendLineMessage(userId, message, accessToken) {
  return new Promise((resolve) => {
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
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        console.log(`   ✅ Message sent`);
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

module.exports = {
  processSlipVerification,
  downloadSlipImageFromLine,
  sendLineMessage,
};
