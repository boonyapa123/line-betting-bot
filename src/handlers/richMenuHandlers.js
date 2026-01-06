/**
 * Rich Menu Handlers
 * จัดการการทำงานของปุ่มต่างๆ ใน Rich Menu
 */

const { client } = require('../config/line');

class RichMenuHandlers {
  /**
   * Handle "เปิดแทง" (Open Betting) button
   */
  static async handleOpenBetting(replyToken, groupId) {
    try {
      console.log('🎯 Handling open betting request');

      // Get LIFF URL
      const liffId = process.env.LIFF_ID || '';
      const liffUrl = `https://liff.line.me/${liffId}?form=open-betting`;

      console.log('🔗 LIFF URL:', liffUrl);

      // Create Flex Message with LIFF button
      const message = {
        type: 'flex',
        altText: '🎯 กรุณากรอกข้อมูลการเปิดรับแทง',
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '🎯 เปิดรับแทง',
                weight: 'bold',
                size: 'xl',
                color: '#FFFFFF',
              },
            ],
            backgroundColor: '#667eea',
            paddingAll: 15,
          },
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
              {
                type: 'text',
                text: 'กรุณากรอกข้อมูลการเปิดรับแทง',
                size: 'md',
                weight: 'bold',
                color: '#333333',
              },
              {
                type: 'text',
                text: 'คลิกปุ่มด้านล่างเพื่อเปิดฟอร์มกรอกข้อมูล',
                size: 'sm',
                color: '#999999',
                wrap: true,
              },
            ],
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                height: 'sm',
                action: {
                  type: 'uri',
                  label: '📝 กรอกข้อมูล',
                  uri: liffUrl,
                },
                color: '#667eea',
              },
            ],
          },
        },
      };

      console.log('📤 Sending Flex Message');
      await client.replyMessage(replyToken, message);

      console.log('✅ LIFF URL sent to user for open betting');
    } catch (error) {
      console.error('❌ Error in handleOpenBetting:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      
      // Send simple text message as fallback
      try {
        const liffId = process.env.LIFF_ID || '';
        const liffUrl = `https://liff.line.me/${liffId}?form=open-betting`;
        const fallbackMessage = `🎯 เปิดรับแทง\n\nกรุณากดลิงค์ด้านล่างเพื่อกรอกข้อมูล:\n${liffUrl}`;
        await client.replyMessage(replyToken, {
          type: 'text',
          text: fallbackMessage,
        });
      } catch (fallbackError) {
        console.error('❌ Fallback error:', fallbackError);
      }
    }
  }

  /**
   * Handle "ส่งห้องแข่ง" (Send Room) button
   */
  static async handleSendRoom(replyToken, groupId, venue, fireNumber) {
    try {
      const message = `🎯 ส่งห้องแข่ง ${venue}\n\nบั้งไฟ: ${fireNumber}`;
      await this.sendReply(replyToken, message);
    } catch (error) {
      console.error('❌ Error in handleSendRoom:', error);
      await this.sendReply(replyToken, '❌ เกิดข้อผิดพลาด');
    }
  }

  /**
   * Handle "ส่งลิงค์การโอนเงิน" (Send Payment Link) button
   */
  static async handleSendPaymentLink(replyToken, adminId, groupId) {
    try {
      console.log('💳 Handling send payment link request');

      // Get LIFF URL
      const liffId = process.env.LIFF_ID || '';
      const liffUrl = `https://liff.line.me/${liffId}?form=payment`;

      // Send LIFF URL to admin
      const message = {
        type: 'flex',
        altText: '💳 กรุณากรอกข้อมูลการโอนเงิน',
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '💳 ส่งลิงค์การโอนเงิน',
                weight: 'bold',
                size: 'xl',
                color: '#FFFFFF',
              },
            ],
            backgroundColor: '#667eea',
            paddingAll: 15,
          },
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
              {
                type: 'text',
                text: 'กรุณากรอกข้อมูลการโอนเงิน',
                size: 'md',
                weight: 'bold',
                color: '#333333',
              },
              {
                type: 'text',
                text: 'คลิกปุ่มด้านล่างเพื่อเปิดฟอร์มกรอกข้อมูล',
                size: 'sm',
                color: '#999999',
                wrap: true,
              },
            ],
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                height: 'sm',
                action: {
                  type: 'uri',
                  label: '📝 กรอกข้อมูล',
                  uri: liffUrl,
                },
                color: '#667eea',
              },
            ],
          },
        },
      };

      await client.replyMessage(replyToken, message);

      console.log('✅ LIFF URL sent to user');
    } catch (error) {
      console.error('❌ Error in handleSendPaymentLink:', error);
      await this.sendReply(replyToken, '❌ เกิดข้อผิดพลาด');
    }
  }

  /**
   * Handle "สรุปยอดแทง" (Summary) button
   */
  static async handleSummary(replyToken, groupId) {
    try {
      const message = '📊 สรุปยอดการแทง\n\nยอดรวม: 0 บาท';
      await this.sendReply(replyToken, message);
    } catch (error) {
      console.error('❌ Error in handleSummary:', error);
      await this.sendReply(replyToken, '❌ เกิดข้อผิดพลาด');
    }
  }

  /**
   * Handle "สรุปผลแข่ง" (Announce Results) button
   */
  static async handleAnnounceResults(replyToken, groupId, venue, fireNumber, winners) {
    try {
      const message = `🏆 สรุปผลแข่ง ${venue}\n\nบั้งไฟ: ${fireNumber}`;
      await this.sendReply(replyToken, message);
    } catch (error) {
      console.error('❌ Error in handleAnnounceResults:', error);
      await this.sendReply(replyToken, '❌ เกิดข้อผิดพลาด');
    }
  }

  /**
   * Handle "รายงานการแข่งขัน" (Report) button
   */
  static async handleReport(replyToken, groupId) {
    try {
      const message = '📈 รายงานการแข่งขัน\n\nไม่มีข้อมูล';
      await this.sendReply(replyToken, message);
    } catch (error) {
      console.error('❌ Error in handleReport:', error);
      await this.sendReply(replyToken, '❌ เกิดข้อผิดพลาด');
    }
  }

  /**
   * Send reply message
   */
  static async sendReply(replyToken, message) {
    try {
      if (typeof message === 'string') {
        await client.replyMessage(replyToken, {
          type: 'text',
          text: message,
        });
      } else if (typeof message === 'object') {
        await client.replyMessage(replyToken, message);
      }
    } catch (error) {
      console.error('❌ Error sending reply:', error);
    }
  }
}

module.exports = {
  RichMenuHandlers,
};
