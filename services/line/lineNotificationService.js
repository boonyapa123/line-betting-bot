/**
 * LineNotificationService
 * ส่งข้อความแจ้งเตือนไปยัง LINE (ส่วนตัวและกลุ่ม)
 */

const axios = require('axios');

class LineNotificationService {
  constructor(accountNumber = 1) {
    // ใช้ Account ที่ระบุ (default = Account 1)
    const tokenKey = accountNumber === 1 
      ? 'LINE_CHANNEL_ACCESS_TOKEN'
      : `LINE_CHANNEL_ACCESS_TOKEN_${accountNumber}`;
    
    this.accessToken = process.env[tokenKey];
    this.accountNumber = accountNumber;
    this.apiUrl = 'https://api.line.me/v2/bot/message';
    
    if (!this.accessToken) {
      console.warn(`⚠️  Warning: ${tokenKey} not found in environment variables`);
    }
  }

  /**
   * ส่งข้อความส่วนตัวไปยัง User
   * @param {string} userId - LINE User ID
   * @param {string} message - ข้อความ
   */
  async sendPrivateMessage(userId, message) {
    try {
      console.log(`📤 Sending private message to ${userId} via Account ${this.accountNumber}`);
      console.log(`   Message length: ${message.length} characters`);
      console.log(`   Has access token: ${!!this.accessToken}`);
      
      const response = await axios.post(
        `${this.apiUrl}/push`,
        {
          to: userId,
          messages: [
            {
              type: 'text',
              text: message,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✅ ส่งข้อความส่วนตัวไปยัง ${userId} สำเร็จ (Status: ${response.status})`);
      return { success: true };
    } catch (error) {
      console.error(`❌ เกิดข้อผิดพลาดในการส่งข้อความส่วนตัว:`);
      console.error(`   User ID: ${userId}`);
      console.error(`   Error: ${error.message}`);
      if (error.response) {
        console.error(`   Response status: ${error.response.status}`);
        console.error(`   Response data:`, error.response.data);
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * ส่งข้อความไปยังกลุ่ม
   * @param {string} groupId - LINE Group ID
   * @param {string} message - ข้อความ
   */
  async sendGroupMessage(groupId, message) {
    try {
      console.log(`📢 Sending group message to ${groupId} via Account ${this.accountNumber}`);
      console.log(`   Message length: ${message.length} characters`);
      console.log(`   Has access token: ${!!this.accessToken}`);
      
      const response = await axios.post(
        `${this.apiUrl}/push`,
        {
          to: groupId,
          messages: [
            {
              type: 'text',
              text: message,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✅ ส่งข้อความไปยังกลุ่ม ${groupId} สำเร็จ (Status: ${response.status})`);
      return { success: true };
    } catch (error) {
      console.error(`❌ เกิดข้อผิดพลาดในการส่งข้อความกลุ่ม:`);
      console.error(`   Group ID: ${groupId}`);
      console.error(`   Error: ${error.message}`);
      if (error.response) {
        console.error(`   Response status: ${error.response.status}`);
        console.error(`   Response data:`, error.response.data);
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * ส่งข้อความตอบกลับ (Reply)
   * @param {string} replyToken - LINE Reply Token
   * @param {string} message - ข้อความ
   */
  async sendReplyMessage(replyToken, message) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/reply`,
        {
          replyToken,
          messages: [
            {
              type: 'text',
              text: message,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✅ ส่งข้อความตอบกลับสำเร็จ`);
      return { success: true };
    } catch (error) {
      console.error(`❌ เกิดข้อผิดพลาดในการส่งข้อความตอบกลับ:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ส่งข้อความแบบ Flex Message
   * @param {string} userId - LINE User ID
   * @param {object} flexMessage - Flex Message Object
   */
  async sendFlexMessage(userId, flexMessage) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/push`,
        {
          to: userId,
          messages: [
            {
              type: 'flex',
              altText: 'ผลการเล่น',
              contents: flexMessage,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✅ ส่ง Flex Message ไปยัง ${userId} สำเร็จ`);
      return { success: true };
    } catch (error) {
      console.error(`❌ เกิดข้อผิดพลาดในการส่ง Flex Message:`, error.message);
      return { success: false, error: error.message };
    }
  }
  /**
   * ส่งรูปภาพไปยังกลุ่ม
   * @param {string} groupId - LINE Group ID
   * @param {string} originalContentUrl - URL รูปภาพต้นฉบับ
   * @param {string} previewImageUrl - URL รูปภาพ preview
   */
  async sendGroupImageMessage(groupId, originalContentUrl, previewImageUrl) {
    try {
      console.log(`📢 Sending image to group ${groupId} via Account ${this.accountNumber}`);

      const response = await axios.post(
        `${this.apiUrl}/push`,
        {
          to: groupId,
          messages: [
            {
              type: 'image',
              originalContentUrl: originalContentUrl,
              previewImageUrl: previewImageUrl,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✅ ส่งรูปภาพไปยังกลุ่ม ${groupId} สำเร็จ (Status: ${response.status})`);
      return { success: true };
    } catch (error) {
      console.error(`❌ เกิดข้อผิดพลาดในการส่งรูปภาพกลุ่ม:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = { LineNotificationService };
