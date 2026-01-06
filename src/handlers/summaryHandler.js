/**
 * Summary Handler
 * จัดการคำสั่ง /สรุป - รวบรวมและจัดเรียงข้อมูลการแทง
 * ✅ ไม่ตรวจสอบ admin - ทุกคนใช้ได้
 */

const { client } = require('../config/line');
const logger = require('../utils/logger');
const googleSheetsService = require('../services/googleSheetsService');
const BettingSummaryService = require('../services/betting/bettingSummaryService');
const BettingRecordService = require('../services/betting/bettingRecordService');

/**
 * Handle /สรุป command
 */
const handleSummaryCommand = async (event) => {
  try {
    const userId = event.source.userId;
    const messageText = event.message.text;
    const replyToken = event.replyToken;

    console.log('📊 Processing /สรุป command from user:', userId);

    // Initialize Google Sheets
    const sheetsInitialized = await googleSheetsService.initializeGoogleSheets();
    if (!sheetsInitialized) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '❌ ไม่สามารถเชื่อมต่อ Google Sheets ได้',
      });
      return;
    }

    // Get spreadsheet ID from environment
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '❌ ไม่พบ Spreadsheet ID',
      });
      return;
    }

    // Initialize services
    const bettingSummaryService = new BettingSummaryService(spreadsheetId);
    const bettingRecordService = new BettingRecordService(spreadsheetId);

    // Get today's date
    const todayDate = bettingRecordService.getTodayDate();

    // Generate daily summary
    const summaryResult = await bettingSummaryService.generateDailySummary(todayDate);

    if (!summaryResult.success) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '❌ ' + (summaryResult.error || 'ไม่สามารถสร้างสรุปได้'),
      });
      return;
    }

    // Format summary for display
    const formattedSummary = bettingSummaryService.formatSummaryForDisplay(
      summaryResult.summary,
      'daily'
    );

    // Send summary to the user who requested it
    await client.pushMessage(userId, {
      type: 'text',
      text: formattedSummary,
    });

    console.log('✅ Summary sent to user:', userId);

  } catch (error) {
    logger.error('Error handling summary command', error);
    try {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '❌ เกิดข้อผิดพลาด: ' + error.message,
      });
    } catch (replyError) {
      console.log('⚠️ Could not send error reply:', replyError.message);
    }
  }
};

/**
 * Handle สรุปยอดโอนเงิน command - Show payout summary for winners
 */
const handlePayoutSummaryCommand = async (event) => {
  try {
    const userId = event.source.userId;
    const replyToken = event.replyToken;

    console.log('💰 Processing สรุปยอดโอนเงิน command from user:', userId);

    // Initialize Google Sheets
    const sheetsInitialized = await googleSheetsService.initializeGoogleSheets();
    if (!sheetsInitialized) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '❌ ไม่สามารถเชื่อมต่อ Google Sheets ได้',
      });
      return;
    }

    // Get spreadsheet ID from environment
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '❌ ไม่พบ Spreadsheet ID',
      });
      return;
    }

    // Initialize services
    const bettingSummaryService = new BettingSummaryService(spreadsheetId);
    const bettingRecordService = new BettingRecordService(spreadsheetId);

    // Get today's date
    const todayDate = bettingRecordService.getTodayDate();

    // Generate daily summary
    const summaryResult = await bettingSummaryService.generateDailySummary(todayDate);

    if (!summaryResult.success) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '❌ ' + (summaryResult.error || 'ไม่สามารถสร้างสรุปได้'),
      });
      return;
    }

    // Format payout summary
    const payoutSummary = formatPayoutSummary(summaryResult.summary);

    // Send payout summary to the user who requested it
    await client.pushMessage(userId, {
      type: 'text',
      text: payoutSummary,
    });

    console.log('✅ Payout summary sent to user:', userId);

  } catch (error) {
    logger.error('Error handling payout summary command', error);
    try {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '❌ เกิดข้อผิดพลาด: ' + error.message,
      });
    } catch (replyError) {
      console.log('⚠️ Could not send error reply:', replyError.message);
    }
  }
};

/**
 * Format payout summary - show winners and their winnings
 */
const formatPayoutSummary = (summary) => {
  const { date, records } = summary;

  // Normalize status
  const normalizeStatus = (status) => {
    if (status === 'win' || status === 'ชนะ') return 'win';
    if (status === 'loss' || status === 'แพ้') return 'loss';
    if (status === 'cancel' || status === 'ยกเลิก') return 'cancel';
    return 'pending';
  };

  // Get winners
  const winners = {};
  records.forEach(record => {
    const status = normalizeStatus(record.updatedStatus || record.result || 'pending');
    
    if (status === 'win') {
      const playerName = record.lineName || 'unknown';
      if (!winners[playerName]) {
        winners[playerName] = {
          playerName,
          totalWinnings: 0,
          winCount: 0,
          details: [],
        };
      }
      const amount = record.amount || 0;
      winners[playerName].totalWinnings += amount;
      winners[playerName].winCount += 1;
      winners[playerName].details.push({
        venue: record.venue,
        message: record.message,
        amount,
      });
    }
  });

  // Sort winners by total winnings (descending)
  const sortedWinners = Object.values(winners).sort((a, b) => b.totalWinnings - a.totalWinnings);

  // Format output
  let text = `
💰 สรุปยอดโอนเงิน - ${date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();

  if (sortedWinners.length === 0) {
    text += '\n\n❌ ไม่มีผู้ชนะในวันนี้';
  } else {
    text += `\n\n✅ ผู้ชนะทั้งหมด: ${sortedWinners.length} คน\n`;
    
    sortedWinners.forEach((winner, index) => {
      text += `\n${index + 1}. ${winner.playerName}`;
      text += `\n   💰 ยอดรวม: ${winner.totalWinnings} บาท`;
      text += `\n   🎯 จำนวนครั้ง: ${winner.winCount} ครั้ง`;
      
      // Show details
      winner.details.forEach(detail => {
        text += `\n   • ${detail.venue} ${detail.message} → ${detail.amount} บาท`;
      });
    });
  }

  // Add total summary
  const totalWinnings = sortedWinners.reduce((sum, w) => sum + w.totalWinnings, 0);
  text += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  text += `\n💵 ยอดโอนเงินรวม: ${totalWinnings} บาท`;

  return text;
};

module.exports = {
  handleSummaryCommand,
  handlePayoutSummaryCommand,
};
