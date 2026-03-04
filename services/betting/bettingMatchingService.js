/**
 * BettingMatchingService
 * จัดการการจับคู่เดิมพันและหักเงินทันที
 */

const bettingPairingService = require('./bettingPairingService');
const balanceUpdateService = require('./balanceUpdateService');
const pendingBalanceService = require('./pendingBalanceService');

class BettingMatchingService {
  /**
   * ค้นหาคู่เดิมพันและหักเงินทันที
   * @param {array} bets - ข้อมูลการเล่นทั้งหมด
   * @returns {object} ผลการจับคู่และหักเงิน
   */
  async findPairsAndDeductBalance(bets) {
    try {
      const pairs = [];
      const processed = new Set();
      const deductionResults = [];

      for (let i = 0; i < bets.length; i++) {
        if (processed.has(i)) continue;

        const bet1 = bets[i];
        if (bet1.status === 'MATCHED') continue;

        for (let j = i + 1; j < bets.length; j++) {
          if (processed.has(j)) continue;

          const bet2 = bets[j];
          if (bet2.status === 'MATCHED') continue;

          // ตรวจสอบว่าเป็นคู่หรือไม่
          let isValid = false;

          // วิธีที่ 1: Direct + Reply Method
          if (bet1.method !== 'REPLY' && bet2.method === 'REPLY') {
            isValid = bettingPairingService.constructor.isValidDirectReplyPair(bet1, bet2);
          }
          // วิธีที่ 1 (สลับ): Reply + Direct Method
          else if (bet1.method === 'REPLY' && bet2.method !== 'REPLY') {
            isValid = bettingPairingService.constructor.isValidDirectReplyPair(bet2, bet1);
          }
          // วิธีที่ 2: Direct + Direct Method
          else if (bet1.method !== 'REPLY' && bet2.method !== 'REPLY') {
            isValid = bettingPairingService.constructor.isValidDirectPair(bet1, bet2);
          }

          if (isValid) {
            // คำนวณจำนวนเงินที่ใช้ (ใช้ยอดน้อยกว่า)
            const betAmount = Math.min(bet1.amount || 0, bet2.amount || 0);

            const pair = {
              bet1: { ...bet1, index: i },
              bet2: { ...bet2, index: j },
              betAmount,
            };

            // หักเงินจากทั้งสองฝั่ง
            const deduct1 = await bettingPairingService.deductBetAmount(
              bet1.displayName,
              betAmount
            );
            const deduct2 = await bettingPairingService.deductBetAmount(
              bet2.displayName,
              betAmount
            );

            if (deduct1.success && deduct2.success) {
              pairs.push(pair);
              deductionResults.push({
                pair,
                deductions: [deduct1, deduct2],
              });
              processed.add(i);
              processed.add(j);
              break;
            } else {
              console.error(`❌ Failed to deduct balance for pair:`, {
                bet1: bet1.displayName,
                bet2: bet2.displayName,
                deduct1,
                deduct2,
              });
            }
          }
        }
      }

      return {
        success: true,
        pairsFound: pairs.length,
        pairs,
        deductionResults,
      };
    } catch (error) {
      console.error('Error finding pairs and deducting balance:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * ตรวจสอบยอดเงินก่อนจับคู่
   * @param {string} displayName - ชื่อ LINE
   * @param {number} betAmount - จำนวนเงินเดิมพัน
   * @returns {object} ผลการตรวจสอบ
   */
  async checkBalanceBeforeMatching(displayName, betAmount) {
    try {
      // ดึงยอดเงินปัจจุบัน
      const currentBalance = await bettingPairingService.getUserBalance(displayName);

      // ดึงเงินค้าง
      const pendingAmount = await pendingBalanceService.getPendingAmount(displayName);

      // คำนวณเงินที่สามารถใช้ได้
      const availableBalance = currentBalance - pendingAmount;

      // ตรวจสอบว่าเพียงพอหรือไม่
      const isSufficient = availableBalance >= betAmount;

      return {
        success: true,
        isSufficient,
        currentBalance,
        pendingAmount,
        availableBalance,
        requiredAmount: betAmount,
        shortfall: isSufficient ? 0 : betAmount - availableBalance,
      };
    } catch (error) {
      console.error('Error checking balance before matching:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * สร้างรายงานการจับคู่และหักเงิน
   * @param {object} matchingResult - ผลการจับคู่
   * @returns {string} รายงาน
   */
  buildMatchingReport(matchingResult) {
    if (!matchingResult.success) {
      return `❌ เกิดข้อผิดพลาด: ${matchingResult.error}`;
    }

    let report = '✅ รายงานการจับคู่และหักเงิน\n';
    report += '='.repeat(50) + '\n\n';
    report += `📊 จำนวนคู่ที่จับได้: ${matchingResult.pairsFound}\n\n`;

    matchingResult.deductionResults.forEach((result, index) => {
      const { pair, deductions } = result;
      report += `${index + 1}. ${pair.bet1.displayName} vs ${pair.bet2.displayName}\n`;
      report += `   เงินเดิมพัน: ${pair.betAmount} บาท\n`;
      report += `   ${pair.bet1.displayName}: ${deductions[0].previousBalance} → ${deductions[0].newBalance} บาท\n`;
      report += `   ${pair.bet2.displayName}: ${deductions[1].previousBalance} → ${deductions[1].newBalance} บาท\n\n`;
    });

    report += '='.repeat(50);

    return report;
  }
}

module.exports = new BettingMatchingService();
