/**
 * PendingBalanceService
 * ตรวจสอบยอดเงินค้างที่ยังไม่มีผล
 * คำนวนเงินเดิมพันที่จับคู่แล้วแต่ยังไม่มีผลออก
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class PendingBalanceService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.betsSheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';
    this.balanceSheetName = 'UsersBalance';
  }

  /**
   * Initialize Google Sheets API
   */
  async initialize() {
    try {
      let credentials;

      if (process.env.GOOGLE_CREDENTIALS_JSON) {
        credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        console.log('✅ Google Sheets credentials loaded from environment');
      } else {
        const credentialsPath = path.join(
          __dirname,
          '../../',
          process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'credentials.json'
        );
        credentials = JSON.parse(fs.readFileSync(credentialsPath));
        console.log('✅ Google Sheets credentials loaded from file');
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
    } catch (error) {
      console.error('Error initializing PendingBalanceService:', error);
      throw error;
    }
  }

  /**
   * ดึงเงินค้างทั้งหมดของผู้เล่น
   * รวมเงินเดิมพันทั้งหมดที่จับคู่แล้วแต่ยังไม่มีผล
   * @param {string} displayName - ชื่อ LINE
   * @returns {number} จำนวนเงินค้าง
   */
  async getPendingAmount(userId) {
      try {
        // Ensure initialization is complete
        await this.ensureInitialized();

        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${this.betsSheetName}!A2:R`,
        });

        const values = response.data.values || [];
        let totalPending = 0;

        for (const row of values) {
          // ค้นหาจาก User ID แทนชื่อ LINE
          const userAId = row[1]; // Column B: User A ID
          const userBId = row[17]; // Column R: User B ID

          // ตรวจสอบสถานะ: MATCHED แต่ยังไม่มีผล (Column I ว่างเปล่า)
          const status = row[8] || ''; // Column I: แสดงผล
          const isMATCHED = row[7] !== undefined && row[7] !== ''; // Column H: ยอดเงิน B (ถ้ามีค่า = MATCHED)
          const hasNoResult = status === '' || status === undefined;

          if (isMATCHED && hasNoResult) {
            if (userAId === userId) {
              const amountA = parseInt(row[6]) || 0; // Column G: ยอดเงิน A
              totalPending += amountA;
            }
            else if (userBId === userId) {
              const amountB = parseInt(row[7]) || 0; // Column H: ยอดเงิน B
              totalPending += amountB;
            }
          }
        }

        return totalPending;
      } catch (error) {
        console.error('Error getting pending amount:', error);
        return 0;
      }
    }

  /**
   * ตรวจสอบว่ายอดเงินเพียงพอสำหรับการเดิมพันใหม่หรือไม่
   * ยอดคงเหลือ - เงินค้าง >= เงินเดิมพันใหม่
   * @param {string} displayName - ชื่อ LINE
   * @param {number} currentBalance - ยอดเงินคงเหลือปัจจุบัน
   * @param {number} newBetAmount - จำนวนเงินเดิมพันใหม่
   * @returns {object} ผลการตรวจสอบ
   */
  async checkSufficientBalance(displayName, currentBalance, newBetAmount) {
    try {
      const pendingAmount = await this.getPendingAmount(displayName);
      const availableBalance = currentBalance - pendingAmount;

      const isSufficient = availableBalance >= newBetAmount;

      return {
        success: true,
        isSufficient,
        currentBalance,
        pendingAmount,
        availableBalance,
        requiredAmount: newBetAmount,
        shortfall: isSufficient ? 0 : newBetAmount - availableBalance,
      };
    } catch (error) {
      console.error('Error checking sufficient balance:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * ดึงรายละเอียดเงินค้างของผู้เล่น
   * @param {string} displayName - ชื่อ LINE
   * @returns {array} รายการเงินค้าง
   */
  async getPendingBetsDetails(displayName) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.betsSheetName}!A2:N`,
      });

      const values = response.data.values || [];
      const pendingBets = [];

      for (const row of values) {
        const userAName = row[2]; // Column C: ชื่อ User A
        const userBName = row[11]; // Column L: ชื่อ User B
        const status = row[8] || ''; // Column I: แสดงผล
        const isMATCHED = row[7] !== undefined && row[7] !== ''; // Column H: ยอดเงิน B
        const hasNoResult = status === '' || status === undefined;

        if (isMATCHED && hasNoResult) {
          if (userAName === displayName) {
            pendingBets.push({
              timestamp: row[0],
              slipName: row[4], // Column E: ชื่อบั้งไฟ
              side: row[5], // Column F: รายการเล่น
              amount: parseInt(row[6]) || 0, // Column G: ยอดเงิน A
              opponent: userBName,
              opponentAmount: parseInt(row[7]) || 0,
              status: 'PENDING',
            });
          } else if (userBName === displayName) {
            pendingBets.push({
              timestamp: row[0],
              slipName: row[4], // Column E: ชื่อบั้งไฟ
              side: row[12], // Column M: รายการเล่น B
              amount: parseInt(row[7]) || 0, // Column H: ยอดเงิน B
              opponent: userAName,
              opponentAmount: parseInt(row[6]) || 0,
              status: 'PENDING',
            });
          }
        }
      }

      return pendingBets;
    } catch (error) {
      console.error('Error getting pending bets details:', error);
      return [];
    }
  }

  /**
   * สร้างข้อความแจ้งเตือนเงินไม่พอ
   * @param {object} checkResult - ผลการตรวจสอบ
   * @returns {string} ข้อความแจ้งเตือน
   */
  buildInsufficientBalanceMessage(checkResult) {
    const {
      currentBalance,
      pendingAmount,
      availableBalance,
      requiredAmount,
      shortfall,
    } = checkResult;

    let message = '⚠️ เงินไม่พอสำหรับการเดิมพันนี้\n\n';
    message += `💰 ยอดเงินคงเหลือ: ${currentBalance} บาท\n`;
    message += `⏳ เงินค้างที่ยังไม่มีผล: ${pendingAmount} บาท\n`;
    message += `✅ เงินที่สามารถใช้ได้: ${availableBalance} บาท\n`;
    message += `❌ ต้องการเงิน: ${requiredAmount} บาท\n`;
    message += `📉 เงินขาด: ${shortfall} บาท\n\n`;
    message += 'กรุณารอผลการเล่นก่อนหน้า หรือเติมเงินเพิ่มเติม';

    return message;
  }

  /**
   * สร้างข้อความแสดงรายละเอียดเงินค้าง
   * @param {array} pendingBets - รายการเงินค้าง
   * @returns {string} ข้อความรายละเอียด
   */
  buildPendingBetsMessage(pendingBets) {
    if (pendingBets.length === 0) {
      return '✅ ไม่มีเงินค้างที่ยังไม่มีผล';
    }

    let message = '⏳ รายการเงินค้างที่ยังไม่มีผล:\n\n';
    let totalPending = 0;

    pendingBets.forEach((bet, index) => {
      message += `${index + 1}. ${bet.slipName}\n`;
      message += `   ฝั่ง: ${bet.side}\n`;
      message += `   เงิน: ${bet.amount} บาท\n`;
      message += `   คู่ต่อสู้: ${bet.opponent}\n`;
      message += `   เวลา: ${new Date(bet.timestamp).toLocaleString('th-TH')}\n\n`;
      totalPending += bet.amount;
    });

    message += `📊 รวมเงินค้าง: ${totalPending} บาท`;

    return message;
  }
}

const instance = new PendingBalanceService();

// Initialize immediately and ensure it's ready before export
let initPromise = instance.initialize().catch(error => {
  console.error('Failed to auto-initialize PendingBalanceService:', error);
});

// Add a method to ensure initialization is complete
instance.ensureInitialized = async function() {
  await initPromise;
  if (!this.sheets) {
    throw new Error('PendingBalanceService failed to initialize');
  }
};

module.exports = instance;
