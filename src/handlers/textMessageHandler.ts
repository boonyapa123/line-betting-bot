/**
 * Text Message Handler
 * จัดการข้อความจากผู้ใช้
 * ✅ ไม่ตรวจสอบ admin - ทุกคนใช้ได้
 */

import { MessageEvent } from '@line/bot-sdk';
import { TextCommandService } from '../services/textCommandService';
import { GroupMessageService } from '../services/groupMessageService';
import { PaymentLinkService } from '../services/paymentLinkService';
import { ChatTypeService } from '../services/chatTypeService';
import { OfficialAccountService } from '../services/officialAccountService';

export class TextMessageHandler {
  /**
   * Handle text message event
   */
  static async handle(event: MessageEvent): Promise<void> {
    try {
      if (event.message.type !== 'text') {
        return;
      }

      const replyToken = event.replyToken;
      const text = event.message.text;
      const userId = event.source.userId;
      const timestamp = event.timestamp;

      console.log('📨 Text message received:', {
        text,
        userId,
        timestamp,
      });

      // Identify chat type
      const chatType = ChatTypeService.identifyChatType(event.source);
      const chatId = ChatTypeService.getChatId(event.source);

      // Handle group messages
      if (chatType === 'group') {
        console.log('👥 Handling group message');
        await GroupMessageService.handleGroupMessage(
          chatId,
          userId,
          text,
          timestamp
        );
        return; // Don't reply in group
      }

      // Handle official account messages (1-on-1)
      // ✅ ไม่ตรวจสอบ admin - ทุกคนใช้ได้
      if (chatType === 'official_account') {
        console.log('👤 Handling official account message (1-on-1) - no admin check');
        await OfficialAccountService.handleOfficialMessage(text, userId, replyToken);
        return;
      }

      // Check if it's payment link input
      if (PaymentLinkService.isPaymentLinkInput(text) && PaymentLinkService.hasPendingRequest(userId)) {
        await PaymentLinkService.processPaymentLinkInput(userId, text, replyToken);
        return;
      }

      // Also handle as text command for backward compatibility
      if (replyToken) {
        await TextCommandService.handleCommand(replyToken, text);
      }
    } catch (error) {
      console.error('❌ Error handling text message:', error);
    }
  }
}
