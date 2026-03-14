/**
 * BetsSheetColumns
 * จัดการคอลัมน์ของชีท Bets อย่างเป็นศูนย์กลาง
 * ป้องกันการใช้คอลัมน์ผิดในหลายไฟล์
 */

class BetsSheetColumns {
  // คอลัมน์ที่ใช้ในชีท Bets (0-indexed)
  static COLUMNS = {
    TIMESTAMP: 0,           // A: Timestamp
    USER_A_ID: 1,           // B: User A ID
    USER_A_NAME: 2,         // C: ชื่อ User A
    MESSAGE_A: 3,           // D: ข้อความ A
    SLIP_NAME: 4,           // E: ชื่อบั้งไฟ
    SIDE_A: 5,              // F: รายการเล่น (ฝั่ง A)
    AMOUNT: 6,              // G: ยอดเงิน
    AMOUNT_B: 7,            // H: ยอดเงิน B
    RESULT: 8,              // I: ผลที่ออก
    RESULT_WIN_LOSE: 9,     // J: ผลแพ้ชนะ A
    RESULT_WIN_LOSE_B: 10,  // K: ผลแพ้ชนะ B
    USER_B_NAME: 11,        // L: ชื่อ User B
    SIDE_B: 12,             // M: รายการแทง (ฝั่ง B)
    GROUP_CHAT_NAME: 13,    // N: ชื่อกลุ่มแชท
    GROUP_NAME: 14,         // O: ชื่อกลุ่ม
    TOKEN_A: 15,            // P: Token A
    GROUP_ID: 16,           // Q: ID กลุ่ม
    USER_B_ID: 17,          // R: User ID B
    RESULT_A: 18,           // S: ผลลัพธ์ A
    RESULT_B: 19,           // T: ผลลัพธ์ B
    MATCHED_AUTO: 20,       // U: MATCHED Auto (จับคู่อัตโนมัติ)
  };

  // ชื่อคอลัมน์ (สำหรับอ้างอิง)
  static COLUMN_NAMES = {
    0: 'A - Timestamp',
    1: 'B - User A ID',
    2: 'C - ชื่อ User A',
    3: 'D - ข้อความ A',
    4: 'E - ชื่อบั้งไฟ',
    5: 'F - รายการเล่น (ฝั่ง A)',
    6: 'G - ยอดเงิน',
    7: 'H - ยอดเงิน B',
    8: 'I - ผลที่ออก',
    9: 'J - ผลแพ้ชนะ A',
    10: 'K - ผลแพ้ชนะ B',
    11: 'L - ชื่อ User B',
    12: 'M - รายการแทง (ฝั่ง B)',
    13: 'N - ชื่อกลุ่มแชท',
    14: 'O - ชื่อกลุ่ม',
    15: 'P - Token A',
    16: 'Q - ID กลุ่ม',
    17: 'R - User ID B',
    18: 'S - ผลลัพธ์ A',
    19: 'T - ผลลัพธ์ B',
    20: 'U - MATCHED Auto',
  };

  /**
   * สร้างแถวข้อมูลสำหรับบันทึกลงชีท Bets
   * @param {object} data - ข้อมูลที่ต้องบันทึก
   * @returns {array} แถวข้อมูล (21 คอลัมน์)
   */
  static createRow(data) {
    // สร้างแถวที่มี 21 คอลัมน์ (A-U) พร้อมค่าว่างเปล่า
    const row = new Array(21).fill('');

    // ตั้งค่าข้อมูลตามคอลัมน์
    if (data.timestamp) row[this.COLUMNS.TIMESTAMP] = data.timestamp;
    if (data.userAId) row[this.COLUMNS.USER_A_ID] = data.userAId;
    if (data.userAName) row[this.COLUMNS.USER_A_NAME] = data.userAName;
    if (data.messageA) row[this.COLUMNS.MESSAGE_A] = data.messageA;
    if (data.slipName) row[this.COLUMNS.SLIP_NAME] = data.slipName;
    if (data.sideA) row[this.COLUMNS.SIDE_A] = data.sideA;
    if (data.amount !== undefined && data.amount !== null) row[this.COLUMNS.AMOUNT] = data.amount;
    if (data.amountB !== undefined && data.amountB !== null) row[this.COLUMNS.AMOUNT_B] = data.amountB;
    if (data.result) row[this.COLUMNS.RESULT] = data.result;
    if (data.resultWinLose) row[this.COLUMNS.RESULT_WIN_LOSE] = data.resultWinLose;
    if (data.resultWinLoseB) row[this.COLUMNS.RESULT_WIN_LOSE_B] = data.resultWinLoseB;
    if (data.userBName) row[this.COLUMNS.USER_B_NAME] = data.userBName;
    if (data.sideB) row[this.COLUMNS.SIDE_B] = data.sideB;
    if (data.groupChatName) row[this.COLUMNS.GROUP_CHAT_NAME] = data.groupChatName;
    if (data.groupName) row[this.COLUMNS.GROUP_NAME] = data.groupName;
    if (data.tokenA) row[this.COLUMNS.TOKEN_A] = data.tokenA;
    if (data.groupId) row[this.COLUMNS.GROUP_ID] = data.groupId;
    if (data.userBId) row[this.COLUMNS.USER_B_ID] = data.userBId;
    if (data.resultA) row[this.COLUMNS.RESULT_A] = data.resultA;
    if (data.resultB) row[this.COLUMNS.RESULT_B] = data.resultB;
    if (data.matchedAuto) row[this.COLUMNS.MATCHED_AUTO] = data.matchedAuto;

    return row;
  }

  /**
   * แปลงแถวข้อมูลจากชีท Bets เป็น object
   * @param {array} row - แถวข้อมูลจากชีท
   * @returns {object} ข้อมูลที่แปลงแล้ว
   */
  static parseRow(row) {
    // Parse price จากข้อความ (column D)
    // ตัวอย่าง: "320-340 ล 100 คำไผ่" → price = "320-340"
    // ตัวอย่าง: "ชล 500 ฟ้าหลังฝน" → price = null (Method 1)
    const message = row[this.COLUMNS.MESSAGE_A] || '';
    const priceMatch = message.match(/^(\d+-\d+)/);
    const price = priceMatch ? priceMatch[1] : null;

    // ดึง slipName จาก column E (ชื่อบั้งไฟ)
    // ถ้าไม่มี หรือมีค่าผิด (มีราคา) ให้ดึงจากท้ายข้อความ
    let slipName = row[this.COLUMNS.SLIP_NAME];
    
    // ตรวจสอบว่า slipName มีค่าผิด (มีราคา เช่น "360-400 เป็ด")
    if (slipName && slipName.match(/^\d+-\d+\s+/)) {
      // ถ้า slipName มีรูปแบบ "ราคา ชื่อบั้งไฟ" ให้ดึงเฉพาะชื่อบั้งไฟ
      const slipMatch = slipName.match(/\s+(.+)$/);
      slipName = slipMatch ? slipMatch[1] : slipName;
    } else if (!slipName) {
      // Parse slipName จากท้ายข้อความ
      // ตัวอย่าง: "320-340 ล 100 คำไผ่" → slipName = "คำไผ่"
      const slipMatch = message.match(/\s+(\S+)$/);
      slipName = slipMatch ? slipMatch[1] : '';
    }

    return {
      timestamp: row[this.COLUMNS.TIMESTAMP],
      userId: row[this.COLUMNS.USER_A_ID],
      displayName: row[this.COLUMNS.USER_A_NAME],
      message: row[this.COLUMNS.MESSAGE_A],
      slipName: slipName,
      side: row[this.COLUMNS.SIDE_A],
      sideCode: row[this.COLUMNS.SIDE_A],
      amount: parseInt(row[this.COLUMNS.AMOUNT]) || 0,
      amountB: parseInt(row[this.COLUMNS.AMOUNT_B]) || 0,
      result: row[this.COLUMNS.RESULT],
      resultWinLose: row[this.COLUMNS.RESULT_WIN_LOSE],
      resultWinLoseB: row[this.COLUMNS.RESULT_WIN_LOSE_B],
      userBId: row[this.COLUMNS.USER_B_ID],  // ✅ ดึง User B ID จาก Column R (index 17)
      userBName: row[this.COLUMNS.USER_B_NAME],
      sideBCode: row[this.COLUMNS.SIDE_B],
      groupChatName: row[this.COLUMNS.GROUP_CHAT_NAME],
      groupName: row[this.COLUMNS.GROUP_NAME],
      tokenA: row[this.COLUMNS.TOKEN_A],
      groupId: row[this.COLUMNS.GROUP_ID],
      resultA: row[this.COLUMNS.RESULT_A],
      resultB: row[this.COLUMNS.RESULT_B],
      matchedAuto: row[this.COLUMNS.MATCHED_AUTO],
      price: price,
      method: price ? 2 : 1,
      status: row[this.COLUMNS.MATCHED_AUTO] ? 'MATCHED' : '', // ✅ ตั้งค่าจาก Column U (MATCHED_AUTO)
    };
  }

  /**
   * ดึงคอลัมน์ที่ต้องการจากแถว
   * @param {array} row - แถวข้อมูล
   * @param {string} columnKey - ชื่อคอลัมน์ (เช่น 'SIDE_A', 'AMOUNT')
   * @returns {*} ค่าของคอลัมน์
   */
  static getColumn(row, columnKey) {
    const columnIndex = this.COLUMNS[columnKey];
    if (columnIndex === undefined) {
      throw new Error(`Unknown column key: ${columnKey}`);
    }
    return row[columnIndex];
  }

  /**
   * ตั้งค่าคอลัมน์ในแถว
   * @param {array} row - แถวข้อมูล
   * @param {string} columnKey - ชื่อคอลัมน์ (เช่น 'SIDE_A', 'AMOUNT')
   * @param {*} value - ค่าที่ต้องการตั้ง
   */
  static setColumn(row, columnKey, value) {
    const columnIndex = this.COLUMNS[columnKey];
    if (columnIndex === undefined) {
      throw new Error(`Unknown column key: ${columnKey}`);
    }
    row[columnIndex] = value;
  }

  /**
   * ดึงช่วงคอลัมน์สำหรับ Google Sheets API
   * @param {number} startCol - คอลัมน์เริ่มต้น (0-indexed)
   * @param {number} endCol - คอลัมน์สิ้นสุด (0-indexed)
   * @returns {string} ช่วงคอลัมน์ (เช่น 'A:T')
   */
  static getColumnRange(startCol = 0, endCol = 19) {
    const startLetter = String.fromCharCode(65 + startCol);
    const endLetter = String.fromCharCode(65 + endCol);
    return `${startLetter}:${endLetter}`;
  }

  /**
   * ดึงช่วงคอลัมน์สำหรับ Google Sheets API (พร้อมแถว)
   * @param {number} startRow - แถวเริ่มต้น (1-indexed)
   * @param {number} endRow - แถวสิ้นสุด (1-indexed)
   * @param {number} startCol - คอลัมน์เริ่มต้น (0-indexed)
   * @param {number} endCol - คอลัมน์สิ้นสุด (0-indexed)
   * @returns {string} ช่วง (เช่น 'A2:T100')
   */
  static getRange(startRow = 2, endRow = null, startCol = 0, endCol = 19) {
    const startLetter = String.fromCharCode(65 + startCol);
    const endLetter = String.fromCharCode(65 + endCol);
    
    if (endRow === null) {
      return `${startLetter}${startRow}:${endLetter}`;
    }
    
    return `${startLetter}${startRow}:${endLetter}${endRow}`;
  }

  /**
   * พิมพ์ข้อมูลแถวเพื่อ debug
   * @param {array} row - แถวข้อมูล
   */
  static logRow(row) {
    console.log('\n📊 Row Data:');
    console.log('=====================================');
    Object.entries(this.COLUMNS).forEach(([key, index]) => {
      const colLetter = String.fromCharCode(65 + index);
      const value = row[index] || '(ว่างเปล่า)';
      console.log(`  [${colLetter}] ${key}: ${value}`);
    });
  }

  /**
   * ดึงฝั่งตรงข้าม
   * @param {string} sideCode - Side code (เช่น "ล", "ต", "ชล", "ชถ")
   * @returns {string} ฝั่งตรงข้าม
   */
  static getOppositeSide(sideCode) {
    const opposites = {
      'ชล': 'ชถ',
      'ชถ': 'ชล',
      'ล': 'ต',
      'ต': 'ล',
    };
    return opposites[sideCode] || sideCode;
  }

  /**
   * สร้าง Price B จาก Price A โดยเปลี่ยน side เป็น opposite
   * @param {string} priceA - Price A (เช่น "300-320 ล 20 ฟ้า")
   * @param {string} sideCodeA - Side code ของ User A (เช่น "ล")
   * @returns {string} Price B (เช่น "300-320 ต")
   */
  static createPriceB(priceA, sideCodeA) {
    if (!priceA) return '';
    
    // ดึงช่วงราคาจาก Price A
    const priceMatch = priceA.match(/^(\d+-\d+)/);
    if (!priceMatch) return '';
    
    const priceRange = priceMatch[1];
    const oppositeSide = this.getOppositeSide(sideCodeA);
    
    return `${priceRange} ${oppositeSide}`;
  }

  /**
   * อัปเดตแถวด้วยข้อมูล User B (เมื่อจับคู่สำเร็จ)
   * @param {array} currentRow - แถวปัจจุบัน
   * @param {object} userBData - ข้อมูล User B
   * @returns {array} แถวที่อัปเดตแล้ว
   */
  static updateRowWithUserB(currentRow, userBData) {
    const row = [...currentRow]; // Copy แถวปัจจุบัน

    // อัปเดตข้อมูล User B
    // ✅ บันทึก User B ID ที่คอลัมน์ R (index 17)
    if (userBData.userId) row[this.COLUMNS.USER_B_ID] = userBData.userId;
    if (userBData.displayName) row[this.COLUMNS.USER_B_NAME] = userBData.displayName;
    
    // ✅ บันทึก Price B ที่มีช่วงราคาเดียวกับ Price A แต่ฝั่งตรงข้าม
    if (userBData.priceB) {
      // ใช้ Price B ที่ส่งมา (มีช่วงราคา)
      row[this.COLUMNS.SIDE_B] = userBData.priceB;
    } else if (userBData.sideCode) {
      // ถ้าไม่มี Price B ให้ใช้ opposite side code
      const oppositeSide = this.getOppositeSide(userBData.sideCode);
      row[this.COLUMNS.SIDE_B] = oppositeSide;
    }
    
    // ✅ บันทึก amount B
    if (userBData.amount !== undefined && userBData.amount !== null) {
      row[this.COLUMNS.AMOUNT_B] = userBData.amount;
    }
    
    // ✅ บันทึก slip name (ไม่ให้เปลี่ยน)
    // ถ้า userBData มี slipName ให้ใช้ค่านั้น (ป้องกันการเปลี่ยนแปลง)
    if (userBData.slipName) {
      // แก้ไข slip name ถ้ามีรูปแบบ "ราคา ชื่อบั้งไฟ"
      let slipName = userBData.slipName;
      if (slipName && slipName.match(/^\d+-\d+\s+/)) {
        // ถ้า slipName มีรูปแบบ "ราคา ชื่อบั้งไฟ" ให้ดึงเฉพาะชื่อบั้งไฟ
        const slipMatch = slipName.match(/\s+(.+)$/);
        slipName = slipMatch ? slipMatch[1] : slipName;
      }
      row[this.COLUMNS.SLIP_NAME] = slipName;
    }
    
    if (userBData.groupName) row[this.COLUMNS.GROUP_NAME] = userBData.groupName;

    // ทำเครื่องหมาย MATCHED Auto ใน Column U
    row[this.COLUMNS.MATCHED_AUTO] = 'AUTO';

    return row;
  }
}

module.exports = BetsSheetColumns;
