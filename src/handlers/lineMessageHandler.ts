/**
 * LINE Message Handler
 * รับและประมวลผลข้อความจาก LINE
 */

import { lineClient, getUserProfile } from '../config/line';
import { identifyMessageType } from '../utils/parsers';
import { BettingService } from '../services/bettingService';
import { ChatAggregationService } from '../services/chatAggregationService';
import { RichMenuInputService } from '../services/richMenuInputService';
import { RichMenuHandlers } from './richMenuHandlers';
import { VenueRepository } from '../models/Venue';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/constants';
import { ChatTypeService } from '../services/chatTypeService';
import { GroupMessageService } from '../services/groupMessageService';
import { OfficialAccountService } from '../services/officialAccountService';

export class LineMessageHandler {
  /**
   * Handle webhook message event
   */
  static async handleMessage(event: any): Promise<void> {
    try {
      const { message, replyToken, source } = event;
      const userId = source.userId;
      const chatType = ChatTypeService.identifyChatType(source);
      const chatId = ChatTypeService.getChatId(source);

      console.log('📨 Processing message:', message.text);

      // Get user profile
      let userProfile;
      try {
        userProfile = await getUserProfile(userId);
      } catch (error) {
        console.warn('⚠️ Could not get user profile:', error);
        userProfile = { displayName: 'Unknown User' };
      }

      const lineName = userProfile.displayName || 'Unknown User';

      // Route based on chat type
      if (chatType === 'group') {
        await this.handleGroupMessage(event, userId, lineName, chatId, message.text);
      } else if (chatType === 'official_account') {
        await this.handleOfficialAccountMessage(event, userId, lineName, message.text);
      } else {
        console.warn('⚠️ Unknown chat type');
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
    }
  }

  /**
   * Handle group message
   * บันทึกข้อมูลทั้งหมด ไม่ตรวจสอบ admin
   */
  private static async handleGroupMessage(
    event: any,
    userId: string,
    lineName: string,
    groupId: string,
    text: string
  ): Promise<void> {
    try {
      const { replyToken } = event;

      // Log all messages to sheet
      await GroupMessageService.handleGroupMessage(
        groupId,
        userId,
        text,
        event.timestamp
      );

      // Continue with normal message processing
      const messageInfo = identifyMessageType(text);

      switch (messageInfo.type) {
        case 'betting':
          await this.handleBettingMessage(
            event,
            userId,
            lineName,
            groupId,
            messageInfo.data
          );
          break;

        case 'venue_selection':
          await this.handleVenueSelection(
            event,
            userId,
            lineName,
            groupId,
            messageInfo.data
          );
          break;

        default:
          // Just log, don't reply
          console.log('📝 Message logged:', text);
      }
    } catch (error) {
      console.error('❌ Error handling group message:', error);
    }
  }

  /**
   * Handle official account message (1-on-1)
   * ไม่บันทึกข้อมูล
   * ✅ ไม่ตรวจสอบ admin - ทุกคนใช้ได้
   */
  private static async handleOfficialAccountMessage(
    event: any,
    userId: string,
    lineName: string,
    text: string
  ): Promise<void> {
    try {
      const { replyToken } = event;

      console.log('👤 Official account message (1-on-1):', text);

      // Process admin commands for all users (no admin check)
      await OfficialAccountService.handleOfficialMessage(text, userId, replyToken);
    } catch (error) {
      console.error('❌ Error handling official account message:', error);
      await this.sendReply(event.replyToken, `❌ ${ERROR_MESSAGES.DATABASE_ERROR}`);
    }
  }

  /**
   * Handle Rich Menu input commands
   */
  private static async handleRichMenuInput(
    event: any,
    userId: string,
    lineName: string,
    groupId: string,
    text: string
  ): Promise<void> {
    try {
      const { replyToken } = event;
      const commandType = RichMenuInputService.getCommandType(text);

      switch (commandType) {
        case 'send_room': {
          const result = RichMenuInputService.parseSendRoomInput(text);
          if (!result.isValid) {
            await this.sendReply(replyToken, `❌ ${result.error}`);
            return;
          }
          await RichMenuHandlers.handleSendRoom(
            replyToken,
            groupId,
            result.venue!,
            result.fireNumber!
          );
          break;
        }

        case 'send_payment_link': {
          const result = RichMenuInputService.parseSendPaymentLinkInput(text);
          if (!result.isValid) {
            await this.sendReply(replyToken, `❌ ${result.error}`);
            return;
          }
          await RichMenuHandlers.handleSendPaymentLink(
            replyToken,
            userId,
            groupId
          );
          break;
        }

        case 'announce_results': {
          const result = RichMenuInputService.parseAnnounceResultsInput(text);
          if (!result.isValid) {
            await this.sendReply(replyToken, `❌ ${result.error}`);
            return;
          }
          await RichMenuHandlers.handleAnnounceResults(
            replyToken,
            groupId,
            result.venue!,
            result.fireNumber!,
            result.winners!
          );
          break;
        }

        default:
          await this.sendReply(replyToken, `❌ ไม่รู้จักคำสั่ง`);
      }
    } catch (error) {
      console.error('❌ Error handling rich menu input:', error);
      await this.sendReply(event.replyToken, `❌ ${ERROR_MESSAGES.DATABASE_ERROR}`);
    }
  }

  /**
   * Handle betting message
   */
  private static async handleBettingMessage(
    event: any,
    userId: string,
    lineName: string,
    groupId: string,
    data: any
  ): Promise<void> {
    try {
      const { venue, amount } = data;
      const { replyToken } = event;

      // Check if venue exists
      const venueExists = await VenueRepository.exists(venue, groupId);
      if (!venueExists) {
        const venues = await VenueRepository.getVenueNames(groupId);
        const venueList = venues.join(', ') || 'ไม่มีสนาม';
        await this.sendReply(
          replyToken,
          `❌ ${ERROR_MESSAGES.VENUE_NOT_FOUND}\n\nสนามที่มี: ${venueList}`
        );
        return;
      }

      // Record bet
      const bet = await BettingService.recordBet({
        userId,
        lineName,
        venue,
        amount,
        timestamp: new Date(),
        groupId,
      });

      // Send confirmation
      const confirmMessage = `✅ ${SUCCESS_MESSAGES.BET_RECORDED}\n\n` +
        `สนาม: ${venue}\n` +
        `ยอดเงิน: ${amount.toLocaleString()} บาท`;

      await this.sendReply(replyToken, confirmMessage);

      console.log('✅ Bet recorded for user:', lineName);
    } catch (error) {
      console.error('❌ Error handling betting message:', error);
      await this.sendReply(event.replyToken, `❌ ${ERROR_MESSAGES.DATABASE_ERROR}`);
    }
  }

  /**
   * Handle venue selection
   */
  private static async handleVenueSelection(
    event: any,
    userId: string,
    lineName: string,
    groupId: string,
    data: any
  ): Promise<void> {
    try {
      const { venue } = data;
      const { replyToken } = event;

      // Get venue
      const venueData = await VenueRepository.findByName(venue, groupId);

      if (!venueData) {
        const venues = await VenueRepository.getVenueNames(groupId);
        const venueList = venues.join(', ') || 'ไม่มีสนาม';
        await this.sendReply(
          replyToken,
          `❌ ${ERROR_MESSAGES.VENUE_NOT_FOUND}\n\nสนามที่มี: ${venueList}`
        );
        return;
      }

      // Send venue link
      let message = `🎯 ลิงค์ห้องแทง ${venue}\n\n`;
      message += `${venueData.roomLink}\n\n`;

      if (venueData.paymentLink) {
        message += `💳 ลิงค์ชำระเงิน:\n${venueData.paymentLink}`;
      }

      await this.sendReply(replyToken, message);

      console.log('✅ Venue link sent for:', venue);
    } catch (error) {
      console.error('❌ Error handling venue selection:', error);
      await this.sendReply(event.replyToken, `❌ ${ERROR_MESSAGES.DATABASE_ERROR}`);
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

  /**
   * Send push message
   */
  static async sendPushMessage(userId: string, message: string): Promise<void> {
    try {
      await lineClient.pushMessage(userId, {
        type: 'text',
        text: message,
      });
    } catch (error) {
      console.error('❌ Error sending push message:', error);
    }
  }

  /**
   * Send message to group
   */
  static async sendGroupMessage(groupId: string, message: string): Promise<void> {
    try {
      await lineClient.pushMessage(groupId, {
        type: 'text',
        text: message,
      });
    } catch (error) {
      console.error('❌ Error sending group message:', error);
    }
  }
}
