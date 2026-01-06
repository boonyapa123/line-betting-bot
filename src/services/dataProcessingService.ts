/**
 * Data Processing Service
 * กรองข้อมูล จัดเรียง ตามชื่อไลน์
 */

export interface RawMessage {
  timestamp: string;
  playerName: string;
  userId: string;
  message: string;
}

export interface ProcessedData {
  playerName: string;
  userId: string;
  messages: string[];
  messageCount: number;
  firstMessage: string;
  lastMessage: string;
}

export class DataProcessingService {
  /**
   * Process raw messages
   * กรองข้อมูล จัดเรียงตามชื่อไลน์
   */
  static processMessages(rawMessages: RawMessage[]): ProcessedData[] {
    try {
      // Group by player name
      const grouped = new Map<string, RawMessage[]>();

      rawMessages.forEach((msg) => {
        const key = msg.playerName;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(msg);
      });

      // Process each group
      const processed: ProcessedData[] = [];

      grouped.forEach((messages, playerName) => {
        const sortedMessages = messages.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        processed.push({
          playerName,
          userId: messages[0].userId,
          messages: sortedMessages.map((m) => m.message),
          messageCount: sortedMessages.length,
          firstMessage: sortedMessages[0].message,
          lastMessage: sortedMessages[sortedMessages.length - 1].message,
        });
      });

      // Sort by player name
      processed.sort((a, b) => a.playerName.localeCompare(b.playerName));

      return processed;
    } catch (error) {
      console.error('❌ Error processing messages:', error);
      return [];
    }
  }

  /**
   * Format for display
   * จัดรูปแบบสำหรับแสดงผล
   */
  static formatForDisplay(processed: ProcessedData[]): string {
    let result = '📊 สรุปข้อมูลการแทง\n\n';

    processed.forEach((data, index) => {
      result += `${index + 1}. ${data.playerName}\n`;
      result += `   ID: ${data.userId}\n`;
      result += `   จำนวนข้อความ: ${data.messageCount}\n`;
      result += `   ข้อความ:\n`;

      data.messages.forEach((msg) => {
        result += `   - ${msg}\n`;
      });

      result += '\n';
    });

    return result;
  }

  /**
   * Format for sheet
   * จัดรูปแบบสำหรับบันทึกลง Sheet
   */
  static formatForSheet(processed: ProcessedData[]): any[] {
    const rows: any[] = [];

    processed.forEach((data) => {
      data.messages.forEach((msg, index) => {
        rows.push({
          playerName: data.playerName,
          userId: data.userId,
          messageNumber: index + 1,
          message: msg,
        });
      });
    });

    return rows;
  }

  /**
   * Get summary statistics
   * ดึงสถิติสรุป
   */
  static getSummary(processed: ProcessedData[]): any {
    return {
      totalPlayers: processed.length,
      totalMessages: processed.reduce((sum, p) => sum + p.messageCount, 0),
      players: processed.map((p) => ({
        name: p.playerName,
        messageCount: p.messageCount,
      })),
    };
  }
}
