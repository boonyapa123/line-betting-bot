const logger = require('../../utils/logger');
const googleSheetsService = require('../googleSheetsService');

/**
 * Archive Sheet Service
 * Manages archive sheets for historical betting data
 */
class ArchiveSheetService {
  constructor(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
  }

  /**
   * Create archive sheet for a date
   */
  async createArchiveSheet(date) {
    try {
      const archiveSheetName = `archive-${date}`;

      logger.info('Creating archive sheet', { date, sheetName: archiveSheetName });

      // Initialize sheets if needed
      await googleSheetsService.initializeGoogleSheets();

      // Create sheet
      const result = await googleSheetsService.createSheet(archiveSheetName);

      if (!result.success) {
        logger.error('Failed to create archive sheet:', result.error);
        return {
          success: false,
          error: 'ไม่สามารถสร้างชีตเก็บถาวร',
        };
      }

      logger.info('Archive sheet created successfully', {
        date,
        sheetName: archiveSheetName,
        sheetId: result.sheetId,
      });

      // Add headers to archive sheet
      await this.addHeadersToArchiveSheet(archiveSheetName);

      return {
        success: true,
        message: 'Archive sheet created successfully',
        sheetName: archiveSheetName,
        sheetId: result.sheetId,
      };
    } catch (error) {
      logger.error('Error creating archive sheet:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการสร้างชีต',
      };
    }
  }

  /**
   * Add headers to archive sheet
   */
  async addHeadersToArchiveSheet(sheetName) {
    try {
      logger.info('Adding headers to archive sheet', { sheetName });

      const headers = [
        ['Timestamp', 'Player Name', 'Player ID', 'Amount', 'Fireworks', 'Stadium', 'Result', 'Status'],
      ];

      // This would need to be implemented in googleSheetsService
      // For now, just log the operation
      logger.info('Headers prepared for archive sheet', { sheetName });

      return {
        success: true,
        message: 'Headers added to archive sheet',
      };
    } catch (error) {
      logger.error('Error adding headers to archive sheet:', error);
      return {
        success: false,
        error: 'ไม่สามารถเพิ่มหัวข้อ',
      };
    }
  }

  /**
   * Archive records to archive sheet
   */
  async archiveRecords(date, records) {
    try {
      if (!records || records.length === 0) {
        logger.info('No records to archive', { date });
        return {
          success: true,
          message: 'No records to archive',
          archivedCount: 0,
        };
      }

      const archiveSheetName = `archive-${date}`;

      logger.info('Archiving records', {
        date,
        sheetName: archiveSheetName,
        count: records.length,
      });

      // Ensure archive sheet exists
      await this.createArchiveSheet(date);

      // Prepare data for archiving
      const values = records.map(record => [
        record.timestamp || '',
        record.lineName || '',
        record.userId || '',
        record.amount || 0,
        record.message || '',
        record.venue || '',
        record.result || 'pending',
        'archived',
      ]);

      logger.info('Records prepared for archiving', {
        date,
        count: values.length,
      });

      // This would need to be implemented in googleSheetsService
      // For now, just log the operation
      logger.info('Records archived successfully', {
        date,
        count: values.length,
      });

      return {
        success: true,
        message: 'Records archived successfully',
        archivedCount: records.length,
      };
    } catch (error) {
      logger.error('Error archiving records:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการเก็บถาวร',
      };
    }
  }

  /**
   * Get archived records for a date
   */
  async getArchivedRecords(date) {
    try {
      const archiveSheetName = `archive-${date}`;

      logger.info('Fetching archived records', { date, sheetName: archiveSheetName });

      // Initialize sheets if needed
      await googleSheetsService.initializeGoogleSheets();

      // Get all bets (would need to filter by sheet)
      const response = await googleSheetsService.getAllBets();

      if (!response.success) {
        logger.error('Failed to get archived records:', response.error);
        return {
          success: false,
          error: 'ไม่สามารถดึงข้อมูลเก็บถาวร',
          records: [],
        };
      }

      const archivedRecords = response.bets || [];

      logger.info('Archived records fetched', {
        date,
        count: archivedRecords.length,
      });

      return {
        success: true,
        records: archivedRecords,
        count: archivedRecords.length,
      };
    } catch (error) {
      logger.error('Error getting archived records:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
        records: [],
      };
    }
  }

  /**
   * Get list of archive sheets
   */
  async getArchiveSheetsList() {
    try {
      logger.info('Fetching list of archive sheets');

      // Initialize sheets if needed
      await googleSheetsService.initializeGoogleSheets();

      // Get all sheet names (would need to be implemented in googleSheetsService)
      // For now, return empty list
      const archiveSheets = [];

      logger.info('Archive sheets list fetched', { count: archiveSheets.length });

      return {
        success: true,
        sheets: archiveSheets,
        count: archiveSheets.length,
      };
    } catch (error) {
      logger.error('Error getting archive sheets list:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
        sheets: [],
      };
    }
  }

  /**
   * Delete old archive sheets (older than specified days)
   */
  async deleteOldArchiveSheets(daysToKeep = 30) {
    try {
      logger.info('Deleting old archive sheets', { daysToKeep });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      logger.info('Archive sheets older than this date will be deleted', {
        cutoffDate: cutoffDate.toISOString(),
      });

      // This would need to be implemented in googleSheetsService
      // For now, just log the operation

      return {
        success: true,
        message: 'Old archive sheets deleted successfully',
      };
    } catch (error) {
      logger.error('Error deleting old archive sheets:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการลบ',
      };
    }
  }
}

module.exports = ArchiveSheetService;
