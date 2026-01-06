const logger = require('../../utils/logger');
const PlayerBettingParser = require('../../services/betting/playerBettingParser');
const BettingRecordService = require('../../services/betting/bettingRecordService');
const { client } = require('../../config/line');

/**
 * Player Betting Handler
 * Handles betting messages from players in group chat
 */
class PlayerBettingHandler {
  constructor(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
    this.bettingRecordService = new BettingRecordService(spreadsheetId);
  }

  /**
   * Handle player betting message
   */
  async handleBettingMessage(event) {
    try {
      const { message, source, replyToken } = event;
      const { text } = message;
      const { userId, groupId } = source;

      logger.info('Processing betting message', {
        userId,
        groupId,
        message: text,
      });

      // Parse betting message
      const parsed = PlayerBettingParser.extractBettingInfo(text);

      if (!parsed.success) {
        logger.warn('Failed to parse betting message', {
          userId,
          message: text,
          error: parsed.error,
        });

        // Send error message
        await client.replyMessage(replyToken, {
          type: 'text',
          text: `❌ ${parsed.error}\n\nรูปแบบที่ถูกต้อง: "ชื่อ 100 บั้งไฟสีแดง สนามกรุงเทพ"`,
        });

        return;
      }

      const { playerName, amount, fireworks, stadium } = parsed.data;

      // Save betting record
      const saveResult = await this.bettingRecordService.saveBettingRecord(
        playerName,
        amount,
        fireworks,
        stadium,
        userId,
        groupId
      );

      if (!saveResult.success) {
        logger.error('Failed to save betting record', {
          userId,
          playerName,
          error: saveResult.error,
        });

        // Send error message
        await client.replyMessage(replyToken, {
          type: 'text',
          text: `❌ ${saveResult.error}`,
        });

        return;
      }

      logger.info('Betting record saved successfully', {
        userId,
        playerName,
        amount,
        fireworks,
        stadium,
      });

      // Send confirmation message (optional - based on requirements, we don't send confirmation)
      // Just log the successful save
    } catch (error) {
      logger.error('Error handling betting message:', error);

      // Send error message to user
      try {
        await client.replyMessage(replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาดในการบันทึกการแทง',
        });
      } catch (replyError) {
        logger.error('Error sending reply message:', replyError);
      }
    }
  }

  /**
   * Check if message is a betting message
   * Returns true if message looks like a betting message
   */
  static isBettingMessage(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }

    // Check if message contains numbers (amount)
    const hasAmount = /\d+/.test(text);

    // Check if message contains betting-related keywords
    const bettingKeywords = ['บั้ง', 'สนาม', 'บาท', 'แทง'];
    const hasBettingKeyword = bettingKeywords.some(keyword => text.includes(keyword));

    return hasAmount && hasBettingKeyword;
  }
}

module.exports = PlayerBettingHandler;
