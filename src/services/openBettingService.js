/**
 * Open Betting Service
 * จัดการการเปิดรับแทง - ส่ง LIFF form ให้ผู้ใช้กรอกข้อมูล
 * ✅ ไม่ตรวจสอบ admin - ทุกคนใช้ได้
 */

const { client } = require('../config/line');

class OpenBettingService {
  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * Request open betting input from user
   * ขอให้ผู้ใช้ใส่ข้อมูลการเปิดรับแทง - ส่ง LIFF form
   */
  async requestOpenBettingInput(replyToken, userId, groupId) {
    try {
      // Store pending request
      this.pendingRequests.set(userId, { groupId, timestamp: Date.now() });

      const liffId = process.env.LIFF_ID;
      const liffUrl = process.env.LIFF_URL || 'https://liff.line.me';

      console.log('🔍 DEBUG - requestOpenBettingInput called with:', { userId, groupId, liffId });
      console.log('🔍 DEBUG - LIFF_ID from env:', liffId);

      if (!liffId || liffId === 'YOUR_LIFF_ID_HERE') {
        console.warn('⚠️ LIFF_ID not configured, sending text message instead');
        const message = `🎯 เปิดรับแทง

กรุณาส่งข้อมูลในรูปแบบ:
เปิดรับแทง <สนาม> <บั้งไฟ>

ตัวอย่าง:
เปิดรับแทง ต 310-35`;

        await client.replyMessage(replyToken, {
          type: 'text',
          text: message,
        });
        return;
      }

      // Send LIFF form with groupId as URL parameter
      let liffAppUrl = `https://liff.line.me/${liffId}`;
      if (groupId) {
        liffAppUrl += `?groupId=${encodeURIComponent(groupId)}`;
        console.log('📝 Generated LIFF URL with groupId:', liffAppUrl);
      } else {
        console.log('📝 Generated LIFF URL (no groupId):', liffAppUrl);
      }
      console.log('🔍 DEBUG - groupId passed via URL:', groupId);
      
      const flexMessage = {
        type: 'flex',
        altText: '🎯 กรุณากรอกข้อมูลการเปิดรับแทง',
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
              {
                type: 'text',
                text: '🎯 เปิดรับแทง',
                size: 'xl',
                weight: 'bold',
                color: '#667eea',
              },
              {
                type: 'text',
                text: 'กรุณากรอกข้อมูลการเปิดรับแทง',
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
      console.error('❌ Error requesting open betting input:', error);
    }
  }

  /**
   * Check if user has pending open betting request
   * ตรวจสอบว่าผู้ใช้มีคำขอการเปิดรับแทงที่รอหรือไม่
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
const openBettingService = new OpenBettingService();

module.exports = openBettingService;
