/**
 * SelfBettingService
 * จัดการการเล่นกับตัวเอง (Self-Betting)
 */

const bettingPairingService = require('./bettingPairingService');

class SelfBettingService {
  /**
   * ตรวจสอบว่าสามารถเล่นกับตัวเองได้หรือไม่
   * @param {array} bets - ข้อมูลการเล่นทั้งหมด
   * @param {string} slipName - ชื่อบั้งไฟ
   * @returns {array} คู่ที่เล่นกับตัวเอง
   */
  findSelfBets(bets, slipName) {
    try {
      const slipBets = bets.filter((bet) => bet.slipName === slipName);
      const selfBets = [];

      // ค้นหาการเล่นที่มีเพียง 1 คน (เล่นกับตัวเอง)
      const playerMap = {};

      for (const bet of slipBets) {
        const lineName = bet.lineName;
        if (!playerMap[lineName]) {
          playerMap[lineName] = [];
        }
        playerMap[lineName].push(bet);
      }

      // ตรวจสอบว่าผู้เล่นคนใดเล่นกับตัวเอง
      for (const lineName in playerMap) {
        const playerBets = playerMap[lineName];
        if (playerBets.length >= 2) {
          // ผู้เล่นเล่นมากกว่า 1 ครั้ง = เล่นกับตัวเอง
          selfBets.push({
            lineName,
            bets: playerBets,
            count: playerBets.length,
          });
        }
      }

      return selfBets;
    } catch (error) {
      console.error('Error finding self bets:', error);
      return [];
    }
  }

  /**
   * คำนวณผลลัพธ์การเล่นกับตัวเอง
   * @param {object} selfBet - ข้อมูลการเล่นกับตัวเอง
   * @param {string} slipName - ชื่อบั้งไฟ
   * @param {number} score - คะแนนที่ออก
   * @returns {array} ผลลัพธ์
   */
  calculateSelfBettingResults(selfBet, slipName, score) {
    try {
      const { lineName, bets } = selfBet;
      const results = [];

      // จับคู่การเล่นของผู้เล่นคนเดียว
      for (let i = 0; i < bets.length - 1; i++) {
        const bet1 = bets[i];
        const bet2 = bets[i + 1];

        // สร้าง pair
        const pair = { bet1, bet2 };

        // คำนวณผลลัพธ์
        const result = bettingPairingService.constructor.calculateResult(
          pair,
          slipName,
          score
        );

        results.push({
          pair,
          result,
          isSelfBetting: true,
          lineName,
        });
      }

      return results;
    } catch (error) {
      console.error('Error calculating self betting results:', error);
      return [];
    }
  }

  /**
   * สร้างข้อความสำหรับการเล่นกับตัวเอง
   * @param {object} result - ผลลัพธ์
   * @param {string} slipName - ชื่อบั้งไฟ
   * @param {number} score - คะแนนที่ออก
   * @returns {string} ข้อความ
   */
  buildSelfBettingMessage(result, slipName, score) {
    const { bet1, bet2 } = result.pair;
    const { winner, loser } = result.result;

    let message = `📊 ผลการเล่นกับตัวเอง\n`;
    message += `บั้งไฟ: ${slipName}\n`;
    message += `คะแนนที่ออก: ${score}\n`;
    message += `${'='.repeat(50)}\n\n`;

    message += `👤 ${bet1.displayName} (${bet1.lineName})\n`;
    message += `   ฝั่ง: ${bet1.side} | เดิมพัน: ${bet1.amount} บาท\n\n`;

    message += `VS\n\n`;

    message += `👤 ${bet2.displayName} (${bet2.lineName})\n`;
    message += `   ฝั่ง: ${bet2.side} | เดิมพัน: ${bet2.amount} บาท\n\n`;

    message += `${'='.repeat(50)}\n`;
    message += `🏆 ผลลัพธ์:\n`;
    message += `ฝั่ง ${winner.side} ชนะ\n`;
    message += `ได้รับ: ${winner.netAmount} บาท\n`;
    message += `เสีย: ${Math.abs(loser.netAmount)} บาท\n`;

    return message;
  }

  /**
   * ตรวจสอบว่าการเล่นกับตัวเองถูกต้องหรือไม่
   * @param {array} bets - ข้อมูลการเล่น
   * @returns {object} ผลลัพธ์การตรวจสอบ
   */
  validateSelfBetting(bets) {
    try {
      const issues = [];

      // ตรวจสอบว่ามีการเล่นอย่างน้อย 2 ครั้ง
      if (bets.length < 2) {
        issues.push('ต้องมีการเล่นอย่างน้อย 2 ครั้ง');
      }

      // ตรวจสอบว่าทุกการเล่นเป็นของคนเดียวกัน
      const lineName = bets[0]?.lineName;
      for (const bet of bets) {
        if (bet.lineName !== lineName) {
          issues.push('ทุกการเล่นต้องเป็นของคนเดียวกัน');
          break;
        }
      }

      // ตรวจสอบว่ามีฝั่งตรงข้าม
      const sides = bets.map((b) => b.side);
      const uniqueSides = [...new Set(sides)];
      if (uniqueSides.length < 2) {
        issues.push('ต้องมีฝั่งตรงข้ามอย่างน้อย 2 ฝั่ง');
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error) {
      console.error('Error validating self betting:', error);
      return {
        valid: false,
        issues: [error.message],
      };
    }
  }
}

module.exports = new SelfBettingService();
