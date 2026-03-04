/**
 * SheetsColumnValidator
 * ตรวจสอบและแก้ไขคอลัมน์ใน Google Sheets
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class SheetsColumnValidator {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
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
      console.error('Error initializing SheetsColumnValidator:', error);
      throw error;
    }
  }

  /**
   * ตรวจสอบคอลัมน์ใน Bets Sheet
   */
  async validateBetsSheetColumns() {
    try {
      console.log('\n📋 ตรวจสอบคอลัมน์ใน Bets Sheet...\n');

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Bets!A1:T1',
      });

      const headers = response.data.values?.[0] || [];

      console.log('คอลัมน์ปัจจุบัน:');
      headers.forEach((header, index) => {
        const column = String.fromCharCode(65 + index);
        console.log(`  ${column}: ${header}`);
      });

      // ตรวจสอบคอลัมน์ที่ถูกต้อง (ตามคอลัมน์จริงในชีท)
      const expectedColumns = {
        A: 'วันเวลา',
        B: 'ID ผู้เล่น A',
        C: 'ชื่อผู้เล่น A',
        D: 'ข้อความ',
        E: 'ชื่อบั้งไฟ',
        F: 'ฝั่ง A',
        G: 'เงิน A',
        H: 'เงิน B',
        I: 'ผลลัพธ์',
        J: 'ผู้ชนะ',
        K: 'ID ผู้เล่น B',
        L: 'ชื่อผู้เล่น B',
        M: 'ฝั่ง B',
        N: 'ฝั่ง A (รหัส)',
        O: 'ชื่อกลุ่ม',
        P: 'Token A',
        Q: 'ID กลุ่ม',
        R: 'Token B',
        S: 'ผลลัพธ์ A',
        T: 'ผลลัพธ์ B',
      };

      console.log('\n✅ คอลัมน์ที่ควรมี:');
      Object.entries(expectedColumns).forEach(([col, name]) => {
        console.log(`  ${col}: ${name}`);
      });

      // ตรวจสอบความผิดพลาด
      const errors = [];
      Object.entries(expectedColumns).forEach(([col, expectedName], index) => {
        const actualName = headers[index];
        if (actualName !== expectedName) {
          errors.push({
            column: col,
            expected: expectedName,
            actual: actualName || '(ว่างเปล่า)',
          });
        }
      });

      if (errors.length > 0) {
        console.log('\n❌ พบข้อผิดพลาด:');
        errors.forEach((error) => {
          console.log(`  ${error.column}: ควรเป็น "${error.expected}" แต่เป็น "${error.actual}"`);
        });
        return { valid: false, errors };
      } else {
        console.log('\n✅ คอลัมน์ถูกต้องทั้งหมด');
        return { valid: true, errors: [] };
      }
    } catch (error) {
      console.error('Error validating Bets sheet columns:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * ตรวจสอบคอลัมน์ใน UsersBalance Sheet
   */
  async validateUsersBalanceSheetColumns() {
    try {
      console.log('\n💰 ตรวจสอบคอลัมน์ใน UsersBalance Sheet...\n');

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'UsersBalance!A1:C1',
      });

      const headers = response.data.values?.[0] || [];

      console.log('คอลัมน์ปัจจุบัน:');
      headers.forEach((header, index) => {
        const column = String.fromCharCode(65 + index);
        console.log(`  ${column}: ${header}`);
      });

      const expectedColumns = {
        A: 'User ID',
        B: 'Display Name',
        C: 'Balance',
      };

      console.log('\n✅ คอลัมน์ที่ควรมี:');
      Object.entries(expectedColumns).forEach(([col, name]) => {
        console.log(`  ${col}: ${name}`);
      });

      const errors = [];
      Object.entries(expectedColumns).forEach(([col, expectedName], index) => {
        const actualName = headers[index];
        if (actualName !== expectedName) {
          errors.push({
            column: col,
            expected: expectedName,
            actual: actualName || '(ว่างเปล่า)',
          });
        }
      });

      if (errors.length > 0) {
        console.log('\n❌ พบข้อผิดพลาด:');
        errors.forEach((error) => {
          console.log(`  ${error.column}: ควรเป็น "${error.expected}" แต่เป็น "${error.actual}"`);
        });
        return { valid: false, errors };
      } else {
        console.log('\n✅ คอลัมน์ถูกต้องทั้งหมด');
        return { valid: true, errors: [] };
      }
    } catch (error) {
      console.error('Error validating UsersBalance sheet columns:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * ตรวจสอบคอลัมน์ใน Transactions Sheet
   */
  async validateTransactionsSheetColumns() {
    try {
      console.log('\n📝 ตรวจสอบคอลัมน์ใน Transactions Sheet...\n');

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Transactions!A1:G1',
      });

      const headers = response.data.values?.[0] || [];

      console.log('คอลัมน์ปัจจุบัน:');
      headers.forEach((header, index) => {
        const column = String.fromCharCode(65 + index);
        console.log(`  ${column}: ${header}`);
      });

      const expectedColumns = {
        A: 'Timestamp',
        B: 'Player Name',
        C: 'Transaction Type',
        D: 'Amount',
        E: 'Previous Balance',
        F: 'New Balance',
        G: 'Slip Name',
      };

      console.log('\n✅ คอลัมน์ที่ควรมี:');
      Object.entries(expectedColumns).forEach(([col, name]) => {
        console.log(`  ${col}: ${name}`);
      });

      const errors = [];
      Object.entries(expectedColumns).forEach(([col, expectedName], index) => {
        const actualName = headers[index];
        if (actualName !== expectedName) {
          errors.push({
            column: col,
            expected: expectedName,
            actual: actualName || '(ว่างเปล่า)',
          });
        }
      });

      if (errors.length > 0) {
        console.log('\n❌ พบข้อผิดพลาด:');
        errors.forEach((error) => {
          console.log(`  ${error.column}: ควรเป็น "${error.expected}" แต่เป็น "${error.actual}"`);
        });
        return { valid: false, errors };
      } else {
        console.log('\n✅ คอลัมน์ถูกต้องทั้งหมด');
        return { valid: true, errors: [] };
      }
    } catch (error) {
      console.error('Error validating Transactions sheet columns:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * แก้ไขคอลัมน์ใน Bets Sheet
   */
  async fixBetsSheetColumns() {
    try {
      console.log('\n🔧 แก้ไขคอลัมน์ใน Bets Sheet...\n');

      const headers = [
        'วันเวลา',
        'ID ผู้เล่น A',
        'ชื่อผู้เล่น A',
        'ข้อความ',
        'ชื่อบั้งไฟ',
        'ฝั่ง A',
        'เงิน A',
        'เงิน B',
        'ผลลัพธ์',
        'ผู้ชนะ',
        'ID ผู้เล่น B',
        'ชื่อผู้เล่น B',
        'ฝั่ง B',
        'ฝั่ง A (รหัส)',
        'ชื่อกลุ่ม',
        'Token A',
        'ID กลุ่ม',
        'Token B',
        'ผลลัพธ์ A',
        'ผลลัพธ์ B',
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Bets!A1:R1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers],
        },
      });

      console.log('✅ แก้ไขคอลัมน์สำเร็จ');
      return { success: true };
    } catch (error) {
      console.error('Error fixing Bets sheet columns:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * แก้ไขคอลัมน์ใน UsersBalance Sheet
   */
  async fixUsersBalanceSheetColumns() {
    try {
      console.log('\n🔧 แก้ไขคอลัมน์ใน UsersBalance Sheet...\n');

      const headers = ['User ID', 'Display Name', 'Balance'];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'UsersBalance!A1:C1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers],
        },
      });

      console.log('✅ แก้ไขคอลัมน์สำเร็จ');
      return { success: true };
    } catch (error) {
      console.error('Error fixing UsersBalance sheet columns:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * แก้ไขคอลัมน์ใน Transactions Sheet
   */
  async fixTransactionsSheetColumns() {
    try {
      console.log('\n🔧 แก้ไขคอลัมน์ใน Transactions Sheet...\n');

      const headers = [
        'Timestamp',
        'Player Name',
        'Transaction Type',
        'Amount',
        'Previous Balance',
        'New Balance',
        'Slip Name',
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Transactions!A1:G1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers],
        },
      });

      console.log('✅ แก้ไขคอลัมน์สำเร็จ');
      return { success: true };
    } catch (error) {
      console.error('Error fixing Transactions sheet columns:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ตรวจสอบและแก้ไขทั้งหมด
   */
  async validateAndFixAll() {
    try {
      console.log('================================================================================');
      console.log('ตรวจสอบและแก้ไขคอลัมน์ใน Google Sheets');
      console.log('================================================================================');

      // ตรวจสอบ Bets Sheet
      const betsValidation = await this.validateBetsSheetColumns();
      if (!betsValidation.valid) {
        console.log('\n🔧 กำลังแก้ไข Bets Sheet...');
        await this.fixBetsSheetColumns();
      }

      // ตรวจสอบ UsersBalance Sheet
      const usersBalanceValidation = await this.validateUsersBalanceSheetColumns();
      if (!usersBalanceValidation.valid) {
        console.log('\n🔧 กำลังแก้ไข UsersBalance Sheet...');
        await this.fixUsersBalanceSheetColumns();
      }

      // ตรวจสอบ Transactions Sheet
      const transactionsValidation = await this.validateTransactionsSheetColumns();
      if (!transactionsValidation.valid) {
        console.log('\n🔧 กำลังแก้ไข Transactions Sheet...');
        await this.fixTransactionsSheetColumns();
      }

      console.log('\n================================================================================');
      console.log('✅ ตรวจสอบและแก้ไขเสร็จสิ้น');
      console.log('================================================================================\n');

      return {
        success: true,
        bets: betsValidation,
        usersBalance: usersBalanceValidation,
        transactions: transactionsValidation,
      };
    } catch (error) {
      console.error('Error in validateAndFixAll:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SheetsColumnValidator();
