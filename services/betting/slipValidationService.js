const { google } = require('googleapis');

/**
 * ระบบตรวจสอบสลิปแบบครอบคลุม
 * ตรวจสอบ: บัญชีตรงกันหรือไม่, สลิปซ้ำหรือไม่, สลิปปลอมหรือไม่
 */
class SlipValidationService {
  constructor(googleAuth, googleSheetId, worksheetName = 'Slip Verification') {
    this.googleAuth = googleAuth;
    this.googleSheetId = googleSheetId;
    this.worksheetName = worksheetName;
    this.sheets = google.sheets({ version: 'v4', auth: googleAuth });
  }

  /**
   * ตรวจสอบสลิปแบบครอบคลุม
   * @param {Object} slipData - ข้อมูลสลิปจาก Slip2Go API
   * @param {Object} options - ตัวเลือกการตรวจสอบ
   * @returns {Promise<Object>} ผลการตรวจสอบ
   */
  async validateSlip(slipData, options = {}) {
    try {
      console.log(`\n🔐 Starting comprehensive slip validation...`);
      
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        checks: {
          isDuplicate: false,
          isFake: false,
          isReceiverMatched: false,
          isAmountValid: false,
          isDateValid: false
        }
      };

      // 1. ตรวจสอบสลิปซ้ำ
      console.log(`\n1️⃣  Checking for duplicate slip...`);
      const duplicateCheck = await this._checkDuplicate(slipData);
      validationResult.checks.isDuplicate = duplicateCheck.isDuplicate;
      if (duplicateCheck.isDuplicate) {
        validationResult.isValid = false;
        validationResult.errors.push(`❌ สลิปซ้ำ: ${duplicateCheck.message}`);
        console.log(`   ❌ ${duplicateCheck.message}`);
      } else {
        console.log(`   ✅ ไม่ใช่สลิปซ้ำ`);
      }

      // 2. ตรวจสอบสลิปปลอม
      console.log(`\n2️⃣  Checking for fake slip...`);
      const fakeCheck = await this._checkFake(slipData);
      validationResult.checks.isFake = fakeCheck.isFake;
      if (fakeCheck.isFake) {
        validationResult.isValid = false;
        validationResult.errors.push(`❌ สลิปปลอม: ${fakeCheck.message}`);
        console.log(`   ❌ ${fakeCheck.message}`);
      } else {
        console.log(`   ✅ ไม่ใช่สลิปปลอม`);
      }

      // 3. ตรวจสอบบัญชีตรงกันหรือไม่
      if (options.expectedReceiverAccount) {
        console.log(`\n3️⃣  Checking receiver account...`);
        const receiverCheck = await this._checkReceiverAccount(
          slipData,
          options.expectedReceiverAccount
        );
        validationResult.checks.isReceiverMatched = receiverCheck.isMatched;
        if (!receiverCheck.isMatched) {
          validationResult.isValid = false;
          validationResult.errors.push(`❌ บัญชีไม่ตรงกัน: ${receiverCheck.message}`);
          console.log(`   ❌ ${receiverCheck.message}`);
        } else {
          console.log(`   ✅ บัญชีตรงกัน`);
        }
      }

      // 4. ตรวจสอบจำนวนเงิน
      if (options.expectedAmount) {
        console.log(`\n4️⃣  Checking amount...`);
        const amountCheck = await this._checkAmount(
          slipData,
          options.expectedAmount
        );
        validationResult.checks.isAmountValid = amountCheck.isValid;
        if (!amountCheck.isValid) {
          validationResult.warnings.push(`⚠️  จำนวนเงินไม่ตรงกัน: ${amountCheck.message}`);
          console.log(`   ⚠️  ${amountCheck.message}`);
        } else {
          console.log(`   ✅ จำนวนเงินตรงกัน`);
        }
      }

      // 5. ตรวจสอบวันที่
      if (options.expectedDate) {
        console.log(`\n5️⃣  Checking date...`);
        const dateCheck = await this._checkDate(
          slipData,
          options.expectedDate
        );
        validationResult.checks.isDateValid = dateCheck.isValid;
        if (!dateCheck.isValid) {
          validationResult.warnings.push(`⚠️  วันที่ไม่ตรงกัน: ${dateCheck.message}`);
          console.log(`   ⚠️  ${dateCheck.message}`);
        } else {
          console.log(`   ✅ วันที่ตรงกัน`);
        }
      }

      console.log(`\n📋 Validation Summary:`);
      console.log(`   Valid: ${validationResult.isValid}`);
      console.log(`   Errors: ${validationResult.errors.length}`);
      console.log(`   Warnings: ${validationResult.warnings.length}`);

      return validationResult;
    } catch (error) {
      console.error(`❌ Validation error: ${error.message}`);
      return {
        isValid: false,
        errors: [`ข้อผิดพลาดในการตรวจสอบ: ${error.message}`],
        warnings: [],
        checks: {}
      };
    }
  }

  /**
   * ตรวจสอบสลิปซ้ำ
   * @private
   */
  async _checkDuplicate(slipData) {
    try {
      const allSlips = await this._getAllSlips();
      
      // ค้นหาสลิปที่มี referenceId เดียวกัน
      const duplicates = allSlips.filter(slip => 
        slip['Reference ID'] === slipData.referenceId
      );

      if (duplicates.length > 0) {
        return {
          isDuplicate: true,
          message: `พบสลิปซ้ำ ${duplicates.length} รายการ (Reference ID: ${slipData.referenceId})`
        };
      }

      // ค้นหาสลิปที่มี transRef เดียวกัน
      const transRefDuplicates = allSlips.filter(slip => 
        slip['Transaction Ref'] === slipData.transRef
      );

      if (transRefDuplicates.length > 0) {
        return {
          isDuplicate: true,
          message: `พบสลิปซ้ำ ${transRefDuplicates.length} รายการ (Transaction Ref: ${slipData.transRef})`
        };
      }

      return {
        isDuplicate: false,
        message: 'ไม่พบสลิปซ้ำ'
      };
    } catch (error) {
      console.error(`❌ Error checking duplicate: ${error.message}`);
      return {
        isDuplicate: false,
        message: `ไม่สามารถตรวจสอบสลิปซ้ำ: ${error.message}`
      };
    }
  }

  /**
   * ตรวจสอบสลิปปลอม
   * @private
   */
  async _checkFake(slipData) {
    try {
      // ตรวจสอบข้อมูลพื้นฐาน
      if (!slipData.referenceId || !slipData.transRef) {
        return {
          isFake: true,
          message: 'ข้อมูลสลิปไม่สมบูรณ์ (ขาด Reference ID หรือ Transaction Ref)'
        };
      }

      if (!slipData.senderName || !slipData.receiverName) {
        return {
          isFake: true,
          message: 'ข้อมูลสลิปไม่สมบูรณ์ (ขาดชื่อผู้ส่งหรือผู้รับ)'
        };
      }

      if (!slipData.amount || slipData.amount <= 0) {
        return {
          isFake: true,
          message: 'จำนวนเงินไม่ถูกต้อง'
        };
      }

      if (!slipData.dateTime) {
        return {
          isFake: true,
          message: 'วันที่โอนไม่ถูกต้อง'
        };
      }

      // ตรวจสอบวันที่ (ไม่ควรเป็นวันในอนาคต)
      const slipDate = new Date(slipData.dateTime);
      const now = new Date();
      if (slipDate > now) {
        return {
          isFake: true,
          message: 'วันที่โอนเป็นวันในอนาคต'
        };
      }

      // ตรวจสอบว่าวันที่เก่าเกินไป (เกิน 30 วัน)
      const daysDiff = Math.floor((now - slipDate) / (1000 * 60 * 60 * 24));
      if (daysDiff > 30) {
        return {
          isFake: true,
          message: `วันที่โอนเก่าเกินไป (${daysDiff} วันที่แล้ว)`
        };
      }

      return {
        isFake: false,
        message: 'ไม่พบสัญญาณสลิปปลอม'
      };
    } catch (error) {
      console.error(`❌ Error checking fake: ${error.message}`);
      return {
        isFake: false,
        message: `ไม่สามารถตรวจสอบสลิปปลอม: ${error.message}`
      };
    }
  }

  /**
   * ตรวจสอบบัญชีตรงกันหรือไม่
   * @private
   */
  async _checkReceiverAccount(slipData, expectedAccount) {
    try {
      const actualAccount = slipData.receiverAccount;
      
      if (!actualAccount) {
        return {
          isMatched: false,
          message: 'ไม่พบข้อมูลบัญชีผู้รับ'
        };
      }

      // ทำให้เป็นตัวพิมพ์เดียวกันและลบช่องว่าง
      const normalizedActual = actualAccount.replace(/\s/g, '').toUpperCase();
      const normalizedExpected = expectedAccount.replace(/\s/g, '').toUpperCase();

      if (normalizedActual === normalizedExpected) {
        return {
          isMatched: true,
          message: `บัญชีตรงกัน (${actualAccount})`
        };
      }

      // ตรวจสอบเลขท้าย 4 หลัก
      const actualLast4 = normalizedActual.slice(-4);
      const expectedLast4 = normalizedExpected.slice(-4);

      if (actualLast4 === expectedLast4) {
        return {
          isMatched: true,
          message: `บัญชีตรงกัน (เลขท้าย 4 หลัก: ${actualLast4})`
        };
      }

      return {
        isMatched: false,
        message: `บัญชีไม่ตรงกัน (คาดหวัง: ${expectedAccount}, ได้รับ: ${actualAccount})`
      };
    } catch (error) {
      console.error(`❌ Error checking receiver account: ${error.message}`);
      return {
        isMatched: false,
        message: `ไม่สามารถตรวจสอบบัญชี: ${error.message}`
      };
    }
  }

  /**
   * ตรวจสอบจำนวนเงิน
   * @private
   */
  async _checkAmount(slipData, expectedAmount) {
    try {
      const actualAmount = slipData.amount;

      if (actualAmount === expectedAmount) {
        return {
          isValid: true,
          message: `จำนวนเงินตรงกัน (${actualAmount} บาท)`
        };
      }

      return {
        isValid: false,
        message: `จำนวนเงินไม่ตรงกัน (คาดหวัง: ${expectedAmount} บาท, ได้รับ: ${actualAmount} บาท)`
      };
    } catch (error) {
      console.error(`❌ Error checking amount: ${error.message}`);
      return {
        isValid: false,
        message: `ไม่สามารถตรวจสอบจำนวนเงิน: ${error.message}`
      };
    }
  }

  /**
   * ตรวจสอบวันที่
   * @private
   */
  async _checkDate(slipData, expectedDate) {
    try {
      const slipDate = new Date(slipData.dateTime);
      const expected = new Date(expectedDate);

      // ตรวจสอบวันที่เดียวกัน (ไม่สนใจเวลา)
      const slipDateOnly = new Date(slipDate.getFullYear(), slipDate.getMonth(), slipDate.getDate());
      const expectedDateOnly = new Date(expected.getFullYear(), expected.getMonth(), expected.getDate());

      if (slipDateOnly.getTime() === expectedDateOnly.getTime()) {
        return {
          isValid: true,
          message: `วันที่ตรงกัน (${slipData.dateTime})`
        };
      }

      return {
        isValid: false,
        message: `วันที่ไม่ตรงกัน (คาดหวัง: ${expectedDate}, ได้รับ: ${slipData.dateTime})`
      };
    } catch (error) {
      console.error(`❌ Error checking date: ${error.message}`);
      return {
        isValid: false,
        message: `ไม่สามารถตรวจสอบวันที่: ${error.message}`
      };
    }
  }

  /**
   * ดึงข้อมูลสลิปทั้งหมด
   * @private
   */
  async _getAllSlips() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.googleSheetId,
        range: `${this.worksheetName}!A:N`
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const data = rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      return data;
    } catch (error) {
      console.error(`❌ Error getting all slips: ${error.message}`);
      return [];
    }
  }
}

module.exports = SlipValidationService;
