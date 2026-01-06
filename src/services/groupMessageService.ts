/**
 * Group Message Service
 * บันทึกข้อความทั้งหมดจากกลุ่ม (ไม่ตรวจสอบ admin)
 */

import { lineClient } from '../config/line';

export class GroupMessageService {
  /**
   * Handle group message
   * บันทึกข้อความทั้งหมดจากกลุ่ม
   */
  static async handleGroupMessage(
    groupId: string,
    userId: string,
    text: string,
    timestamp: number
  ): Promise<void> {
    try {
      console.log('📝 Group message received:', {
        groupId,
        userId,
        text,
        timestamp,
      });

      // Get user profile
      let userProfile;
      try {
        userProfile = await lineClient.getProfile(userId);
      } catch (error) {
        console.warn('⚠️ Could not get user profile:', error);
        userProfile = { displayName: 'Unknown User' };
      }

      const userName = userProfile.displayName || 'Unknown User';

      // Log to sheet (บันทึกข้อมูลทั้งหมด ไม่ว่าจะเป็นแอดมินหรือไม่)
      await this.logToSheet({
        groupId,
        userId,
        userName,
        message: text,
        timestamp: new Date(timestamp).toISOString(),
      });

      console.log('✅ Message logged to sheet');
    } catch (error) {
      console.error('❌ Error handling group message:', error);
    }
  }

  /**
   * Log message to Google Sheet
   * บันทึกข้อมูลลงใน Google Sheet
   */
  private static async logToSheet(data: {
    groupId: string;
    userId: string;
    userName: string;
    message: string;
    timestamp: string;
  }): Promise<void> {
    try {
      // TODO: Implement Google Sheets logging
      // For now, just log to console
      console.log('📊 Logging to sheet:', {
        timestamp: data.timestamp,
        playerName: data.userName,
        userId: data.userId,
        message: data.message,
        groupId: data.groupId,
      });

      // ข้อมูลที่จะบันทึก:
      // [timestamp, playerName, userId, message, groupId]
    } catch (error) {
      console.error('❌ Error logging to sheet:', error);
    }
  }
}
