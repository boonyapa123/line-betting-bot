/**
 * ระบบแยกข้อมูลสลิปจากข้อความ LINE OA
 */
class LineSlipParserService {
  /**
   * แยกข้อมูลสลิปจากข้อความ LINE OA
   * @param {string} message - ข้อความจาก LINE OA
   * @returns {Object|null} ข้อมูลสลิป หรือ null ถ้าไม่ใช่ข้อความสลิป
   */
  parseSlipMessage(message) {
    console.log(`🔍 Parsing slip message: ${message}`);

    // ตรวจสอบว่ามีเครื่องหมายถูก (✅) หรือไม่
    if (!message.includes('✅')) {
      console.log(`   ❌ No checkmark found`);
      return null;
    }

    // ตรวจสอบว่ามีข้อมูลธนาคารหรือไม่
    if (!message.includes('จาก:') && !message.includes('ไปยัง:')) {
      console.log(`   ❌ No bank info found`);
      return null;
    }

    try {
      const slipData = {
        isValid: true,
        amount: this._extractAmount(message),
        senderBank: this._extractSenderBank(message),
        senderAccount: this._extractSenderAccount(message),
        receiverBank: this._extractReceiverBank(message),
        receiverAccount: this._extractReceiverAccount(message),
        receiverName: this._extractReceiverName(message),
        dateTime: this._extractDateTime(message),
        referenceId: this._extractReferenceId(message),
      };

      console.log(`   ✅ Parsed slip data:`, slipData);
      return slipData;
    } catch (error) {
      console.error(`   ❌ Error parsing slip: ${error.message}`);
      return null;
    }
  }

  /**
   * ตรวจสอบว่าข้อความเป็นสลิปที่ถูกต้องหรือไม่
   * @param {string} message - ข้อความจาก LINE OA
   * @returns {boolean}
   */
  isValidSlip(message) {
    return message.includes('✅') && (message.includes('จาก:') || message.includes('ไปยัง:'));
  }

  /**
   * ดึงจำนวนเงิน
   * @private
   */
  _extractAmount(message) {
    // ค้นหาตัวเลขที่อยู่ก่อน "บาท"
    const match = message.match(/(\d+(?:\.\d+)?)\s*บาท/);
    if (match) {
      return parseFloat(match[1]);
    }
    return null;
  }

  /**
   * ดึงชื่อธนาคารผู้ส่ง
   * @private
   */
  _extractSenderBank(message) {
    // ค้นหาข้อมูลหลังจาก "จาก:" หรือ "ผู้ส่ง"
    const match = message.match(/จาก:?\s*([^\n]+)/i);
    if (match) {
      return match[1].trim();
    }
    return null;
  }

  /**
   * ดึงเลขบัญชีผู้ส่ง
   * @private
   */
  _extractSenderAccount(message) {
    // ค้นหาเลขบัญชี (รูปแบบ xxx-x-xxxxx-x)
    const match = message.match(/xxx-x-\d+-x/);
    if (match) {
      return match[0];
    }
    return null;
  }

  /**
   * ดึงชื่อธนาคารผู้รับ
   * @private
   */
  _extractReceiverBank(message) {
    // ค้นหาข้อมูลหลังจาก "ไปยัง:" หรือ "ผู้รับ"
    const match = message.match(/ไปยัง:?\s*([^\n]+)/i);
    if (match) {
      return match[1].trim();
    }
    return null;
  }

  /**
   * ดึงเลขบัญชีผู้รับ
   * @private
   */
  _extractReceiverAccount(message) {
    // ค้นหาเลขบัญชี (รูปแบบ xxx-x-xxxxx-x)
    const matches = message.match(/xxx-x-\d+-x/g);
    if (matches && matches.length > 1) {
      return matches[1];
    }
    return null;
  }

  /**
   * ดึงชื่อผู้รับ
   * @private
   */
  _extractReceiverName(message) {
    // ค้นหาชื่อที่อยู่ก่อนเลขบัญชี
    const match = message.match(/([A-Z\s]+)\s+xxx-x-\d+-x/);
    if (match) {
      return match[1].trim();
    }
    return null;
  }

  /**
   * ดึงวันที่เวลา
   * @private
   */
  _extractDateTime(message) {
    // ค้นหารูปแบบ "25 ก.พ. 2569 01:55"
    const match = message.match(/(\d{1,2})\s+([ก-ฮ\.]+)\s+(\d{4})\s+(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]} ${match[4]}:${match[5]}`;
    }
    return null;
  }

  /**
   * ดึง Reference ID
   * @private
   */
  _extractReferenceId(message) {
    // ค้นหารูปแบบ "20250225000000374"
    const match = message.match(/(\d{17})/);
    if (match) {
      return match[1];
    }
    return null;
  }
}

module.exports = LineSlipParserService;
