/**
 * Payment Link Service
 * จัดการข้อมูลการโอนเงิน
 */

import { lineClient } from '../config/line';

export interface PaymentLinkData {
  groupId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  paymentLink?: string;
  note?: string;
  userId: string;
  timestamp: string;
}

export class PaymentLinkService {
  /**
   * Check if text is payment link input
   */
  static isPaymentLinkInput(text: string): boolean {
    // Check if text contains payment link patterns
    return text.includes('http') || text.includes('promptpay');
  }

  /**
   * Check if user has pending payment link request
   */
  static hasPendingRequest(userId: string): boolean {
    // TODO: Implement pending request tracking
    return false;
  }

  /**
   * Process payment link input
   */
  static async processPaymentLinkInput(
    userId: string,
    text: string,
    replyToken: string
  ): Promise<void> {
    // TODO: Implement payment link input processing
    console.log('Processing payment link input:', text);
  }

  /**
   * Send payment link to group
   * ส่งข้อมูลการโอนเงินไปยังกลุ่ม
   */
  static async sendToGroup(data: PaymentLinkData): Promise<void> {
    try {
      console.log('💳 Sending payment link to group:', {
        groupId: data.groupId,
        bankName: data.bankName,
      });

      // Validate group ID
      if (!data.groupId) {
        throw new Error('Group ID is required');
      }

      // Create Flex Message
      const flexMessage = this.createFlexMessage(data);

      // Send to group
      await lineClient.pushMessage(data.groupId, flexMessage);

      console.log('✅ Payment link sent to group:', data.groupId);
    } catch (error) {
      console.error('❌ Error sending payment link to group:', error);
      throw error;
    }
  }

  /**
   * Create Flex Message for payment link
   * สร้าง Flex Message สำหรับข้อมูลการโอนเงิน
   */
  private static createFlexMessage(data: PaymentLinkData): any {
    const timestamp = new Date(data.timestamp).toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      type: 'flex' as const,
      altText: `💳 ข้อมูลการโอนเงิน - ${data.bankName}`,
      contents: {
        type: 'bubble' as const,
        header: {
          type: 'box' as const,
          layout: 'vertical' as const,
          contents: [
            {
              type: 'text' as const,
              text: '💳 ข้อมูลการโอนเงิน',
              weight: 'bold' as const,
              size: 'xl' as const,
              color: '#FFFFFF',
            },
          ],
          backgroundColor: '#667eea',
          paddingAll: 15,
        },
        body: {
          type: 'box' as const,
          layout: 'vertical' as const,
          spacing: 'md' as const,
          contents: [
            // Bank name
            {
              type: 'box' as const,
              layout: 'vertical' as const,
              spacing: 'xs' as const,
              contents: [
                {
                  type: 'text' as const,
                  text: '🏦 ธนาคาร',
                  size: 'sm' as const,
                  color: '#999999',
                  weight: 'bold' as const,
                },
                {
                  type: 'text' as const,
                  text: data.bankName,
                  size: 'lg' as const,
                  weight: 'bold' as const,
                  color: '#333333',
                },
              ],
            },
            // Account number
            {
              type: 'box' as const,
              layout: 'vertical' as const,
              spacing: 'xs' as const,
              contents: [
                {
                  type: 'text' as const,
                  text: '🔢 เลขบัญชี',
                  size: 'sm' as const,
                  color: '#999999',
                  weight: 'bold' as const,
                },
                {
                  type: 'text' as const,
                  text: data.accountNumber,
                  size: 'lg' as const,
                  weight: 'bold' as const,
                  color: '#333333',
                  family: 'monospace' as const,
                },
              ],
            },
            // Account name
            {
              type: 'box' as const,
              layout: 'vertical' as const,
              spacing: 'xs' as const,
              contents: [
                {
                  type: 'text' as const,
                  text: '👤 ชื่อบัญชี',
                  size: 'sm' as const,
                  color: '#999999',
                  weight: 'bold' as const,
                },
                {
                  type: 'text' as const,
                  text: data.accountName,
                  size: 'lg' as const,
                  weight: 'bold' as const,
                  color: '#333333',
                },
              ],
            },
            // Divider
            {
              type: 'separator' as const,
              margin: 'md' as const,
            },
            // Payment link (if available)
            ...(data.paymentLink ? [
              {
                type: 'box' as const,
                layout: 'vertical' as const,
                spacing: 'xs' as const,
                contents: [
                  {
                    type: 'text' as const,
                    text: '🔗 ลิงค์โอนเงิน',
                    size: 'sm' as const,
                    color: '#999999',
                    weight: 'bold' as const,
                  },
                  {
                    type: 'text' as const,
                    text: data.paymentLink,
                    size: 'sm' as const,
                    color: '#667eea',
                    wrap: true,
                  },
                ],
              },
            ] : []),
            // Note (if available)
            ...(data.note ? [
              {
                type: 'box' as const,
                layout: 'vertical' as const,
                spacing: 'xs' as const,
                contents: [
                  {
                    type: 'text' as const,
                    text: '📝 หมายเหตุ',
                    size: 'sm' as const,
                    color: '#999999',
                    weight: 'bold' as const,
                  },
                  {
                    type: 'text' as const,
                    text: data.note,
                    size: 'sm' as const,
                    color: '#333333',
                    wrap: true,
                  },
                ],
              },
            ] : []),
            // Timestamp
            {
              type: 'box' as const,
              layout: 'vertical' as const,
              spacing: 'xs' as const,
              contents: [
                {
                  type: 'text' as const,
                  text: `⏰ ${timestamp}`,
                  size: 'xs' as const,
                  color: '#999999',
                },
              ],
            },
          ],
        },
        footer: {
          type: 'box' as const,
          layout: 'vertical' as const,
          spacing: 'sm' as const,
          contents: [
            {
              type: 'button' as const,
              style: 'primary' as const,
              height: 'sm' as const,
              action: {
                type: 'uri' as const,
                label: '📋 คัดลอกข้อมูล',
                uri: 'https://line.me/',
              },
              color: '#667eea',
            },
          ],
        },
      },
    };
  }
}
