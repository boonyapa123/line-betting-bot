/**
 * BettingMessageParserService
 * Parse ข้อความเล่นทั้ง 2 วิธี
 * วิธีที่ 1: ราคาช่าง (ชล./ชถ.)
 * วิธีที่ 2: ราคาคะแนน (ล./ย.)
 */

class BettingMessageParserService {
  /**
   * Regex Pattern สำหรับวิธีที่ 1 (ราคาช่าง)
   * รูปแบบเดิม: [ชื่อบั้งไฟ] [ชล./ชถ.] [ยอดเงิน]
   * ตัวอย่าง: "ฟ้าหลังฝน ชล. 500"
   * 
   * รูปแบบใหม่: [ชล/ชถ/ชย] [ยอดเงิน] [ชื่อบั้งไฟ]
   * ตัวอย่าง: "ชล 500 ฟ้าหลังฝน" หรือ "ชย 500 ฟ้าหลังฝน"
   */
  static METHOD1_PATTERN = /^(.+?)\s+(ชล\.|ชถ\.)\s+(\d+)$/;
  static METHOD1_ALT_PATTERN = /^(ชล|ชถ|ชย)\s+(\d+)\s+(.+)$/;

  /**
   * Regex Pattern สำหรับวิธีที่ 2 (ราคาคะแนน)
   * รูปแบบเดิม: [ราคา] [ล./ย.] [ยอดเงิน] [ชื่อบั้งไฟ]
   * ตัวอย่าง: "0/3(300-330) ล. 500 ฟ้าหลังฝน"
   * 
   * รูปแบบใหม่: [ราคา] [ล/ย] [ยอดเงิน] [ชื่อบั้งไฟ]
   * ตัวอย่าง: "0/3(300-330) ล 500 ฟ้าหลังฝน"
   * 
   * รูปแบบง่าย: [ราคา] [ล/ย] [ยอดเงิน] [ชื่อบั้งไฟ]
   * ตัวอย่าง: "300-330 ล 500 ฟ้าหลังฝน"
   * 
   * รูปแบบ Slash: [ล/ย/ต/ส]/[ราคา]/[ยอดเงิน][ชื่อบั้งไฟ]
   * ตัวอย่าง: "ล/350-390/10000แอดไล่"
   */
  static METHOD2_PATTERN = /^(.+?)\s+([ลย]\.)\s+(\d+)\s+(.+)$/;
  static METHOD2_ALT_PATTERN = /^(.+?)\s+([ลย])\s+(\d+)\s+(.+)$/;
  static METHOD2_SIMPLE_PATTERN = /^(\d+[\-\.\/\*]\d+)\s+([ลย])\s+(\d+)\s+(.+)$/;
  static METHOD2_SLASH_PATTERN = /^([ก-๙]+)\/(\d+[\-\.\/\*]\d+)\/(\d+)\/?([ก-๙\s]+)$/;

  /**
   * Parse ข้อความเล่น
   * @param {string} message - ข้อความจาก User
   * @returns {object} ผลลัพธ์ parsing
   */
  static parseMessage(message) {
    const trimmedMessage = message.trim();

    // ตรวจสอบวิธีที่ 2 (ราคาคะแนน) - รูปแบบ Slash ใหม่
    const method2SlashMatch = trimmedMessage.match(this.METHOD2_SLASH_PATTERN);
    if (method2SlashMatch) {
      return this.parseMethod2Slash(method2SlashMatch);
    }

    // ตรวจสอบวิธีที่ 1 (ราคาช่าง) - รูปแบบเดิม
    const method1Match = trimmedMessage.match(this.METHOD1_PATTERN);
    if (method1Match) {
      return this.parseMethod1(method1Match);
    }

    // ตรวจสอบวิธีที่ 1 (ราคาช่าง) - รูปแบบใหม่
    const method1AltMatch = trimmedMessage.match(this.METHOD1_ALT_PATTERN);
    if (method1AltMatch) {
      return this.parseMethod1Alt(method1AltMatch);
    }

    // ตรวจสอบวิธีที่ 2 (ราคาคะแนน) - รูปแบบเดิม
    const method2Match = trimmedMessage.match(this.METHOD2_PATTERN);
    if (method2Match) {
      return this.parseMethod2(method2Match);
    }

    // ตรวจสอบวิธีที่ 2 (ราคาคะแนน) - รูปแบบใหม่
    const method2AltMatch = trimmedMessage.match(this.METHOD2_ALT_PATTERN);
    if (method2AltMatch) {
      return this.parseMethod2Alt(method2AltMatch);
    }

    // ตรวจสอบวิธีที่ 2 (ราคาคะแนน) - รูปแบบง่าย
    const method2SimpleMatch = trimmedMessage.match(this.METHOD2_SIMPLE_PATTERN);
    if (method2SimpleMatch) {
      return this.parseMethod2Simple(method2SimpleMatch);
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
   * Parse วิธีที่ 1 (ราคาช่าง) - รูปแบบเดิม
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
   * Parse วิธีที่ 1 (ราคาช่าง) - รูปแบบใหม่
   * รูปแบบ: [ชล/ชถ/ชย] [ยอดเงิน] [ชื่อบั้งไฟ]
   * ตัวอย่าง: "ชล 500 ฟ้าหลังฝน"
   * @private
   */
  static parseMethod1Alt(match) {
    const [, side, amount, slipName] = match;

    const sideMap = {
      'ชล': 'ไล่',
      'ชถ': 'ถอย',
      'ชย': 'ยั้ง',
    };

    return {
      success: true,
      method: 1,
      slipName: slipName.trim(),
      side: sideMap[side] || side,
      sideCode: side,
      amount: parseInt(amount),
      price: null, // วิธีที่ 1 ไม่มีราคา
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Parse วิธีที่ 2 (ราคาคะแนน) - รูปแบบเดิม
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
   * Parse วิธีที่ 2 (ราคาคะแนน) - รูปแบบใหม่
   * รูปแบบ: [ราคา] [ล/ย] [ยอดเงิน] [ชื่อบั้งไฟ]
   * ตัวอย่าง: "0/3(300-330) ล 500 ฟ้าหลังฝน"
   * @private
   */
  static parseMethod2Alt(match) {
    const [, price, side, amount, slipName] = match;

    const sideMap = {
      'ล': 'ไล่',
      'ย': 'ยั้ง',
    };

    return {
      success: true,
      method: 2,
      price: price.trim(),
      side: sideMap[side] || side,
      sideCode: side,
      amount: parseInt(amount),
      slipName: slipName.trim(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Parse วิธีที่ 2 (ราคาคะแนน) - รูปแบบง่าย
   * รูปแบบ: [ราคา] [ล/ย] [ยอดเงิน] [ชื่อบั้งไฟ]
   * ตัวอย่าง: "300-330 ล 500 ฟ้าหลังฝน"
   * @private
   */
  static parseMethod2Simple(match) {
    const [, price, side, amount, slipName] = match;

    const sideMap = {
      'ล': 'ไล่',
      'ย': 'ยั้ง',
    };

    return {
      success: true,
      method: 2,
      price: price.trim(),
      side: sideMap[side] || side,
      sideCode: side,
      amount: parseInt(amount),
      slipName: slipName.trim(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Parse วิธีที่ 2 (ราคาคะแนน) - รูปแบบ Slash ใหม่
   * รูปแบบ: [ล/ย/ต/ส/ไล่]/[ราคา]/[ยอดเงิน][ชื่อบั้งไฟ]
   * ตัวอย่าง: "ล/350-390/10000แอดไล่"
   * @private
   */
  static parseMethod2Slash(match) {
    const [, side, price, amount, slipName] = match;

    const sideMap = {
      'ล': 'ไล่',
      'ไล่': 'ไล่',
      'ย': 'ยั้ง',
      'ยั้ง': 'ยั้ง',
      'ต': 'ต่ำ/ยั่ง',
      'ส': 'สูง/ไล่',
    };

    const sideCodeMap = {
      'ล': 'ล',
      'ไล่': 'ล',
      'ย': 'ย',
      'ยั้ง': 'ย',
      'ต': 'ต',
      'ส': 'ส',
    };

    return {
      success: true,
      method: 2,
      price: price.trim(),
      side: sideMap[side] || side,
      sideCode: sideCodeMap[side] || side,
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
    if (message.includes('ล') || message.includes('ย') || message.includes('ต') || message.includes('ส')) {
      return '❌ ต้องใส่ยอดเงิน!\n\n✅ รูปแบบที่ถูกต้อง:\nวิธีที่ 2: [ฝั่ง]/[ราคา]/[ยอดเงิน][ชื่อบั้งไฟ]\nตัวอย่าง: ไล่/325-340/100ฟ้า\n\nหรือ: [ราคา] [ล./ย.] [ยอดเงิน] [ชื่อบั้งไฟ]\nตัวอย่าง: 300-330 ล 500 ฟ้าหลังฝน';
    }
    return 'กรุณาใช้รูปแบบใดรูปแบบหนึ่ง:\nวิธีที่ 1: ฟ้าหลังฝน ชล. 500\nวิธีที่ 2: ไล่/325-340/100ฟ้า\nหรือ: 300-330 ล 500 ฟ้าหลังฝน';
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
   * Reply 'ต' จะแปลงเป็นฝั่งตรงข้ามตามบริบท
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
        method: 'REPLY',
        side: 'ต', // ฝั่ง reply (จะแปลงเป็นฝั่งตรงข้ามเมื่อจับคู่)
        sideCode: 'ต',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: false,
      type: null,
      error: 'ไม่ใช่ reply ที่ถูกต้อง',
    };
  }

  /**
   * แสดงข้อมูลการเล่นในรูปแบบที่อ่านง่าย
   * @param {object} parsedBet - ข้อมูลการเล่นที่ถอดแล้ว
   * @returns {string} ข้อมูลในรูปแบบ "ชื่อบั้งไฟ: xxx ยอดเงิน: xxx เดิมพัน: xxx ราคา: xxx"
   */
  static formatBetInfo(parsedBet) {
    if (!parsedBet.success) {
      return '';
    }

    let info = `ชื่อบั้งไฟ: ${parsedBet.slipName}`;
    info += `ยอดเงิน: ${parsedBet.amount}`;
    info += `เดิมพัน: ${parsedBet.sideCode}`;
    
    if (parsedBet.price) {
      info += `ราคา: ${parsedBet.price}`;
    }

    return info;
  }
}

module.exports = BettingMessageParserService;
