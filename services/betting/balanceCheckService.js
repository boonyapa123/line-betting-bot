/**
 * BalanceCheckService
 * ตรวจสอบยอดเงินคงเหลือและแจ้งเตือนเมื่อไม่พอ
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { LineNotificationService } = require('../line/lineNotificationService');

class BalanceCheckService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.playersSheetName = 'Players';
    this.usersBalanceSheetName = 'UsersBalance';
    // สร้าง notification service สำหรับแต่ละ Account (Account 1 & 2 เท่านั้น)
    this.lineNotificationServices = {
      1: new LineNotificationService(1),
      2: new LineNotificationService(2),
    };
  }

  /**
   * Initialize Google Sheets API
   */
  async initialize() {
    try {
      const credentialsPath = path.join(
        __dirname,
        '../../',
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'credentials.json'
      );
      const credentials = JSON.parse(fs.readFileSync(credentialsPath));

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
    } catch (error) {
      console.error('Error initializing BalanceCheckService:', error);
      throw error;
    }
  }

  /**
   * ตรวจสอบยอดเงินคงเหลือ
   * @param {string} lineName - ชื่อ LINE
   * @param {number} requiredAmount - จำนวนเงินที่ต้องการเดิมพัน
   * @returns {object} ผลลัพธ์ {sufficient: boolean, currentBalance: number, shortfall: number}
   */
  async checkBalance(lineName, requiredAmount) {
    try {
      const currentBalance = await this.getUserBalance(lineName);

      if (currentBalance >= requiredAmount) {
        return {
          sufficient: true,
          currentBalance,
          shortfall: 0,
          message: `ยอดเงินเพียงพอ (${currentBalance} บาท)`,
        };
      }

      const shortfall = requiredAmount - currentBalance;
      return {
        sufficient: false,
        currentBalance,
        shortfall,
        message: `ยอดเงินไม่พอ ขาด ${shortfall} บาท`,
      };
    } catch (error) {
      console.error('Error checking balance:', error);
      return {
        sufficient: false,
        currentBalance: 0,
        shortfall: requiredAmount,
        error: error.message,
      };
    }
  }

  /**
   * ดึงยอดเงินคงเหลือของ User
   * @param {string} lineName - ชื่อ LINE
   * @returns {number} ยอดเงินคงเหลือ
   */
  async getUserBalance(lineName) {
    try {
      // ลองดึงจากชีท UsersBalance ก่อน
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.usersBalanceSheetName}!A:C`,
      });

      const values = response.data.values || [];

      for (let i = 1; i < values.length; i++) {
        if (values[i] && values[i][1] === lineName) {
          return parseInt(values[i][2]) || 0;
        }
      }

      // ถ้าไม่พบในชีท UsersBalance ให้ดึงจากชีท Players
      const playersResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.playersSheetName}!B:E`,
      });

      const playerValues = playersResponse.data.values || [];

      for (let i = 1; i < playerValues.length; i++) {
        if (playerValues[i] && playerValues[i][0] === lineName) {
          return parseInt(playerValues[i][3]) || 0; // Column E = Balance
        }
      }

      return 0;
    } catch (error) {
      console.error('Error getting user balance:', error);
      return 0;
    }
  }

  /**
   * แจ้งเตือนเมื่อยอดเงินไม่พอ
   * @param {string} lineName - ชื่อ LINE
   * @param {number} currentBalance - ยอดเงินปัจจุบัน
   * @param {number} requiredAmount - จำนวนเงินที่ต้องการเดิมพัน
   * @param {number} shortfall - ยอดเงินที่ขาด
   * @param {string} userId - LINE User ID (สำหรับส่งข้อความ)
   * @param {number} accountNumber - LINE OA Account Number (1, 2, หรือ 3)
   */
  async notifyInsufficientBalance(lineName, currentBalance, requiredAmount, shortfall, userId, accountNumber = 1) {
    try {
      const message = this.buildInsufficientBalanceMessage(
        lineName,
        currentBalance,
        requiredAmount,
        shortfall
      );

      console.log(`📤 Sending insufficient balance notification to ${userId} (${lineName}) via Account ${accountNumber}`);
      console.log(`   Current balance: ${currentBalance} บาท`);
      console.log(`   Required amount: ${requiredAmount} บาท`);
      console.log(`   Shortfall: ${shortfall} บาท`);

      // เลือก notification service ตามหมายเลข Account
      const notificationService = this.lineNotificationServices[accountNumber] || this.lineNotificationServices[1];

      // ส่งข้อความส่วนตัว
      const result = await notificationService.sendPrivateMessage(userId, message);

      if (result.success) {
        console.log(`✅ แจ้งเตือนยอดเงินไม่พอไปยัง ${lineName} สำเร็จ (Account ${accountNumber})`);
        return { success: true };
      } else {
        console.error(`❌ ไม่สามารถส่งแจ้งเตือนไปยัง ${lineName}: ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error notifying insufficient balance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * สร้างข้อความแจ้งเตือนยอดเงินไม่พอ
   * @private
   */
  buildInsufficientBalanceMessage(lineName, currentBalance, requiredAmount, shortfall) {
    let message = `⚠️ ⚠️ ⚠️ ยอดเงินไม่พอสำหรับการเดิมพัน ⚠️ ⚠️ ⚠️\n\n`;
    message += `👤 ชื่อ: ${lineName}\n`;
    message += `💰 ยอดเงินปัจจุบัน: ${currentBalance} บาท\n`;
    message += `🎰 จำนวนเงินที่ต้องการเดิมพัน: ${requiredAmount} บาท\n`;
    message += `❌ ขาด: ${shortfall} บาท\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💡 วิธีแก้ไข:\n`;
    message += `1️⃣  โอนเงินเพิ่มอย่างน้อย ${shortfall} บาท\n`;
    message += `2️⃣  ส่งสลิปการโอนเงินให้ระบบตรวจสอบ\n`;
    message += `3️⃣  รอการยืนยันจากระบบ\n`;
    message += `4️⃣  ลองเดิมพันใหม่อีกครั้ง\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📱 ติดต่อแอดมิน หากมีปัญหา`;

    return message;
  }

  /**
   * ตรวจสอบและแจ้งเตือนยอดเงิน
   * @param {string} lineName - ชื่อ LINE
   * @param {number} requiredAmount - จำนวนเงินที่ต้องการเดิมพัน
   * @param {string} userId - LINE User ID (สำหรับส่งข้อความ)
   * @param {number} accountNumber - LINE OA Account Number (1, 2, หรือ 3)
   * @returns {object} ผลลัพธ์
   */
  async checkAndNotify(lineName, requiredAmount, userId, accountNumber = 1) {
    try {
      const checkResult = await this.checkBalance(lineName, requiredAmount);

      if (!checkResult.sufficient) {
        // แจ้งเตือนเมื่อยอดเงินไม่พอ
        await this.notifyInsufficientBalance(
          lineName,
          checkResult.currentBalance,
          requiredAmount,
          checkResult.shortfall,
          userId,
          accountNumber
        );
      }

      return checkResult;
    } catch (error) {
      console.error('Error in checkAndNotify:', error);
      return {
        sufficient: false,
        error: error.message,
      };
    }
  }

  /**
   * ดึงข้อมูลยอดเงินทั้งหมด
   * @returns {array} ข้อมูลยอดเงินทั้งหมด
   */
  async getAllBalances() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.usersBalanceSheetName}!A:C`,
      });

      const values = response.data.values || [];
      const balances = [];

      for (let i = 1; i < values.length; i++) {
        if (values[i]) {
          balances.push({
            userId: values[i][0],
            displayName: values[i][1],
            balance: parseInt(values[i][2]) || 0,
          });
        }
      }

      return balances;
    } catch (error) {
      console.error('Error getting all balances:', error);
      return [];
    }
  }
}

module.exports = new BalanceCheckService();
