/**
 * Chat Type Service
 * ระบุประเภทของแชท (group, official_account, user)
 */

export type ChatType = 'group' | 'official_account' | 'user' | 'unknown';

export class ChatTypeService {
  /**
   * Identify chat type from LINE source
   * ระบุประเภทของแชทจาก LINE source
   */
  static identifyChatType(source: any): ChatType {
    try {
      // Check if it's a group
      if (source.groupId) {
        return 'group';
      }

      // Check if it's an official account (1-on-1)
      if (source.type === 'user' && !source.groupId && !source.roomId) {
        // Check if it's from official account by checking userId pattern
        // Official account messages come from 1-on-1 chats
        return 'official_account';
      }

      // Check if it's a room
      if (source.roomId) {
        return 'user';
      }

      // Default to user (1-on-1)
      if (source.type === 'user') {
        return 'official_account';
      }

      return 'unknown';
    } catch (error) {
      console.error('❌ Error identifying chat type:', error);
      return 'unknown';
    }
  }

  /**
   * Get chat ID from LINE source
   * ได้รับ ID ของแชทจาก LINE source
   */
  static getChatId(source: any): string {
    if (source.groupId) {
      return source.groupId;
    }

    if (source.roomId) {
      return source.roomId;
    }

    if (source.userId) {
      return source.userId;
    }

    return '';
  }

  /**
   * Check if it's a group chat
   */
  static isGroup(source: any): boolean {
    return !!source.groupId;
  }

  /**
   * Check if it's a 1-on-1 chat
   */
  static isOneOnOne(source: any): boolean {
    return !source.groupId && !source.roomId && source.type === 'user';
  }

  /**
   * Check if it's a room chat
   */
  static isRoom(source: any): boolean {
    return !!source.roomId;
  }
}
