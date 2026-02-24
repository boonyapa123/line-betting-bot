const express = require('express');
const { google } = require('googleapis');
const https = require('https');

/**
 * สร้าง webhook route สำหรับ Slip2Go
 */
function createSlip2GoWebhookRouter(googleAuth, googleSheetId, registrationBotAccessToken, slip2GoSecretKey) {
  const router = express.Router();

  /**
   * Webhook endpoint สำหรับ Slip2Go
   * รับข้อมูลการตรวจสอบสลิป และบันทึกลงชีท
   */
  router.post('/slip-verified', async (req, res) => {
    try {
      console.log('\n🔔 Webhook จาก Slip2Go');
      console.log(`   Body:`, JSON.stringify(req.body, null, 2));

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

      if (status === 'verified') {
        console.log(`✅ สลิปตรวจสอบแล้ว: ${slipId} (${amount} บาท)`);

        // บันทึกลงชีท Players
        console.log(`📝 บันทึกลงชีท Players...`);
        const playerResult = await _recordPlayerToSheet(
          googleAuth,
          googleSheetId,
          userId,
          amount
        );

        // บันทึกลงชีท Transactions
        console.log(`📝 บันทึกลงชีท Transactions...`);
        await _recordTransactionToSheet(
          googleAuth,
          googleSheetId,
          userId,
          amount,
          slipId,
          referenceId,
          transRef,
          dateTime
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
      } else {
        console.log(`❌ สลิปไม่ถูกต้อง: ${message}`);

        // ส่งข้อความแจ้งว่าสลิปไม่ถูกต้อง
        const errorMessage = `❌ สลิปไม่ถูกต้อง\n\n` +
          `เหตุผล: ${message}\n\n` +
          `📸 กรุณาส่งสลิปใหม่`;

        await _sendLineMessage(userId, errorMessage, registrationBotAccessToken);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

/**
 * บันทึกข้อมูลผู้เล่นลงชีท Players
 * @private
 */
async function _recordPlayerToSheet(googleAuth, googleSheetId, userId, amount) {
  try {
    const sheets = google.sheets('v4');

    // ตรวจสอบว่าผู้เล่นมีอยู่แล้วหรือไม่
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Players!A:J`,
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
        range: `Players!A${playerRowIndex}:J${playerRowIndex}`,
      });

      const currentRow = updateResponse.data.values ? updateResponse.data.values[0] : [];

      const newRow = [
        userId,
        currentRow[1] || 'Unknown',
        currentRow[2] || '',
        currentRow[3] || '',
        newBalance,
        newTotalDeposits,
        currentRow[6] || 0,
        'active',
        currentRow[8] || dateStr,
        dateStr,
      ];

      await sheets.spreadsheets.values.update({
        auth: googleAuth,
        spreadsheetId: googleSheetId,
        range: `Players!A${playerRowIndex}:J${playerRowIndex}`,
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
        'Unknown',
        '',
        '',
        amount,
        amount,
        0,
        'active',
        dateStr,
        dateStr,
      ];

      const nextRowIndex = rows.length + 1;

      await sheets.spreadsheets.values.update({
        auth: googleAuth,
        spreadsheetId: googleSheetId,
        range: `Players!A${nextRowIndex}:J${nextRowIndex}`,
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
  amount,
  slipId,
  referenceId,
  transRef,
  dateTime
) {
  try {
    const sheets = google.sheets('v4');

    // ดึงข้อมูลผู้เล่นเพื่อหาชื่อ
    const playerResponse = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Players!A:B`,
    });

    const playerRows = playerResponse.data.values || [];
    let playerName = 'Unknown';

    for (let i = 1; i < playerRows.length; i++) {
      if (playerRows[i] && playerRows[i][0] === userId) {
        playerName = playerRows[i][1] || 'Unknown';
        break;
      }
    }

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
      playerName,
      'deposit',
      amount,
      slipId || referenceId || '',
      '',
      'verified',
      `Slip verification passed - Ref: ${transRef}`,
      balanceBefore,
      balanceAfter,
      `${dateStr} ${timeStr}`,
    ];

    await sheets.spreadsheets.values.update({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Transactions!A${nextRowIndex}:K${nextRowIndex}`,
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

module.exports = createSlip2GoWebhookRouter;
