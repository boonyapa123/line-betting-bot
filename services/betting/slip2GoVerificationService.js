const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * ระบบตรวจสอบสลิปจาก Slip2Go API
 */
class Slip2GoVerificationService {
  constructor(slip2GoSecretKey, slip2GoApiUrl = 'https://api.slip2go.com') {
    this.secretKey = slip2GoSecretKey;
    this.apiUrl = slip2GoApiUrl;
  }

  /**
   * ตรวจสอบสลิปจากรูปภาพ
   * @param {string} imagePath - เส้นทางไฟล์รูปภาพสลิป
   * @param {Object} options - ตัวเลือกการตรวจสอบ
   * @returns {Promise<Object>} ผลการตรวจสอบ
   */
  async verifySlipFromImage(imagePath, options = {}) {
    try {
      console.log(`🔍 ตรวจสอบสลิป: ${imagePath}`);

      // ตรวจสอบว่าไฟล์มีอยู่
      if (!fs.existsSync(imagePath)) {
        throw new Error(`ไฟล์ไม่พบ: ${imagePath}`);
      }

      // อ่านไฟล์รูปภาพ
      const imageBuffer = fs.readFileSync(imagePath);
      const fileName = path.basename(imagePath);

      // สร้าง payload
      const payload = {
        checkDuplicate: options.checkDuplicate !== false,
        checkReceiver: options.checkReceiver || [],
        checkAmount: options.checkAmount || {},
        checkDate: options.checkDate || {},
      };

      // เรียก API
      const result = await this._callSlip2GoApi(imageBuffer, fileName, payload);

      if (result.code === '200000') {
        console.log(`✅ สลิปถูกต้อง`);
        return {
          success: true,
          data: result.data,
          message: result.message,
        };
      } else {
        console.log(`❌ สลิปไม่ถูกต้อง: ${result.message}`);
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
   * ตรวจสอบสลิปจาก URL
   * @param {string} imageUrl - URL ของรูปภาพสลิป
   * @param {Object} options - ตัวเลือกการตรวจสอบ
   * @returns {Promise<Object>} ผลการตรวจสอบ
   */
  async verifySlipFromUrl(imageUrl, options = {}) {
    try {
      console.log(`🔍 ตรวจสอบสลิปจาก URL: ${imageUrl}`);

      // ดาวน์โหลดรูปภาพ
      const imageBuffer = await this._downloadImage(imageUrl);

      // สร้าง payload
      const payload = {
        checkDuplicate: options.checkDuplicate !== false,
        checkReceiver: options.checkReceiver || [],
        checkAmount: options.checkAmount || {},
        checkDate: options.checkDate || {},
      };

      // เรียก API
      const result = await this._callSlip2GoApi(imageBuffer, 'slip.jpg', payload);

      if (result.code === '200000') {
        console.log(`✅ สลิปถูกต้อง`);
        return {
          success: true,
          data: result.data,
          message: result.message,
        };
      } else {
        console.log(`❌ สลิปไม่ถูกต้อง: ${result.message}`);
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
  async _callSlip2GoApi(imageBuffer, fileName, payload) {
    return new Promise((resolve, reject) => {
      const boundary = '----FormBoundary' + Date.now();
      
      // สร้าง multipart form data
      let body = '';
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
      body += `Content-Type: image/jpeg\r\n\r\n`;

      const bodyBuffer = Buffer.concat([
        Buffer.from(body),
        imageBuffer,
        Buffer.from(`\r\n--${boundary}\r\n`),
        Buffer.from(`Content-Disposition: form-data; name="payload"\r\n\r\n`),
        Buffer.from(JSON.stringify(payload)),
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const options = {
        hostname: 'api.slip2go.com',
        path: '/api/verify-slip/qr-image/info',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length,
        },
      };

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
      }).end(bodyBuffer);
    });
  }

  /**
   * ดาวน์โหลดรูปภาพจาก URL
   * @private
   */
  async _downloadImage(imageUrl) {
    return new Promise((resolve, reject) => {
      https.get(imageUrl, (res) => {
        let data = '';
        res.setEncoding('binary');
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve(Buffer.from(data, 'binary'));
        });
      }).on('error', (err) => {
        reject(err);
      });
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

module.exports = Slip2GoVerificationService;
