const { client } = require('../config/line');
const { parseBettingMessage } = require('../utils/messageParser');
const { extractUserInfo } = require('../utils/lineUserExtractor');
const { recordBet } = require('../services/bettingService');
const { recordBetMetric, recordError } = require('../utils/monitoring');
const logger = require('../utils/logger');

/**
 * Handle betting messages
 */
const handleBettingMessage = async (event) => {
  try {
    const messageText = event.message.text;

    // Parse betting message
    const parseResult = parseBettingMessage(messageText);

    if (!parseResult.isValid) {
      // Send error message
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `❌ ${parseResult.error}\n\nExample: ต200, ชล400`,
      });
      recordError(new Error(parseResult.error));
      return;
    }

    // Extract user info
    const userInfo = await extractUserInfo(event);

    // Record bet
    const betResult = await recordBet(
      userInfo.userId,
      userInfo.lineName,
      parseResult.venue,
      parseResult.amount
    );

    if (!betResult.success) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `❌ ${betResult.error}`,
      });
      recordError(new Error(betResult.error));
      return;
    }

    // Record metric
    recordBetMetric();

    // Send confirmation
    const confirmationMessage = `✅ บันทึกการแทงสำเร็จ\n\n` +
      `ชื่อ: ${userInfo.lineName}\n` +
      `สนาม: ${parseResult.venue}\n` +
      `ยอดเงิน: ${parseResult.amount} บาท`;

    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: confirmationMessage,
    });

    logger.info(`Bet recorded: ${userInfo.lineName} - ${parseResult.venue} ${parseResult.amount}`);
  } catch (error) {
    logger.error('Error handling betting message', error);
    recordError(error);
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่',
    });
  }
};

module.exports = {
  handleBettingMessage,
};
