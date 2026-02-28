const https = require('https');
const FormData = require('form-data');

/**
 * Service สำหรับตรวจสอบสลิปจากรูปภาพโดยตรงกับ Slip2Go API
 */
class Slip2GoImageVerificationService {
  constructor(slip2GoSecretKey, slip2GoApiUrl = 'https://api.slip2go.com') {
    this.secretKey = slip2GoSecretKey;
    this.apiUrl = slip2GoApiUrl;
  }

  /**
   * ตรวจสอบสลิปจากรูปภาพ
   * @param {Buffer} imageBuffer - รูปภาพสลิป
   * @param {Object} checkCondition - เงื่อนไขการตรวจสอบ
   * @returns {Promise<Object>} ผลลัพธ์การตรวจสอบ
   */
  async verifySlipFromImage(imageBuffer, checkCondition = {}) {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔍 Verifying slip with Slip2Go API...`);
        
        const form = new FormData();
        
        // Add image file
        form.append('file', imageBuffer, {
          filename: 'slip.jpg',
          contentType: 'image/jpeg'
        });

        // Add payload with check conditions
        const payload = {
          checkDuplicate: checkCondition.checkDuplicate !== false,
          checkReceiver: checkCondition.checkReceiver || [],
          checkAmount: checkCondition.checkAmount || undefined,
          checkDate: checkCondition.checkDate || undefined
        };

        // Remove undefined fields
        Object.keys(payload).forEach(key => {
          if (payload[key] === undefined) {
            delete payload[key];
          }
        });

        form.append('payload', JSON.stringify(payload));

        const options = {
          hostname: 'api.slip2go.com',
          path: '/api/verify-slip/qr-image/info',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            ...form.getHeaders()
          }
        };

        console.log(`   📤 Sending request to Slip2Go API...`);
        console.log(`   Payload:`, payload);

        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', chunk => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              console.log(`   ✅ Response received:`, response);
              resolve(response);
            } catch (error) {
              console.error(`   ❌ Failed to parse response:`, error.message);
              reject(new Error(`Failed to parse Slip2Go response: ${error.message}`));
            }
          });
        });

        req.on('error', (error) => {
          console.error(`   ❌ Request error:`, error.message);
          reject(error);
        });

        form.pipe(req);
      } catch (error) {
        console.error(`   ❌ Error:`, error.message);
        reject(error);
      }
    });
  }

  /**
   * ตรวจสอบว่าสลิปตรวจสอบสำเร็จหรือไม่
   * @param {Object} response - Response จาก Slip2Go API
   * @returns {boolean}
   */
  isVerified(response) {
    return response?.code === '200000' || response?.code === '200200';
  }

  /**
   * สกัดข้อมูลสลิปจาก response
   * @param {Object} response - Response จาก Slip2Go API
   * @returns {Object} ข้อมูลสลิป
   */
  extractSlipData(response) {
    if (!response?.data) {
      return null;
    }

    const data = response.data;
    return {
      referenceId: data.referenceId,
      transRef: data.transRef,
      amount: data.amount,
      dateTime: data.dateTime,
      senderName: data.sender?.account?.name,
      senderAccount: data.sender?.account?.bank?.account,
      senderBank: data.sender?.bank?.name,
      receiverName: data.receiver?.account?.name,
      receiverAccount: data.receiver?.account?.bank?.account,
      receiverBank: data.receiver?.bank?.name,
      status: 'verified'
    };
  }

  /**
   * สร้างข้อความตอบกลับสำหรับ LINE
   * @param {Object} response - Response จาก Slip2Go API
   * @returns {string} ข้อความตอบกลับ
   */
  createLineMessage(response) {
    if (this.isVerified(response)) {
      const data = response.data;
      return `✅ ได้รับยอดเงินแล้ว\n\n` +
        `📊 รายละเอียดสลิป:\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💰 จำนวนเงิน: ${data.amount} บาท\n` +
        `👤 ผู้ส่ง: ${data.sender?.account?.name}\n` +
        `👥 ผู้รับ: ${data.receiver?.account?.name}\n` +
        `📅 วันที่: ${new Date(data.dateTime).toLocaleString('th-TH')}\n` +
        `🔖 เลขอ้างอิง: ${data.transRef}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `ขอบคุณที่ใช้บริการ 🙏`;
    } else {
      const message = response?.message || 'ไม่ทราบเหตุผล';
      return `❌ ตรวจสอบสลิปไม่สำเร็จ\n\n` +
        `เหตุผล: ${message}\n\n` +
        `📸 กรุณาส่งสลิปใหม่`;
    }
  }
}

module.exports = Slip2GoImageVerificationService;
