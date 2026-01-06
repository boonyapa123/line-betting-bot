const BettingRound = require('../models/BettingRound');
const Bet = require('../models/Bet');
const { formatCurrency, calculateRoundStats } = require('../utils/calculationUtils');

/**
 * Generate detailed round report
 */
const generateRoundReport = async (roundId) => {
  try {
    const round = await BettingRound.findById(roundId);

    if (!round) {
      return {
        success: false,
        error: 'Betting round not found',
      };
    }

    // Get all bets for this round
    const bets = await Bet.find({ roundId }).sort({ timestamp: 1 });

    // Calculate statistics
    const stats = calculateRoundStats(bets, round.winners);

    // Group bets by result
    const winningBets = bets.filter((b) => b.result === 'win');
    const losingBets = bets.filter((b) => b.result === 'lose');

    // Build report
    let report = `📊 รายงานการแข่ง\n`;
    report += `${'='.repeat(40)}\n\n`;

    // Header
    report += `🎆 สนาม: ${round.venue}\n`;
    report += `🔢 บั้งไฟ: ${round.fireNumber}\n`;
    report += `📅 วันที่: ${new Date(round.createdAt).toLocaleDateString('th-TH')}\n`;
    report += `⏰ เวลา: ${new Date(round.createdAt).toLocaleTimeString('th-TH')}\n`;
    report += `📌 สถานะ: ${round.status}\n\n`;

    // Statistics
    report += `📈 สถิติ\n`;
    report += `${'─'.repeat(40)}\n`;
    report += `ผู้เล่นทั้งหมด: ${stats.totalBetCount} คน\n`;
    report += `ผู้ชนะ: ${stats.winnerCount} คน\n`;
    report += `ผู้แพ้: ${stats.loserCount} คน\n`;
    report += `ยอดเงินแทงทั้งหมด: ${formatCurrency(stats.totalBets)}\n`;
    report += `ยอดเงินแทงของผู้ชนะ: ${formatCurrency(stats.totalWinningAmount)}\n`;
    report += `ยอดเงินแทงของผู้แพ้: ${formatCurrency(stats.totalLosingAmount)}\n`;
    report += `ยอดเงินแทงเฉลี่ย: ${formatCurrency(stats.averageBetAmount)}\n\n`;

    // Financial Summary
    report += `💰 สรุปการเงิน\n`;
    report += `${'─'.repeat(40)}\n`;
    report += `ยอดรายรับ: ${formatCurrency(round.totalRevenue)}\n`;
    report += `ยอดจ่ายให้ผู้ชนะ: ${formatCurrency(round.totalPayout)}\n`;
    report += `กำไร/ขาดทุน: ${formatCurrency(round.profit)}\n\n`;

    // Winners
    if (winningBets.length > 0) {
      report += `🏆 ผู้ชนะ\n`;
      report += `${'─'.repeat(40)}\n`;
      winningBets.forEach((bet, index) => {
        report += `${index + 1}. ${bet.lineName}\n`;
        report += `   ยอดแทง: ${formatCurrency(bet.amount)}\n`;
      });
      report += `\n`;
    }

    // Losers
    if (losingBets.length > 0) {
      report += `❌ ผู้แพ้\n`;
      report += `${'─'.repeat(40)}\n`;
      losingBets.forEach((bet, index) => {
        report += `${index + 1}. ${bet.lineName}\n`;
        report += `   ยอดแทง: ${formatCurrency(bet.amount)}\n`;
      });
      report += `\n`;
    }

    return {
      success: true,
      report,
      data: {
        roundId: round._id,
        venue: round.venue,
        fireNumber: round.fireNumber,
        status: round.status,
        stats,
        totalRevenue: round.totalRevenue,
        totalPayout: round.totalPayout,
        profit: round.profit,
        winnerCount: stats.winnerCount,
        loserCount: stats.loserCount,
      },
    };
  } catch (error) {
    console.error('Error generating round report:', error);
    return {
      success: false,
      error: 'Failed to generate report',
    };
  }
};

/**
 * Generate summary report for multiple rounds
 */
const generateSummaryReport = async (venue, startDate, endDate) => {
  try {
    const query = { venue };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const rounds = await BettingRound.find(query).sort({ createdAt: -1 });

    if (rounds.length === 0) {
      return {
        success: false,
        error: 'No rounds found for the specified criteria',
      };
    }

    // Calculate totals
    const totalRevenue = rounds.reduce((sum, r) => sum + r.totalRevenue, 0);
    const totalPayout = rounds.reduce((sum, r) => sum + r.totalPayout, 0);
    const totalProfit = rounds.reduce((sum, r) => sum + r.profit, 0);

    // Build report
    let report = `📊 รายงานสรุป\n`;
    report += `${'='.repeat(40)}\n\n`;

    report += `🎆 สนาม: ${venue}\n`;
    report += `📅 ช่วงเวลา: ${startDate || 'ทั้งหมด'} ถึง ${endDate || 'ปัจจุบัน'}\n\n`;

    report += `📈 สรุปทั่วไป\n`;
    report += `${'─'.repeat(40)}\n`;
    report += `จำนวนรอบ: ${rounds.length}\n`;
    report += `ยอดรายรับรวม: ${formatCurrency(totalRevenue)}\n`;
    report += `ยอดจ่ายรวม: ${formatCurrency(totalPayout)}\n`;
    report += `กำไร/ขาดทุนรวม: ${formatCurrency(totalProfit)}\n\n`;

    report += `📋 รายละเอียดรอบ\n`;
    report += `${'─'.repeat(40)}\n`;
    rounds.forEach((round, index) => {
      report += `${index + 1}. บั้งไฟ ${round.fireNumber}\n`;
      report += `   รายรับ: ${formatCurrency(round.totalRevenue)}\n`;
      report += `   จ่าย: ${formatCurrency(round.totalPayout)}\n`;
      report += `   กำไร: ${formatCurrency(round.profit)}\n`;
    });

    return {
      success: true,
      report,
      data: {
        venue,
        roundCount: rounds.length,
        totalRevenue,
        totalPayout,
        totalProfit,
      },
    };
  } catch (error) {
    console.error('Error generating summary report:', error);
    return {
      success: false,
      error: 'Failed to generate summary report',
    };
  }
};

/**
 * Generate player statistics report
 */
const generatePlayerReport = async (userId) => {
  try {
    const bets = await Bet.find({ userId }).sort({ timestamp: -1 });

    if (bets.length === 0) {
      return {
        success: false,
        error: 'No bets found for this player',
      };
    }

    const lineName = bets[0].lineName;
    const totalBets = bets.reduce((sum, b) => sum + b.amount, 0);
    const winCount = bets.filter((b) => b.result === 'win').length;
    const loseCount = bets.filter((b) => b.result === 'lose').length;
    const pendingCount = bets.filter((b) => b.result === 'pending').length;

    let report = `👤 รายงานผู้เล่น\n`;
    report += `${'='.repeat(40)}\n\n`;

    report += `ชื่อ: ${lineName}\n`;
    report += `ID: ${userId}\n\n`;

    report += `📊 สถิติ\n`;
    report += `${'─'.repeat(40)}\n`;
    report += `จำนวนการแทงทั้งหมด: ${bets.length}\n`;
    report += `ชนะ: ${winCount}\n`;
    report += `แพ้: ${loseCount}\n`;
    report += `รอผล: ${pendingCount}\n`;
    report += `ยอดเงินแทงรวม: ${formatCurrency(totalBets)}\n`;
    report += `อัตราชนะ: ${((winCount / (winCount + loseCount)) * 100).toFixed(2)}%\n\n`;

    report += `📋 ประวัติการแทง (10 ครั้งล่าสุด)\n`;
    report += `${'─'.repeat(40)}\n`;
    bets.slice(0, 10).forEach((bet, index) => {
      report += `${index + 1}. ${bet.venue} - ${formatCurrency(bet.amount)} (${bet.result})\n`;
    });

    return {
      success: true,
      report,
      data: {
        userId,
        lineName,
        totalBets,
        winCount,
        loseCount,
        pendingCount,
        totalAmount: totalBets,
      },
    };
  } catch (error) {
    console.error('Error generating player report:', error);
    return {
      success: false,
      error: 'Failed to generate player report',
    };
  }
};

module.exports = {
  generateRoundReport,
  generateSummaryReport,
  generatePlayerReport,
};
