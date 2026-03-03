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
  async isPlayerRegistered(lineName) {
    try {
      // ลองดึงจากชีท UsersBalance ก่อน
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.usersBalanceSheetName}!A:C`,
      });

      const values = response.data.values || [];

      for (let i = 1; i < values.length; i++) {
        if (values[i] && values[i][1] === lineName) {
          return true;
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
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking if player is registered:', error);
      return false;
    }
  }

  /**
   * ตรวจสอบยอดเงินคงเหลือ
   * @param {string} lineName - ชื่อ LINE
   * @param {number} requiredAmount - จำนวนเงินที่ต้องการเดิมพัน
   * @returns {object} ผลลัพธ์ {sufficient: boolean, currentBalance: number, shortfall: number, registered: boolean}
   */
  async checkBalance(lineName, requiredAmount) {
    try {
      // ตรวจสอบว่าผู้เล่นมีชื่อในระบบหรือไม่ (อันดับแรก)
      const isRegistered = await this.isPlayerRegistered(lineName);
      
      if (!isRegistered) {
        return {
          sufficient: false,
          currentBalance: 0,
          shortfall: requiredAmount,
          registered: false,
          message: `ผู้เล่นไม่พบในระบบ`,
        };
      }

      const currentBalance = await this.getUserBalance(lineName);

      if (currentBalance >= requiredAmount) {
        return {
          sufficient: true,
          currentBalance,
          shortfall: 0,
          registered: true,
          message: `ยอดเงินเพียงพอ (${currentBalance} บาท)`,
        };
      }

      const shortfall = requiredAmount - currentBalance;
      return {
        sufficient: false,
        currentBalance,
        shortfall,
        registered: true,
        message: `ยอดเงินไม่พอ ขาด ${shortfall} บาท`,
      };
    } catch (error) {
      console.error('Error checking balance:', error);
      return {
        sufficient: false,
        currentBalance: 0,
        shortfall: requiredAmount,
        registered: false,
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
   * แจ้งเตือนเมื่อผู้เล่นไม่พบในระบบ
   * @param {string} lineName - ชื่อ LINE
   * @param {string} userId - LINE User ID (สำหรับส่งข้อความ)
   * @param {number} accountNumber - LINE OA Account Number (1, 2, หรือ 3)
   * @param {string} groupId - LINE Group ID (สำหรับส่งข้อความในกลุ่ม)
   */
  async notifyPlayerNotRegistered(lineName, userId, accountNumber = 1, groupId = null) {
    try {
      const message = `❌ ❌ ❌ ยังไม่ได้ลงทะเบียนในระบบ ❌ ❌ ❌\n\n` +
        `👤 ${lineName}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⚠️  คุณยังไม่ได้ลงทะเบียนในระบบ\n\n` +
        `💡 วิธีแก้ไข (เติมเงินเพื่อลงทะเบียน):\n` +
        `1️⃣  โอนเงินเข้าระบบ\n` +
        `2️⃣  ส่งสลิปการโอนให้ระบบตรวจสอบ\n` +
        `3️⃣  รอการยืนยันจากระบบ\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📱 ติดต่อแอดมิน หากมีปัญหา\n` +
        `🔗 เข้าร่วมกลุ่ม: https://lin.ee/JO6X7FE`;

      console.log(`\n📤 === Player Not Registered Notification ===`);
      console.log(`   Player: ${lineName}`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Account: ${accountNumber}`);
      console.log(`   Group ID: ${groupId || 'N/A'}`);

      // เลือก notification service ตามหมายเลข Account
      const notificationService = this.lineNotificationServices[accountNumber] || this.lineNotificationServices[1];

      // ส่งข้อความส่วนตัว
      console.log(`\n   📤 Sending private message...`);
      const result = await notificationService.sendPrivateMessage(userId, message);

      if (result.success) {
        console.log(`   ✅ Private message sent successfully`);
      } else {
        console.error(`   ❌ Failed to send private message: ${result.error}`);
      }

      // ส่งข้อความแจ้งเตือนในกลุ่มด้วย (ถ้ามี groupId)
      if (groupId) {
        const groupMessage = `❌ ❌ ❌ ยังไม่ได้ลงทะเบียนในระบบ ❌ ❌ ❌\n\n` +
          `👤 ${lineName} ยังไม่ได้ลงทะเบียน\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `💡 วิธีแก้ไข (เติมเงินเพื่อลงทะเบียน):\n` +
          `1️⃣  โอนเงินเข้าระบบ\n` +
          `2️⃣  ส่งสลิปการโอนให้ระบบตรวจสอบ\n` +
          `3️⃣  รอการยืนยันจากระบบ\n\n` +
          `📱 ติดต่อแอดมิน หากมีปัญหา\n` +
          `🔗 เข้าร่วมกลุ่ม: https://lin.ee/JO6X7FE`;

        console.log(`\n   📢 Sending group message...`);
        const groupResult = await notificationService.sendGroupMessage(groupId, groupMessage);
        if (groupResult.success) {
          console.log(`   ✅ Group message sent successfully`);
        } else {
          console.error(`   ❌ Failed to send group message: ${groupResult.error}`);
        }
      }

      console.log(`\n   === End Notification ===\n`);
      return { success: result.success };
    } catch (error) {
      console.error('Error notifying player not registered:', error);
      return { success: false, error: error.message };
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
   * @param {string} groupId - LINE Group ID (สำหรับส่งข้อความในกลุ่ม)
   */
  async notifyInsufficientBalance(lineName, currentBalance, requiredAmount, shortfall, userId, accountNumber = 1, groupId = null) {
    try {
      const message = this.buildInsufficientBalanceMessage(
        lineName,
        currentBalance,
        requiredAmount,
        shortfall
      );

      console.log(`\n📤 === Insufficient Balance Notification ===`);
      console.log(`   Player: ${lineName}`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Current balance: ${currentBalance} บาท`);
      console.log(`   Required amount: ${requiredAmount} บาท`);
      console.log(`   Shortfall: ${shortfall} บาท`);
      console.log(`   Account: ${accountNumber}`);
      console.log(`   Group ID: ${groupId || 'N/A'}`);

      // เลือก notification service ตามหมายเลข Account
      const notificationService = this.lineNotificationServices[accountNumber] || this.lineNotificationServices[1];

      // ส่งข้อความส่วนตัว
      console.log(`\n   📤 Sending private message...`);
      const result = await notificationService.sendPrivateMessage(userId, message);

      if (result.success) {
        console.log(`   ✅ Private message sent successfully`);
      } else {
        console.error(`   ❌ Failed to send private message: ${result.error}`);
      }

      // ส่งข้อความแจ้งเตือนในกลุ่มด้วย (ถ้ามี groupId)
      if (groupId) {
        const groupMessage = `⚠️ ⚠️ ⚠️ ยอดเงินไม่เพียงพอ ⚠️ ⚠️ ⚠️\n\n` +
          `👤 ${lineName} ยอดเงินไม่พอ (ขาด ${shortfall} บาท)\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `💡 วิธีแก้ไข (เติมเงิน):\n` +
          `1️⃣  โอนเงินเพิ่มเติมให้เพียงพอ\n` +
          `2️⃣  ส่งสลิปการโอนให้ระบบตรวจสอบ\n` +
          `3️⃣  รอการยืนยันจากระบบ\n\n` +
          `📱 ติดต่อแอดมิน หากมีปัญหา`;

        console.log(`\n   📢 Sending group message...`);
        const groupResult = await notificationService.sendGroupMessage(groupId, groupMessage);
        if (groupResult.success) {
          console.log(`   ✅ Group message sent successfully`);
        } else {
          console.error(`   ❌ Failed to send group message: ${groupResult.error}`);
        }
      }

      console.log(`\n   === End Notification ===\n`);
      return { success: result.success };
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
    let message = `⚠️ ⚠️ ⚠️ ยอดเงินไม่พอสำหรับการเดิมพัน ⚠️ ⚠️ ⚠️\n`;
    message += `👤 ${lineName}\n`;
    message += `💰 ยอดเงินปัจจุบัน: ${currentBalance} บาท\n`;
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
   * ตรวจสอบและแจ้งเตือนยอดเงิน
   * @param {string} lineName - ชื่อ LINE
   * @param {number} requiredAmount - จำนวนเงินที่ต้องการเดิมพัน
   * @param {string} userId - LINE User ID (สำหรับส่งข้อความ)
   * @param {number} accountNumber - LINE OA Account Number (1, 2, หรือ 3)
   * @param {string} groupId - LINE Group ID (สำหรับส่งข้อความในกลุ่ม)
   * @returns {object} ผลลัพธ์
   */
  async checkAndNotify(lineName, requiredAmount, userId, accountNumber = 1, groupId = null) {
    try {
      const checkResult = await this.checkBalance(lineName, requiredAmount);

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

      // ถ้ายอดเงินไม่พอ ให้แจ้งเตือน
      if (!checkResult.sufficient) {
        await this.notifyInsufficientBalance(
          lineName,
          checkResult.currentBalance,
          requiredAmount,
          checkResult.shortfall,
          userId,
          accountNumber,
          groupId
        );
      }

      return checkResult;
    } catch (error) {
      console.error('Error in checkAndNotify:', error);
      return {
        sufficient: false,
        registered: false,
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
