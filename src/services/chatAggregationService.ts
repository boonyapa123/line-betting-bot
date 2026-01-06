/**
 * Chat Aggregation Service
 * รวบรวมและจัดเรียงข้อมูลการแทงจากแชท
 */

import { BetRepository } from '../models/Bet';
import { IChatAggregation, IPlayerBetSummary, IVenueBetSummary } from '../types/models';

export class ChatAggregationService {
  /**
   * Collect all betting messages from database for a specific date
   */
  static async collectBettingMessages(
    groupId: string,
    date: Date
  ): Promise<any[]> {
    try {
      const bets = await BetRepository.findByGroupAndDate(groupId, date);
      return bets;
    } catch (error) {
      console.error('❌ Error collecting betting messages:', error);
      throw error;
    }
  }

  /**
   * Aggregate bets by player
   */
  static async aggregateByPlayer(
    groupId: string,
    date: Date
  ): Promise<IPlayerBetSummary[]> {
    try {
      const aggregated = await BetRepository.getBetsByPlayer(groupId, date);

      return aggregated.map((item: any) => ({
        lineName: item.lineName,
        userId: item._id,
        totalAmount: item.totalAmount,
        bets: item.bets,
      }));
    } catch (error) {
      console.error('❌ Error aggregating bets by player:', error);
      throw error;
    }
  }

  /**
   * Aggregate bets by venue
   */
  static async aggregateByVenue(
    groupId: string,
    date: Date
  ): Promise<IVenueBetSummary[]> {
    try {
      const aggregated = await BetRepository.getBetsByVenue(groupId, date);

      return aggregated.map((item: any) => ({
        venue: item.venue,
        totalBets: item.totalBets,
        playerCount: item.playerCount,
        players: [],
      }));
    } catch (error) {
      console.error('❌ Error aggregating bets by venue:', error);
      throw error;
    }
  }

  /**
   * Generate daily summary
   */
  static async generateDailySummary(
    groupId: string,
    date: Date
  ): Promise<IChatAggregation> {
    try {
      const playerSummary = await this.aggregateByPlayer(groupId, date);
      const venueSummary = await this.aggregateByVenue(groupId, date);

      const totalRevenue = playerSummary.reduce(
        (sum, player) => sum + player.totalAmount,
        0
      );

      return {
        groupId,
        date,
        playerSummary,
        venueSummary,
        totalRevenue,
      };
    } catch (error) {
      console.error('❌ Error generating daily summary:', error);
      throw error;
    }
  }

  /**
   * Format summary report for LINE message
   */
  static formatSummaryReport(aggregation: IChatAggregation): string {
    let report = `📊 สรุปการแทงประจำวัน ${aggregation.date.toLocaleDateString('th-TH')}\n\n`;

    // Player summary
    report += `👥 สรุปตามผู้เล่น:\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    if (aggregation.playerSummary.length === 0) {
      report += `ไม่มีการแทง\n`;
    } else {
      aggregation.playerSummary.forEach((player, index) => {
        report += `${index + 1}. ${player.lineName}\n`;
        report += `   รวม: ${player.totalAmount.toLocaleString()} บาท\n`;
        player.bets.forEach((bet: any) => {
          report += `   • ${bet.venue}: ${bet.amount.toLocaleString()} บาท\n`;
        });
      });
    }

    report += `\n`;

    // Venue summary
    report += `🎯 สรุมตามสนาม:\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    if (aggregation.venueSummary.length === 0) {
      report += `ไม่มีการแทง\n`;
    } else {
      aggregation.venueSummary.forEach((venue) => {
        report += `${venue.venue}: ${venue.totalBets.toLocaleString()} บาท (${venue.playerCount} คน)\n`;
      });
    }

    report += `\n`;

    // Total revenue
    report += `💰 ยอดรายรับทั้งหมด: ${aggregation.totalRevenue.toLocaleString()} บาท\n`;

    return report;
  }

  /**
   * Format detailed player report
   */
  static formatPlayerReport(playerSummary: IPlayerBetSummary[]): string {
    let report = `📋 รายละเอียดการแทงตามผู้เล่น\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (playerSummary.length === 0) {
      return report + `ไม่มีการแทง`;
    }

    playerSummary.forEach((player, index) => {
      report += `${index + 1}. ${player.lineName}\n`;
      report += `   รวมทั้งหมด: ${player.totalAmount.toLocaleString()} บาท\n`;
      report += `   รายการแทง:\n`;

      player.bets.forEach((bet: any) => {
        const time = new Date(bet.timestamp).toLocaleTimeString('th-TH');
        report += `   • ${bet.venue}: ${bet.amount.toLocaleString()} บาท (${time})\n`;
      });

      report += `\n`;
    });

    return report;
  }

  /**
   * Format detailed venue report
   */
  static formatVenueReport(venueSummary: IVenueBetSummary[]): string {
    let report = `🎯 รายละเอียดการแทงตามสนาม\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (venueSummary.length === 0) {
      return report + `ไม่มีการแทง`;
    }

    venueSummary.forEach((venue) => {
      report += `${venue.venue}\n`;
      report += `   รวม: ${venue.totalBets.toLocaleString()} บาท\n`;
      report += `   จำนวนผู้เล่น: ${venue.playerCount} คน\n\n`;
    });

    return report;
  }

  /**
   * Get summary statistics
   */
  static getSummaryStatistics(aggregation: IChatAggregation): {
    totalPlayers: number;
    totalVenues: number;
    totalRevenue: number;
    averageBetPerPlayer: number;
    topPlayer: IPlayerBetSummary | null;
    topVenue: IVenueBetSummary | null;
  } {
    const topPlayer =
      aggregation.playerSummary.length > 0
        ? aggregation.playerSummary[0]
        : null;

    const topVenue =
      aggregation.venueSummary.length > 0
        ? aggregation.venueSummary.reduce((prev, current) =>
            prev.totalBets > current.totalBets ? prev : current
          )
        : null;

    const averageBetPerPlayer =
      aggregation.playerSummary.length > 0
        ? aggregation.totalRevenue / aggregation.playerSummary.length
        : 0;

    return {
      totalPlayers: aggregation.playerSummary.length,
      totalVenues: aggregation.venueSummary.length,
      totalRevenue: aggregation.totalRevenue,
      averageBetPerPlayer,
      topPlayer,
      topVenue,
    };
  }

  /**
   * Format statistics report
   */
  static formatStatisticsReport(aggregation: IChatAggregation): string {
    const stats = this.getSummaryStatistics(aggregation);

    let report = `📈 สถิติการแทง\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `จำนวนผู้เล่น: ${stats.totalPlayers} คน\n`;
    report += `จำนวนสนาม: ${stats.totalVenues} สนาม\n`;
    report += `ยอดรายรับทั้งหมด: ${stats.totalRevenue.toLocaleString()} บาท\n`;
    report += `เฉลี่ยต่อคน: ${Math.round(stats.averageBetPerPlayer).toLocaleString()} บาท\n`;

    if (stats.topPlayer) {
      report += `\n👑 ผู้เล่นชั้นนำ: ${stats.topPlayer.lineName}\n`;
      report += `   ยอดแทง: ${stats.topPlayer.totalAmount.toLocaleString()} บาท\n`;
    }

    if (stats.topVenue) {
      report += `\n🏆 สนามชั้นนำ: ${stats.topVenue.venue}\n`;
      report += `   ยอดแทง: ${stats.topVenue.totalBets.toLocaleString()} บาท\n`;
    }

    return report;
  }
}
