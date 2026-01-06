/**
 * Betting Service
 * จัดการข้อมูลการแทง คำนวณผลลัพธ์
 */

import { BetRepository } from '../models/Bet';
import { BettingRoundRepository } from '../models/BettingRound';
import { IBet, IBettingRound, IReport } from '../types/models';

export class BettingService {
  /**
   * Record a new bet
   */
  static async recordBet(betData: IBet): Promise<any> {
    try {
      const bet = await BetRepository.create(betData);
      console.log('✅ Bet recorded:', bet._id);
      return bet;
    } catch (error) {
      console.error('❌ Error recording bet:', error);
      throw error;
    }
  }

  /**
   * Get bet history for a user
   */
  static async getBetHistory(
    userId: string,
    groupId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const bets = await BetRepository.findByUser(userId, groupId);
      return bets.slice(0, limit);
    } catch (error) {
      console.error('❌ Error getting bet history:', error);
      throw error;
    }
  }

  /**
   * Get bets by user and date
   */
  static async getBetsByUserAndDate(
    userId: string,
    groupId: string,
    date: Date
  ): Promise<any[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const bets = await BetRepository.findByDateRange(
        groupId,
        startOfDay,
        endOfDay
      );

      return bets.filter(bet => bet.userId === userId);
    } catch (error) {
      console.error('❌ Error getting bets by user and date:', error);
      throw error;
    }
  }

  /**
   * Get total amount bet by user on a date
   */
  static async getTotalAmountByUserAndDate(
    userId: string,
    groupId: string,
    date: Date
  ): Promise<number> {
    try {
      return await BetRepository.getTotalAmountByUser(userId, groupId, date);
    } catch (error) {
      console.error('❌ Error getting total amount:', error);
      throw error;
    }
  }

  /**
   * Create a new betting round
   */
  static async createRound(roundData: IBettingRound): Promise<any> {
    try {
      const round = await BettingRoundRepository.create(roundData);
      console.log('✅ Betting round created:', round._id);
      return round;
    } catch (error) {
      console.error('❌ Error creating betting round:', error);
      throw error;
    }
  }

  /**
   * Get open rounds
   */
  static async getOpenRounds(groupId: string): Promise<any[]> {
    try {
      return await BettingRoundRepository.findOpenRounds(groupId);
    } catch (error) {
      console.error('❌ Error getting open rounds:', error);
      throw error;
    }
  }

  /**
   * Close a betting round
   */
  static async closeRound(roundId: string): Promise<any> {
    try {
      const round = await BettingRoundRepository.updateStatus(roundId, 'closed');
      console.log('✅ Betting round closed:', roundId);
      return round;
    } catch (error) {
      console.error('❌ Error closing round:', error);
      throw error;
    }
  }

  /**
   * Calculate winnings for a round
   */
  static async calculateWinnings(
    roundId: string,
    winners: string[]
  ): Promise<{
    totalRevenue: number;
    totalPayout: number;
    profit: number;
    winnerPayouts: Map<string, number>;
  }> {
    try {
      // Get all bets for this round
      const bets = await BetRepository.findByRound(roundId);

      // Calculate total revenue
      const totalRevenue = bets.reduce((sum, bet) => sum + bet.amount, 0);

      // Calculate payout per winner
      const winnerCount = winners.length;
      const payoutPerWinner = winnerCount > 0 ? totalRevenue / winnerCount : 0;

      // Create winner payout map
      const winnerPayouts = new Map<string, number>();
      winners.forEach(winnerId => {
        const winnerBets = bets.filter(
          bet => bet.userId === winnerId && winners.includes(bet.userId)
        );
        const winnerTotal = winnerBets.reduce((sum, bet) => sum + bet.amount, 0);
        winnerPayouts.set(winnerId, payoutPerWinner);
      });

      const totalPayout = payoutPerWinner * winnerCount;
      const profit = totalRevenue - totalPayout;

      return {
        totalRevenue,
        totalPayout,
        profit,
        winnerPayouts,
      };
    } catch (error) {
      console.error('❌ Error calculating winnings:', error);
      throw error;
    }
  }

  /**
   * Set round winners and calculate results
   */
  static async setRoundWinners(
    roundId: string,
    winners: string[]
  ): Promise<any> {
    try {
      // Calculate winnings
      const winnings = await this.calculateWinnings(roundId, winners);

      // Update round with winners and financial data
      const round = await BettingRoundRepository.updateFinancials(
        roundId,
        winnings.totalRevenue,
        winnings.totalRevenue,
        winnings.totalPayout,
        winnings.profit
      );

      // Set winners
      await BettingRoundRepository.setWinners(roundId, winners);

      // Update bet results
      const bets = await BetRepository.findByRound(roundId);
      for (const bet of bets) {
        const result = winners.includes(bet.userId) ? 'win' : 'lose';
        await BetRepository.updateResult(bet._id!, result);
      }

      console.log('✅ Round winners set:', roundId);
      return round;
    } catch (error) {
      console.error('❌ Error setting round winners:', error);
      throw error;
    }
  }

  /**
   * Generate report for a round
   */
  static async generateReport(roundId: string): Promise<IReport> {
    try {
      const round = await BettingRoundRepository.findById(roundId);
      if (!round) {
        throw new Error('Round not found');
      }

      const bets = await BetRepository.findByRound(roundId);

      // Calculate payouts
      const winnerCount = round.winners.length;
      const payoutPerWinner =
        winnerCount > 0 ? round.totalRevenue / winnerCount : 0;

      const players = bets.map(bet => ({
        lineName: bet.lineName,
        userId: bet.userId,
        amount: bet.amount,
        result: round.winners.includes(bet.userId) ? ('win' as const) : ('lose' as const),
        payout: round.winners.includes(bet.userId) ? payoutPerWinner : 0,
      }));

      const report: IReport = {
        roundId,
        venue: round.venue,
        fireNumber: round.fireNumber,
        players,
        totalRevenue: round.totalRevenue,
        totalPayout: round.totalPayout,
        profit: round.profit,
        generatedAt: new Date(),
      };

      return report;
    } catch (error) {
      console.error('❌ Error generating report:', error);
      throw error;
    }
  }

  /**
   * Format report for LINE message
   */
  static formatReportForLine(report: IReport): string {
    let message = `📊 ผลการแข่ง\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `สนาม: ${report.venue}\n`;
    message += `บั้งไฟ: ${report.fireNumber}\n\n`;

    // Winners
    const winners = report.players.filter(p => p.result === 'win');
    if (winners.length > 0) {
      message += `🏆 ผู้ชนะ:\n`;
      winners.forEach(player => {
        message += `• ${player.lineName}: ${player.payout?.toLocaleString()} บาท\n`;
      });
    }

    // Losers
    const losers = report.players.filter(p => p.result === 'lose');
    if (losers.length > 0) {
      message += `\n❌ ผู้แพ้:\n`;
      losers.forEach(player => {
        message += `• ${player.lineName}: ${player.amount.toLocaleString()} บาท\n`;
      });
    }

    message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `ยอดรายรับ: ${report.totalRevenue.toLocaleString()} บาท\n`;
    message += `เงินรางวัล: ${report.totalPayout.toLocaleString()} บาท\n`;
    message += `กำไร/ขาดทุน: ${report.profit.toLocaleString()} บาท\n`;

    return message;
  }

  /**
   * Get total profit by group
   */
  static async getTotalProfit(groupId: string): Promise<number> {
    try {
      return await BettingRoundRepository.getTotalProfit(groupId);
    } catch (error) {
      console.error('❌ Error getting total profit:', error);
      throw error;
    }
  }

  /**
   * Get bets by venue and fire number
   */
  static async getBetsByVenueAndFire(
    venue: string,
    fireNumber: string
  ): Promise<any[]> {
    try {
      return await BetRepository.findByVenueAndFire(venue, fireNumber);
    } catch (error) {
      console.error('❌ Error getting bets by venue and fire:', error);
      throw error;
    }
  }

  /**
   * Get venue statistics
   */
  static async getVenueStatistics(groupId: string): Promise<any[]> {
    try {
      return await BettingRoundRepository.getVenueStatistics(groupId);
    } catch (error) {
      console.error('❌ Error getting venue statistics:', error);
      throw error;
    }
  }
}
