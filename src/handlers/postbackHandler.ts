/**
 * Postback Handler
 * จัดการ postback events จาก Rich Menu
 */

import { PostbackEvent } from '@line/bot-sdk';
import { lineClient } from '../config/line';
import { RichMenuHandlers } from './richMenuHandlers';
import { PaymentLinkService } from '../services/paymentLinkService';

export class PostbackHandler {
  /**
   * Handle postback event
   */
  static async handle(event: PostbackEvent): Promise<void> {
    try {
      const replyToken = event.replyToken;
      const data = (event.postback as any).data;
      const source = event.source as any;
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
          // Send LIFF URL to admin for input
          await RichMenuHandlers.handleSendPaymentLink(replyToken, userId, groupId);
          break;

        case 'summary':
          await RichMenuHandlers.handleSummary(replyToken, groupId);
          break;

        case 'announce_results':
          // This requires additional input, so we'll ask the user
          await this.askForResultsInfo(replyToken);
          break;

        case 'report':
          await RichMenuHandlers.handleReport(replyToken, groupId);
          break;

        default:
          await this.sendReply(replyToken, '❌ Unknown action');
      }
    } catch (error) {
      console.error('❌ Error handling postback:', error);
      await this.sendReply(event.replyToken, '❌ An error occurred');
    }
  }

  /**
   * Ask for room information
   */
  private static async askForRoomInfo(replyToken: string): Promise<void> {
    const message = `📝 ส่งห้องแข่ง

กรุณาส่งข้อมูลในรูปแบบ:
ส่งห้องแข่ง <สนาม> <บั้งไฟ>

ตัวอย่าง:
ส่งห้องแข่ง ต 310-35`;

    await this.sendReply(replyToken, message);
  }

  /**
   * Ask for payment information
   */
  private static async askForPaymentInfo(replyToken: string): Promise<void> {
    const message = `💳 ส่งลิงค์การโอนเงิน

กรุณาส่งข้อมูลในรูปแบบ:
ส่งลิงค์การโอนเงิน <ธนาคาร> <เลขบัญชี> <ชื่อบัญชี>

ตัวอย่าง:
ส่งลิงค์การโอนเงิน ธนาคารกรุงไทย 1234567890 นาย ก. ใจดี`;

    await this.sendReply(replyToken, message);
  }

  /**
   * Ask for results information
   */
  private static async askForResultsInfo(replyToken: string): Promise<void> {
    const message = `🏆 แจ้งผลแทง

กรุณาส่งข้อมูลในรูปแบบ:
แจ้งผลแทง <สนาม> <บั้งไฟ> <ผู้ชนะ1,ผู้ชนะ2,...>

ตัวอย่าง:
แจ้งผลแทง ต 310-35 สมชาย,สมหญิง`;

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
