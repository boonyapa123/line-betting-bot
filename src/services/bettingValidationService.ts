/**
 * Betting Validation Service
 * ตรวจสอบเงื่อนไขการแทง
 */

export interface BettingData {
  venueName: string;
  fireNumber: string;
  amount: number;
  playerName: string;
  userId: string;
  timestamp: string;
}

export class BettingValidationService {
  /**
   * Validate betting message
   * ตรวจสอบว่าข้อความมีเงื่อนไขการแทง
   */
  static validateBettingMessage(text: string): BettingData | null {
    try {
      // Pattern: "ชื่อสนาม บั้งไฟ จำนวนเงิน"
      // Example: "ชลบุรี 123 500"
      
      const parts = text.trim().split(/\s+/);
      
      if (parts.length < 3) {
        return null;
      }

      const venueName = parts[0];
      const fireNumber = parts[1];
      const amount = parseInt(parts[2]);

      // Validate
      if (!venueName || !fireNumber || isNaN(amount) || amount <= 0) {
        return null;
      }

      // Check if fireNumber is numeric
      if (!/^\d+$/.test(fireNumber)) {
        return null;
      }

      return {
        venueName,
        fireNumber,
        amount,
        playerName: '', // Will be filled from user profile
        userId: '',     // Will be filled from event
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if message is betting
   */
  static isBettingMessage(text: string): boolean {
    return this.validateBettingMessage(text) !== null;
  }

  /**
   * Format betting data for sheet
   */
  static formatForSheet(data: BettingData): any[] {
    return [
      data.timestamp,
      data.playerName,
      data.userId,
      data.venueName,
      data.fireNumber,
      data.amount,
    ];
  }
}
