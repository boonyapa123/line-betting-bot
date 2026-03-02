/**
 * ResultVerificationService
 * ตรวจสอบความถูกต้องของผลประกาศก่อนสรุปผล
 * 
 * ขั้นตอน:
 * 1. ตรวจสอบว่าชื่อบั้งไฟมีการเล่นหรือไม่
 * 2. ตรวจสอบว่าผลประกาศมาจากแหล่งที่เชื่อถือได้หรือไม่
 * 3. ตรวจสอบว่าคะแนนชัดเจนหรือไม่
 * 4. จึงจะสรุปผลได้
 */

class ResultVerificationService {
  constructor() {
    // แหล่งข้อมูลที่เชื่อถือได้
    this.TRUSTED_SOURCES = [
      'Airdrop Thailand',
      'ผลออกสลากกินแบ่งรัฐบาล',
      'ผลหวยหุ้น',
      'ผลบอล',
      'ผลกีฬา',
    ];

    // ชื่อบั้งไฟที่รู้จัก
    this.KNOWN_SLIP_NAMES = [
      'แอดเทวดา',
      'หวยหุ้น',
      'บอล',
      'กีฬา',
      'บั้งไฟ1',
      'บั้งไฟ2',
      'บั้งไฟ3',
    ];

    // สถานะการประกาศผล
    this.ANNOUNCEMENT_STATUS = {
      PENDING: 'PENDING', // รอประกาศผล
      ANNOUNCED: 'ANNOUNCED', // ประกาศผลแล้ว
      VERIFIED: 'VERIFIED', // ยืนยันแล้ว
      REJECTED: 'REJECTED', // ปฏิเสธ
    };
  }

  /**
   * ตรวจสอบความถูกต้องของผลประกาศ
   * @param {string} slipName - ชื่อบั้งไฟ
   * @param {number} score - คะแนนที่ประกาศ
   * @param {object} announcement - ข้อมูลการประกาศผล
   * @param {array} bets - รายการการเล่นของบั้งไฟนั้น
   * @returns {object} ผลการตรวจสอบ
   */
  verifyResultAnnouncement(slipName, score, announcement, bets) {
    const verification = {
      isValid: true,
      errors: [],
      warnings: [],
      checks: {},
    };

    // Check 1: ตรวจสอบว่าชื่อบั้งไฟมีการเล่นหรือไม่
    const slipNameCheck = this.checkSlipNameExists(slipName, bets);
    verification.checks.slipNameExists = slipNameCheck;
    if (!slipNameCheck.passed) {
      verification.isValid = false;
      verification.errors.push(slipNameCheck.message);
    }

    // Check 2: ตรวจสอบว่าผลประกาศมาจากแหล่งที่เชื่อถือได้หรือไม่
    const sourceCheck = this.checkTrustedSource(announcement.source);
    verification.checks.trustedSource = sourceCheck;
    if (!sourceCheck.passed) {
      verification.isValid = false;
      verification.errors.push(sourceCheck.message);
    }

    // Check 3: ตรวจสอบว่าคะแนนชัดเจนหรือไม่
    const scoreCheck = this.checkScoreClarity(score);
    verification.checks.scoreClarity = scoreCheck;
    if (!scoreCheck.passed) {
      verification.isValid = false;
      verification.errors.push(scoreCheck.message);
    }

    // Check 4: ตรวจสอบว่าวันที่ถูกต้องหรือไม่
    const dateCheck = this.checkAnnouncementDate(announcement.date);
    verification.checks.announcementDate = dateCheck;
    if (!dateCheck.passed) {
      verification.warnings.push(dateCheck.message);
    }

    // Check 5: ตรวจสอบว่าชื่อบั้งไฟในประกาศตรงกับที่ส่งมาหรือไม่
    const slipNameMatchCheck = this.checkSlipNameMatch(
      slipName,
      announcement.slipName
    );
    verification.checks.slipNameMatch = slipNameMatchCheck;
    if (!slipNameMatchCheck.passed) {
      verification.isValid = false;
      verification.errors.push(slipNameMatchCheck.message);
    }

    return verification;
  }

  /**
   * Check 1: ตรวจสอบว่าชื่อบั้งไฟมีการเล่นหรือไม่
   * @private
   */
  checkSlipNameExists(slipName, bets) {
    const hasBets = bets && bets.length > 0;

    return {
      passed: hasBets,
      message: hasBets
        ? `✅ บั้งไฟ "${slipName}" มีการเล่น (${bets.length} รายการ)`
        : `❌ บั้งไฟ "${slipName}" ไม่มีการเล่น`,
      betCount: bets ? bets.length : 0,
    };
  }

  /**
   * Check 2: ตรวจสอบว่าผลประกาศมาจากแหล่งที่เชื่อถือได้หรือไม่
   * @private
   */
  checkTrustedSource(source) {
    if (!source) {
      return {
        passed: false,
        message: '❌ ไม่ระบุแหล่งข้อมูล',
      };
    }

    const isTrusted = this.TRUSTED_SOURCES.some((trustedSource) =>
      source.toLowerCase().includes(trustedSource.toLowerCase())
    );

    return {
      passed: isTrusted,
      message: isTrusted
        ? `✅ แหล่งข้อมูล: ${source} (เชื่อถือได้)`
        : `❌ แหล่งข้อมูล: ${source} (ไม่เชื่อถือได้)`,
      source,
      isTrusted,
    };
  }

  /**
   * Check 3: ตรวจสอบว่าคะแนนชัดเจนหรือไม่
   * @private
   */
  checkScoreClarity(score) {
    const isValid = score !== null && score !== undefined && score !== '';

    return {
      passed: isValid,
      message: isValid
        ? `✅ คะแนน: ${score} (ชัดเจน)`
        : `❌ คะแนนไม่ชัดเจน`,
      score,
    };
  }

  /**
   * Check 4: ตรวจสอบว่าวันที่ถูกต้องหรือไม่
   * @private
   */
  checkAnnouncementDate(announcementDate) {
    if (!announcementDate) {
      return {
        passed: false,
        message: '⚠️ ไม่ระบุวันที่ประกาศผล',
      };
    }

    const date = new Date(announcementDate);
    const today = new Date();
    const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));

    // ถ้าประกาศผลเกิน 7 วัน ให้แสดง warning
    if (daysDiff > 7) {
      return {
        passed: false,
        message: `⚠️ ประกาศผลเมื่อ ${daysDiff} วันที่แล้ว (${announcementDate})`,
      };
    }

    return {
      passed: true,
      message: `✅ วันที่: ${announcementDate}`,
    };
  }

  /**
   * Check 5: ตรวจสอบว่าชื่อบั้งไฟในประกาศตรงกับที่ส่งมาหรือไม่
   * @private
   */
  checkSlipNameMatch(expectedSlipName, announcedSlipName) {
    if (!announcedSlipName) {
      return {
        passed: false,
        message: '❌ ประกาศผลไม่ระบุชื่อบั้งไฟ',
      };
    }

    const match =
      expectedSlipName.toLowerCase() === announcedSlipName.toLowerCase();

    return {
      passed: match,
      message: match
        ? `✅ ชื่อบั้งไฟตรงกัน: ${expectedSlipName}`
        : `❌ ชื่อบั้งไฟไม่ตรงกัน (คาดหวัง: ${expectedSlipName}, ประกาศ: ${announcedSlipName})`,
      expectedSlipName,
      announcedSlipName,
    };
  }

  /**
   * สร้างรายงานการตรวจสอบ
   * @param {object} verification - ผลการตรวจสอบ
   * @returns {string} รายงาน
   */
  buildVerificationReport(verification) {
    let report = '📋 รายงานการตรวจสอบผลประกาศ\n';
    report += '='.repeat(50) + '\n\n';

    // สรุปผล
    if (verification.isValid) {
      report += '✅ ผลประกาศถูกต้อง พร้อมสรุปผล\n\n';
    } else {
      report += '❌ ผลประกาศไม่ถูกต้อง ไม่สามารถสรุปผลได้\n\n';
    }

    // รายละเอียดการตรวจสอบ
    report += '📝 รายละเอียดการตรวจสอบ:\n';
    report += '-'.repeat(50) + '\n';

    Object.entries(verification.checks).forEach(([checkName, checkResult]) => {
      report += `\n${checkResult.message}\n`;
    });

    // ข้อผิดพลาด
    if (verification.errors.length > 0) {
      report += '\n\n❌ ข้อผิดพลาด:\n';
      verification.errors.forEach((error) => {
        report += `  • ${error}\n`;
      });
    }

    // คำเตือน
    if (verification.warnings.length > 0) {
      report += '\n\n⚠️ คำเตือน:\n';
      verification.warnings.forEach((warning) => {
        report += `  • ${warning}\n`;
      });
    }

    report += '\n' + '='.repeat(50);

    return report;
  }

  /**
   * ตรวจสอบว่าสามารถสรุปผลได้หรือไม่
   * @param {object} verification - ผลการตรวจสอบ
   * @returns {boolean}
   */
  canSettleResult(verification) {
    return verification.isValid && verification.errors.length === 0;
  }
}

module.exports = new ResultVerificationService();
