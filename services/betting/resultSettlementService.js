/**
 * ResultSettlementService
 * รวมทั้งหมดเข้าด้วยกัน: แยกข้อมูล → ตรวจสอบ → คำนวณผล → แจ้งเตือน
 */

const resultAnnouncementParserService = require('./resultAnnouncementParserService');
const resultVerificationService = require('./resultVerificationService');
const bettingResultService = require('./bettingResultService');
const bettingPairingService = require('./bettingPairingService');
const balanceUpdateService = require('./balanceUpdateService');

class ResultSettlementService {
  /**
   * สรุปผลการเล่น (Settlement)
   * @param {string} announcementText - ข้อความประกาศผล เช่น "499คะแนน แอดเทวดา✅️"
   * @param {array} allBets - รายการการเล่นทั้งหมด
   * @param {string} groupId - ID ของกลุ่ม LINE
   * @param {number} accountNumber - LINE OA Account Number (1 หรือ 2)
   * @returns {object} ผลการสรุป
   */
  async settleResult(announcementText, allBets, groupId, accountNumber = 1) {
    const settlement = {
      success: false,
      steps: [],
      errors: [],
      warnings: [],
      result: null,
    };

    try {
      // Step 1: แยกข้อมูลจากประกาศผล
      const parseStep = this.parseAnnouncement(announcementText);
      settlement.steps.push(parseStep);

      if (!parseStep.success) {
        settlement.errors.push('ไม่สามารถแยกข้อมูลประกาศผลได้');
        return settlement;
      }

      const { score, slipName } = parseStep.data;

      // Step 2: ตรวจสอบความถูกต้องของประกาศผล
      const betsForSlip = allBets.filter((bet) => bet.slipName === slipName);
      const verifyStep = this.verifyAnnouncement(
        slipName,
        score,
        betsForSlip,
        parseStep.data
      );
      settlement.steps.push(verifyStep);

      if (!verifyStep.success) {
        settlement.errors.push('ประกาศผลไม่ถูกต้อง');
        return settlement;
      }

      // Step 3: จับคู่การเล่น
      const pairingStep = this.pairBets(betsForSlip);
      settlement.steps.push(pairingStep);

      if (!pairingStep.success || !pairingStep.data.pairs) {
        settlement.errors.push('ไม่สามารถจับคู่การเล่นได้');
        return settlement;
      }

      // Step 4: คำนวณผลลัพธ์สำหรับแต่ละคู่
      const calculateStep = this.calculateResults(
        pairingStep.data.pairs,
        slipName,
        score
      );
      settlement.steps.push(calculateStep);

      if (!calculateStep.success) {
        settlement.errors.push('ไม่สามารถคำนวณผลลัพธ์ได้');
        return settlement;
      }

      // Step 5: บันทึกผลลัพธ์
      const recordStep = await this.recordResults(
        calculateStep.data.results,
        slipName,
        score
      );
      settlement.steps.push(recordStep);

      // Step 6: อัปเดตยอดเงิน
      const balanceStep = await this.updateBalances(
        calculateStep.data.results,
        slipName
      );
      settlement.steps.push(balanceStep);

      // Step 7: แจ้งเตือน LINE
      const notifyStep = await this.notifyResults(
        calculateStep.data.results,
        slipName,
        score,
        groupId,
        accountNumber
      );
      settlement.steps.push(notifyStep);

      settlement.success = true;
      settlement.result = {
        slipName,
        score,
        pairs: pairingStep.data.pairs,
        results: calculateStep.data.results,
      };

      return settlement;
    } catch (error) {
      settlement.errors.push(`ข้อผิดพลาด: ${error.message}`);
      return settlement;
    }
  }

  /**
   * Step 1: แยกข้อมูลจากประกาศผล
   * @private
   */
  parseAnnouncement(announcementText) {
    try {
      const parsed = resultAnnouncementParserService.parseAnnouncement(
        announcementText
      );
      const validation =
        resultAnnouncementParserService.validateParsedAnnouncement(parsed);

      return {
        success: parsed.success && validation.isValid,
        stepName: 'แยกข้อมูลประกาศผล',
        data: parsed,
        validation,
        message: parsed.success
          ? `✅ แยกข้อมูลสำเร็จ: คะแนน ${parsed.score}, บั้งไฟ ${parsed.slipName}`
          : `❌ แยกข้อมูลไม่สำเร็จ`,
      };
    } catch (error) {
      return {
        success: false,
        stepName: 'แยกข้อมูลประกาศผล',
        error: error.message,
        message: `❌ ข้อผิดพลาด: ${error.message}`,
      };
    }
  }

  /**
   * Step 2: ตรวจสอบความถูกต้องของประกาศผล
   * @private
   */
  verifyAnnouncement(slipName, score, betsForSlip, announcementData) {
    try {
      const verification = resultVerificationService.verifyResultAnnouncement(
        slipName,
        score,
        {
          source: 'User Announcement',
          slipName,
          date: new Date().toISOString(),
        },
        betsForSlip
      );

      return {
        success: verification.isValid,
        stepName: 'ตรวจสอบประกาศผล',
        data: verification,
        message: verification.isValid
          ? `✅ ประกาศผลถูกต้อง`
          : `❌ ประกาศผลไม่ถูกต้อง`,
      };
    } catch (error) {
      return {
        success: false,
        stepName: 'ตรวจสอบประกาศผล',
        error: error.message,
        message: `❌ ข้อผิดพลาด: ${error.message}`,
      };
    }
  }

  /**
   * Step 3: จับคู่การเล่น
   * @private
   */
  pairBets(betsForSlip) {
    try {
      const pairs = bettingPairingService.pairBets(betsForSlip);

      return {
        success: pairs && pairs.length > 0,
        stepName: 'จับคู่การเล่น',
        data: { pairs },
        message:
          pairs && pairs.length > 0
            ? `✅ จับคู่สำเร็จ: ${pairs.length} คู่`
            : `❌ ไม่สามารถจับคู่ได้`,
      };
    } catch (error) {
      return {
        success: false,
        stepName: 'จับคู่การเล่น',
        error: error.message,
        message: `❌ ข้อผิดพลาด: ${error.message}`,
      };
    }
  }

  /**
   * Step 4: คำนวณผลลัพธ์
   * @private
   */
  calculateResults(pairs, slipName, score) {
    try {
      const results = pairs.map((pair) => {
        const result = bettingResultService.calculateResultWithFees(
          pair,
          slipName,
          score
        );
        return result;
      });

      return {
        success: results && results.length > 0,
        stepName: 'คำนวณผลลัพธ์',
        data: { results },
        message:
          results && results.length > 0
            ? `✅ คำนวณสำเร็จ: ${results.length} ผลลัพธ์`
            : `❌ ไม่สามารถคำนวณได้`,
      };
    } catch (error) {
      return {
        success: false,
        stepName: 'คำนวณผลลัพธ์',
        error: error.message,
        message: `❌ ข้อผิดพลาด: ${error.message}`,
      };
    }
  }

  /**
   * Step 5: บันทึกผลลัพธ์
   * @private
   */
  async recordResults(results, slipName, score) {
    try {
      const recordPromises = results.map((result) =>
        bettingResultService.recordResult(result, slipName, score)
      );

      const recordResults = await Promise.all(recordPromises);
      const allSuccess = recordResults.every((r) => r.success);

      return {
        success: allSuccess,
        stepName: 'บันทึกผลลัพธ์',
        data: recordResults,
        message: allSuccess
          ? `✅ บันทึกสำเร็จ: ${recordResults.length} ผลลัพธ์`
          : `❌ บันทึกไม่สำเร็จ`,
      };
    } catch (error) {
      return {
        success: false,
        stepName: 'บันทึกผลลัพธ์',
        error: error.message,
        message: `❌ ข้อผิดพลาด: ${error.message}`,
      };
    }
  }

  /**
   * Step 6: อัปเดตยอดเงิน
   * @private
   */
  async updateBalances(results, slipName) {
    try {
      const updatePromises = results.map((result) =>
        balanceUpdateService.updateBalancesForResult(result, slipName)
      );

      const updateResults = await Promise.all(updatePromises);
      const allSuccess = updateResults.every((r) => r.success);

      return {
        success: allSuccess,
        stepName: 'อัปเดตยอดเงิน',
        data: updateResults,
        message: allSuccess
          ? `✅ อัปเดตสำเร็จ: ${updateResults.length} ผลลัพธ์`
          : `❌ อัปเดตไม่สำเร็จ`,
      };
    } catch (error) {
      return {
        success: false,
        stepName: 'อัปเดตยอดเงิน',
        error: error.message,
        message: `❌ ข้อผิดพลาด: ${error.message}`,
      };
    }
  }

  /**
   * Step 7: แจ้งเตือน LINE
   * @private
   */
  async notifyResults(results, slipName, score, groupId, accountNumber = 1) {
    try {
      const notifyPromises = results.map((result) =>
        bettingResultService.notifyLineResult(result, slipName, score, groupId, accountNumber)
      );

      const notifyResults = await Promise.all(notifyPromises);
      const allSuccess = notifyResults.every((r) => r.success);

      return {
        success: allSuccess,
        stepName: 'แจ้งเตือน LINE',
        data: notifyResults,
        message: allSuccess
          ? `✅ แจ้งเตือนสำเร็จ: ${notifyResults.length} ผลลัพธ์`
          : `❌ แจ้งเตือนไม่สำเร็จ`,
      };
    } catch (error) {
      return {
        success: false,
        stepName: 'แจ้งเตือน LINE',
        error: error.message,
        message: `❌ ข้อผิดพลาด: ${error.message}`,
      };
    }
  }

  /**
   * สร้างรายงานการสรุปผล
   * @param {object} settlement - ผลการสรุป
   * @returns {string} รายงาน
   */
  buildSettlementReport(settlement) {
    let report = '📊 รายงานการสรุปผล\n';
    report += '='.repeat(60) + '\n\n';

    if (settlement.success) {
      report += '✅ สรุปผลสำเร็จ\n\n';
      report += `บั้งไฟ: ${settlement.result.slipName}\n`;
      report += `คะแนน: ${settlement.result.score}\n`;
      report += `จำนวนคู่: ${settlement.result.pairs.length}\n\n`;
    } else {
      report += '❌ สรุปผลไม่สำเร็จ\n\n';
    }

    // รายละเอียดแต่ละขั้นตอน
    report += '📝 ขั้นตอนการทำงาน:\n';
    report += '-'.repeat(60) + '\n';

    settlement.steps.forEach((step, index) => {
      const status = step.success ? '✅' : '❌';
      report += `\n${index + 1}. ${status} ${step.stepName}\n`;
      report += `   ${step.message}\n`;

      if (step.error) {
        report += `   ข้อผิดพลาด: ${step.error}\n`;
      }
    });

    // ข้อผิดพลาด
    if (settlement.errors.length > 0) {
      report += '\n\n❌ ข้อผิดพลาด:\n';
      settlement.errors.forEach((error) => {
        report += `  • ${error}\n`;
      });
    }

    // คำเตือน
    if (settlement.warnings.length > 0) {
      report += '\n\n⚠️ คำเตือน:\n';
      settlement.warnings.forEach((warning) => {
        report += `  • ${warning}\n`;
      });
    }

    report += '\n' + '='.repeat(60);

    return report;
  }
}

module.exports = new ResultSettlementService();
