/**
 * BettingMessageParserService
 * Parse ข้อความเล่นทั้ง 2 วิธี
 * วิธีที่ 1: ราคาช่าง (ชล./ชถ.)
 * วิธีที่ 2: ราคาคะแนน (ล./ย.)
 */

class BettingMessageParserService {
  /**
   * Regex Pattern สำหรับวิธีที่ 1 (ราคาช่าง)
   * รูปแบบ: [ชื่อบั้งไฟ] [ชล./ชถ.] [ยอดเงิน]
   * ตัวอย่าง: "ฟ้าหลังฝน ชล. 500"
   */
  static METHOD1_PATTERN = /^(.+?)\s+(ชล\.|ชถ\.)\s+(\d+)$/;

  /**
   * Regex Pattern สำหรับวิธีที่ 2 (ราคาคะแนน)
   * รูปแบบ: [ราคา] [ล./ย.] [ยอดเงิน] [ชื่อบั้งไฟ]
   * ตัวอย่าง: "0/3(300-330) ล. 500 ฟ้าหลังฝน"
   */
  static METHOD2_PATTERN = /^(.+?)\s+([ลย]\.)\s+(\d+)\s+(.+)$/;

  /**
   * Parse ข้อความเล่น
   * @param {string} message - ข้อความจาก User
   * @returns {object} ผลลัพธ์ parsing
   */
  static parseMessage(message) {
    const trimmedMessage = message.trim();

    // ตรวจสอบวิธีที่ 1 (ราคาช่าง)
    const method1Match = trimmedMessage.match(this.METHOD1_PATTERN);
    if (method1Match) {
      return this.parseMethod1(method1Match);
    }

    // ตรวจสอบวิธีที่ 2 (ราคาคะแนน)
    const method2Match = trimmedMessage.match(this.METHOD2_PATTERN);
    if (method2Match) {
      return this.parseMethod2(method2Match);
    }

    // ไม่ตรงรูปแบบ
    return {
      success: false,
      method: null,
      error: 'รูปแบบผิดครับ กรุณาตรวจสอบการเว้นวรรค',
      hint: this.getHint(trimmedMessage),
    };
  }

  /**
   * Parse วิธีที่ 1 (ราคาช่าง)
   * @private
   */
  static parseMethod1(match) {
    const [, slipName, side, amount] = match;

    return {
      success: true,
      method: 1,
      slipName: slipName.trim(),
      side: side === 'ชล.' ? 'ไล่' : 'ถอย', // ชล. = ไล่, ชถ. = ถอย
      sideCode: side === 'ชล.' ? 'ชล' : 'ชถ',
      amount: parseInt(amount),
      price: null, // วิธีที่ 1 ไม่มีราคา
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Parse วิธีที่ 2 (ราคาคะแนน)
   * @private
   */
  static parseMethod2(match) {
    const [, price, side, amount, slipName] = match;

    return {
      success: true,
      method: 2,
      price: price.trim(),
      side: side === 'ล.' ? 'ไล่' : 'ยั้ง', // ล. = ไล่, ย. = ยั้ง
      sideCode: side === 'ล.' ? 'ล' : 'ย',
      amount: parseInt(amount),
      slipName: slipName.trim(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * ให้คำแนะนำตามข้อความที่ส่งมา
   * @private
   */
  static getHint(message) {
    if (message.includes('ชล') || message.includes('ชถ')) {
      return 'วิธีที่ 1: [ชื่อบั้งไฟ] [ชล./ชถ.] [ยอดเงิน]\nตัวอย่าง: ฟ้าหลังฝน ชล. 500';
    }
    if (message.includes('ล') || message.includes('ย')) {
      return 'วิธีที่ 2: [ราคา] [ล./ย.] [ยอดเงิน] [ชื่อบั้งไฟ]\nตัวอย่าง: 0/3(300-330) ล. 500 ฟ้าหลังฝน';
    }
    return 'กรุณาใช้รูปแบบใดรูปแบบหนึ่ง:\nวิธีที่ 1: ฟ้าหลังฝน ชล. 500\nวิธีที่ 2: 0/3(300-330) ล. 500 ฟ้าหลังฝน';
  }

  /**
   * ตรวจสอบว่าข้อความเป็นคำสั่งแอดมินหรือไม่
   * @param {string} message
   * @returns {object}
   */
  static parseAdminCommand(message) {
    const trimmedMessage = message.trim();

    // คำสั่ง :เริ่ม
    if (trimmedMessage.startsWith(':เริ่ม')) {
      const slipName = trimmedMessage.replace(':เริ่ม', '').trim();
      return {
        isCommand: true,
        command: 'START',
        slipName: slipName || null,
      };
    }

    // คำสั่ง :หยุด
    if (trimmedMessage === ':หยุด') {
      return {
        isCommand: true,
        command: 'STOP',
      };
    }

    // คำสั่ง :สรุป
    if (trimmedMessage.startsWith(':สรุป')) {
      const parts = trimmedMessage.replace(':สรุป', '').trim().split(/\s+/);
      const result = parts.slice(0, -1).join(' '); // ชื่อบั้งไฟ
      const score = parts[parts.length - 1]; // คะแนน

      return {
        isCommand: true,
        command: 'CALCULATE',
        slipName: result,
        score: parseInt(score),
      };
    }

    return {
      isCommand: false,
    };
  }

  /**
   * ตรวจสอบความถูกต้องของข้อมูลการเล่น
   * @param {object} parsedData
   * @returns {object}
   */
  static validateBet(parsedData) {
    if (!parsedData.success) {
      return { valid: false, error: parsedData.error };
    }

    // REPLY Method ไม่ต้องตรวจสอบจำนวนเงิน
    if (parsedData.method === 'REPLY') {
      if (!parsedData.slipName || parsedData.slipName.length === 0) {
        return { valid: false, error: 'ชื่อบั้งไฟไม่ถูกต้อง' };
      }
      return { valid: true };
    }

    // Direct Method ต้องตรวจสอบจำนวนเงิน
    if (parsedData.amount && parsedData.amount <= 0) {
      return { valid: false, error: 'จำนวนเงินต้องมากกว่า 0' };
    }

    if (parsedData.amount && parsedData.amount > 1000000) {
      return { valid: false, error: 'จำนวนเงินเกินขีดจำกัด' };
    }

    // ตรวจสอบชื่อบั้งไฟ
    if (!parsedData.slipName || parsedData.slipName.length === 0) {
      return { valid: false, error: 'ชื่อบั้งไฟไม่ถูกต้อง' };
    }

    return { valid: true };
  }

  /**
   * ตรวจสอบว่าเป็น Reply Method หรือไม่
   * @param {string} message
   * @returns {object}
   */
  static parseReplyMessage(message) {
    const trimmedMessage = message.trim();

    // ตรวจสอบ reply
    if (trimmedMessage === 'ต' || trimmedMessage === 'ต.') {
      return {
        success: true,
        type: 'REPLY',
        side: 'ต',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: false,
      type: null,
      error: 'ไม่ใช่ reply ที่ถูกต้อง',
    };
  }
}

module.exports = BettingMessageParserService;
