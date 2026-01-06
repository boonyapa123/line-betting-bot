/**
 * Text Command Service
 * จัดการคำสั่งจากข้อความ
 */

import { lineClient } from '../config/line';

export class TextCommandService {
  /**
   * Handle text commands
   */
  static async handleCommand(
    replyToken: string,
    text: string
  ): Promise<void> {
    try {
      const command = text.trim();

      console.log('📝 Text command received:', {
        command,
      });

      switch (true) {
        // เปิดรับแทง - Open Betting
        case command === 'เปิดรับแทง':
          await this.handleOpenBetting(replyToken);
          break;

        // ส่งลิ้งค์ห้องแข่ง - Send Room
        case command === 'ส่งลิ้งค์ห้องแข่ง':
          await this.handleSendRoom(replyToken);
          break;

        // ส่งลิ้งค์การโอนเงิน - Send Payment Link
        case command === 'ส่งลิ้งค์การโอนเงิน':
          await this.handleSendPaymentLink(replyToken);
          break;

        // สรุปยอดแทง - Summary
        case command === 'สรุปยอดแทง':
          await this.handleSummary(replyToken);
          break;

        // สรุปผลแข่ง - Announce Results
        case command === 'สรุปผลแข่ง':
          await this.handleResults(replyToken);
          break;

        // รายงานการแข่งขัน - Report
        case command === 'รายงานการแข่งขัน':
          await this.handleHelp(replyToken);
          break;

        default:
          await this.sendReply(replyToken, '❓ Unknown command. Type รายงานการแข่งขัน for help.');
      }
    } catch (error) {
      console.error('❌ Error handling text command:', error);
      await this.sendReply(replyToken, '❌ An error occurred');
    }
  }

  /**
   * Handle เปิดรับแทง command
   */
  private static async handleOpenBetting(replyToken: string): Promise<void> {
    const message = `📋 เปิดรับแทง

กรุณาส่งข้อมูลการแทง:
/เปิดรับแทง <สนาม> <บั้งไฟ>

ตัวอย่าง:
/เปิดรับแทง ชลบุรี 123`;

    await this.sendReply(replyToken, message);
  }

  /**
   * Handle ส่งห้องแข่ง command
   */
  private static async handleSendRoom(replyToken: string): Promise<void> {
    const message = `🏟️ ส่งห้องแข่ง

กรุณาส่งข้อมูลห้องแข่ง:
/ส่งห้องแข่ง <สนาม> <ลิงค์>

ตัวอย่าง:
/ส่งห้องแข่ง ชลบุรี https://example.com`;

    await this.sendReply(replyToken, message);
  }

  /**
   * Handle ส่งลิ้งค์การโอนเงิน command
   */
  private static async handleSendPaymentLink(replyToken: string): Promise<void> {
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
                uri: liffUrl,
              },
              color: '#667eea',
            },
          ],
        },
      },
    };

    await lineClient.replyMessage(replyToken, message);
  }

  /**
   * Get LIFF URL
   */
  private static getLiffUrl(): string {
    const baseUrl = process.env.LIFF_URL || 'https://liff.line.me';
    const liffId = process.env.LIFF_ID || '';
    return `${baseUrl}/${liffId}`;
  }

  /**
   * Handle สรุปยอด command
   */
  private static async handleSummary(replyToken: string): Promise<void> {
    const message = `📊 สรุปยอดการแทง

วันนี้ยอดการแทง:
- ยอดรวม: 50,000 บาท
- จำนวนผู้เล่น: 25 คน
- จำนวนสนาม: 5 สนาม`;

    await this.sendReply(replyToken, message);
  }

  /**
   * Handle แจ้งผลแทง command
   */
  private static async handleResults(replyToken: string): Promise<void> {
    const message = `🏆 แจ้งผลแทง

กรุณาส่งผลการแข่ง`;

    await this.sendReply(replyToken, message);
  }

  /**
   * Handle help command
   */
  private static async handleHelp(replyToken: string): Promise<void> {
    const message = `📚 รายงานการแข่งขัน - คำสั่งที่ใช้ได้

🎯 คำสั่งการแทง:
เปิดรับแทง - เปิดการแทงใหม่
ส่งลิ้งค์ห้องแข่ง - ส่งข้อมูลห้องแข่ง
ส่งลิ้งค์การโอนเงิน - ส่งลิงค์โอนเงิน
สรุปยอดแทง - แสดงสรุปยอด
สรุปผลแข่ง - แจ้งผลการแข่ง

📋 คำสั่งอื่นๆ:
รายงานการแข่งขัน - แสดงคำสั่งทั้งหมด`;

    await this.sendReply(replyToken, message);
  }

  /**
   * Send reply message
   */
  private static async sendReply(replyToken: string, message: string): Promise<void> {
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
