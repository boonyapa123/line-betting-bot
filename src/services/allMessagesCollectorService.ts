/**
 * All Messages Collector Service
 * เก็บข้อความทั้งหมดและจัดเรียงตามชื่อ LINE
 */

export interface UserMessage {
  lineName: string;
  userId: string;
  message: string;
  timestamp: Date;
}

export interface UserMessagesGroup {
  lineName: string;
  userId: string;
  messages: string[];
  messageCount: number;
  firstMessageTime: Date;
  lastMessageTime: Date;
}

export interface AllMessagesData {
  groupId: string;
  date: Date;
  totalUsers: number;
  totalMessages: number;
  userGroups: UserMessagesGroup[];
}

export class AllMessagesCollectorService {
  /**
   * Collect all messages from group
   * เก็บข้อความทั้งหมดจากกลุ่ม
   */
  static collectAllMessages(messages: any[]): UserMessage[] {
    return messages.map(msg => ({
      lineName: msg.lineName,
      userId: msg.userId,
      message: msg.message,
      timestamp: msg.timestamp || new Date(),
    }));
  }

  /**
   * Group messages by user (LINE name)
   * จัดเรียงข้อความตามชื่อ LINE
   */
  static groupMessagesByUser(messages: UserMessage[]): UserMessagesGroup[] {
    const grouped = new Map<string, UserMessage[]>();

    // Group by lineName
    messages.forEach(msg => {
      if (!grouped.has(msg.lineName)) {
        grouped.set(msg.lineName, []);
      }
      grouped.get(msg.lineName)!.push(msg);
    });

    // Convert to array and sort by lineName
    const result: UserMessagesGroup[] = [];

    grouped.forEach((userMessages, lineName) => {
      const userId = userMessages[0].userId;
      const messageTexts = userMessages.map(m => m.message);
      const timestamps = userMessages.map(m => m.timestamp);

      result.push({
        lineName,
        userId,
        messages: messageTexts,
        messageCount: messageTexts.length,
        firstMessageTime: new Date(Math.min(...timestamps.map(t => t.getTime()))),
        lastMessageTime: new Date(Math.max(...timestamps.map(t => t.getTime()))),
      });
    });

    // Sort by lineName (A-Z)
    result.sort((a, b) => a.lineName.localeCompare(b.lineName, 'th'));

    return result;
  }

  /**
   * Generate all messages data
   * สร้างข้อมูลข้อความทั้งหมด
   */
  static generateAllMessagesData(
    groupId: string,
    messages: UserMessage[]
  ): AllMessagesData {
    const userGroups = this.groupMessagesByUser(messages);

    return {
      groupId,
      date: new Date(),
      totalUsers: userGroups.length,
      totalMessages: messages.length,
      userGroups,
    };
  }

  /**
   * Format all messages report (sorted by user)
   * จัดรูปแบบรายงานข้อความทั้งหมด
   */
  static formatAllMessagesReport(data: AllMessagesData): string {
    let report = `📋 รายงานข้อความทั้งหมด\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `วันที่: ${data.date.toLocaleDateString('th-TH')}\n`;
    report += `เวลา: ${data.date.toLocaleTimeString('th-TH')}\n\n`;

    report += `📊 สรุป:\n`;
    report += `จำนวนผู้เล่น: ${data.totalUsers} คน\n`;
    report += `จำนวนข้อความทั้งหมด: ${data.totalMessages} ข้อความ\n\n`;

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Display each user's messages
    data.userGroups.forEach((user, index) => {
      report += `${index + 1}. ${user.lineName}\n`;
      report += `   User ID: ${user.userId}\n`;
      report += `   จำนวนข้อความ: ${user.messageCount} ข้อความ\n`;
      report += `   เวลาแรก: ${user.firstMessageTime.toLocaleTimeString('th-TH')}\n`;
      report += `   เวลาสุดท้าย: ${user.lastMessageTime.toLocaleTimeString('th-TH')}\n`;
      report += `   ข้อความ:\n`;

      user.messages.forEach((msg, msgIndex) => {
        report += `      ${msgIndex + 1}. ${msg}\n`;
      });

      report += `\n`;
    });

    return report;
  }

  /**
   * Format simple list (just names and messages)
   * จัดรูปแบบรายชื่อแบบง่าย
   */
  static formatSimpleList(data: AllMessagesData): string {
    let report = `📝 รายชื่อผู้เล่นและข้อความ\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    data.userGroups.forEach((user, index) => {
      report += `${index + 1}. ${user.lineName}\n`;
      user.messages.forEach((msg, msgIndex) => {
        report += `   ${msgIndex + 1}. ${msg}\n`;
      });
      report += `\n`;
    });

    return report;
  }

  /**
   * Format compact list (one line per user)
   * จัดรูปแบบรายชื่อแบบกะทัดรัด
   */
  static formatCompactList(data: AllMessagesData): string {
    let report = `📋 รายชื่อผู้เล่น\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    data.userGroups.forEach((user, index) => {
      const messages = user.messages.join(' | ');
      report += `${index + 1}. ${user.lineName}: ${messages}\n`;
    });

    return report;
  }

  /**
   * Format table style (for easy verification)
   * จัดรูปแบบตารางเพื่อให้ตรวจสอบง่าย
   */
  static formatTableStyle(data: AllMessagesData): string {
    let report = `📊 ตารางข้อมูล\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Header
    report += `ลำดับ | ชื่อผู้เล่น | จำนวนข้อความ | ข้อความ\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    data.userGroups.forEach((user, index) => {
      const messages = user.messages.join(', ');
      report += `${index + 1} | ${user.lineName} | ${user.messageCount} | ${messages}\n`;
    });

    return report;
  }

  /**
   * Export to Google Sheets format
   * ส่งออกเป็นรูปแบบ Google Sheets
   */
  static exportToGoogleSheetsFormat(data: AllMessagesData): any[] {
    const rows: any[] = [
      ['ลำดับ', 'ชื่อผู้เล่น', 'User ID', 'ข้อความ', 'จำนวนข้อความ', 'เวลาแรก', 'เวลาสุดท้าย'],
    ];

    data.userGroups.forEach((user, index) => {
      user.messages.forEach((msg, msgIndex) => {
        rows.push([
          msgIndex === 0 ? index + 1 : '',
          msgIndex === 0 ? user.lineName : '',
          msgIndex === 0 ? user.userId : '',
          msg,
          msgIndex === 0 ? user.messageCount : '',
          msgIndex === 0 ? user.firstMessageTime.toLocaleTimeString('th-TH') : '',
          msgIndex === 0 ? user.lastMessageTime.toLocaleTimeString('th-TH') : '',
        ]);
      });
    });

    return rows;
  }

  /**
   * Get user messages by name
   * ดึงข้อความของผู้เล่นตามชื่อ
   */
  static getUserMessages(
    data: AllMessagesData,
    lineName: string
  ): UserMessagesGroup | undefined {
    return data.userGroups.find(u => u.lineName === lineName);
  }

  /**
   * Get users with most messages
   * ดึงผู้เล่นที่มีข้อความมากที่สุด
   */
  static getUsersWithMostMessages(
    data: AllMessagesData,
    limit: number = 5
  ): UserMessagesGroup[] {
    return [...data.userGroups]
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, limit);
  }

  /**
   * Search messages
   * ค้นหาข้อความ
   */
  static searchMessages(
    data: AllMessagesData,
    keyword: string
  ): UserMessagesGroup[] {
    return data.userGroups
      .map(user => ({
        ...user,
        messages: user.messages.filter(msg =>
          msg.toLowerCase().includes(keyword.toLowerCase())
        ),
      }))
      .filter(user => user.messages.length > 0);
  }

  /**
   * Get statistics
   * ดึงสถิติ
   */
  static getStatistics(data: AllMessagesData): {
    totalUsers: number;
    totalMessages: number;
    averageMessagesPerUser: number;
    userWithMostMessages: UserMessagesGroup | null;
    userWithLeastMessages: UserMessagesGroup | null;
  } {
    const sorted = [...data.userGroups].sort(
      (a, b) => b.messageCount - a.messageCount
    );

    return {
      totalUsers: data.totalUsers,
      totalMessages: data.totalMessages,
      averageMessagesPerUser: Math.round(data.totalMessages / data.totalUsers),
      userWithMostMessages: sorted[0] || null,
      userWithLeastMessages: sorted[sorted.length - 1] || null,
    };
  }
}
