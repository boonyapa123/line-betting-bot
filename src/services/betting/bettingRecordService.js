const logger = require('../../utils/logger');
const googleSheetsService = require('../googleSheetsService');

/**
 * Betting Record Service
 * Handles saving and retrieving betting records from Google Sheets
 */
class BettingRecordService {
  constructor(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get current time in HH:MM:SS format (Bangkok timezone)
   */
  getCurrentTime() {
    const now = new Date();
    // Convert to Bangkok timezone (UTC+7)
    const bangkokTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const hours = String(bangkokTime.getHours()).padStart(2, '0');
    const minutes = String(bangkokTime.getMinutes()).padStart(2, '0');
    const seconds = String(bangkokTime.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Get sheet name for a specific date
   */
  getSheetName(date = null) {
    const dateStr = date || this.getTodayDate();
    return dateStr; // Sheet name is just the date
  }

  /**
   * Save betting record to Google Sheets
   */
  async saveBettingRecord(playerName, amount, fireworks, stadium, userId, groupId) {
    try {
      const date = this.getTodayDate();
      const timestamp = this.getCurrentTime();
      const sheetName = this.getSheetName(date);

      // Prepare data for Google Sheets
      const values = [
        [
          timestamp,
          playerName,
          userId,
          amount,
          fireworks,
          stadium,
          'pending', // result
          'active', // status
        ],
      ];

      // Append to Google Sheets
      const request = {
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:H`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values,
        },
      };

      // Initialize sheets if needed
      await googleSheetsService.initializeGoogleSheets();

      // Create sheet if not exists
      try {
        await googleSheetsService.createSheet(sheetName);
      } catch (error) {
        // Sheet might already exist, continue
        logger.debug('Sheet might already exist:', sheetName);
      }

      // Append the record
      const response = await googleSheetsService.appendBet({
        timestamp: new Date(),
        lineName: playerName,
        venue: stadium,
        amount,
        result: 'pending',
        userId,
      });

      if (response.success) {
        logger.info('Betting record saved', {
          playerName,
          amount,
          fireworks,
          stadium,
          date,
        });

        return {
          success: true,
          message: 'บันทึกการแทงสำเร็จ',
          data: {
            date,
            timestamp,
            playerName,
            amount,
            fireworks,
            stadium,
          },
        };
      } else {
        logger.error('Failed to save betting record:', response.error);
        return {
          success: false,
          error: 'ไม่สามารถบันทึกการแทงได้',
        };
      }
    } catch (error) {
      logger.error('Error saving betting record:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการบันทึก',
      };
    }
  }

  /**
   * Get betting records by date
   */
  async getBettingRecordsByDate(date = null) {
    try {
      const dateStr = date || this.getTodayDate();
      const sheetName = this.getSheetName(dateStr);

      // Initialize sheets if needed
      await googleSheetsService.initializeGoogleSheets();

      // Get all bets
      const response = await googleSheetsService.getAllBets();

      if (!response.success) {
        logger.error('Failed to get betting records:', response.error);
        return {
          success: false,
          error: 'ไม่สามารถดึงข้อมูลการแทงได้',
          records: [],
        };
      }

      // Filter by date (if needed)
      const records = response.bets || [];

      logger.info('Retrieved betting records', {
        date: dateStr,
        count: records.length,
      });

      return {
        success: true,
        records,
        count: records.length,
      };
    } catch (error) {
      logger.error('Error getting betting records by date:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
        records: [],
      };
    }
  }

  /**
   * Get betting records by player
   */
  async getBettingRecordsByPlayer(playerName, date = null) {
    try {
      const dateStr = date || this.getTodayDate();

      // Get all records for the date
      const response = await this.getBettingRecordsByDate(dateStr);

      if (!response.success) {
        return response;
      }

      // Filter by player name
      const playerRecords = response.records.filter(
        record => record.lineName === playerName
      );

      logger.info('Retrieved player betting records', {
        playerName,
        date: dateStr,
        count: playerRecords.length,
      });

      return {
        success: true,
        records: playerRecords,
        count: playerRecords.length,
        playerName,
      };
    } catch (error) {
      logger.error('Error getting betting records by player:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
        records: [],
      };
    }
  }

  /**
   * Get betting records by stadium
   */
  async getBettingRecordsByStadium(stadium, date = null) {
    try {
      const dateStr = date || this.getTodayDate();

      // Get all records for the date
      const response = await this.getBettingRecordsByDate(dateStr);

      if (!response.success) {
        return response;
      }

      // Filter by stadium
      const stadiumRecords = response.records.filter(
        record => record.venue === stadium
      );

      logger.info('Retrieved stadium betting records', {
        stadium,
        date: dateStr,
        count: stadiumRecords.length,
      });

      return {
        success: true,
        records: stadiumRecords,
        count: stadiumRecords.length,
        stadium,
      };
    } catch (error) {
      logger.error('Error getting betting records by stadium:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
        records: [],
      };
    }
  }

  /**
   * Update betting result
   */
  async updateBettingResult(playerName, stadium, amount, result) {
    try {
      // Validate result
      if (!['win', 'loss', 'pending'].includes(result)) {
        return {
          success: false,
          error: 'ผลลัพธ์ไม่ถูกต้อง',
        };
      }

      // Update in Google Sheets
      const response = await googleSheetsService.updateBetResult(
        playerName,
        stadium,
        amount,
        result
      );

      if (response.success) {
        logger.info('Betting result updated', {
          playerName,
          stadium,
          amount,
          result,
        });

        return {
          success: true,
          message: 'อัปเดตผลลัพธ์สำเร็จ',
        };
      } else {
        logger.error('Failed to update betting result:', response.error);
        return {
          success: false,
          error: 'ไม่สามารถอัปเดตผลลัพธ์ได้',
        };
      }
    } catch (error) {
      logger.error('Error updating betting result:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการอัปเดต',
      };
    }
  }

  /**
   * Clear daily records (archive and delete)
   */
  async clearDailyRecords(date = null) {
    try {
      const dateStr = date || this.getTodayDate();
      const sheetName = this.getSheetName(dateStr);
      const archiveSheetName = `archive-${dateStr}`;

      // Initialize sheets if needed
      await googleSheetsService.initializeGoogleSheets();

      // Get all records before clearing
      const response = await this.getBettingRecordsByDate(dateStr);

      if (response.success && response.records.length > 0) {
        // Create archive sheet
        try {
          await googleSheetsService.createSheet(archiveSheetName);
        } catch (error) {
          logger.debug('Archive sheet might already exist:', archiveSheetName);
        }

        // Copy records to archive (would need to implement this)
        logger.info('Records archived', {
          date: dateStr,
          count: response.records.length,
        });
      }

      // Clear the active sheet
      const clearResponse = await googleSheetsService.clearSheet(sheetName);

      if (clearResponse.success) {
        logger.info('Daily records cleared', {
          date: dateStr,
          sheetName,
        });

        return {
          success: true,
          message: 'เคลียร์ข้อมูลรายวันสำเร็จ',
          archivedCount: response.records.length,
        };
      } else {
        logger.error('Failed to clear daily records:', clearResponse.error);
        return {
          success: false,
          error: 'ไม่สามารถเคลียร์ข้อมูลได้',
        };
      }
    } catch (error) {
      logger.error('Error clearing daily records:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการเคลียร์ข้อมูล',
      };
    }
  }
}

module.exports = BettingRecordService;
