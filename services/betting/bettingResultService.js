/**
 * BettingResultService
 * จัดการผลลัพธ์การเล่น คำนวณค่าธรรมเนียม และแจ้งเตือน LINE
 */

const { LineNotificationService } = require('../line/lineNotificationService');
const bettingPairingService = require('./bettingPairingService');

class BettingResultService {
  constructor() {
    // สร้าง notification service สำหรับแต่ละ Account (Account 1 & 2)
    this.lineNotificationServices = {
      1: new LineNotificationService(1),
      2: new LineNotificationService(2),
    };
    this.FEE_PERCENTAGE = 0.10; // 10% ค่าธรรมเนียมจากยอดเล่น
    this.DRAW_FEE_PERCENTAGE = 0.05; // 5% ค่าธรรมเนียมออกกลาง
  }

  /**
   * คำนวณค่าธรรมเนียมและผลลัพธ์
   * @param {object} pair - คู่การเล่น {bet1, bet2}
   * @param {string} slipName - ชื่อบั้งไฟ
   * @param {number} score - คะแนนที่ออก
   * @returns {object} ผลลัพธ์พร้อมค่าธรรมเนียม
   */
  calculateResultWithFees(pair, slipName, score) {
    const baseResult = bettingPairingService.constructor.calculateResult(
      pair,
      slipName,
      score
    );

    const { bet1, bet2 } = pair;
    const winAmount = bet1.amount || bet2.amount || 0;

    // ตรวจสอบว่าเป็นการออกกลาง (draw) หรือไม่
    const isDraw = this.isDrawResult(bet1, bet2, score);

    if (isDraw) {
      // ออกกลาง: หัก 5% ทั้งสองฝั่ง
      const drawFee = Math.round(winAmount * this.DRAW_FEE_PERCENTAGE);
      return {
        ...baseResult,
        isDraw: true,
        winAmount,
        drawFee,
        winner: {
          ...baseResult.winner,
          netAmount: -drawFee,
          grossAmount: 0,
          fee: drawFee,
          feeType: 'DRAW',
        },
        loser: {
          ...baseResult.loser,
          netAmount: -drawFee,
          grossAmount: 0,
          fee: drawFee,
          feeType: 'DRAW',
        },
      };
    }

    // ชนะ-แพ้: หัก 10% จากยอดเล่น
    const fee = Math.round(winAmount * this.FEE_PERCENTAGE);
    const netWinAmount = winAmount - fee;

    return {
      ...baseResult,
      isDraw: false,
      winAmount,
      fee,
      winner: {
        ...baseResult.winner,
        grossAmount: winAmount,
        netAmount: netWinAmount,
        fee,
        feeType: 'WIN',
      },
      loser: {
        ...baseResult.loser,
        grossAmount: -winAmount,
        netAmount: -winAmount,
        fee: 0,
        feeType: 'LOSE',
      },
    };
  }

  /**
   * ตรวจสอบว่าเป็นการออกกลาง (draw) หรือไม่
   * @private
   */
  isDrawResult(bet1, bet2, score) {
    // ถ้าทั้งสองฝั่งเป็น REPLY method ให้ถือว่าออกกลาง
    if (bet1.method === 'REPLY' && bet2.method === 'REPLY') {
      return true;
    }

    // ถ้าเป็น Direct Method ตรวจสอบตามกฎเกม
    if (bet1.method === 2 && bet2.method === 2) {
      const priceRange1 = bettingPairingService.constructor.parsePriceRange(
        bet1.price
      );
      const priceRange2 = bettingPairingService.constructor.parsePriceRange(
        bet2.price
      );

      // ถ้าคะแนนอยู่ในเกณฑ์ของทั้งสองฝั่ง ให้ถือว่าออกกลาง
      const isInRange1 = score >= priceRange1.min && score <= priceRange1.max;
      const isInRange2 = score >= priceRange2.min && score <= priceRange2.max;

      return isInRange1 && isInRange2;
    }

    return false;
  }

  /**
   * บันทึกผลลัพธ์ลงชีท Results
   * @param {object} result - ผลลัพธ์
   * @param {string} slipName - ชื่อบั้งไฟ
   * @param {number} score - คะแนนที่ออก
   */
  async recordResult(result, slipName, score) {
    try {
      const { bet1, bet2 } = result.pair;

      const row = [
        new Date().toISOString(), // Timestamp
        slipName,
        score,
        bet1.userId, // Player 1 ID
        bet1.displayName, // Player 1 Name
        bet1.lineName || '', // Player 1 LINE Name
        bet1.side, // Player 1 Side
        bet1.amount || 0, // Player 1 Amount
        bet2.userId, // Player 2 ID
        bet2.displayName, // Player 2 Name
        bet2.lineName || '', // Player 2 LINE Name
        bet2.side, // Player 2 Side
        bet2.amount || 0, // Player 2 Amount
        result.winner.userId, // Winner ID
        result.winner.displayName, // Winner Name
        result.winner.lineName || '', // Winner LINE Name
        result.winner.grossAmount, // Winner Gross Amount
        result.winner.fee, // Winner Fee
        result.winner.netAmount, // Winner Net Amount
        result.loser.userId, // Loser ID
        result.loser.displayName, // Loser Name
        result.loser.lineName || '', // Loser LINE Name
        result.loser.grossAmount, // Loser Gross Amount
        result.loser.fee, // Loser Fee
        result.loser.netAmount, // Loser Net Amount
        result.isDraw ? 'DRAW' : 'WIN', // Result Type
      ];

      // เพิ่มแถวใหม่ (ต้องสร้างชีท Results ก่อน)
      // await this.sheets.spreadsheets.values.append({...})

      return { success: true };
    } catch (error) {
      console.error('Error recording result:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * แจ้งเตือน LINE ส่วนตัวและกลุ่ม
   * @param {object} result - ผลลัพธ์
   * @param {string} slipName - ชื่อบั้งไฟ
   * @param {number} score - คะแนนที่ออก
   * @param {string} groupId - ID ของกลุ่ม LINE
   * @param {number} accountNumber - LINE OA Account Number (1 หรือ 2)
   */
  async notifyLineResult(result, slipName, score, groupId, accountNumber = 1) {
    try {
      const { winner, loser, isDraw } = result;

      // เลือก notification service ตามหมายเลข Account
      const notificationService = this.lineNotificationServices[accountNumber] || this.lineNotificationServices[1];

      // สร้างข้อความแจ้งเตือน
      const resultMessage = this.buildResultMessage(
        result,
        slipName,
        score,
        isDraw
      );

      // แจ้งเตือนส่วนตัวผู้เล่น
      if (winner.userId) {
        await notificationService.sendPrivateMessage(
          winner.userId,
          this.buildWinnerMessage(winner, slipName, score, isDraw)
        );
      }

      if (loser.userId) {
        await notificationService.sendPrivateMessage(
          loser.userId,
          this.buildLoserMessage(loser, slipName, score, isDraw)
        );
      }

      // แจ้งเตือนในกลุ่ม
      if (groupId) {
        await notificationService.sendGroupMessage(
          groupId,
          resultMessage
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error notifying LINE result:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * สร้างข้อความผลลัพธ์สำหรับกลุ่ม
   * @private
   */
  buildResultMessage(result, slipName, score, isDraw) {
    const { winner, loser, bet1, bet2 } = result;

    let message = `📊 ผลการเล่น บั้งไฟ: ${slipName}\n`;
    message += `คะแนนที่ออก: ${score}\n`;
    message += `${'='.repeat(50)}\n\n`;

    if (isDraw) {
      message += `🤝 ออกกลาง\n\n`;
      message += `👤 ${bet1.displayName} (${bet1.lineName})\n`;
      message += `   ฝั่ง: ${bet1.side} | เดิมพัน: ${bet1.amount} บาท\n`;
      message += `   หัก: ${winner.fee} บาท (5%)\n\n`;

      message += `👤 ${bet2.displayName} (${bet2.lineName})\n`;
      message += `   ฝั่ง: ${bet2.side} | เดิมพัน: ${bet2.amount} บาท\n`;
      message += `   หัก: ${loser.fee} บาท (5%)\n`;
    } else {
      message += `🏆 ชนะ: ${winner.displayName} (${winner.lineName})\n`;
      message += `   ฝั่ง: ${bet1.side === winner.side ? bet1.side : bet2.side}\n`;
      message += `   เดิมพัน: ${winner.grossAmount} บาท\n`;
      message += `   หัก: ${winner.fee} บาท (10%)\n`;
      message += `   ได้รับ: ${winner.netAmount} บาท\n\n`;

      message += `❌ แพ้: ${loser.displayName} (${loser.lineName})\n`;
      message += `   ฝั่ง: ${bet1.side === loser.side ? bet1.side : bet2.side}\n`;
      message += `   เดิมพัน: ${Math.abs(loser.grossAmount)} บาท\n`;
    }

    message += `\n${'='.repeat(50)}`;

    return message;
  }

  /**
   * สร้างข้อความสำหรับผู้ชนะ (ส่วนตัว)
   * @private
   */
  buildWinnerMessage(winner, slipName, score, isDraw) {
    let message = `🎉 ยินดีด้วย! คุณชนะ\n\n`;
    message += `บั้งไฟ: ${slipName}\n`;
    message += `คะแนนที่ออก: ${score}\n`;

    if (isDraw) {
      message += `\n🤝 ออกกลาง\n`;
      message += `หัก: ${winner.fee} บาท (5%)\n`;
    } else {
      message += `\nเดิมพัน: ${winner.grossAmount} บาท\n`;
      message += `หัก: ${winner.fee} บาท (10%)\n`;
      message += `ได้รับ: ${winner.netAmount} บาท\n`;
    }

    return message;
  }

  /**
   * สร้างข้อความสำหรับผู้แพ้ (ส่วนตัว)
   * @private
   */
  buildLoserMessage(loser, slipName, score, isDraw) {
    let message = `😔 เสียใจด้วย คุณแพ้\n\n`;
    message += `บั้งไฟ: ${slipName}\n`;
    message += `คะแนนที่ออก: ${score}\n`;

    if (isDraw) {
      message += `\n🤝 ออกกลาง\n`;
      message += `หัก: ${loser.fee} บาท (5%)\n`;
    } else {
      message += `\nเดิมพัน: ${Math.abs(loser.grossAmount)} บาท\n`;
    }

    return message;
  }
}

module.exports = new BettingResultService();
