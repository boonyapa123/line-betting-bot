const express = require('express');
const { google } = require('googleapis');
const https = require('https');

/**
 * สร้าง webhook route สำหรับ Slip2Go
 */
function createSlip2GoWebhookRouter(googleAuth, googleSheetId, registrationBotAccessToken, slip2GoSecretKey, reprocessStoredMessagesCallback) {
  const router = express.Router();

  /**
   * Health check endpoint
   */
  router.get('/health', (req, res) => {
    console.log('✅ Slip2Go webhook health check');
    res.status(200).json({ status: 'ok', message: 'Slip2Go webhook is running' });
  });

  /**
   * GET /slip-verified for testing
   */
  router.get('/slip-verified', (req, res) => {
    console.log('✅ Slip2Go webhook GET request received');
    console.log(`   Query:`, req.query);
    res.status(200).json({ status: 'ok', message: 'Slip2Go webhook is running' });
  });

  /**
   * Webhook endpoint สำหรับ Slip2Go
   * รับข้อมูลการตรวจสอบสลิป และบันทึกลงชีท
   */
  router.post('/slip-verified', async (req, res) => {
    try {
      console.log('\n🔔 Slip2Go webhook received');
      console.log(`   Path: ${req.path}`);
      console.log(`   Method: ${req.method}`);
      console.log(`   Headers:`, req.headers);
      console.log(`   Body:`, JSON.stringify(req.body, null, 2));

      // ตรวจสอบว่าเป็น Slip2Go webhook หรือ LINE webhook
      if (req.body.events && req.body.destination) {
        console.log(`⚠️  This is a LINE webhook, not Slip2Go webhook`);
        console.log(`   Waiting for Slip2Go to verify the slip...`);
        res.status(200).json({ success: true, message: 'LINE webhook received, waiting for Slip2Go verification' });
        return;
      }

      const {
        userId,
        slipId,
        amount,
        status,
        message,
        referenceId,
        transRef,
        dateTime,
        receiver,
        sender,
      } = req.body;

      console.log(`   Parsed data:`, { userId, slipId, amount, status, message });

      if (!userId || !amount) {
        console.log(`❌ Missing required fields: userId=${userId}, amount=${amount}`);
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // ตอบสนองทันทีเพื่อหลีกเลี่ยง timeout
      res.status(200).json({ success: true, message: 'Webhook received' });

      // ประมวลผลในพื้นหลัง
      if (status === 'verified') {
        console.log(`✅ สลิปตรวจสอบแล้ว: ${slipId} (${amount} บาท)`);

        try {
          // Get LINE user profile
          console.log(`👤 Getting LINE user profile...`);
          let lineUserName = 'Unknown';
          let accessToken = registrationBotAccessToken;
          try {
            const userProfile = await getLineUserProfile(userId, accessToken);
            lineUserName = userProfile.displayName || 'Unknown';
            console.log(`   ✅ User name: ${lineUserName}`);
          } catch (profileError) {
            console.error(`   ⚠️  Failed to get user profile: ${profileError.message}`);
          }

          // บันทึกลงชีท Players
          console.log(`📝 บันทึกลงชีท Players...`);
          const playerResult = await _recordPlayerToSheet(
            googleAuth,
            googleSheetId,
            userId,
            lineUserName,
            accessToken,
            amount
          );

          // บันทึกลงชีท Transactions
          console.log(`📝 บันทึกลงชีท Transactions...`);
          await _recordTransactionToSheet(
            googleAuth,
            googleSheetId,
            userId,
            lineUserName,
            accessToken,
            amount,
            slipId,
            referenceId,
            transRef,
            dateTime
          );

          // บันทึกลงชีท Slip Verification
          console.log(`📝 บันทึกลงชีท Slip Verification...`);
          await _recordSlipVerificationToSheet(
            googleAuth,
            googleSheetId,
            userId,
            lineUserName,
            accessToken,
            amount,
            slipId,
            referenceId,
            transRef,
            dateTime,
            receiver,
            sender
          );

          // ส่ง automessage ไปที่ LINE OA
          console.log(`📤 ส่ง automessage ไปที่ LINE OA...`);
          const automessage = `✅ ตรวจสอบสลิปสำเร็จ\n\n` +
            `💰 เติมเงิน: ${amount} บาท\n` +
            `💳 ยอดเงินใหม่: ${playerResult.newBalance} บาท\n` +
            `📝 Reference ID: ${referenceId}\n` +
            `🏦 ธนาคารผู้รับ: ${receiver?.bank?.name || 'N/A'}\n\n` +
            `🎉 พร้อมเล่นแล้ว!`;

          await _sendLineMessage(userId, automessage, registrationBotAccessToken);

          console.log(`✅ บันทึกและส่งข้อความสำเร็จ`);
          
          // Re-process stored messages for this user
          if (reprocessStoredMessagesCallback && typeof reprocessStoredMessagesCallback === 'function') {
            console.log(`🔄 Re-processing stored messages...`);
            try {
              await reprocessStoredMessagesCallback(userId, lineUserName, registrationBotAccessToken);
            } catch (reprocessError) {
              console.error(`⚠️  Error re-processing messages: ${reprocessError.message}`);
            }
          }
        } catch (error) {
          console.error(`❌ ข้อผิดพลาดในการประมวลผล: ${error.message}`);
        }
      } else {
        console.log(`❌ สลิปไม่ถูกต้อง: ${message}`);

        try {
          // ส่งข้อความแจ้งว่าสลิปไม่ถูกต้อง
          const errorMessage = `❌ สลิปไม่ถูกต้อง\n\n` +
            `เหตุผล: ${message}\n\n` +
            `📸 กรุณาส่งสลิปใหม่`;

          await _sendLineMessage(userId, errorMessage, registrationBotAccessToken);
        } catch (error) {
          console.error(`❌ ข้อผิดพลาดในการส่งข้อความ: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      console.error(`   Stack:`, error.stack);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  return router;
}

/**
 * บันทึกข้อมูลผู้เล่นลงชีท Players
 * @private
 */
async function _recordPlayerToSheet(googleAuth, googleSheetId, userId, lineUserName, accessToken, amount) {
  try {
    console.log(`📝 _recordPlayerToSheet called:`);
    console.log(`   userId: ${userId}`);
    console.log(`   lineUserName: ${lineUserName}`);
    console.log(`   amount: ${amount}`);
    
    const sheets = google.sheets('v4');

    // ตรวจสอบว่าผู้เล่นมีอยู่แล้วหรือไม่
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Players!A:K`,
    });

    const rows = response.data.values || [];
    let playerRowIndex = null;
    let currentBalance = 0;
    let totalDeposits = 0;

    // หาแถวของผู้เล่น
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === userId) {
        playerRowIndex = i + 1;
        currentBalance = parseFloat(rows[i][4]) || 0;
        totalDeposits = parseFloat(rows[i][5]) || 0;
        console.log(`   Found player at row ${playerRowIndex}: balance=${currentBalance}, deposits=${totalDeposits}`);
        break;
      }
    }

    const now = new Date();
    const dateStr = now.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const newBalance = currentBalance + amount;
    const newTotalDeposits = totalDeposits + amount;

    if (playerRowIndex) {
      // อัปเดตผู้เล่นที่มีอยู่แล้ว
      console.log(`   📝 อัปเดตผู้เล่น: ${userId}`);

      const updateResponse = await sheets.spreadsheets.values.get({
        auth: googleAuth,
        spreadsheetId: googleSheetId,
        range: `Players!A${playerRowIndex}:K${playerRowIndex}`,
      });

      const currentRow = updateResponse.data.values ? updateResponse.data.values[0] : [];

      const newRow = [
        userId,
        lineUserName,
        currentRow[2] || '',
        currentRow[3] || '',
        newBalance,
        newTotalDeposits,
        currentRow[6] || 0,
        'active',
        currentRow[8] || dateStr,
        dateStr,
        accessToken,
      ];

      await sheets.spreadsheets.values.update({
        auth: googleAuth,
        spreadsheetId: googleSheetId,
        range: `Players!A${playerRowIndex}:K${playerRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [newRow],
        },
      });

      console.log(`   ✅ อัปเดตสำเร็จ: ${newBalance} บาท`);
    } else {
      // สร้างผู้เล่นใหม่
      console.log(`   📝 สร้างผู้เล่นใหม่: ${userId}`);

      const newRow = [
        userId,
        lineUserName,
        '',
        '',
        amount,
        amount,
        0,
        'active',
        dateStr,
        dateStr,
        accessToken,
      ];

      const nextRowIndex = rows.length + 1;

      await sheets.spreadsheets.values.update({
        auth: googleAuth,
        spreadsheetId: googleSheetId,
        range: `Players!A${nextRowIndex}:K${nextRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [newRow],
        },
      });

      console.log(`   ✅ สร้างสำเร็จ: ${amount} บาท`);
    }

    return {
      success: true,
      newBalance: newBalance,
    };
  } catch (error) {
    console.error(`   ❌ ข้อผิดพลาด: ${error.message}`);
    throw error;
  }
}

/**
 * บันทึกรายการเงินลงชีท Transactions
 * @private
 */
async function _recordTransactionToSheet(
  googleAuth,
  googleSheetId,
  userId,
  lineUserName,
  accessToken,
  amount,
  slipId,
  referenceId,
  transRef,
  dateTime
) {
  try {
    const sheets = google.sheets('v4');

    // ดึงจำนวนแถวปัจจุบัน
    const transResponse = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Transactions!A:A`,
    });

    const transRows = transResponse.data.values || [];
    const nextRowIndex = transRows.length + 1;

    const now = new Date();
    const dateStr = now.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const timeStr = now.toLocaleString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // ดึงยอดเงินก่อนหน้า
    const playerData = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Players!A:E`,
    });

    const playerDataRows = playerData.data.values || [];
    let balanceBefore = 0;

    for (let i = 1; i < playerDataRows.length; i++) {
      if (playerDataRows[i] && playerDataRows[i][0] === userId) {
        balanceBefore = parseFloat(playerDataRows[i][4]) || 0;
        break;
      }
    }

    const balanceAfter = balanceBefore + amount;

    const transactionRow = [
      dateStr,
      lineUserName,
      'deposit',
      amount,
      slipId || referenceId || '',
      '',
      'verified',
      `Slip verification passed - Ref: ${transRef}`,
      balanceBefore,
      balanceAfter,
      `${dateStr} ${timeStr}`,
      accessToken,
      userId,
    ];

    await sheets.spreadsheets.values.update({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Transactions!A${nextRowIndex}:M${nextRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [transactionRow],
      },
    });

    console.log(`   ✅ บันทึกรายการเงินสำเร็จ`);
  } catch (error) {
    console.error(`   ❌ ข้อผิดพลาด: ${error.message}`);
    throw error;
  }
}

/**
 * ส่งข้อความ LINE
 * @private
 */
async function _sendLineMessage(userId, message, accessToken) {
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
        console.log(`   ✅ ส่งข้อความสำเร็จ`);
        resolve(true);
      });
    })
      .on('error', (err) => {
        console.log(`   ❌ ข้อผิดพลาดในการส่งข้อความ: ${err.message}`);
        resolve(false);
      })
      .write(body);
  });
}

/**
 * ดึงข้อมูล LINE user profile
 */
async function getLineUserProfile(userId, accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.line.me',
      port: 443,
      path: `/v2/bot/profile/${userId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const profile = JSON.parse(data);
          resolve(profile);
        } catch (error) {
          reject(error);
        }
      });
    })
      .on('error', (err) => {
        reject(err);
      })
      .end();
  });
}

/**
 * บันทึกข้อมูลสลิปลงชีท Slip Verification
 * @private
 */
async function _recordSlipVerificationToSheet(
  googleAuth,
  googleSheetId,
  userId,
  lineUserName,
  accessToken,
  amount,
  slipId,
  referenceId,
  transRef,
  dateTime,
  receiver,
  sender
) {
  try {
    const sheets = google.sheets('v4');

    // ดึงจำนวนแถวปัจจุบัน
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `'Slip Verification'!A:A`,
    });

    const rows = response.data.values || [];
    const nextRowIndex = rows.length + 1;

    const now = new Date();
    const dateStr = now.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const timeStr = now.toLocaleString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const slipVerificationRow = [
      `${dateStr} ${timeStr}`,           // A: วันที่บันทึก
      referenceId || slipId || '',       // B: Reference ID
      transRef || '',                    // C: Transaction Ref
      amount,                            // D: จำนวนเงิน
      dateTime || dateStr,               // E: วันที่โอน
      sender?.name || '',                // F: ชื่อผู้ส่ง
      sender?.accountNumber || '',       // G: บัญชีผู้ส่ง
      sender?.bank?.name || '',          // H: ธนาคารผู้ส่ง
      receiver?.name || '',              // I: ชื่อผู้รับ
      receiver?.accountNumber || '',     // J: บัญชีผู้รับ
      receiver?.bank?.name || '',        // K: ธนาคารผู้รับ
      'verified',                        // L: สถานะ
      lineUserName,                      // M: ชื่อ LINE
      accessToken,                       // N: Access Token
    ];

    await sheets.spreadsheets.values.update({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `'Slip Verification'!A${nextRowIndex}:N${nextRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [slipVerificationRow],
      },
    });

    console.log(`   ✅ บันทึก Slip Verification สำเร็จ`);
  } catch (error) {
    console.error(`   ❌ ข้อผิดพลาด: ${error.message}`);
    throw error;
  }
}

module.exports = createSlip2GoWebhookRouter;
