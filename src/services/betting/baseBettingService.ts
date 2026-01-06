import { BettingRecord, BettingEvent } from '../../types/betting';

const googleSheetsService = require('../googleSheetsService');

export abstract class BaseBettingService {
  protected spreadsheetId: string;

  constructor(spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId;
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  protected getTodayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get current time in HH:MM:SS format (Bangkok timezone)
   */
  protected getCurrentTime(): string {
    const now = new Date();
    // Convert to Bangkok timezone (UTC+7)
    const bangkokTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const hours = String(bangkokTime.getHours()).padStart(2, '0');
    const minutes = String(bangkokTime.getMinutes()).padStart(2, '0');
    const seconds = String(bangkokTime.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Get current timestamp in milliseconds
   */
  protected getCurrentTimestamp(): number {
    return Date.now();
  }

  /**
   * Create or get sheet for a specific date
   */
  protected async getOrCreateSheet(sheetName: string): Promise<string> {
    try {
      // Try to get existing sheet
      const sheets = await this.sheetsService.getSheetNames(this.spreadsheetId);
      if (sheets.includes(sheetName)) {
        return sheetName;
      }

      // Create new sheet if not exists
      await this.sheetsService.addSheet(this.spreadsheetId, sheetName);
      return sheetName;
    } catch (error) {
      console.error(`Error getting or creating sheet ${sheetName}:`, error);
      throw error;
    }
  }

  /**
   * Format betting record for Google Sheets
   */
  protected formatRecordForSheets(record: BettingRecord): any[] {
    return [
      record.timestamp,
      record.playerName,
      record.playerId,
      record.amount,
      record.fireworks,
      record.stadium,
      record.result,
      record.status,
    ];
  }

  /**
   * Parse row from Google Sheets to BettingRecord
   */
  protected parseRowToRecord(row: any[], date: string, id: string): BettingRecord {
    return {
      id,
      date,
      timestamp: row[0] || '',
      playerName: row[1] || '',
      playerId: row[2] || '',
      amount: parseFloat(row[3]) || 0,
      fireworks: row[4] || '',
      stadium: row[5] || '',
      result: row[6] || 'pending',
      status: row[7] || 'active',
      createdAt: this.getCurrentTimestamp(),
      updatedAt: this.getCurrentTimestamp(),
    };
  }
}
