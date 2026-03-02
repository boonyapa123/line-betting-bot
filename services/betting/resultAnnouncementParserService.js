/**
 * ResultAnnouncementParserService
 * แยกข้อมูลจากประกาศผล
 * 
 * รูปแบบประกาศผล:
 * "499คะแนน แอดเทวดา✅️"
 * 
 * ส่วนประกอบ:
 * - 499 = คะแนนที่ออก
 * - แอดเทวดา = ชื่อบั้งไฟ
 * - ✅️ = ยืนยันแล้ว
 */

class ResultAnnouncementParserService {
  /**
   * แยกข้อมูลจากประกาศผล
   * @param {string} announcementText - ข้อความประกาศผล เช่น "499คะแนน แอดเทวดา✅️"
   * @returns {object} ข้อมูลที่แยกออกมา
   */
  parseAnnouncement(announcementText) {
    if (!announcementText || typeof announcementText !== 'string') {
      return {
        success: false,
        error: 'ข้อความประกาศผลไม่ถูกต้อง',
      };
    }

    try {
      const result = {
        success: false,
        rawText: announcementText,
        score: null,
        slipName: null,
        isVerified: false,
        errors: [],
      };

      // ตรวจสอบว่ามี ✅️ หรือ ✅ หรือไม่
      result.isVerified =
        announcementText.includes('✅️') || announcementText.includes('✅');

      // ลบ ✅️ และ ✅ ออก
      let cleanText = announcementText
        .replace(/✅️/g, '')
        .replace(/✅/g, '')
        .trim();

      // แยกคะแนน (ตัวเลขที่อยู่ด้านหน้า)
      const scoreMatch = cleanText.match(/^(\d+)/);
      if (scoreMatch) {
        result.score = parseInt(scoreMatch[1], 10);
        cleanText = cleanText.substring(scoreMatch[0].length).trim();
      } else {
        result.errors.push('ไม่พบคะแนน');
      }

      // ลบคำว่า "คะแนน" ออก
      cleanText = cleanText.replace(/คะแนน/g, '').trim();

      // ส่วนที่เหลือคือชื่อบั้งไฟ
      if (cleanText) {
        result.slipName = cleanText;
      } else {
        result.errors.push('ไม่พบชื่อบั้งไฟ');
      }

      // ตรวจสอบว่าสำเร็จหรือไม่
      result.success =
        result.score !== null &&
        result.slipName !== null &&
        result.errors.length === 0;

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * ตรวจสอบว่าประกาศผลถูกต้องหรือไม่
   * @param {object} parsed - ผลการแยกข้อมูล
   * @returns {object} ผลการตรวจสอบ
   */
  validateParsedAnnouncement(parsed) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // ตรวจสอบว่าแยกข้อมูลสำเร็จหรือไม่
    if (!parsed.success) {
      validation.isValid = false;
      validation.errors.push('ไม่สามารถแยกข้อมูลประกาศผลได้');
      if (parsed.errors && parsed.errors.length > 0) {
        validation.errors.push(...parsed.errors);
      }
      return validation;
    }

    // ตรวจสอบคะแนน
    if (parsed.score === null || parsed.score === undefined) {
      validation.isValid = false;
      validation.errors.push('ไม่พบคะแนน');
    } else if (parsed.score < 0) {
      validation.isValid = false;
      validation.errors.push('คะแนนต้องเป็นตัวเลขบวก');
    }

    // ตรวจสอบชื่อบั้งไฟ
    if (!parsed.slipName) {
      validation.isValid = false;
      validation.errors.push('ไม่พบชื่อบั้งไฟ');
    }

    // ตรวจสอบว่ามีการยืนยันหรือไม่
    if (!parsed.isVerified) {
      validation.warnings.push('ประกาศผลยังไม่มีการยืนยัน (ไม่มี ✅️)');
    }

    return validation;
  }

  /**
   * สร้างรายงานการแยกข้อมูล
   * @param {object} parsed - ผลการแยกข้อมูล
   * @param {object} validation - ผลการตรวจสอบ
   * @returns {string} รายงาน
   */
  buildParsingReport(parsed, validation) {
    let report = '📋 รายงานการแยกข้อมูลประกาศผล\n';
    report += '='.repeat(50) + '\n\n';

    report += `📝 ข้อความต้นฉบับ:\n"${parsed.rawText}"\n\n`;

    if (parsed.success) {
      report += '✅ แยกข้อมูลสำเร็จ\n\n';
      report += `📊 ข้อมูลที่แยกออกมา:\n`;
      report += `-`.repeat(50) + '\n';
      report += `คะแนน: ${parsed.score}\n`;
      report += `ชื่อบั้งไฟ: ${parsed.slipName}\n`;
      report += `ยืนยันแล้ว: ${parsed.isVerified ? '✅' : '❌'}\n`;
    } else {
      report += '❌ แยกข้อมูลไม่สำเร็จ\n\n';
      if (parsed.errors && parsed.errors.length > 0) {
        report += `ข้อผิดพลาด:\n`;
        parsed.errors.forEach((error) => {
          report += `  • ${error}\n`;
        });
      }
    }

    if (validation.errors.length > 0) {
      report += '\n❌ ข้อผิดพลาด:\n';
      validation.errors.forEach((error) => {
        report += `  • ${error}\n`;
      });
    }

    if (validation.warnings.length > 0) {
      report += '\n⚠️ คำเตือน:\n';
      validation.warnings.forEach((warning) => {
        report += `  • ${warning}\n`;
      });
    }

    report += '\n' + '='.repeat(50);

    return report;
  }

  /**
   * ตัวอย่างการใช้งาน
   */
  static examples() {
    const parser = new ResultAnnouncementParserService();

    console.log('=== ตัวอย่างการแยกข้อมูลประกาศผล ===\n');

    // ตัวอย่าง 1: ประกาศผลถูกต้อง
    const example1 = '499คะแนน แอดเทวดา✅️';
    const parsed1 = parser.parseAnnouncement(example1);
    const validation1 = parser.validateParsedAnnouncement(parsed1);
    console.log(parser.buildParsingReport(parsed1, validation1));

    console.log('\n\n');

    // ตัวอย่าง 2: ประกาศผลไม่มีการยืนยัน
    const example2 = '45คะแนน หวยหุ้น';
    const parsed2 = parser.parseAnnouncement(example2);
    const validation2 = parser.validateParsedAnnouncement(parsed2);
    console.log(parser.buildParsingReport(parsed2, validation2));

    console.log('\n\n');

    // ตัวอย่าง 3: ประกาศผลไม่ถูกต้อง
    const example3 = 'แอดเทวดา✅️';
    const parsed3 = parser.parseAnnouncement(example3);
    const validation3 = parser.validateParsedAnnouncement(parsed3);
    console.log(parser.buildParsingReport(parsed3, validation3));
  }
}

module.exports = new ResultAnnouncementParserService();
