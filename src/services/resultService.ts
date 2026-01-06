/**
 * Result Service
 * จัดการผลการแข่งและคำนวณเงินรางวัล
 */

import { BettingService } from './bettingService';
import { lineClient } from '../config/line';

export interface ResultData {
  venue: string;
  fireNumber: string;
  winners: string[];
  groupId: string;
}

export interface ResultReport {
  venue: string;
  fireNumber: string;
  totalRevenue: number;
  totalPayout: number;
  profit: number;
  results: {
    lineName: string;
    amount: number;
    result: 'ชนะ' | 'แพ้';
    payout: number;
  }[];
}

export class ResultService {
  /**
   * Process betting results
   */
  static async processResults(data: ResultData): Promise<ResultReport> {
    try {
      // Get all bets for this venue and fire number
      const bets = await BettingService.getBetsByVenueAndFire(data.venue, data.fireNumber);

      if (bets.length === 0) {
        throw new Error(`ไม่พบการแทงสำหรับ ${data.venue} ${data.fireNumber}`);
      }

      // Calculate results
      let totalRevenue = 0;
      let totalPayout = 0;
      const results: any[] = [];

      bets.forEach((bet: any) => {
        totalRevenue += bet.amount;
        const isWinner = data.winners.includes(bet.lineName);

        if (isWinner) {
          totalPayout += bet.amount * 2; // Simple 2x payout
        }

        results.push({
          lineName: bet.lineName,
          amount: bet.amount,
          result: isWinner ? 'ชนะ' : 'แพ้',
          payout: isWinner ? bet.amount * 2 : 0,
        });
      });

      return {
        venue: data.venue,
        fireNumber: data.fireNumber,
        totalRevenue,
        totalPayout,
        profit: totalRevenue - totalPayout,
        results,
      };
    } catch (error) {
      console.error('❌ Error processing results:', error);
      throw error;
    }
  }

  /**
   * Format result report for LINE message
   */
  static formatResultMessage(report: ResultReport): string {
    let message = `🏆 ผลการแข่ง ${report.venue} ${report.fireNumber}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Separate winners and losers
    const winners = report.results.filter(r => r.result === 'ชนะ');
    const losers = report.results.filter(r => r.result === 'แพ้');

    // Show winners
    if (winners.length > 0) {
      message += `✅ ผู้ชนะ:\n`;
      winners.forEach(result => {
        message += `• ${result.lineName}\n`;
        message += `  แทง: ${result.amount.toLocaleString()} บาท\n`;
        message += `  ได้รับ: ${result.payout.toLocaleString()} บาท\n\n`;
      });
    }

    // Show losers
    if (losers.length > 0) {
      message += `❌ ผู้แพ้:\n`;
      losers.forEach(result => {
        message += `• ${result.lineName}: ${result.amount.toLocaleString()} บาท\n`;
      });
      message += '\n';
    }

    // Show summary
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💰 สรุป:\n`;
    message += `ยอดรายรับ: ${report.totalRevenue.toLocaleString()} บาท\n`;
    message += `ยอดจ่าย: ${report.totalPayout.toLocaleString()} บาท\n`;
    message += `กำไร/ขาดทุน: ${report.profit.toLocaleString()} บาท`;

    return message;
  }

  /**
   * Send result to group
   */
  static async sendResultToGroup(groupId: string, report: ResultReport): Promise<void> {
    try {
      const message = this.formatResultMessage(report);
      await lineClient.pushMessage(groupId, {
        type: 'text',
        text: message,
      });
      console.log('✅ Result sent to group:', groupId);
    } catch (error) {
      console.error('❌ Error sending result to group:', error);
      throw error;
    }
  }

  /**
   * Get daily report
   */
  static async getDailyReport(groupId: string, date: Date): Promise<{
    totalRounds: number;
    totalRevenue: number;
    totalPayout: number;
    totalProfit: number;
  }> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // TODO: Get all rounds for the day from database
      // For now, return placeholder
      return {
        totalRounds: 0,
        totalRevenue: 0,
        totalPayout: 0,
        totalProfit: 0,
      };
    } catch (error) {
      console.error('❌ Error getting daily report:', error);
      throw error;
    }
  }
}
