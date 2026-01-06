const logger = require('../../utils/logger');
const { client } = require('../../config/line');

/**
 * Admin Command Handler
 * Handles admin commands for betting system
 */
class AdminCommandHandler {
  constructor(spreadsheetId, liffId) {
    this.spreadsheetId = spreadsheetId;
    this.liffId = liffId;
  }

  /**
   * Handle admin command
   */
  async handleAdminCommand(event) {
    try {
      const { message, source, replyToken } = event;
      const { text } = message;
      const { userId } = source;

      logger.info('Processing admin command', {
        userId,
        command: text,
      });

      // Detect command
      if (text.includes('เปิดรับแทง')) {
        await this.handleOpenBettingCommand(event);
      } else if (text.includes('ส่งลิ้งค์การโอนเงิน')) {
        await this.handlePaymentLinkCommand(event);
      } else if (text.includes('สรุปยอดแทง')) {
        await this.handleBettingSummaryCommand(event);
      } else if (text.includes('สรุปผลแข่ง')) {
        await this.handleResultSummaryCommand(event);
      } else {
        // Unknown command
        await client.replyMessage(replyToken, {
          type: 'text',
          text: '❌ คำสั่งไม่ถูกต้อง\n\nคำสั่งที่ใช้ได้:\n- เปิดรับแทง\n- ส่งลิ้งค์การโอนเงิน\n- สรุปยอดแทง\n- สรุปผลแข่ง',
        });
      }
    } catch (error) {
      logger.error('Error handling admin command:', error);

      try {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง',
        });
      } catch (replyError) {
        logger.error('Error sending reply message:', replyError);
      }
    }
  }

  /**
   * Handle "เปิดรับแทง" command
   */
  async handleOpenBettingCommand(event) {
    try {
      const { replyToken, source } = event;
      const { userId } = source;

      logger.info('Opening betting form', { userId });

      // Create LIFF URL for open betting form
      const liffUrl = `https://liff.line.me/${this.liffId}?form=open-betting&userId=${userId}`;

      // Send LIFF form
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '📋 กรุณากรอกข้อมูลการเปิดรับแทง',
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'uri',
                label: 'เปิดฟอร์ม',
                uri: liffUrl,
              },
            },
          ],
        },
      });
    } catch (error) {
      logger.error('Error handling open betting command:', error);
      throw error;
    }
  }

  /**
   * Handle "ส่งลิ้งค์การโอนเงิน" command
   */
  async handlePaymentLinkCommand(event) {
    try {
      const { replyToken, source } = event;
      const { userId } = source;

      logger.info('Opening payment link form', { userId });

      // Create LIFF URL for payment link form
      const liffUrl = `https://liff.line.me/${this.liffId}?form=payment&userId=${userId}`;

      // Send LIFF form
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '💳 กรุณากรอกข้อมูลการโอนเงิน',
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'uri',
                label: 'เปิดฟอร์ม',
                uri: liffUrl,
              },
            },
          ],
        },
      });
    } catch (error) {
      logger.error('Error handling payment link command:', error);
      throw error;
    }
  }

  /**
   * Handle "สรุปยอดแทง" command
   */
  async handleBettingSummaryCommand(event) {
    try {
      const { replyToken } = event;

      logger.info('Generating betting summary');

      // This will be implemented in BettingSummaryService
      // For now, send a placeholder message
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '📊 กำลังสร้างสรุปยอดแทง...',
      });
    } catch (error) {
      logger.error('Error handling betting summary command:', error);
      throw error;
    }
  }

  /**
   * Handle "สรุปผลแข่ง" command
   */
  async handleResultSummaryCommand(event) {
    try {
      const { replyToken, source } = event;
      const { userId } = source;

      logger.info('Opening result summary form', { userId });

      // Create LIFF URL for result summary form
      const liffUrl = `https://liff.line.me/${this.liffId}?form=result-summary-form&userId=${userId}`;

      // Send LIFF form
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '🏆 กรุณากรอกผลแข่ง',
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'uri',
                label: 'เปิดฟอร์ม',
                uri: liffUrl,
              },
            },
          ],
        },
      });
    } catch (error) {
      logger.error('Error handling result summary command:', error);
      throw error;
    }
  }

  /**
   * Check if message is an admin command
   */
  static isAdminCommand(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const adminCommands = [
      'เปิดรับแทง',
      'ส่งลิ้งค์การโอนเงิน',
      'สรุปยอดแทง',
      'สรุปผลแข่ง',
    ];

    return adminCommands.some(command => text.includes(command));
  }
}

module.exports = AdminCommandHandler;
