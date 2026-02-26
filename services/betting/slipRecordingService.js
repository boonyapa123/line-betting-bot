const { google } = require('googleapis');

/**
 * ระบบบันทึกข้อมูลสลิปลง Google Sheets
 */
class SlipRecordingService {
  constructor(googleAuth, googleSheetId, worksheetName = 'Slip Verification') {
    this.googleAuth = googleAuth;
    this.googleSheetId = googleSheetId;
    this.worksheetName = worksheetName;
    this.sheets = google.sheets({ version: 'v4', auth: googleAuth });
  }

  /**
   * บันทึกข้อมูลสลิปลง Google Sheets
   * @param {Object} slipData - ข้อมูลสลิป
   * @returns {Promise<Object>} ผลการบันทึก
   */
  async recordSlip(slipData) {
    try {
      console.log(`💾 บันทึกข้อมูลสลิป...`);

      // ตรวจสอบว่า Worksheet มีอยู่
      await this._ensureWorksheetExists();

      // เตรียมข้อมูลสำหรับบันทึก
      const row = this._prepareRowData(slipData);

      // บันทึกลง Google Sheets
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.googleSheetId,
        range: `${this.worksheetName}!A:L`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [row]
        }
      });

      console.log(`✅ บันทึกข้อมูลสำเร็จ`);
      return {
        success: true,
        updatedRange: response.data.updates.updatedRange,
        updatedRows: response.data.updates.updatedRows
      };
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * บันทึกข้อมูลสลิปหลายรายการ
   * @param {Array} slipsData - อาร์เรย์ของข้อมูลสลิป
   * @returns {Promise<Object>} ผลการบันทึก
   */
  async recordMultipleSlips(slipsData) {
    try {
      console.log(`💾 บันทึกข้อมูลสลิป ${slipsData.length} รายการ...`);

      // ตรวจสอบว่า Worksheet มีอยู่
      await this._ensureWorksheetExists();

      // เตรียมข้อมูลสำหรับบันทึก
      const rows = slipsData.map(slip => this._prepareRowData(slip));

      // บันทึกลง Google Sheets
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.googleSheetId,
        range: `${this.worksheetName}!A:L`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: rows
        }
      });

      console.log(`✅ บันทึกข้อมูลสำเร็จ ${response.data.updates.updatedRows} แถว`);
      return {
        success: true,
        updatedRange: response.data.updates.updatedRange,
        updatedRows: response.data.updates.updatedRows
      };
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * ดึงข้อมูลสลิปทั้งหมด
   * @returns {Promise<Array>} ข้อมูลสลิป
   */
  async getAllSlips() {
    try {
      console.log(`📖 ดึงข้อมูลสลิปทั้งหมด...`);

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.googleSheetId,
        range: `${this.worksheetName}!A:L`
      });

      const rows = response.data.values || [];
      const headers = rows[0] || [];
      const data = rows.slice(1).map(row => this._rowToObject(headers, row));

      console.log(`✅ ดึงข้อมูล ${data.length} รายการ`);
      return data;
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      return [];
    }
  }

  /**
   * ค้นหาข้อมูลสลิปตามเงื่อนไข
   * @param {string} field - ชื่อ field
   * @param {string} value - ค่าที่ต้องการค้นหา
   * @returns {Promise<Array>} ข้อมูลสลิป
   */
  async searchSlips(field, value) {
    try {
      console.log(`🔍 ค้นหาข้อมูลสลิป: ${field} = ${value}`);

      const allSlips = await this.getAllSlips();
      const results = allSlips.filter(slip => slip[field] === value);

      console.log(`✅ พบ ${results.length} รายการ`);
      return results;
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      return [];
    }
  }

  /**
   * ตรวจสอบว่าสลิปซ้ำหรือไม่
   * @param {string} referenceId - Reference ID ของสลิป
   * @returns {Promise<boolean>} true ถ้าซ้ำ
   */
  async isSlipDuplicate(referenceId) {
    try {
      console.log(`🔍 ตรวจสอบสลิปซ้ำ: ${referenceId}`);

      const results = await this.searchSlips('referenceId', referenceId);
      const isDuplicate = results.length > 0;

      if (isDuplicate) {
        console.log(`⚠️  สลิปซ้ำ - พบ ${results.length} รายการ`);
      } else {
        console.log(`✅ สลิปไม่ซ้ำ`);
      }

      return isDuplicate;
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      return false;
    }
  }

  /**
   * เตรียมข้อมูลแถวสำหรับบันทึก
   * @private
   */
  _prepareRowData(slipData) {
    const now = new Date();
    const dateTime = now.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return [
      dateTime,                                    // A: วันที่บันทึก
      slipData.referenceId || '',                 // B: Reference ID
      slipData.transRef || '',                    // C: Transaction Reference
      slipData.amount || 0,                       // D: จำนวนเงิน
      slipData.dateTime || '',                    // E: วันที่โอน
      slipData.senderName || '',                  // F: ชื่อผู้ส่ง
      slipData.senderAccount || '',               // G: บัญชีผู้ส่ง
      slipData.senderBank || '',                  // H: ธนาคารผู้ส่ง
      slipData.receiverName || '',                // I: ชื่อผู้รับ
      slipData.receiverAccount || '',             // J: บัญชีผู้รับ
      slipData.receiverBank || '',                // K: ธนาคารผู้รับ
      slipData.status || 'verified'               // L: สถานะ
    ];
  }

  /**
   * แปลงแถวเป็น Object
   * @private
   */
  _rowToObject(headers, row) {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  }

  /**
   * ตรวจสอบและสร้าง Worksheet ถ้าไม่มี
   * @private
   */
  async _ensureWorksheetExists() {
    try {
      // ดึงข้อมูล Spreadsheet
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.googleSheetId
      });

      // ตรวจสอบว่า Worksheet มีอยู่
      const worksheetExists = spreadsheet.data.sheets.some(
        sheet => sheet.properties.title === this.worksheetName
      );

      if (!worksheetExists) {
        console.log(`📝 สร้าง Worksheet: ${this.worksheetName}`);
        
        // สร้าง Worksheet ใหม่
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.googleSheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: this.worksheetName
                  }
                }
              }
            ]
          }
        });

        // เพิ่ม Header
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.googleSheetId,
          range: `${this.worksheetName}!A1:L1`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [[
              'วันที่บันทึก',
              'Reference ID',
              'Transaction Ref',
              'จำนวนเงิน',
              'วันที่โอน',
              'ชื่อผู้ส่ง',
              'บัญชีผู้ส่ง',
              'ธนาคารผู้ส่ง',
              'ชื่อผู้รับ',
              'บัญชีผู้รับ',
              'ธนาคารผู้รับ',
              'สถานะ'
            ]]
          }
        });

        console.log(`✅ สร้าง Worksheet สำเร็จ`);
      }
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      throw error;
    }
  }
}

module.exports = SlipRecordingService;
