/**
 * BalanceUpdateService
 * อัปเดตยอดเงินของผู้เล่นหลังจากสรุปผล
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class BalanceUpdateService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.usersBalanceSheetName = 'UsersBalance';
    this.transactionsSheetName = 'Transactions';
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
      console.error('Error initializing BalanceUpdateService:', error);
      throw error;
    }
  }

  /**
   * อัปเดตยอดเงินของผู้เล่น
   * ใช้ DisplayName (ชื่อ LINE) เป็นหลัก
   * @param {string} displayName - ชื่อ LINE (DisplayName)
   * @param {number} amount - จำนวนเงินที่เปลี่ยนแปลง (บวก = ได้รับ, ลบ = เสีย)
   * @param {string} transactionType - ประเภทธุรกรรม (WIN, LOSE, DRAW, DEPOSIT, WITHDRAW)
   * @param {string} slipName - ชื่อบั้งไฟ (สำหรับ WIN/LOSE/DRAW)
   * @returns {object} ผลการอัปเดต
   */
  async updateBalance(displayName, amount, transactionType, slipName = null) {
    try {
      // ดึงยอดเงินปัจจุบัน
      const currentBalance = await this.getUserBalance(displayName);
      const newBalance = currentBalance + amount;

      // อัปเดตยอดเงินในชีท UsersBalance
      const updateResult = await this.updateUserBalanceInSheet(
        displayName,
        newBalance
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error,
        };
      }

      // บันทึกธุรกรรม
      const transactionResult = await this.recordTransaction(
        displayName,
        amount,
        transactionType,
        currentBalance,
        newBalance,
        slipName
      );

      return {
        success: true,
        displayName,
        previousBalance: currentBalance,
        amount,
        newBalance,
        transactionType,
        slipName,
        transactionRecorded: transactionResult.success,
      };
    } catch (error) {
      console.error('Error updating balance:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * อัปเดตยอดเงินของผู้ชนะและผู้แพ้
   * ใช้ DisplayName (ชื่อ LINE) เป็นหลัก
   * @param {object} result - ผลลัพธ์การเล่น
   * @param {string} slipName - ชื่อบั้งไฟ
   * @returns {object} ผลการอัปเดต
   */
  async updateBalancesForResult(result, slipName) {
    try {
      const { winner, loser, isDraw } = result;

      const updates = [];

      // อัปเดตยอดเงินผู้ชนะ (ใช้ displayName)
      if (winner && winner.displayName) {
        const winnerUpdate = await this.updateBalance(
          winner.displayName,
          winner.netAmount,
          isDraw ? 'DRAW' : 'WIN',
          slipName
        );
        updates.push({
          player: 'winner',
          ...winnerUpdate,
        });
      }

      // อัปเดตยอดเงินผู้แพ้ (ใช้ displayName)
      if (loser && loser.displayName) {
        const loserUpdate = await this.updateBalance(
          loser.displayName,
          loser.netAmount,
          isDraw ? 'DRAW' : 'LOSE',
          slipName
        );
        updates.push({
          player: 'loser',
          ...loserUpdate,
        });
      }

      return {
        success: updates.every((u) => u.success),
        updates,
      };
    } catch (error) {
      console.error('Error updating balances for result:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * ดึงยอดเงินปัจจุบันของผู้เล่น
   * ใช้ DisplayName (ชื่อ LINE) เป็นหลัก
   * @private
   */
  async getUserBalance(displayName) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.usersBalanceSheetName}!A:C`,
      });

      const values = response.data.values || [];

      // ค้นหาจาก DisplayName (Column B)
      for (let i = 1; i < values.length; i++) {
        if (values[i] && values[i][1] === displayName) {
          return parseInt(values[i][2]) || 0;
        }
      }

      return 0;
    } catch (error) {
      console.error('Error getting user balance:', error);
      return 0;
    }
  }

  /**
   * อัปเดตยอดเงินในชีท UsersBalance
   * ใช้ DisplayName (ชื่อ LINE) เป็นหลัก
   * @private
   */
  async updateUserBalanceInSheet(displayName, newBalance) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.usersBalanceSheetName}!A:C`,
      });

      const values = response.data.values || [];
      let rowIndex = -1;

      // ค้นหาแถวของผู้เล่นจาก DisplayName (Column B)
      for (let i = 1; i < values.length; i++) {
        if (values[i] && values[i][1] === displayName) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex === -1) {
        return {
          success: false,
          error: `ไม่พบผู้เล่น ${displayName}`,
        };
      }

      // อัปเดตยอดเงิน (Column C)
      const range = `${this.usersBalanceSheetName}!C${rowIndex + 1}`;
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[newBalance]],
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating user balance in sheet:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * บันทึกธุรกรรม
   * ใช้ DisplayName (ชื่อ LINE) เป็นหลัก
   * @private
   */
  async recordTransaction(
    displayName,
    amount,
    transactionType,
    previousBalance,
    newBalance,
    slipName
  ) {
    try {
      const row = [
        new Date().toISOString(), // Timestamp
        displayName, // Player Name (DisplayName)
        transactionType, // Transaction Type
        amount, // Amount
        previousBalance, // Previous Balance
        newBalance, // New Balance
        slipName || '', // Slip Name
      ];

      // เพิ่มแถวใหม่ในชีท Transactions
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.transactionsSheetName}!A:G`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [row],
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error recording transaction:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * ดึงข้อมูลยอดเงินทั้งหมด
   * ใช้ DisplayName (ชื่อ LINE) เป็นหลัก
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
            displayName: values[i][1], // ชื่อ LINE (DisplayName)
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
   * สร้างรายงานการอัปเดตยอดเงิน
   * ใช้ DisplayName (ชื่อ LINE) เป็นหลัก
   * @param {object} updateResult - ผลการอัปเดต
   * @returns {string} รายงาน
   */
  buildBalanceUpdateReport(updateResult) {
    let report = '💰 รายงานการอัปเดตยอดเงิน\n';
    report += '='.repeat(50) + '\n\n';

    if (updateResult.success) {
      report += '✅ อัปเดตสำเร็จ\n\n';

      updateResult.updates.forEach((update) => {
        report += `${update.player === 'winner' ? '🏆' : '❌'} ${update.displayName}\n`;
        report += `   ยอดเงินเดิม: ${update.previousBalance} บาท\n`;
        report += `   เปลี่ยนแปลง: ${update.amount > 0 ? '+' : ''}${update.amount} บาท\n`;
        report += `   ยอดเงินใหม่: ${update.newBalance} บาท\n`;
        report += `   ประเภท: ${update.transactionType}\n\n`;
      });
    } else {
      report += '❌ อัปเดตไม่สำเร็จ\n\n';
      report += `ข้อผิดพลาด: ${updateResult.error}\n`;
    }

    report += '='.repeat(50);

    return report;
  }
}

module.exports = new BalanceUpdateService();
