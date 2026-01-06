const Bet = require('../models/Bet');
const BettingRound = require('../models/BettingRound');
const logger = require('../utils/logger');

/**
 * Export bets to CSV format
 */
const exportBetsToCSV = async (filters = {}) => {
  try {
    const query = {};

    if (filters.venue) query.venue = filters.venue;
    if (filters.roundId) query.roundId = filters.roundId;
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
      if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
    }

    const bets = await Bet.find(query).sort({ timestamp: -1 });

    if (bets.length === 0) {
      return {
        success: false,
        error: 'No bets found for export',
      };
    }

    // Build CSV header
    let csv = 'ลำดับ,ชื่อผู้เล่น,สนาม,ยอดเงิน,ผล,วันที่เวลา\n';

    // Add data rows
    bets.forEach((bet, index) => {
      const timestamp = new Date(bet.timestamp).toLocaleString('th-TH');
      csv += `${index + 1},"${bet.lineName}","${bet.venue}",${bet.amount},"${bet.result}","${timestamp}"\n`;
    });

    return {
      success: true,
      csv,
      filename: `bets_${Date.now()}.csv`,
      count: bets.length,
    };
  } catch (error) {
    logger.error('Error exporting bets to CSV', error);
    return {
      success: false,
      error: 'Failed to export bets',
    };
  }
};

/**
 * Export round report to CSV format
 */
const exportRoundReportToCSV = async (roundId) => {
  try {
    const round = await BettingRound.findById(roundId);

    if (!round) {
      return {
        success: false,
        error: 'Betting round not found',
      };
    }

    const bets = await Bet.find({ roundId }).sort({ timestamp: 1 });

    if (bets.length === 0) {
      return {
        success: false,
        error: 'No bets found for this round',
      };
    }

    // Build CSV header
    let csv = `รายงานการแข่ง - ${round.venue} - บั้งไฟ ${round.fireNumber}\n`;
    csv += `วันที่: ${new Date(round.createdAt).toLocaleDateString('th-TH')}\n`;
    csv += `สถานะ: ${round.status}\n`;
    csv += `ยอดรายรับ: ${round.totalRevenue} บาท\n`;
    csv += `ยอดจ่าย: ${round.totalPayout} บาท\n`;
    csv += `กำไร: ${round.profit} บาท\n\n`;

    csv += 'ลำดับ,ชื่อผู้เล่น,ยอดเงิน,ผล\n';

    // Add data rows
    bets.forEach((bet, index) => {
      csv += `${index + 1},"${bet.lineName}",${bet.amount},"${bet.result}"\n`;
    });

    return {
      success: true,
      csv,
      filename: `round_${roundId}_${Date.now()}.csv`,
      count: bets.length,
    };
  } catch (error) {
    logger.error('Error exporting round report to CSV', error);
    return {
      success: false,
      error: 'Failed to export round report',
    };
  }
};

/**
 * Export venue summary to CSV format
 */
const exportVenueSummaryToCSV = async (venue, startDate, endDate) => {
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
        error: 'No rounds found for this venue',
      };
    }

    // Build CSV header
    let csv = `สรุปสนาม - ${venue}\n`;
    csv += `ช่วงเวลา: ${startDate || 'ทั้งหมด'} ถึง ${endDate || 'ปัจจุบัน'}\n\n`;

    csv += 'ลำดับ,บั้งไฟ,ยอดรายรับ,ยอดจ่าย,กำไร,สถานะ\n';

    // Add data rows
    let totalRevenue = 0;
    let totalPayout = 0;
    let totalProfit = 0;

    rounds.forEach((round, index) => {
      csv += `${index + 1},"${round.fireNumber}",${round.totalRevenue},${round.totalPayout},${round.profit},"${round.status}"\n`;
      totalRevenue += round.totalRevenue;
      totalPayout += round.totalPayout;
      totalProfit += round.profit;
    });

    csv += `\nรวม,${rounds.length},${totalRevenue},${totalPayout},${totalProfit}\n`;

    return {
      success: true,
      csv,
      filename: `venue_${venue}_${Date.now()}.csv`,
      count: rounds.length,
      summary: {
        totalRevenue,
        totalPayout,
        totalProfit,
      },
    };
  } catch (error) {
    logger.error('Error exporting venue summary to CSV', error);
    return {
      success: false,
      error: 'Failed to export venue summary',
    };
  }
};

module.exports = {
  exportBetsToCSV,
  exportRoundReportToCSV,
  exportVenueSummaryToCSV,
};
