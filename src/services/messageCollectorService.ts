/**
 * Message Collector Service
 * อ่านข้อความทั้งหมดในกลุ่มและจัดเรียงข้อมูล
 */

import { parseBettingMessage } from '../utils/parsers';

export interface MessageData {
  timestamp: Date;
  userId: string;
  lineName: string;
  message: string;
  venue?: string;
  amount?: number;
  isBettingMessage: boolean;
}

export interface PlayerBettingData {
  lineName: string;
  userId: string;
  totalAmount: number;
  bets: Array<{
    venue: string;
    amount: number;
    timestamp: Date;
    message: string;
  }>;
  allMessages: string[];
}

export interface GroupBettingData {
  groupId: string;
  date: Date;
  totalPlayers: number;
  totalAmount: number;
  playerData: PlayerBettingData[];
  allMessages: MessageData[];
}

export class MessageCollectorService {
  /**
   * Collect all messages from Google Sheets
   */
  static async collectAllMessages(
    messages: any[]
  ): Promise<MessageData[]> {
    try {
      const collectedMessages: MessageData[] = messages.map(msg => {
        const bettingResult = parseBettingMessage(msg.message);

        return {
          timestamp: msg.timestamp || new Date(),
          userId: msg.userId,
          lineName: msg.lineName,
          message: msg.message,
          venue: bettingResult.isValid ? bettingResult.venue : undefined,
          amount: bettingResult.isValid ? bettingResult.amount : undefined,
          isBettingMessage: bettingResult.isValid,
        };
      });

      return collectedMessages;
    } catch (error) {
      console.error('❌ Error collecting messages:', error);
      throw error;
    }
  }

  /**
   * Filter betting messages only
   */
  static filterBettingMessages(messages: MessageData[]): MessageData[] {
    return messages.filter(msg => msg.isBettingMessage);
  }

  /**
   * Group messages by player (LINE name)
   */
  static groupByPlayer(messages: MessageData[]): Map<string, MessageData[]> {
    const grouped = new Map<string, MessageData[]>();

    messages.forEach(msg => {
      if (!grouped.has(msg.lineName)) {
        grouped.set(msg.lineName, []);
      }
      grouped.get(msg.lineName)!.push(msg);
    });

    return grouped;
  }

  /**
   * Generate player betting data
   */
  static generatePlayerBettingData(
    lineName: string,
    userId: string,
    messages: MessageData[]
  ): PlayerBettingData {
    const bettingMessages = messages.filter(msg => msg.isBettingMessage);

    const totalAmount = bettingMessages.reduce(
      (sum, msg) => sum + (msg.amount || 0),
      0
    );

    const bets = bettingMessages.map(msg => ({
      venue: msg.venue || '',
      amount: msg.amount || 0,
      timestamp: msg.timestamp,
      message: msg.message,
    }));

    const allMessages = messages.map(msg => msg.message);

    return {
      lineName,
      userId,
      totalAmount,
      bets,
      allMessages,
    };
  }

  /**
   * Generate group betting data (organized by player)
   */
  static generateGroupBettingData(
    groupId: string,
    messages: MessageData[]
  ): GroupBettingData {
    const grouped = this.groupByPlayer(messages);
    const playerData: PlayerBettingData[] = [];
    let totalAmount = 0;

    grouped.forEach((playerMessages, lineName) => {
      const userId = playerMessages[0].userId;
      const playerBetting = this.generatePlayerBettingData(
        lineName,
        userId,
        playerMessages
      );

      playerData.push(playerBetting);
      totalAmount += playerBetting.totalAmount;
    });

    // Sort by total amount (descending)
    playerData.sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      groupId,
      date: new Date(),
      totalPlayers: playerData.length,
      totalAmount,
      playerData,
      allMessages: messages,
    };
  }

  /**
   * Format player betting report
   */
  static formatPlayerReport(playerData: PlayerBettingData): string {
    let report = `👤 ${playerData.lineName}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `รวมทั้งหมด: ${playerData.totalAmount.toLocaleString()} บาท\n`;
    report += `จำนวนครั้ง: ${playerData.bets.length} ครั้ง\n\n`;

    report += `📋 รายละเอียด:\n`;
    playerData.bets.forEach((bet, index) => {
      const time = bet.timestamp.toLocaleTimeString('th-TH');
      report += `${index + 1}. ${bet.venue}: ${bet.amount.toLocaleString()} บาท (${time})\n`;
    });

    return report;
  }

  /**
   * Format group betting summary (organized by player)
   */
  static formatGroupSummary(groupData: GroupBettingData): string {
    let report = `📊 สรุปการแทงประจำวัน ${groupData.date.toLocaleDateString('th-TH')}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    report += `📈 สถิติทั่วไป:\n`;
    report += `จำนวนผู้เล่น: ${groupData.totalPlayers} คน\n`;
    report += `ยอดรายรับทั้งหมด: ${groupData.totalAmount.toLocaleString()} บาท\n`;
    report += `เฉลี่ยต่อคน: ${Math.round(groupData.totalAmount / groupData.totalPlayers).toLocaleString()} บาท\n\n`;

    report += `👥 รายละเอียดตามผู้เล่น:\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    groupData.playerData.forEach((player, index) => {
      report += `${index + 1}. ${player.lineName}\n`;
      report += `   รวม: ${player.totalAmount.toLocaleString()} บาท (${player.bets.length} ครั้ง)\n`;

      player.bets.forEach((bet, betIndex) => {
        report += `   ${betIndex + 1}. ${bet.venue}: ${bet.amount.toLocaleString()} บาท\n`;
      });

      report += `\n`;
    });

    return report;
  }

  /**
   * Format detailed player list (for admin verification)
   */
  static formatDetailedPlayerList(groupData: GroupBettingData): string {
    let report = `📋 รายชื่อผู้เล่นและการแทง\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `วันที่: ${groupData.date.toLocaleDateString('th-TH')}\n`;
    report += `เวลา: ${groupData.date.toLocaleTimeString('th-TH')}\n\n`;

    groupData.playerData.forEach((player, index) => {
      report += `${index + 1}. ${player.lineName}\n`;
      report += `   User ID: ${player.userId}\n`;
      report += `   ยอดรวม: ${player.totalAmount.toLocaleString()} บาท\n`;
      report += `   จำนวนครั้ง: ${player.bets.length} ครั้ง\n`;

      // Group by venue
      const byVenue = new Map<string, number>();
      player.bets.forEach(bet => {
        const current = byVenue.get(bet.venue) || 0;
        byVenue.set(bet.venue, current + bet.amount);
      });

      report += `   สนาม:\n`;
      byVenue.forEach((amount, venue) => {
        report += `      • ${venue}: ${amount.toLocaleString()} บาท\n`;
      });

      report += `\n`;
    });

    return report;
  }

  /**
   * Format venue summary (how much bet on each venue)
   */
  static formatVenueSummary(groupData: GroupBettingData): string {
    const venueData = new Map<string, { total: number; players: Set<string> }>();

    groupData.playerData.forEach(player => {
      player.bets.forEach(bet => {
        if (!venueData.has(bet.venue)) {
          venueData.set(bet.venue, { total: 0, players: new Set() });
        }

        const data = venueData.get(bet.venue)!;
        data.total += bet.amount;
        data.players.add(player.lineName);
      });
    });

    let report = `🎯 สรุปตามสนาม\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Sort by total amount
    const sorted = Array.from(venueData.entries()).sort(
      (a, b) => b[1].total - a[1].total
    );

    sorted.forEach(([venue, data]) => {
      report += `${venue}: ${data.total.toLocaleString()} บาท (${data.players.size} คน)\n`;
      report += `   ผู้เล่น: ${Array.from(data.players).join(', ')}\n\n`;
    });

    return report;
  }

  /**
   * Export to Google Sheets format
   */
  static exportToGoogleSheetsFormat(groupData: GroupBettingData): {
    playerSheet: any[];
    summarySheet: any[];
  } {
    const playerSheet: any[] = [
      ['ชื่อผู้เล่น', 'User ID', 'สนาม', 'ยอดเงิน', 'เวลา', 'ข้อความ'],
    ];

    const summarySheet: any[] = [
      ['ชื่อผู้เล่น', 'ยอดรวม', 'จำนวนครั้ง', 'สนามที่แทง'],
    ];

    groupData.playerData.forEach(player => {
      player.bets.forEach(bet => {
        playerSheet.push([
          player.lineName,
          player.userId,
          bet.venue,
          bet.amount,
          bet.timestamp.toLocaleString('th-TH'),
          bet.message,
        ]);
      });

      // Group venues
      const venues = player.bets
        .map(b => `${b.venue}(${b.amount})`)
        .join(', ');

      summarySheet.push([
        player.lineName,
        player.totalAmount,
        player.bets.length,
        venues,
      ]);
    });

    return {
      playerSheet,
      summarySheet,
    };
  }

  /**
   * Get player by name
   */
  static getPlayerByName(
    groupData: GroupBettingData,
    lineName: string
  ): PlayerBettingData | undefined {
    return groupData.playerData.find(p => p.lineName === lineName);
  }

  /**
   * Get top bettors
   */
  static getTopBettors(groupData: GroupBettingData, limit: number = 5): PlayerBettingData[] {
    return groupData.playerData.slice(0, limit);
  }

  /**
   * Calculate statistics
   */
  static calculateStatistics(groupData: GroupBettingData): {
    totalPlayers: number;
    totalAmount: number;
    averagePerPlayer: number;
    topBettor: PlayerBettingData | null;
    totalBets: number;
  } {
    const totalBets = groupData.playerData.reduce(
      (sum, p) => sum + p.bets.length,
      0
    );

    return {
      totalPlayers: groupData.totalPlayers,
      totalAmount: groupData.totalAmount,
      averagePerPlayer: Math.round(groupData.totalAmount / groupData.totalPlayers),
      topBettor: groupData.playerData[0] || null,
      totalBets,
    };
  }
}
