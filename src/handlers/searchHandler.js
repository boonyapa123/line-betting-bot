const { client } = require('../config/line');
const { getBetHistory } = require('../services/bettingService');
const { generatePlayerReport } = require('../services/reportService');

/**
 * Handle bet history search request
 */
const handleBetHistorySearch = async (event, filters = {}) => {
  try {
    const messageText = event.message.text;

    // Parse search criteria from message
    // Format: "ประวัติ [userId/lineName] [venue] [limit]"
    const parts = messageText.split(' ');

    const searchFilters = {
      limit: filters.limit || 20,
    };

    if (parts[1]) {
      // Could be userId or lineName
      searchFilters.lineName = parts[1];
    }

    if (parts[2]) {
      searchFilters.venue = parts[2];
    }

    if (parts[3]) {
      searchFilters.limit = parseInt(parts[3], 10);
    }

    const result = await getBetHistory(searchFilters);

    if (!result.success || result.count === 0) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '❌ ไม่พบประวัติการแทง',
      });
      return;
    }

    // Format results
    let historyMessage = `📋 ประวัติการแทง (${result.count} รายการ)\n`;
    historyMessage += `${'='.repeat(40)}\n\n`;

    result.bets.forEach((bet, index) => {
      historyMessage += `${index + 1}. ${bet.lineName}\n`;
      historyMessage += `   สนาม: ${bet.venue}\n`;
      historyMessage += `   ยอดเงิน: ${bet.amount} บาท\n`;
      historyMessage += `   ผล: ${bet.result}\n`;
      historyMessage += `   เวลา: ${new Date(bet.timestamp).toLocaleString('th-TH')}\n\n`;
    });

    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: historyMessage,
    });
  } catch (error) {
    console.error('Error handling bet history search:', error);
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่',
    });
  }
};

/**
 * Handle player statistics request
 */
const handlePlayerStatsRequest = async (event, userId) => {
  try {
    const result = await generatePlayerReport(userId);

    if (!result.success) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `❌ ${result.error}`,
      });
      return;
    }

    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: result.report,
    });
  } catch (error) {
    console.error('Error handling player stats request:', error);
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่',
    });
  }
};

module.exports = {
  handleBetHistorySearch,
  handlePlayerStatsRequest,
};
