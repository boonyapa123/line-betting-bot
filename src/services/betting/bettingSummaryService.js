const logger = require('../../utils/logger');
const BettingRecordService = require('./bettingRecordService');

/**
 * Betting Summary Service
 * Generates betting summaries and reports
 */
class BettingSummaryService {
  constructor(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
    this.bettingRecordService = new BettingRecordService(spreadsheetId);
  }

  /**
   * Generate player summary
   */
  async generatePlayerSummary(playerName, date = null) {
    try {
      logger.info('Generating player summary', { playerName, date });

      // Get player records
      const response = await this.bettingRecordService.getBettingRecordsByPlayer(
        playerName,
        date
      );

      if (!response.success) {
        return response;
      }

      const records = response.records || [];

      // Calculate statistics
      const totalAmount = records.reduce((sum, record) => sum + (record.amount || 0), 0);
      const betCount = records.length;
      const wins = records.filter(r => r.result === 'win').length;
      const losses = records.filter(r => r.result === 'loss').length;
      const pending = records.filter(r => r.result === 'pending').length;

      const summary = {
        playerName,
        date: date || this.bettingRecordService.getTodayDate(),
        totalAmount,
        betCount,
        wins,
        losses,
        pending,
        records,
      };

      logger.info('Player summary generated', summary);

      return {
        success: true,
        summary,
      };
    } catch (error) {
      logger.error('Error generating player summary:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการสร้างสรุป',
      };
    }
  }

  /**
   * Generate stadium summary
   */
  async generateStadiumSummary(stadium, date = null) {
    try {
      logger.info('Generating stadium summary', { stadium, date });

      // Get stadium records
      const response = await this.bettingRecordService.getBettingRecordsByStadium(
        stadium,
        date
      );

      if (!response.success) {
        return response;
      }

      const records = response.records || [];

      // Calculate statistics
      const totalAmount = records.reduce((sum, record) => sum + (record.amount || 0), 0);
      const betCount = records.length;
      const wins = records.filter(r => r.result === 'win').length;
      const losses = records.filter(r => r.result === 'loss').length;
      const pending = records.filter(r => r.result === 'pending').length;

      // Group by fireworks
      const byFireworks = {};
      records.forEach(record => {
        const fireworks = record.message || 'unknown';
        if (!byFireworks[fireworks]) {
          byFireworks[fireworks] = {
            fireworks,
            totalAmount: 0,
            betCount: 0,
            wins: 0,
            losses: 0,
            pending: 0,
          };
        }
        byFireworks[fireworks].totalAmount += record.amount || 0;
        byFireworks[fireworks].betCount += 1;
        if (record.result === 'win') byFireworks[fireworks].wins += 1;
        if (record.result === 'loss') byFireworks[fireworks].losses += 1;
        if (record.result === 'pending') byFireworks[fireworks].pending += 1;
      });

      const summary = {
        stadium,
        date: date || this.bettingRecordService.getTodayDate(),
        totalAmount,
        betCount,
        wins,
        losses,
        pending,
        byFireworks: Object.values(byFireworks),
        records,
      };

      logger.info('Stadium summary generated', summary);

      return {
        success: true,
        summary,
      };
    } catch (error) {
      logger.error('Error generating stadium summary:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการสร้างสรุป',
      };
    }
  }

  /**
   * Generate daily summary
   */
  async generateDailySummary(date = null) {
    try {
      const dateStr = date || this.bettingRecordService.getTodayDate();
      logger.info('Generating daily summary', { date: dateStr });

      // Get all records for the date
      const response = await this.bettingRecordService.getBettingRecordsByDate(dateStr);

      if (!response.success) {
        return response;
      }

      const records = response.records || [];

      // Calculate statistics using updatedStatus if available
      const totalAmount = records.reduce((sum, record) => sum + (record.amount || 0), 0);
      const betCount = records.length;
      
      // Normalize status and count
      const normalizeStatus = (status) => {
        if (status === 'win' || status === 'ชนะ') return 'win';
        if (status === 'loss' || status === 'แพ้') return 'loss';
        if (status === 'cancel' || status === 'ยกเลิก') return 'cancel';
        return 'pending';
      };
      
      const wins = records.filter(r => normalizeStatus(r.updatedStatus || r.result) === 'win').length;
      const losses = records.filter(r => normalizeStatus(r.updatedStatus || r.result) === 'loss').length;
      const pending = records.filter(r => normalizeStatus(r.updatedStatus || r.result) === 'pending').length;

      // Group by player
      const byPlayer = {};
      records.forEach(record => {
        const playerName = record.lineName || 'unknown';
        const status = normalizeStatus(record.updatedStatus || record.result || 'pending');
        
        if (!byPlayer[playerName]) {
          byPlayer[playerName] = {
            playerName,
            totalAmount: 0,
            betCount: 0,
            wins: 0,
            losses: 0,
            pending: 0,
          };
        }
        byPlayer[playerName].totalAmount += record.amount || 0;
        byPlayer[playerName].betCount += 1;
        if (status === 'win') byPlayer[playerName].wins += 1;
        if (status === 'loss') byPlayer[playerName].losses += 1;
        if (status === 'pending') byPlayer[playerName].pending += 1;
      });

      // Group by stadium
      const byStadium = {};
      records.forEach(record => {
        const stadium = record.venue || 'unknown';
        const status = normalizeStatus(record.updatedStatus || record.result || 'pending');
        
        if (!byStadium[stadium]) {
          byStadium[stadium] = {
            stadium,
            totalAmount: 0,
            betCount: 0,
            wins: 0,
            losses: 0,
            pending: 0,
          };
        }
        byStadium[stadium].totalAmount += record.amount || 0;
        byStadium[stadium].betCount += 1;
        if (status === 'win') byStadium[stadium].wins += 1;
        if (status === 'loss') byStadium[stadium].losses += 1;
        if (status === 'pending') byStadium[stadium].pending += 1;
      });

      const summary = {
        date: dateStr,
        totalAmount,
        betCount,
        wins,
        losses,
        pending,
        byPlayer: Object.values(byPlayer),
        byStadium: Object.values(byStadium),
        records,
      };

      logger.info('Daily summary generated', summary);

      return {
        success: true,
        summary,
      };
    } catch (error) {
      logger.error('Error generating daily summary:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการสร้างสรุป',
      };
    }
  }

  /**
   * Format summary for display
   */
  formatSummaryForDisplay(summary, type = 'daily') {
    if (type === 'player') {
      return this.formatPlayerSummaryForDisplay(summary);
    } else if (type === 'stadium') {
      return this.formatStadiumSummaryForDisplay(summary);
    } else {
      return this.formatDailySummaryForDisplay(summary);
    }
  }

  /**
   * Format player summary for display
   */
  formatPlayerSummaryForDisplay(summary) {
    const { playerName, totalAmount, betCount, wins, losses, pending } = summary;

    return `
📊 สรุปยอดแทง - ${playerName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 ยอดแทงรวม: ${totalAmount} บาท
🎯 จำนวนการแทง: ${betCount} ครั้ง
✅ ชนะ: ${wins} ครั้ง
❌ แพ้: ${losses} ครั้ง
⏳ รอผล: ${pending} ครั้ง
    `.trim();
  }

  /**
   * Format stadium summary for display
   */
  formatStadiumSummaryForDisplay(summary) {
    const { stadium, totalAmount, betCount, wins, losses, pending } = summary;

    return `
📊 สรุปยอดแทง - ${stadium}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 ยอดแทงรวม: ${totalAmount} บาท
🎯 จำนวนการแทง: ${betCount} ครั้ง
✅ ชนะ: ${wins} ครั้ง
❌ แพ้: ${losses} ครั้ง
⏳ รอผล: ${pending} ครั้ง
    `.trim();
  }

  /**
   * Format daily summary for display
   */
  formatDailySummaryForDisplay(summary) {
    const { date, totalAmount, betCount, wins, losses, pending, byPlayer, byStadium, records } = summary;

    let text = `
📊 สรุปยอดแทงรายวัน - ${date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 ยอดแทงรวม: ${totalAmount} บาท
🎯 จำนวนการแทง: ${betCount} ครั้ง
✅ ชนะ: ${wins} ครั้ง
❌ แพ้: ${losses} ครั้ง
⏳ รอผล: ${pending} ครั้ง

📋 รายละเอียดตามผู้เล่น:
    `.trim();

    // Normalize status
    const normalizeStatus = (status) => {
      if (status === 'win' || status === 'ชนะ') return 'win';
      if (status === 'loss' || status === 'แพ้') return 'loss';
      if (status === 'cancel' || status === 'ยกเลิก') return 'cancel';
      return 'pending';
    };

    byPlayer.forEach(player => {
      text += `\n${player.playerName}: ${player.totalAmount} บาท (${player.betCount} ครั้ง)`;
      
      // Show details for this player - separated by win/loss/pending
      const playerRecords = records.filter(r => r.lineName === player.playerName);
      
      // Group by status
      const winRecords = playerRecords.filter(r => normalizeStatus(r.updatedStatus || r.result) === 'win');
      const lossRecords = playerRecords.filter(r => normalizeStatus(r.updatedStatus || r.result) === 'loss');
      const pendingRecords = playerRecords.filter(r => normalizeStatus(r.updatedStatus || r.result) === 'pending');
      
      // Calculate totals by status
      const winTotal = winRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
      const lossTotal = lossRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
      const pendingTotal = pendingRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
      
      // Show wins (only if there are wins)
      if (winRecords.length > 0) {
        text += `\n✅ ชนะ: ${winTotal} บาท (${winRecords.length} ครั้ง)`;
        winRecords.forEach(record => {
          const amount = record.amount ? ` (${record.amount} บาท)` : '';
          text += `\n✅ ${record.venue} ${record.message}${amount}`;
        });
      }
      
      // Show losses (only if there are losses)
      if (lossRecords.length > 0) {
        text += `\n❌ แพ้: ${lossTotal} บาท (${lossRecords.length} ครั้ง)`;
        lossRecords.forEach(record => {
          const amount = record.amount ? ` (${record.amount} บาท)` : '';
          text += `\n❌ ${record.venue} ${record.message}${amount}`;
        });
      }
      
      // Show pending (only if there are pending)
      if (pendingRecords.length > 0) {
        text += `\n⏳ รอผล: ${pendingTotal} บาท (${pendingRecords.length} ครั้ง)`;
        pendingRecords.forEach(record => {
          const amount = record.amount ? ` (${record.amount} บาท)` : '';
          text += `\n⏳ ${record.venue} ${record.message}${amount}`;
        });
      }
    });

    text += `\n\n📋 รายละเอียดตามสนาม:`;
    byStadium.forEach(stadium => {
      text += `\n${stadium.stadium}: ${stadium.totalAmount} บาท (${stadium.betCount} ครั้ง)`;
    });

    // Add summary by status
    const totalWinAmount = records
      .filter(r => normalizeStatus(r.updatedStatus || r.result) === 'win')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    
    const totalLossAmount = records
      .filter(r => normalizeStatus(r.updatedStatus || r.result) === 'loss')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    text += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    text += `\n📊 สรุปยอดรวม:`;
    text += `\n✅ ยอดชนะ: ${totalWinAmount} บาท`;
    text += `\n❌ ยอดแพ้: ${totalLossAmount} บาท`;
    text += `\n💰 ยอดสุทธิ: ${totalWinAmount - totalLossAmount} บาท`;

    return text;
  }
}

module.exports = BettingSummaryService;
