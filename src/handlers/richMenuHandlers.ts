/**
 * Rich Menu Handlers
 * จัดการการทำงานของปุ่มต่างๆ ใน Rich Menu
 */

import { lineClient } from '../config/line';
import { ChatAggregationService } from '../services/chatAggregationService';
import { ResultService } from '../services/resultService';
import { PaymentLinkService } from '../services/paymentLinkService';
import { LiffPaymentService } from '../services/liffPaymentService';
import { VenueRepository } from '../models/Venue';
import { BettingRound } from '../models/BettingRound';
import { ERROR_MESSAGES } from '../config/constants';

export class RichMenuHandlers {
  /**
   * Handle "เปิดแทง" (Open Betting) button
   * Send LIFF URL to admin for input
   */
  static async handleOpenBetting(replyToken: string, groupId: string): Promise<void> {
    try {
      console.log('🎯 Handling open betting request');

      // Get LIFF URL with groupId
      const liffUrl = this.getLiffUrl('open-betting', groupId);

      // Create Flex Message with LIFF button
      const message: any = {
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

      await lineClient.replyMessage(replyToken, message);

      console.log('✅ LIFF URL sent to user for open betting');
    } catch (error) {
      console.error('❌ Error in handleOpenBetting:', error);
      await this.sendReply(replyToken, `❌ ${ERROR_MESSAGES.DATABASE_ERROR}`);
    }
  }

  /**
   * Handle "ส่งห้องแข่ง" (Send Room) button
   * Allow admin to input betting information and send to group
   */
  static async handleSendRoom(
    replyToken: string,
    groupId: string,
    venue: string,
    fireNumber: string
  ): Promise<void> {
    try {
      // Validate venue
      const venueData = await VenueRepository.findByName(venue, groupId);
      if (!venueData) {
        await this.sendReply(replyToken, `❌ ไม่พบสนาม: ${venue}`);
        return;
      }

      // Create message
      let message = `🎯 เปิดแทง ${venue}\n\n`;
      message += `บั้งไฟ: ${fireNumber}\n`;
      message += `ลิงค์ห้องแข่ง:\n${venueData.roomLink}\n\n`;

      if (venueData.paymentLink) {
        message += `💳 ลิงค์ชำระเงิน:\n${venueData.paymentLink}`;
      }

      // Send to group
      await lineClient.pushMessage(groupId, {
        type: 'text',
        text: message,
      });

      await this.sendReply(replyToken, `✅ ส่งข้อมูลห้องแข่งไปยังกลุ่มแล้ว`);
    } catch (error) {
      console.error('❌ Error in handleSendRoom:', error);
      await this.sendReply(replyToken, `❌ ${ERROR_MESSAGES.DATABASE_ERROR}`);
    }
  }

  /**
   * Handle "ส่งลิงค์การโอน" (Send Payment Link) button
   * Send LIFF URL to admin for input
   */
  static async handleSendPaymentLink(replyToken: string, adminId: string, groupId: string): Promise<void> {
    try {
      console.log('💳 Handling send payment link request');

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
                text: '💳 ส่งลิงค์โอนเงิน',
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

      console.log('✅ LIFF URL sent to user');
    } catch (error) {
      console.error('❌ Error in handleSendPaymentLink:', error);
      await this.sendReply(replyToken, `❌ ${ERROR_MESSAGES.DATABASE_ERROR}`);
    }
  }

  /**
   * Get LIFF URL
   */
  private static getLiffUrl(formType: string = 'payment', groupId?: string): string {
    const baseUrl = process.env.LIFF_URL || 'https://liff.line.me';
    const liffId = process.env.LIFF_ID || '';
    
    if (formType === 'open-betting') {
      return `${baseUrl}/${liffId}?form=open-betting${groupId ? `&groupId=${groupId}` : ''}`;
    }
    
    return `${baseUrl}/${liffId}?form=payment${groupId ? `&groupId=${groupId}` : ''}`;
  }

  /**
   * Handle "สรุปยอด" (Summary) button
   * Display all bets for current day organized by player
   * ✅ ส่งไปยังผู้ใช้ที่ร้องขอ ไม่ใช่กลุ่ม
   */
  static async handleSummary(replyToken: string, groupId: string, userId?: string): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const summary = await ChatAggregationService.generateDailySummary(groupId, today);

      if (!summary || summary.playerSummary.length === 0) {
        await this.sendReply(replyToken, '📊 ไม่มีการแทงในวันนี้');
        return;
      }

      let message = `📊 สรุปยอดการแทง\n\n`;

      // Player summary
      summary.playerSummary.forEach((player: any) => {
        message += `👤 ${player.lineName}\n`;
        message += `   รวม: ${player.totalAmount.toLocaleString()} บาท\n`;
        player.bets.forEach((bet: any) => {
          message += `   - ${bet.venue}: ${bet.amount.toLocaleString()} บาท\n`;
        });
        message += '\n';
      });

      // Venue summary
      message += `\n🏟️ สรุปตามสนาม\n`;
      summary.venueSummary.forEach((venue: any) => {
        message += `${venue.venue}: ${venue.totalBets.toLocaleString()} บาท (${venue.playerCount} คน)\n`;
      });

      message += `\n💰 ยอดรายรับทั้งหมด: ${summary.totalRevenue.toLocaleString()} บาท`;

      // ✅ ส่งไปยังผู้ใช้ที่ร้องขอ (1-on-1) ไม่ใช่กลุ่ม
      if (userId) {
        await lineClient.pushMessage(userId, {
          type: 'text',
          text: message,
        });
        console.log('✅ Summary sent to user:', userId);
      } else {
        await this.sendReply(replyToken, message);
      }
    } catch (error) {
      console.error('❌ Error in handleSummary:', error);
      await this.sendReply(replyToken, `❌ ${ERROR_MESSAGES.DATABASE_ERROR}`);
    }
  }

  /**
   * Handle "แจ้งผลแทง" (Announce Results) button
   * Allow admin to input winners/losers and calculate winnings
   */
  static async handleAnnounceResults(
    replyToken: string,
    groupId: string,
    venue: string,
    fireNumber: string,
    winners: string[]
  ): Promise<void> {
    try {
      // Process results
      const report = await ResultService.processResults({
        venue,
        fireNumber,
        winners,
        groupId,
      });

      // Send result to group
      await ResultService.sendResultToGroup(groupId, report);

      await this.sendReply(replyToken, `✅ ส่งผลการแข่งไปยังกลุ่มแล้ว`);
    } catch (error) {
      console.error('❌ Error in handleAnnounceResults:', error);
      await this.sendReply(replyToken, `❌ ${error instanceof Error ? error.message : ERROR_MESSAGES.DATABASE_ERROR}`);
    }
  }

  /**
   * Handle "รายงาน" (Report) button
   * Display daily report with all betting rounds and results
   */
  static async handleReport(replyToken: string, groupId: string): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get daily summary
      const summary = await ChatAggregationService.generateDailySummary(groupId, today);

      if (!summary || summary.playerSummary.length === 0) {
        await this.sendReply(replyToken, '📈 ไม่มีรายงานสำหรับวันนี้');
        return;
      }

      let message = `📈 รายงานรายวัน\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      // Player summary
      message += `👥 สรุปตามผู้เล่น:\n`;
      summary.playerSummary.forEach((player: any, index: number) => {
        message += `${index + 1}. ${player.lineName}\n`;
        message += `   รวม: ${player.totalAmount.toLocaleString()} บาท\n`;
        player.bets.forEach((bet: any) => {
          message += `   • ${bet.venue}: ${bet.amount.toLocaleString()} บาท\n`;
        });
        message += '\n';
      });

      // Venue summary
      message += `🎯 สรุปตามสนาม:\n`;
      summary.venueSummary.forEach((venue: any) => {
        message += `${venue.venue}: ${venue.totalBets.toLocaleString()} บาท (${venue.playerCount} คน)\n`;
      });

      message += `\n💰 ยอดรายรับทั้งหมด: ${summary.totalRevenue.toLocaleString()} บาท`;

      await this.sendReply(replyToken, message);
    } catch (error) {
      console.error('❌ Error in handleReport:', error);
      await this.sendReply(replyToken, `❌ ${ERROR_MESSAGES.DATABASE_ERROR}`);
    }
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
