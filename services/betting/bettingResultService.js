/**
 * BettingResultService
 * จัดการผลลัพธ์การเล่น คำนวณค่าธรรมเนียม และแจ้งเตือน LINE
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { LineNotificationService } = require('../line/lineNotificationService');
const bettingPairingService = require('./bettingPairingService');

class BettingResultService {
  constructor() {
    // สร้าง notification service สำหรับแต่ละ Account (Account 1 & 2)
    this.lineNotificationServices = {
      1: new LineNotificationService(1),
      2: new LineNotificationService(2),
    };
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.betsSheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';
    this.FEE_PERCENTAGE = 0.10; // 10% ค่าธรรมเนียมจากยอดเล่น
    this.DRAW_FEE_PERCENTAGE = 0.05; // 5% ค่าธรรมเนียมออกกลาง
  }

  /**
   * Initialize Google Sheets API
   */
  async initialize() {
    try {
      let credentials;

      if (process.env.GOOGLE_CREDENTIALS_JSON) {
        credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      } else {
        const credentialsPath = path.join(
          __dirname,
          '../../',
          process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'credentials.json'
        );
        credentials = JSON.parse(fs.readFileSync(credentialsPath));
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
    } catch (error) {
      console.error('Error initializing BettingResultService:', error);
      throw error;
    }
  }

  /**
   * Ensure initialization is complete
   */
  async ensureInitialized() {
    if (!this.sheets) {
      await this.initialize();
    }
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
   * บันทึกผลลัพธ์ลงชีท Bets (อัปเดตแถวที่จับคู่ไปแล้ว)
   * @param {object} result - ผลลัพธ์
   * @param {string} slipName - ชื่อบั้งไฟ
   * @param {number} score - คะแนนที่ออก
   */
  async recordResult(result, slipName, score) {
    try {
      await this.ensureInitialized();

      const { bet1, bet2 } = result.pair;
      const { winner, loser, isDraw } = result;

      // ค้นหาแถวที่จับคู่ไปแล้ว
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.betsSheetName}!A2:U`,
      });

      const values = response.data.values || [];
      let matchedRowIndex = -1;

      // ค้นหาแถวที่มี User A + User B ของบั้งไฟนี้
      for (let i = 0; i < values.length; i++) {
        const row = values[i];
        const userAName = row[2]; // Column C
        const userBName = row[11]; // Column L
        const rowSlipName = row[4]; // Column E
        const userBAmount = row[7]; // Column H (ถ้ามีค่า = MATCHED)

        if (
          rowSlipName === slipName &&
          userBAmount !== undefined &&
          userBAmount !== '' &&
          ((userAName === bet1.displayName && userBName === bet2.displayName) ||
            (userAName === bet2.displayName && userBName === bet1.displayName))
        ) {
          matchedRowIndex = i + 2; // +2 เพราะ header + 0-indexed
          break;
        }
      }

      if (matchedRowIndex === -1) {
        console.warn(`No matched row found for slip: ${slipName}`);
        return { success: false, error: 'No matched row found' };
      }

      // อัปเดตผลลัพธ์
      const updates = [];

      // Column I: ผลที่ออก
      updates.push({
        range: `${this.betsSheetName}!I${matchedRowIndex}`,
        values: [[score]],
      });

      // Column J: ผลแพ้ชนะ (ชนะ/แพ้/เสมอ)
      const resultStatus = isDraw ? 'เสมอ' : (winner.displayName === bet1.displayName ? 'ชนะ' : 'แพ้');
      updates.push({
        range: `${this.betsSheetName}!J${matchedRowIndex}`,
        values: [[resultStatus]],
      });

      // Column S: ผลลัพธ์ A
      const resultA = winner.displayName === bet1.displayName
        ? `ชนะ ${winner.netAmount} บาท`
        : `แพ้ ${Math.abs(loser.netAmount)} บาท`;
      updates.push({
        range: `${this.betsSheetName}!S${matchedRowIndex}`,
        values: [[resultA]],
      });

      // Column T: ผลลัพธ์ B
      const resultB = winner.displayName === bet2.displayName
        ? `ชนะ ${winner.netAmount} บาท`
        : `แพ้ ${Math.abs(loser.netAmount)} บาท`;
      updates.push({
        range: `${this.betsSheetName}!T${matchedRowIndex}`,
        values: [[resultB]],
      });

      // บันทึกทั้งหมด
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          data: updates,
          valueInputOption: 'USER_ENTERED',
        },
      });

      console.log(`✅ Result recorded for row ${matchedRowIndex}`);
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
   * สร้างข้อความผลลัพธ์สำหรับกลุ่ม (รูปแบบใหม่ด้วย emoji)
   * ตัวอย่าง: แอด 460✅️เทวดา 300❌️เทพพนม 350⛔️ฟ้าหลังฝน
   * @private
   */
  buildResultMessage(result, slipName, score, isDraw) {
    const { winner, loser, bet1, bet2 } = result;

    if (isDraw) {
      // ออกกลาง (เสมอ)
      return `${slipName} ${score}⛔️${bet1.displayName} ⛔️${bet2.displayName}`;
    } else {
      // ชนะ-แพ้
      const winnerName = winner.displayName;
      const loserName = loser.displayName;

      return `${slipName} ${score}✅️${winnerName} ❌️${loserName}`;
    }
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
      message += `\n⛔️ ออกกลาง (เสมอ)\n`;
      message += `หัก: ${winner.fee} บาท (5%)\n`;
    } else {
      message += `\n✅️ ชนะ\n`;
      message += `เดิมพัน: ${winner.grossAmount} บาท\n`;
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
      message += `\n⛔️ ออกกลาง (เสมอ)\n`;
      message += `หัก: ${loser.fee} บาท (5%)\n`;
    } else {
      message += `\n❌️ แพ้\n`;
      message += `เดิมพัน: ${Math.abs(loser.grossAmount)} บาท\n`;
    }

    return message;
  }
}

const instance = new BettingResultService();

// Initialize immediately
let initPromise = instance.initialize().catch(error => {
  console.error('Failed to auto-initialize BettingResultService:', error);
});

// Add a method to ensure initialization is complete
instance.ensureInitialized = async function() {
  await initPromise;
  if (!this.sheets) {
    throw new Error('BettingResultService failed to initialize');
  }
};

module.exports = instance;
