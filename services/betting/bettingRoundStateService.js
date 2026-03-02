/**
 * BettingRoundStateService
 * จัดการสถานะรอบการเล่น (OPEN/CLOSED/CALCULATING)
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class BettingRoundStateService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.stateSheetName = 'RoundState';
    this.currentState = 'CLOSED'; // Default state
    this.currentRound = null;
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
      await this.loadCurrentState();
    } catch (error) {
      console.error('Error initializing BettingRoundStateService:', error);
      throw error;
    }
  }

  /**
   * โหลดสถานะปัจจุบันจาก Google Sheets
   */
  async loadCurrentState() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.stateSheetName}!A1:D1`,
      });

      const values = response.data.values;
      if (values && values[0]) {
        this.currentState = values[0][0] || 'CLOSED';
        this.currentRound = {
          roundId: values[0][1],
          startTime: values[0][2],
          slipName: values[0][3],
        };
      }
    } catch (error) {
      console.error('Error loading current state:', error);
    }
  }

  /**
   * เปิดรอบการเล่น (OPEN)
   * @param {string} slipName - ชื่อบั้งไฟ
   * @returns {object} ผลลัพธ์
   */
  async openRound(slipName) {
    try {
      const roundId = `ROUND_${Date.now()}`;
      const startTime = new Date().toISOString();

      this.currentState = 'OPEN';
      this.currentRound = { roundId, startTime, slipName };

      // บันทึกลง Google Sheets
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.stateSheetName}!A1:D1`,
        valueInputOption: 'RAW',
        resource: {
          values: [[this.currentState, roundId, startTime, slipName]],
        },
      });

      return {
        success: true,
        message: `เปิดรอบการเล่น: ${slipName}`,
        state: this.currentState,
        roundId,
      };
    } catch (error) {
      console.error('Error opening round:', error);
      return { success: false, message: 'เกิดข้อผิดพลาดในการเปิดรอบ' };
    }
  }

  /**
   * ปิดรอบการเล่น (CLOSED)
   * @returns {object} ผลลัพธ์
   */
  async closeRound() {
    try {
      this.currentState = 'CLOSED';

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.stateSheetName}!A1`,
        valueInputOption: 'RAW',
        resource: {
          values: [[this.currentState]],
        },
      });

      return {
        success: true,
        message: 'รอบนี้ปิดการทายแล้วคะ/ครับ',
        state: this.currentState,
      };
    } catch (error) {
      console.error('Error closing round:', error);
      return { success: false, message: 'เกิดข้อผิดพลาดในการปิดรอบ' };
    }
  }

  /**
   * เปลี่ยนสถานะเป็น CALCULATING
   * @returns {object} ผลลัพธ์
   */
  async startCalculating() {
    try {
      this.currentState = 'CALCULATING';

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.stateSheetName}!A1`,
        valueInputOption: 'RAW',
        resource: {
          values: [[this.currentState]],
        },
      });

      return {
        success: true,
        message: 'เริ่มประมวลผลผลลัพธ์',
        state: this.currentState,
      };
    } catch (error) {
      console.error('Error starting calculation:', error);
      return { success: false, message: 'เกิดข้อผิดพลาดในการประมวลผล' };
    }
  }

  /**
   * ตรวจสอบสถานะปัจจุบัน
   * @returns {string} สถานะ (OPEN/CLOSED/CALCULATING)
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * ตรวจสอบว่าสามารถรับการเล่นได้หรือไม่
   * @returns {boolean}
   */
  canAcceptBets() {
    return this.currentState === 'OPEN';
  }

  /**
   * ดึงข้อมูลรอบปัจจุบัน
   * @returns {object}
   */
  getCurrentRound() {
    return this.currentRound;
  }
}

module.exports = new BettingRoundStateService();
