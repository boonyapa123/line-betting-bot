/**
 * Official Account Service
 * อ่านคำสั่งจาก LINE Official (1-on-1) และส่งข้อความไปกลุ่ม
 * ❌ ไม่บันทึกข้อมูล
 */

import { lineClient } from '../config/line';
import { config } from '../config/environment';

export class OfficialAccountService {
  /**
   * Handle official account message (1-on-1)
   * อ่านคำสั่งจาก LINE Official
   * ✅ ไม่ตรวจสอบ admin - ทุกคนใช้ได้
   */
  static async handleOfficialMessage(
    text: string,
    userId: string,
    replyToken?: string
  ): Promise<void> {
    try {
      console.log('👤 Official account message (1-on-1):', {
        text,
        userId,
      });

      console.log('✅ Processing official account command (no admin check):', userId);

      // Parse command
      const command = text.trim();

      // Get group ID from environment or config
      const groupId = process.env.LINE_GROUP_ID;

      if (!groupId) {
        console.error('❌ LINE_GROUP_ID not set');
        if (replyToken) {
          await lineClient.replyMessage(replyToken, {
            type: 'text',
            text: '❌ ไม่สามารถเชื่อมต่อกับกลุ่มได้',
          });
        }
        return;
      }

      // Handle different commands - ไม่ตรวจสอบ admin
      switch (true) {
        case command === 'เปิดรับแทง':
          await this.handleOpenBetting(groupId, command, replyToken);
          break;

        case command === 'ส่งลิ้งค์ห้องแข่ง':
          await this.handleSendRoom(groupId, command, replyToken);
          break;

        case command === 'ส่งลิ้งค์การโอนเงิน':
          await this.handleSendPaymentLink(userId, groupId, replyToken);
          break;

        case command === 'สรุปยอดแทง':
          await this.handleSummary(groupId, command, replyToken, userId);
          break;

        case command === 'สรุปผลแข่ง':
          await this.handleResults(groupId, command, replyToken);
          break;

        default:
          if (replyToken) {
            await lineClient.replyMessage(replyToken, {
              type: 'text',
              text: '❌ คำสั่งไม่ถูกต้อง\n\nคำสั่งที่ใช้ได้:\n- เปิดรับแทง\n- ส่งลิ้งค์ห้องแข่ง\n- ส่งลิ้งค์การโอนเงิน\n- สรุปยอดแทง\n- สรุปผลแข่ง',
            });
          }
          console.log('⏭️ Unknown command:', command);
      }
    } catch (error) {
      console.error('❌ Error handling official message:', error);
      if (replyToken) {
        await lineClient.replyMessage(replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง',
        });
      }
    }
  }

  /**
   * Handle /เปิดรับแทง command
   */
  private static async handleOpenBetting(
    groupId: string,
    command: string,
    replyToken?: string
  ): Promise<void> {
    try {
      // Parse: /เปิดรับแทง <สนาม> <บั้งไฟ>
      const parts = command.split(' ');
      const venue = parts[1];
      const fireNumber = parts[2];

      if (!venue || !fireNumber) {
        if (replyToken) {
          await lineClient.replyMessage(replyToken, {
            type: 'text',
            text: '❌ รูปแบบไม่ถูกต้อง\n\nใช้: เปิดรับแทง <สนาม> <บั้งไฟ>',
          });
        }
        console.log('❌ Invalid format');
        return;
      }

      const message = `📋 เปิดรับแทง

สนาม: ${venue}
บั้งไฟ: ${fireNumber}

กรุณาส่งการแทงของคุณ`;

      await this.sendToGroup(groupId, message);
      
      if (replyToken) {
        await lineClient.replyMessage(replyToken, {
          type: 'text',
          text: '✅ ส่งคำสั่งเปิดรับแทงไปยังกลุ่มแล้ว',
        });
      }
    } catch (error) {
      console.error('❌ Error handling open betting:', error);
      if (replyToken) {
        await lineClient.replyMessage(replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาด',
        });
      }
    }
  }

  /**
   * Handle /ส่งห้องแข่ง command
   */
  private static async handleSendRoom(
    groupId: string,
    command: string,
    replyToken?: string
  ): Promise<void> {
    try {
      // Parse: /ส่งห้องแข่ง <สนาม> <ลิงค์>
      const parts = command.split(' ');
      const venue = parts[1];
      const link = parts[2];

      if (!venue || !link) {
        if (replyToken) {
          await lineClient.replyMessage(replyToken, {
            type: 'text',
            text: '❌ รูปแบบไม่ถูกต้อง\n\nใช้: ส่งลิ้งค์ห้องแข่ง <สนาม> <ลิงค์>',
          });
        }
        console.log('❌ Invalid format');
        return;
      }

      const message = `🏟️ ห้องแข่ง ${venue}

ลิงค์: ${link}

กรุณาเข้าห้องแข่งเพื่อดูการแข่ง`;

      await this.sendToGroup(groupId, message);
      
      if (replyToken) {
        await lineClient.replyMessage(replyToken, {
          type: 'text',
          text: '✅ ส่งลิงค์ห้องแข่งไปยังกลุ่มแล้ว',
        });
      }
    } catch (error) {
      console.error('❌ Error handling send room:', error);
      if (replyToken) {
        await lineClient.replyMessage(replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาด',
        });
      }
    }
  }

  /**
   * Handle ส่งลิ้งค์การโอนเงิน command
   * ส่ง LIFF form ให้แอดมินกรอกข้อมูล
   */
  private static async handleSendPaymentLink(
    userId: string,
    groupId: string,
    replyToken?: string
  ): Promise<void> {
    try {
      console.log('💳 Handling send payment link command');

      // Get LIFF URL
      const liffUrl = this.getLiffUrl();

      // Create Flex Message with LIFF button
      const message: any = {
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
                text: '💳 ส่งลิ้งค์การโอนเงิน',
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
                  uri: `${liffUrl}?groupId=${groupId}`,
                },
                color: '#667eea',
              },
            ],
          },
        },
      };

      // Send using replyMessage if available, otherwise use pushMessage
      if (replyToken) {
        await lineClient.replyMessage(replyToken, message);
        console.log('✅ LIFF form sent via reply');
      } else {
        await lineClient.pushMessage(userId, message);
        console.log('✅ LIFF form sent via push to:', userId);
      }
    } catch (error) {
      console.error('❌ Error handling send payment link:', error);
    }
  }

  /**
   * Get LIFF URL
   */
  private static getLiffUrl(): string {
    const baseUrl = config.LIFF_URL;
    const liffId = config.LIFF_ID;
    
    if (!liffId) {
      console.warn('⚠️ LIFF_ID not configured');
      return '';
    }
    
    return `${baseUrl}/${liffId}`;
  }

  /**
   * Handle /สรุปยอด command
   */
  private static async handleSummary(
    groupId: string,
    command: string,
    replyToken?: string,
    userId?: string
  ): Promise<void> {
    try {
      const message = `📊 สรุปยอดการแทง

วันนี้ยอดการแทง:
- ยอดรวม: 50,000 บาท
- จำนวนผู้เล่น: 25 คน
- จำนวนสนาม: 5 สนาม`;

      // ✅ ส่งไปยังผู้ใช้ที่ร้องขอ (1-on-1) ไม่ใช่กลุ่ม
      if (userId) {
        await lineClient.pushMessage(userId, {
          type: 'text',
          text: message,
        });
        console.log('✅ Summary sent to user:', userId);
      }
      
      if (replyToken) {
        await lineClient.replyMessage(replyToken, {
          type: 'text',
          text: '✅ ส่งสรุปยอดแทงไปแล้ว',
        });
      }
    } catch (error) {
      console.error('❌ Error handling summary:', error);
      if (replyToken) {
        await lineClient.replyMessage(replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาด',
        });
      }
    }
  }

  /**
   * Handle /แจ้งผลแทง command
   */
  private static async handleResults(
    groupId: string,
    command: string,
    replyToken?: string
  ): Promise<void> {
    try {
      // Parse: /แจ้งผลแทง <สนาม> <บั้งไฟ> <ผลลัพธ์>
      const parts = command.split(' ');
      const venue = parts[1];
      const fireNumber = parts[2];
      const results = parts[3];

      if (!venue || !fireNumber || !results) {
        if (replyToken) {
          await lineClient.replyMessage(replyToken, {
            type: 'text',
            text: '❌ รูปแบบไม่ถูกต้อง\n\nใช้: สรุปผลแข่ง <สนาม> <บั้งไฟ> <ผลลัพธ์>',
          });
        }
        console.log('❌ Invalid format');
        return;
      }

      const message = `🏆 ผลการแข่ง

สนาม: ${venue}
บั้งไฟ: ${fireNumber}
ผลลัพธ์: ${results}

ขอบคุณที่ร่วมเล่น`;

      await this.sendToGroup(groupId, message);
      
      if (replyToken) {
        await lineClient.replyMessage(replyToken, {
          type: 'text',
          text: '✅ ส่งผลแข่งไปยังกลุ่มแล้ว',
        });
      }
    } catch (error) {
      console.error('❌ Error handling results:', error);
      if (replyToken) {
        await lineClient.replyMessage(replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาด',
        });
      }
    }
  }

  /**
   * Send message to group
   */
  private static async sendToGroup(
    groupId: string,
    message: string
  ): Promise<void> {
    try {
      await lineClient.pushMessage(groupId, {
        type: 'text',
        text: message,
      });

      console.log('✅ Message sent to group:', groupId);
    } catch (error) {
      console.error('❌ Error sending message to group:', error);
    }
  }
}
