/**
 * Payment Link Service
 * จัดการการส่งข้อมูลการโอนเงิน
 * ✅ ไม่ตรวจสอบ admin - ทุกคนใช้ได้
 */

const { client } = require('../config/line');

class PaymentLinkService {
  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * Request payment link input from user
   * ขอให้ผู้ใช้ใส่ข้อมูลการโอนเงิน - ส่ง LIFF form
   */
  async requestPaymentLinkInput(replyToken, userId, groupId) {
    try {
      // Store pending request
      this.pendingRequests.set(userId, { groupId, timestamp: Date.now() });

      const liffId = process.env.LIFF_ID;
      const liffUrl = process.env.LIFF_URL || 'https://liff.line.me';

      console.log('🔍 DEBUG - LIFF_ID from env:', liffId);

      if (!liffId || liffId === 'YOUR_LIFF_ID_HERE') {
        console.warn('⚠️ LIFF_ID not configured, sending text message instead');
        const message = `💳 ส่งลิงค์การโอนเงิน

กรุณาส่งข้อมูลในรูปแบบ:
ส่งลิงค์การโอนเงิน <ธนาคาร> <เลขบัญชี> <ชื่อบัญชี>

ตัวอย่าง:
ส่งลิงค์การโอนเงิน ธนาคารกรุงไทย 1234567890 นาย ก. ใจดี`;

        await client.replyMessage(replyToken, {
          type: 'text',
          text: message,
        });
        return;
      }

      // Send LIFF form
      const liffAppUrl = `https://liff.line.me/${liffId}?groupId=${groupId}&form=payment`;
      console.log('📝 Generated LIFF URL:', liffAppUrl);
      
      const flexMessage = {
        type: 'flex',
        altText: '💳 กรุณากรอกข้อมูลการโอนเงิน',
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
              {
                type: 'text',
                text: '💳 ส่งลิงค์การโอนเงิน',
                size: 'xl',
                weight: 'bold',
                color: '#667eea',
              },
              {
                type: 'text',
                text: 'กรุณากรอกข้อมูลการโอนเงิน',
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
                  uri: liffAppUrl,
                },
                color: '#667eea',
              },
            ],
          },
        },
      };

      await client.replyMessage(replyToken, flexMessage);

      console.log('📝 LIFF form sent to user:', userId);
    } catch (error) {
      console.error('❌ Error requesting payment link input:', error);
    }
  }

  /**
   * Process payment link input
   * ประมวลผลข้อมูลการโอนเงิน
   */
  async processPaymentLinkInput(userId, text, replyToken) {
    try {
      // Check if user has pending request
      const pending = this.pendingRequests.get(userId);
      if (!pending) {
        await client.replyMessage(replyToken, {
          type: 'text',
          text: '❌ ไม่มีคำขอการส่งข้อมูลการโอนเงิน กรุณากดปุ่ม "ส่งลิงค์การโอนเงิน" ก่อน',
        });
        return;
      }

      // Parse payment link data
      const parts = text.trim().split(/\s+/);

      if (parts.length < 4) {
        await client.replyMessage(replyToken, {
          type: 'text',
          text: '❌ รูปแบบไม่ถูกต้อง\nใช้: ส่งลิงค์การโอนเงิน [ธนาคาร] [เลขบัญชี] [ชื่อบัญชี]\nตัวอย่าง: ส่งลิงค์การโอนเงิน ธนาคารกรุงไทย 1234567890 นาย ก.',
        });
        return;
      }

      const bankName = parts[1];
      const accountNumber = parts[2];
      const accountName = parts.slice(3).join(' ');

      // Validate account number
      if (!/^\d+$/.test(accountNumber)) {
        await client.replyMessage(replyToken, {
          type: 'text',
          text: '❌ เลขบัญชีต้องเป็นตัวเลขเท่านั้น',
        });
        return;
      }

      // Send to group
      const groupId = pending.groupId;
      await this.sendPaymentLinkToGroup(groupId, {
        bankName,
        accountNumber,
        accountName,
      });

      // Clear pending request
      this.pendingRequests.delete(userId);

      // Confirm to user
      await client.replyMessage(replyToken, {
        type: 'text',
        text: `✅ ส่งข้อมูลการโอนเงินไปยังกลุ่มแล้ว\n\nธนาคาร: ${bankName}\nเลขบัญชี: ${accountNumber}\nชื่อบัญชี: ${accountName}`,
      });

      console.log('✅ Payment link sent to group:', groupId);
    } catch (error) {
      console.error('❌ Error processing payment link input:', error);
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '❌ เกิดข้อผิดพลาดในการประมวลผล',
      });
    }
  }

  /**
   * Send payment link to group
   * ส่งข้อมูลการโอนเงินไปยังกลุ่ม
   */
  async sendPaymentLinkToGroup(groupId, data) {
    try {
      const message = `💳 ข้อมูลการโอนเงิน

ธนาคาร: ${data.bankName}
เลขบัญชี: ${data.accountNumber}
ชื่อบัญชี: ${data.accountName}

⏰ กรุณาชำระเงินภายในเวลาที่กำหนด`;

      await client.pushMessage(groupId, {
        type: 'text',
        text: message,
      });

      console.log('✅ Payment link message sent to group');
    } catch (error) {
      console.error('❌ Error sending payment link to group:', error);
      throw error;
    }
  }

  /**
   * Check if text is payment link input
   * ตรวจสอบว่าข้อความเป็นการใส่ข้อมูลการโอนเงินหรือไม่
   */
  isPaymentLinkInput(text) {
    return text.startsWith('ส่งลิงค์การโอนเงิน');
  }

  /**
   * Check if user has pending payment link request
   * ตรวจสอบว่าผู้ใช้มีคำขอการส่งข้อมูลการโอนเงินที่รอหรือไม่
   */
  hasPendingRequest(userId) {
    return this.pendingRequests.has(userId);
  }

  /**
   * Clear pending request
   * ลบคำขอที่รอ
   */
  clearPendingRequest(userId) {
    this.pendingRequests.delete(userId);
  }
}

// Create singleton instance
const paymentLinkService = new PaymentLinkService();

module.exports = paymentLinkService;
