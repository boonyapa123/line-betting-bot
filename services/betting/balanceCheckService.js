/**
 * BalanceCheckService
 * ตรวจสอบยอดเงินคงเหลือและแจ้งเตือนเมื่อไม่พอ
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { LineNotificationService } = require('../line/lineNotificationService');
const pendingBalanceService = require('./pendingBalanceService');

class BalanceCheckService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.playersSheetName = 'Players';
    this.usersBalanceSheetName = 'UsersBalance';
  }

  /**
   * Initialize Google Sheets API
   */
  async initialize() {
    try {
      let credentials;

      // Try to load from environment variable first (for production)
      if (process.env.GOOGLE_CREDENTIALS_JSON) {
        credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        console.log('✅ Google Sheets credentials loaded from environment');
      } else {
        // Fall back to file (for local development)
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
      console.error('Error initializing BalanceCheckService:', error);
      throw error;
    }
  }

  /**
   * ตรวจสอบว่าผู้เล่นมีชื่อในระบบหรือไม่
   * @param {string} lineName - ชื่อ LINE
   * @returns {boolean} true ถ้าพบผู้เล่น, false ถ้าไม่พบ
   */
  async isPlayerRegistered(userId) {
      try {
        // ลองดึงจากชีท UsersBalance ก่อน (Column A = User ID)
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${this.usersBalanceSheetName}!A:C`,
        });

        const values = response.data.values || [];

        for (let i = 1; i < values.length; i++) {
          if (values[i] && values[i][0] === userId) {
            return true;
          }
        }

        // ถ้าไม่พบในชีท UsersBalance ให้ดึงจากชีท Players (Column A = User ID)
        const playersResponse = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${this.playersSheetName}!A:E`,
        });

        const playerValues = playersResponse.data.values || [];

        for (let i = 1; i < playerValues.length; i++) {
          if (playerValues[i] && playerValues[i][0] === userId) {
            return true;
          }
        }

        return false;
      } catch (error) {
        console.error('Error checking if player is registered:', error);
        if (error.code === 429 || error.response?.status === 429 || 
            error.message?.includes('Quota exceeded') || 
            error.message?.includes('ECONNREFUSED') ||
            error.message?.includes('ETIMEDOUT')) {
          const apiError = new Error(`API_ERROR: ${error.message}`);
          apiError.isApiError = true;
          apiError.originalError = error;
          throw apiError;
        }
        return false;
      }
    }

  /**
   * ตรวจสอบยอดเงินคงเหลือ (รวมการตรวจสอบเงินค้าง)
   * @param {string} lineName - ชื่อ LINE
   * @param {number} requiredAmount - จำนวนเงินที่ต้องการเดิมพัน
   * @returns {object} ผลลัพธ์ {sufficient: boolean, currentBalance: number, shortfall: number, registered: boolean, pendingAmount: number, availableBalance: number}
   */
  async checkBalance(userId, requiredAmount) {
      try {
        // ตรวจสอบว่าผู้เล่นมี User ID ในระบบหรือไม่
        const isRegistered = await this.isPlayerRegistered(userId);

        if (!isRegistered) {
          return {
            sufficient: false,
            currentBalance: 0,
            shortfall: requiredAmount,
            registered: false,
            pendingAmount: 0,
            availableBalance: 0,
            message: `ผู้เล่นไม่พบในระบบ`,
          };
        }

        const currentBalance = await this.getUserBalance(userId);

        // ตรวจสอบเงินค้าง (เงินเดิมพันที่จับคู่แล้วแต่ยังไม่มีผล)
        const pendingAmount = await pendingBalanceService.getPendingAmount(userId);
        const availableBalance = currentBalance - pendingAmount;

        if (availableBalance >= requiredAmount) {
          return {
            sufficient: true,
            currentBalance,
            shortfall: 0,
            registered: true,
            pendingAmount,
            availableBalance,
            message: `ยอดเงินเพียงพอ (${availableBalance} บาท หลังหักเงินค้าง)`,
          };
        }

        const shortfall = requiredAmount - availableBalance;
        return {
          sufficient: false,
          currentBalance,
          shortfall,
          registered: true,
          pendingAmount,
          availableBalance,
          message: `ยอดเงินไม่พอ ขาด ${shortfall} บาท (หลังหักเงินค้าง)`,
        };
      } catch (error) {
        console.error('Error checking balance:', error);
        if (error.isApiError || error.code === 429 || error.response?.status === 429 ||
            error.message?.includes('Quota exceeded') || error.message?.includes('API_ERROR')) {
          console.warn('⚠️  API error during balance check - skipping balance verification (allowing bet)');
          return {
            sufficient: true,
            currentBalance: 0,
            shortfall: 0,
            registered: true,
            pendingAmount: 0,
            availableBalance: 0,
            apiError: true,
            message: `⚠️ ไม่สามารถตรวจสอบยอดเงินได้ (API error) - อนุญาตให้เดิมพันต่อ`,
          };
        }
        return {
          sufficient: false,
          currentBalance: 0,
          shortfall: requiredAmount,
          registered: false,
          pendingAmount: 0,
          availableBalance: 0,
          error: error.message,
        };
      }
    }

  /**
   * ดึงยอดเงินคงเหลือของ User
   * @param {string} lineName - ชื่อ LINE
   * @returns {number} ยอดเงินคงเหลือ
   */
  async getUserBalance(userId) {
      try {
        // ลองดึงจากชีท UsersBalance ก่อน (Column A = User ID, Column C = Balance)
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${this.usersBalanceSheetName}!A:C`,
        });

        const values = response.data.values || [];

        for (let i = 1; i < values.length; i++) {
          if (values[i] && values[i][0] === userId) {
            return parseInt(values[i][2]) || 0;
          }
        }

        // ถ้าไม่พบในชีท UsersBalance ให้ดึงจากชีท Players (Column A = User ID, Column E = Balance)
        const playersResponse = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${this.playersSheetName}!A:E`,
        });

        const playerValues = playersResponse.data.values || [];

        for (let i = 1; i < playerValues.length; i++) {
          if (playerValues[i] && playerValues[i][0] === userId) {
            return parseInt(playerValues[i][4]) || 0;
          }
        }

        return 0;
      } catch (error) {
        console.error('Error getting user balance:', error);
        return 0;
      }
    }

  /**
   * แจ้งเตือนเมื่อผู้เล่นไม่พบในระบบ
   * @param {string} lineName - ชื่อ LINE
   * @param {string} userId - LINE User ID (สำหรับส่งข้อความ)
   * @param {number} accountNumber - LINE OA Account Number (1, 2, หรือ 3)
   * @param {string} groupId - LINE Group ID (สำหรับส่งข้อความในกลุ่ม)
   */
  async notifyPlayerNotRegistered(lineName, userId, accountNumber = 1, groupId = null) {
      try {
        console.log(`\n📤 === Player Not Registered Notification ===`);
        console.log(`   Player: ${lineName}`);
        console.log(`   User ID: ${userId}`);
        console.log(`   Account: ${accountNumber}`);
        console.log(`   Group ID: ${groupId || 'N/A'}`);

        // ดึง Account Number จากกลุ่ม (ถ้ามี groupId)
        let finalAccountNumber = accountNumber;
        if (groupId) {
          const groupAccountNumber = await this.getGroupAccountNumber(groupId);
          if (groupAccountNumber) {
            finalAccountNumber = groupAccountNumber;
            console.log(`   📍 Using group's account: ${finalAccountNumber}`);
          }
        }

        // สร้าง notification service ตามหมายเลข Account
        const notificationService = new LineNotificationService(finalAccountNumber);

        // ส่งข้อความแจ้งเตือนในกลุ่ม (ข้อความเดียว + รูป QR)
        if (groupId) {
          const groupMessage = `⚠️ ${lineName} ยังไม่ได้เติมเงิน\n\n` +
            `💡 กรุณาเติมเงินก่อนเริ่มเล่น\n` +
            `📱 เลข บช. 865-0-35901-9 กรุงไทย\n` +
            `ชญาภา พรรณวงค์`;

          console.log(`\n   📢 Sending group message...`);
          const groupResult = await notificationService.sendGroupMessage(groupId, groupMessage);
          if (groupResult.success) {
            console.log(`   ✅ Group message sent successfully`);
          } else {
            console.error(`   ❌ Failed to send group message: ${groupResult.error}`);
          }

        }

        console.log(`\n   === End Notification ===\n`);
        return { success: true };
      } catch (error) {
        console.error('Error notifying player not registered:', error);
        return { success: false, error: error.message };
      }
    }

  /**
   * แจ้งเตือนเมื่อยอดเงินไม่พอ (รวมเงินค้าง)
   * @param {string} lineName - ชื่อ LINE
   * @param {number} currentBalance - ยอดเงินปัจจุบัน
   * @param {number} requiredAmount - จำนวนเงินที่ต้องการเดิมพัน
   * @param {number} shortfall - ยอดเงินที่ขาด
   * @param {string} userId - LINE User ID (สำหรับส่งข้อความ)
   * @param {number} accountNumber - LINE OA Account Number (1, 2, หรือ 3)
   * @param {string} groupId - LINE Group ID (สำหรับส่งข้อความในกลุ่ม)
   * @param {number} pendingAmount - เงินค้างที่ยังไม่มีผล
   * @param {number} availableBalance - เงินที่สามารถใช้ได้
   */
  async notifyInsufficientBalance(lineName, currentBalance, requiredAmount, shortfall, userId, accountNumber = 1, groupId = null, pendingAmount = 0, availableBalance = 0) {
      try {
        console.log(`\n📤 === Insufficient Balance Notification ===`);
        console.log(`   Player: ${lineName}`);
        console.log(`   User ID: ${userId}`);
        console.log(`   Current balance: ${currentBalance} บาท`);
        console.log(`   Required amount: ${requiredAmount} บาท`);
        console.log(`   Shortfall: ${shortfall} บาท`);
        console.log(`   Account: ${accountNumber}`);
        console.log(`   Group ID: ${groupId || 'N/A'}`);

        // ดึง Account Number จากกลุ่ม (ถ้ามี groupId)
        let finalAccountNumber = accountNumber;
        if (groupId) {
          const groupAccountNumber = await this.getGroupAccountNumber(groupId);
          if (groupAccountNumber) {
            finalAccountNumber = groupAccountNumber;
            console.log(`   📍 Using group's account: ${finalAccountNumber}`);
          }
        }

        const notificationService = new LineNotificationService(finalAccountNumber);

        // ส่งข้อความแจ้งเตือนในกลุ่ม (ข้อความเดียว + รูป QR)
        if (groupId) {
          const groupMessage = `⚠️ ${lineName} ยอดเงินไม่พอ (ขาด ${shortfall} บาท)\n\n` +
            `💡 กรุณาเติมเงินก่อนเริ่มเล่น\n` +
            `📱 เลข บช. 865-0-35901-9 กรุงไทย\n` +
            `ชญาภา พรรณวงค์`;

          console.log(`\n   📢 Sending group message...`);
          const groupResult = await notificationService.sendGroupMessage(groupId, groupMessage);
          if (groupResult.success) {
            console.log(`   ✅ Group message sent successfully`);
          } else {
            console.error(`   ❌ Failed to send group message: ${groupResult.error}`);
          }

          // ส่งรูป QR payment ในกลุ่ม
        }

        console.log(`\n   === End Notification ===\n`);
        return { success: true };
      } catch (error) {
        console.error('Error notifying insufficient balance:', error);
        return { success: false, error: error.message };
      }
    }

  /**
   * สร้างข้อความแจ้งเตือนยอดเงินไม่พอ (รวมเงินค้าง)
   * @private
   */
  buildInsufficientBalanceMessage(lineName, currentBalance, requiredAmount, shortfall, pendingAmount = 0, availableBalance = 0) {
    let message = `⚠️ ⚠️ ⚠️ ยอดเงินไม่พอสำหรับการเดิมพัน ⚠️ ⚠️ ⚠️\n`;
    message += `👤 ${lineName}\n`;
    message += `💰 ยอดเงินปัจจุบัน: ${currentBalance} บาท\n`;
    if (pendingAmount > 0) {
      message += `⏳ เงินค้างที่ยังไม่มีผล: ${pendingAmount} บาท\n`;
      message += `✅ เงินที่สามารถใช้ได้: ${availableBalance} บาท\n`;
    }
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💡 วิธีแก้ไข (เติมเงิน):\n`;
    message += `1️⃣  โอนเงินเพิ่มอย่างน้อย ${shortfall} บาท\n`;
    message += `2️⃣  ส่งสลิปการโอนเงินให้ระบบตรวจสอบ\n`;
    message += `3️⃣  รอการยืนยันจากระบบ\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📱 ติดต่อแอดมิน หากมีปัญหา\n`;
    message += `🔗 เข้าร่วมกลุ่ม: https://lin.ee/JO6X7FE`;

    return message;
  }

  /**
   * ตรวจสอบและแจ้งเตือนยอดเงิน (รวมเงินค้าง)
   * @param {string} lineName - ชื่อ LINE
   * @param {number} requiredAmount - จำนวนเงินที่ต้องการเดิมพัน
   * @param {string} userId - LINE User ID (สำหรับส่งข้อความ)
   * @param {number} accountNumber - LINE OA Account Number (1, 2, หรือ 3)
   * @param {string} groupId - LINE Group ID (สำหรับส่งข้อความในกลุ่ม)
   * @returns {object} ผลลัพธ์
   */
  async checkAndNotify(lineName, requiredAmount, userId, accountNumber = 1, groupId = null) {
      try {
        // ใช้ userId ในการเช็คยอดเงิน (แทน lineName)
        const checkResult = await this.checkBalance(userId, requiredAmount);

        // ถ้า API error ให้ข้ามการตรวจสอบ (อนุญาตให้เดิมพันต่อ)
        if (checkResult.apiError) {
          console.warn(`⚠️  API error - skipping balance/registration check for ${lineName} (${userId})`);
          return checkResult;
        }

        // ถ้าผู้เล่นไม่พบในระบบ ให้แจ้งเตือนทันที
        if (!checkResult.registered) {
          await this.notifyPlayerNotRegistered(
            lineName,
            userId,
            accountNumber,
            groupId
          );
          return checkResult;
        }

        // ถ้ายอดเงินไม่พอ ให้แจ้งเตือน (รวมเงินค้าง)
        if (!checkResult.sufficient) {
          await this.notifyInsufficientBalance(
            lineName,
            checkResult.currentBalance,
            requiredAmount,
            checkResult.shortfall,
            userId,
            accountNumber,
            groupId,
            checkResult.pendingAmount,
            checkResult.availableBalance
          );
        } else if (checkResult.availableBalance <= 50) {
          // ถ้าเงินใกล้หมด (≤ 50 บาท) แต่ยังเล่นได้ ให้แจ้งเตือน
          await this.notifyLowBalance(
            lineName,
            checkResult.currentBalance,
            checkResult.pendingAmount,
            checkResult.availableBalance,
            userId,
            accountNumber,
            groupId
          );
        }

        return checkResult;
      } catch (error) {
        console.error('Error in checkAndNotify:', error);
        if (error.isApiError || error.code === 429 || error.response?.status === 429 ||
            error.message?.includes('Quota exceeded') || error.message?.includes('API_ERROR')) {
          console.warn(`⚠️  API error in checkAndNotify - allowing bet for ${lineName} (${userId})`);
          return {
            sufficient: true,
            registered: true,
            currentBalance: 0,
            pendingAmount: 0,
            availableBalance: 0,
            apiError: true,
            message: `⚠️ ไม่สามารถตรวจสอบยอดเงินได้ - อนุญาตให้เดิมพันต่อ`,
          };
        }
        return {
          sufficient: false,
          registered: false,
          error: error.message,
        };
      }
    }

  /**
   * แจ้งเตือนเงินใกล้หมด (เมื่อ availableBalance <= 50 แต่ยังเล่นได้)
   * @param {string} lineName - ชื่อ LINE
   * @param {number} currentBalance - ยอดเงินคงเหลือ
   * @param {number} pendingAmount - เงินค้างรอผล
   * @param {number} availableBalance - เงินที่ใช้ได้จริง
   * @param {string} userId - LINE User ID
   * @param {number} accountNumber - LINE OA Account Number
   * @param {string} groupId - LINE Group ID
   */
  async notifyLowBalance(lineName, currentBalance, pendingAmount, availableBalance, userId, accountNumber = 1, groupId = null) {
    try {
      // ดึงรายละเอียดรายการรอผล
      const pendingBets = await pendingBalanceService.getPendingBetsDetails(lineName);
      
      // สร้างข้อความ
      let message = `⚠️ แจ้งเตือน: เงินใกล้หมด\n`;
      message += `👤 ${lineName}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `💰 ยอดเงินคงเหลือ: ${currentBalance} บาท\n`;
      message += `⏳ เงินค้างรอผล: ${pendingAmount} บาท (${pendingBets.length} รายการ)\n`;
      message += `✅ เงินที่ใช้ได้จริง: ${availableBalance} บาท\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      
      if (pendingBets.length > 0) {
        message += `📋 รายการรอผล:\n`;
        pendingBets.forEach((bet, index) => {
          message += `  ${index + 1}. ${bet.slipName} - ${bet.side} ${bet.amount} บาท\n`;
        });
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      }
      
      message += `💡 เงินเหลือน้อย กรุณาเติมเงินเพิ่ม\n`;
      message += `📱 ติดต่อแอดมิน หากมีปัญหา\n`;
      message += `https://lin.ee/JO6X7FE`;

      console.log(`\n📤 === Low Balance Warning ===`);
      console.log(`   Player: ${lineName}`);
      console.log(`   Available balance: ${availableBalance} บาท`);
      console.log(`   Pending bets: ${pendingBets.length} รายการ`);

      // ดึง Account Number จากกลุ่ม (ถ้ามี groupId)
      let finalAccountNumber = accountNumber;
      if (groupId) {
        const groupAccountNumber = await this.getGroupAccountNumber(groupId);
        if (groupAccountNumber) {
          finalAccountNumber = groupAccountNumber;
        }
      }

      // สร้าง notification service ตามหมายเลข Account
      const notificationService = new LineNotificationService(finalAccountNumber);

      // ส่งข้อความส่วนตัว
      const result = await notificationService.sendPrivateMessage(userId, message);

      if (result.success) {
        console.log(`   ✅ Low balance warning sent`);
      } else {
        console.error(`   ❌ Failed to send warning: ${result.error}`);
      }

      console.log(`   === End Warning ===\n`);
      return { success: result.success };
    } catch (error) {
      console.error('Error notifying low balance:', error);
      return { success: false, error: error.message };
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

  /**
   * ดึง Account Number จาก groupId
   * @private
   */
  async getGroupAccountNumber(groupId) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // อ่านไฟล์ groups.json
      const groupsFilePath = path.join(__dirname, '../../data/groups.json');
      
      if (!fs.existsSync(groupsFilePath)) {
        console.warn(`Groups data file not found at ${groupsFilePath}`);
        return null;
      }
      
      const groupsData = JSON.parse(fs.readFileSync(groupsFilePath, 'utf8'));
      
      if (groupsData[groupId]) {
        return groupsData[groupId].account;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting group account number: ${error.message}`);
      return null;
    }
  }
}

module.exports = new BalanceCheckService();
