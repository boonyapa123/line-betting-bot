/**
 * Postback Handler
 * จัดการ postback events จาก Rich Menu
 */

const { lineClient } = require('../config/line');
const { RichMenuHandlers } = require('./richMenuHandlers');

class PostbackHandler {
  /**
   * Handle postback event
   */
  static async handle(event) {
    try {
      const replyToken = event.replyToken;
      const data = event.postback.data;
      const source = event.source;
      const userId = source.userId;
      const groupId = source.groupId || source.roomId || source.userId;

      console.log('📨 Postback event received:', {
        action: data,
        groupId,
        timestamp: event.timestamp,
      });

      // Parse postback data
      const params = new URLSearchParams(data);
      const action = params.get('action');

      switch (action) {
        case 'open_betting':
          await RichMenuHandlers.handleOpenBetting(replyToken, groupId);
          break;

        case 'send_room':
          // This requires additional input, so we'll ask the user
          await this.askForRoomInfo(replyToken);
          break;

        case 'send_payment_link':
          // Request payment link input from admin
          await RichMenuHandlers.handleSendPaymentLink(replyToken, userId, groupId);
          break;

        case 'summary':
          await RichMenuHandlers.handleSummary(replyToken, groupId, userId);
          break;

        case 'announce_results':
          // This requires additional input
          await this.askForResultsInfo(replyToken);
          break;

        case 'report':
          await RichMenuHandlers.handleReport(replyToken, groupId);
          break;

        default:
          console.log('⏭️ Unknown action:', action);
          await this.sendReply(replyToken, '❓ ไม่เข้าใจคำสั่ง');
      }
    } catch (error) {
      console.error('❌ Error handling postback:', error);
      await this.sendReply(event.replyToken, '❌ เกิดข้อผิดพลาด');
    }
  }

  /**
   * Ask for room information
   */
  static async askForRoomInfo(replyToken) {
    const message = `🎯 ส่งห้องแข่ง

กรุณาส่งข้อมูลในรูปแบบ:
ส่งห้องแข่ง <สนาม> <บั้งไฟ>

ตัวอย่าง:
ส่งห้องแข่ง ต 310-35`;

    await this.sendReply(replyToken, message);
  }

  /**
   * Ask for results information
   */
  static async askForResultsInfo(replyToken) {
    const message = `🏆 สรุปผลแข่ง

กรุณาส่งข้อมูลในรูปแบบ:
แจ้งผลแทง <สนาม> <บั้งไฟ> <ผู้ชนะ1,ผู้ชนะ2,...>

ตัวอย่าง:
แจ้งผลแทง ต 310-35 สมชาย,สมหญิง`;

    await this.sendReply(replyToken, message);
  }

  /**
   * Send reply message
   */
  static async sendReply(replyToken, message) {
    try {
      await lineClient.replyMessage(replyToken, {
        type: 'text',
        text: message,
      });
    } catch (error) {
      console.error('❌ Error sending reply:', error);
    }
  }
}

module.exports = {
  PostbackHandler,
};
