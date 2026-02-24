const https = require('https');

/**
 * ระบบตรวจสอบสลิปจาก QR Code โดยใช้ Slip2Go API
 */
class Slip2GoQRVerificationService {
  constructor(slip2GoSecretKey, slip2GoApiUrl = 'https://api.slip2go.com') {
    this.secretKey = slip2GoSecretKey;
    this.apiUrl = slip2GoApiUrl;
  }

  /**
   * ตรวจสอบสลิปจาก QR Code
   * @param {string} qrCode - QR Code จากสลิป
   * @param {Object} checkCondition - เงื่อนไขการตรวจสอบ
   * @returns {Promise<Object>} ผลการตรวจสอบ
   */
  async verifySlipFromQRCode(qrCode, checkCondition = {}) {
    try {
      console.log(`🔍 ตรวจสอบสลิปจาก QR Code`);
      console.log(`   QR Code: ${qrCode}`);

      const payload = {
        qrCode: qrCode,
        checkCondition: {
          checkDuplicate: checkCondition.checkDuplicate !== false,
          checkReceiver: checkCondition.checkReceiver || [],
          checkAmount: checkCondition.checkAmount || {},
          checkDate: checkCondition.checkDate || {},
        },
      };

      console.log(`   Payload:`, JSON.stringify(payload, null, 2));

      // เรียก API
      const result = await this._callSlip2GoApi(payload);

      console.log(`   Response:`, JSON.stringify(result, null, 2));

      if (result.code === '200200') {
        console.log(`✅ สลิปถูกต้อง`);
        return {
          success: true,
          data: result.data,
          message: result.message,
          code: result.code,
        };
      } else if (result.code === '200000') {
        console.log(`✅ พบสลิป`);
        return {
          success: true,
          data: result.data,
          message: result.message,
          code: result.code,
        };
      } else {
        console.log(`❌ สลิปไม่ถูกต้อง: ${result.message} (${result.code})`);
        return {
          success: false,
          message: result.message,
          code: result.code,
        };
      }
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * เรียก Slip2Go API
   * @private
   */
  async _callSlip2GoApi(payload) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({ payload });

      const options = {
        hostname: 'api.slip2go.com',
        path: '/api/verify-slip/qr-code/info',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      console.log(`   Calling API: ${options.hostname}${options.path}`);

      https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (error) {
            reject(new Error(`ไม่สามารถแปลง response: ${error.message}`));
          }
        });
      }).on('error', (err) => {
        reject(err);
      }).write(body);
    });
  }

  /**
   * ดึงข้อมูลจากสลิป
   * @param {Object} slipData - ข้อมูลสลิปจาก API
   * @returns {Object} ข้อมูลที่สำคัญ
   */
  extractSlipInfo(slipData) {
    if (!slipData || !slipData.data) {
      return null;
    }

    const data = slipData.data;
    return {
      referenceId: data.referenceId,
      amount: data.amount,
      dateTime: data.dateTime,
      transRef: data.transRef,
      receiver: {
        name: data.receiver?.account?.name,
        account: data.receiver?.account?.bank?.account,
        bank: data.receiver?.bank?.name,
      },
      sender: {
        name: data.sender?.account?.name,
        account: data.sender?.account?.bank?.account,
        bank: data.sender?.bank?.name,
      },
    };
  }
}

module.exports = Slip2GoQRVerificationService;
