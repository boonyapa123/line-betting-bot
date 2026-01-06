const logger = require('../../utils/logger');
const { ParsedBettingMessage } = require('../../types/betting');

/**
 * Player Betting Parser
 * Analyzes player messages to extract betting information
 */
class PlayerBettingParser {
  /**
   * Parse betting message from player
   * Supports flexible formats like:
   * - "กุหลาบขาว 270-75 น้องรีวิว 270-80 เหลี่ยมอิสาน 280-300"
   * - "ราย 325 5/7-500 ธ.คุณ"
   * - "puang 4-68500 คุณ"
   * - "-5 ธ 500 คุณ"
   * - "Art_CN. 68-78 ธ500 คุณ"
   * - "ชื่อ 100 บั้งไฟสีแดง สนามกรุงเทพ"
   */
  static parseBettingMessage(message) {
    try {
      if (!message || typeof message !== 'string') {
        return {
          success: false,
          error: 'Invalid message format',
          missingFields: ['message'],
        };
      }

      const trimmedMessage = message.trim();
      
      // Extract all numbers (could be amount, range, or mixed)
      const numberMatches = trimmedMessage.match(/\d+/g);
      if (!numberMatches || numberMatches.length === 0) {
        return {
          success: false,
          error: 'ไม่พบจำนวนเงิน',
          missingFields: ['amount'],
        };
      }

      // Get the first number as amount (or largest if multiple)
      let amount = 0;
      
      // Try to extract amount from patterns like "5/7-500", "4-68500", "68-78 ธ500"
      const rangeMatch = trimmedMessage.match(/(\d+)[\/-](\d+)/);
      if (rangeMatch) {
        // For range like "5/7-500", take the second number
        amount = parseInt(rangeMatch[2], 10);
      } else {
        // Otherwise take the first number
        amount = parseInt(numberMatches[0], 10);
      }

      if (amount <= 0) {
        return {
          success: false,
          error: 'จำนวนเงินต้องมากกว่า 0',
          missingFields: ['amount'],
        };
      }

      // Split message into parts
      const parts = trimmedMessage.split(/[\s\/-]+/).filter(p => p.length > 0);

      if (parts.length < 2) {
        return {
          success: false,
          error: 'ข้อมูลไม่ครบ',
          missingFields: ['playerName', 'fireworks', 'stadium'],
        };
      }

      // Extract player name (first non-numeric part)
      let playerName = '';
      let startIndex = 0;
      
      for (let i = 0; i < parts.length; i++) {
        if (!/^\d+$/.test(parts[i])) {
          playerName = parts[i];
          startIndex = i + 1;
          break;
        }
      }

      if (!playerName) {
        playerName = parts[0];
        startIndex = 1;
      }

      // Extract fireworks and stadium from remaining parts
      let fireworks = '';
      let stadium = '';

      // Look for fireworks keywords
      const fireworksKeywords = ['สีแดง', 'สีเขียว', 'สีเหลือง', 'สีน้ำเงิน', 'สีม่วง', 'สีขาว', 'สีดำ', 'บั้ง', 'ธ'];
      const stadiumKeywords = ['กรุงเทพ', 'ต', 'ท', 'สนาม', 'ห้อง', 'คุณ'];

      for (let i = startIndex; i < parts.length; i++) {
        const part = parts[i];
        
        // Check if it's a fireworks type
        if (fireworksKeywords.some(keyword => part.includes(keyword))) {
          if (!fireworks) {
            fireworks = part;
          }
        }
        
        // Check if it's a stadium
        if (stadiumKeywords.some(keyword => part.includes(keyword))) {
          if (!stadium) {
            stadium = part;
          }
        }
      }

      // If still missing, try to extract from the whole message
      if (!fireworks) {
        const fw = trimmedMessage.match(/(สี\w+|ธ|บั้ง)/);
        if (fw) fireworks = fw[1];
      }

      if (!stadium) {
        const st = trimmedMessage.match(/(กรุงเทพ|ต|ท|คุณ|สนาม|ห้อง)/);
        if (st) stadium = st[1];
      }

      // Validate extracted data
      const missingFields = [];
      if (!playerName) missingFields.push('playerName');
      if (!fireworks) missingFields.push('fireworks');
      if (!stadium) missingFields.push('stadium');

      if (missingFields.length > 0) {
        return {
          success: false,
          error: 'ข้อมูลไม่ครบ',
          missingFields,
        };
      }

      return {
        success: true,
        data: {
          playerName: playerName.trim(),
          amount,
          fireworks: fireworks.trim(),
          stadium: stadium.trim(),
        },
      };
    } catch (error) {
      logger.error('Error parsing betting message:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการประมวลผลข้อมูล',
      };
    }
  }

  /**
   * Parse multiple bets from message (e.g., "กุหลาบขาว 270-75 น้องรีวิว 270-80 เหลี่ยมอิสาน 280-300")
   * Returns array of bets with stadium and fireworks
   */
  static parseMultipleBets(message) {
    try {
      if (!message || typeof message !== 'string') {
        return {
          success: false,
          error: 'Invalid message format',
          bets: [],
        };
      }

      const trimmedMessage = message.trim();
      const bets = [];

      // Pattern: "สนาม บั้งไฟ สนาม บั้งไฟ ..."
      // Example: "กุหลาบขาว 270-75 น้องรีวิว 270-80 เหลี่ยมอิสาน 280-300"
      
      // Split by spaces and group into pairs (stadium, fireworks)
      const parts = trimmedMessage.split(/\s+/).filter(p => p.length > 0);
      
      for (let i = 0; i < parts.length; i += 2) {
        if (i + 1 < parts.length) {
          const stadium = parts[i];
          const fireworks = parts[i + 1];
          
          // Check if this looks like a valid bet pair
          if (stadium && fireworks && /\d+[-\/]\d+/.test(fireworks)) {
            bets.push({
              stadium: stadium.trim(),
              fireworks: fireworks.trim(),
            });
          }
        }
      }

      if (bets.length === 0) {
        return {
          success: false,
          error: 'ไม่พบข้อมูลการแทง',
          bets: [],
        };
      }

      return {
        success: true,
        bets,
        count: bets.length,
      };
    } catch (error) {
      logger.error('Error parsing multiple bets:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการประมวลผลข้อมูล',
        bets: [],
      };
    }
  }

  /**
   * Validate betting data
   */
  static validateBettingData(data) {
    const errors = [];

    if (!data.playerName || typeof data.playerName !== 'string') {
      errors.push('ชื่อผู้เล่นไม่ถูกต้อง');
    }

    if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
      errors.push('จำนวนเงินต้องมากกว่า 0');
    }

    if (!data.fireworks || typeof data.fireworks !== 'string') {
      errors.push('ประเภทบั้งไฟไม่ถูกต้อง');
    }

    if (!data.stadium || typeof data.stadium !== 'string') {
      errors.push('ชื่อสนามไม่ถูกต้อง');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format betting data for display
   */
  static formatBettingDataForDisplay(data) {
    return `
👤 ชื่อ: ${data.playerName}
💰 จำนวนเงิน: ${data.amount} บาท
🎆 บั้งไฟ: ${data.fireworks}
🏟️ สนาม: ${data.stadium}
    `.trim();
  }

  /**
   * Extract betting info from various message formats
   * Supports multiple formats:
   * 1. "ชื่อ 100 บั้งไฟสีแดง สนามกรุงเทพ"
   * 2. "ชื่อ 100 บาท บั้งไฟสีแดง สนามกรุงเทพ"
   * 3. "ชื่อ 100 สีแดง กรุงเทพ"
   */
  static extractBettingInfo(message) {
    const parsed = this.parseBettingMessage(message);
    
    if (!parsed.success) {
      return parsed;
    }

    const validation = this.validateBettingData(parsed.data);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
        missingFields: Object.keys(parsed.data).filter(key => !parsed.data[key]),
      };
    }

    return parsed;
  }
}

module.exports = PlayerBettingParser;
