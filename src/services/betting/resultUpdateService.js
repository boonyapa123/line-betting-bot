const logger = require('../../utils/logger');
const BettingRecordService = require('./bettingRecordService');
const { client } = require('../../config/line');

/**
 * Result Update Service
 * Handles updating betting results and sending summaries
 */
class ResultUpdateService {
  constructor(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
    this.bettingRecordService = new BettingRecordService(spreadsheetId);
  }

  /**
   * Get betting events by date
   */
  async getBettingEventsByDate(date = null) {
    try {
      const dateStr = date || this.bettingRecordService.getTodayDate();
      logger.info('Fetching betting events by date', { date: dateStr });

      // Get all records for the date
      const response = await this.bettingRecordService.getBettingRecordsByDate(dateStr);

      if (!response.success) {
        return response;
      }

      // Group by stadium and fireworks
      const events = {};
      const records = response.records || [];

      records.forEach(record => {
        const key = `${record.venue}-${record.message}`;
        if (!events[key]) {
          events[key] = {
            id: key,
            stadium: record.venue,
            fireworks: record.message,
            totalBets: 0,
            totalAmount: 0,
            records: [],
          };
        }
        events[key].records.push(record);
        events[key].totalBets += 1;
        events[key].totalAmount += record.amount || 0;
      });

      logger.info('Betting events fetched', {
        date: dateStr,
        eventCount: Object.keys(events).length,
      });

      return {
        success: true,
        events: Object.values(events),
        date: dateStr,
      };
    } catch (error) {
      logger.error('Error getting betting events by date:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
        events: [],
      };
    }
  }

  /**
   * Update betting results
   */
  async updateBettingResults(results) {
    try {
      logger.info('Updating betting results', { count: results.length });

      const updateResults = [];

      for (const result of results) {
        const updateResult = await this.bettingRecordService.updateBettingResult(
          result.playerName,
          result.stadium,
          result.amount,
          result.result
        );

        updateResults.push({
          playerName: result.playerName,
          stadium: result.stadium,
          amount: result.amount,
          result: result.result,
          success: updateResult.success,
          error: updateResult.error,
        });
      }

      const successCount = updateResults.filter(r => r.success).length;
      const failureCount = updateResults.filter(r => !r.success).length;

      logger.info('Betting results updated', {
        successCount,
        failureCount,
      });

      return {
        success: true,
        message: `อัปเดตผลลัพธ์สำเร็จ: ${successCount} รายการ`,
        results: updateResults,
        successCount,
        failureCount,
      };
    } catch (error) {
      logger.error('Error updating betting results:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการอัปเดต',
      };
    }
  }

  /**
   * Send result summary to group
   */
  async sendResultSummaryToGroup(groupId, results) {
    try {
      if (!groupId || !results || results.length === 0) {
        logger.warn('Invalid parameters for sending result summary', { groupId });
        return {
          success: false,
          error: 'ข้อมูลไม่ครบ',
        };
      }

      logger.info('Sending result summary to group', { groupId, resultCount: results.length });

      // Create Flex Message for results
      const flexMessage = this.createResultFlexMessage(results);

      await client.pushMessage(groupId, flexMessage);

      logger.info('Result summary sent to group', { groupId });

      return {
        success: true,
        message: 'ส่งสรุปผลลัพธ์สำเร็จ',
      };
    } catch (error) {
      logger.error('Error sending result summary to group:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการส่งข้อมูล',
      };
    }
  }

  /**
   * Create Flex Message for results
   */
  createResultFlexMessage(results) {
    // Group results by stadium
    const byStadium = {};
    results.forEach(result => {
      const stadium = result.stadium || 'unknown';
      if (!byStadium[stadium]) {
        byStadium[stadium] = [];
      }
      byStadium[stadium].push(result);
    });

    // Create boxes for each stadium
    const stadiumBoxes = Object.entries(byStadium).map(([stadium, stadiumResults]) => {
      const resultItems = stadiumResults.map(result => ({
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: result.playerName,
            flex: 2,
            size: 'sm',
          },
          {
            type: 'text',
            text: `${result.amount} บาท`,
            flex: 1,
            size: 'sm',
            align: 'end',
          },
          {
            type: 'text',
            text: result.result === 'win' ? '✅' : '❌',
            flex: 0,
            size: 'sm',
            align: 'end',
            color: result.result === 'win' ? '#00AA00' : '#FF0000',
          },
        ],
        spacing: 'sm',
        margin: 'sm',
      }));

      return {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `🏟️ ${stadium}`,
            weight: 'bold',
            size: 'md',
            margin: 'md',
          },
          {
            type: 'separator',
            margin: 'sm',
          },
          ...resultItems,
        ],
        spacing: 'sm',
      };
    });

    return {
      type: 'flex',
      altText: '🏆 ผลลัพธ์แข่งขัน',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🏆 ผลลัพธ์แข่งขัน',
              weight: 'bold',
              size: 'lg',
              margin: 'md',
            },
            {
              type: 'separator',
              margin: 'md',
            },
            ...stadiumBoxes,
          ],
          spacing: 'md',
          paddingAll: 'md',
        },
      },
    };
  }

  /**
   * Calculate result statistics
   */
  calculateResultStatistics(results) {
    try {
      const stats = {
        totalResults: results.length,
        wins: results.filter(r => r.result === 'win').length,
        losses: results.filter(r => r.result === 'loss').length,
        totalAmount: results.reduce((sum, r) => sum + (r.amount || 0), 0),
        winAmount: results
          .filter(r => r.result === 'win')
          .reduce((sum, r) => sum + (r.amount || 0), 0),
        lossAmount: results
          .filter(r => r.result === 'loss')
          .reduce((sum, r) => sum + (r.amount || 0), 0),
      };

      return {
        success: true,
        statistics: stats,
      };
    } catch (error) {
      logger.error('Error calculating result statistics:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการคำนวณ',
      };
    }
  }
}

module.exports = ResultUpdateService;
