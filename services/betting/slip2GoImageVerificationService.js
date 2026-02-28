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
    try {
      const axios = require('axios');
      
      console.log(`🔍 Verifying slip with Slip2Go API...`);
      
      const form = new FormData();
      
      // Add image file
      form.append('file', imageBuffer, {
        filename: 'slip.jpg',
        contentType: 'image/jpeg'
      });

      // Add form fields (not JSON payload)
      form.append('checkDuplicate', checkCondition.checkDuplicate !== false ? 'true' : 'false');

      // Add checkReceiver if provided
      if (checkCondition.checkReceiver && checkCondition.checkReceiver.length > 0) {
        form.append('checkReceiver', JSON.stringify(checkCondition.checkReceiver));
      }

      // Add checkAmount if provided
      if (checkCondition.checkAmount) {
        form.append('checkAmount', JSON.stringify(checkCondition.checkAmount));
      }

      // Add checkDate if provided
      if (checkCondition.checkDate) {
        form.append('checkDate', JSON.stringify(checkCondition.checkDate));
      }

      const payload = {
        checkDuplicate: checkCondition.checkDuplicate !== false
      };
      if (checkCondition.checkReceiver && checkCondition.checkReceiver.length > 0) {
        payload.checkReceiver = checkCondition.checkReceiver;
      }
      if (checkCondition.checkAmount) {
        payload.checkAmount = checkCondition.checkAmount;
      }
      if (checkCondition.checkDate) {
        payload.checkDate = checkCondition.checkDate;
      }

      console.log(`   📤 Sending request to Slip2Go API...`);
      console.log(`   URL: ${this.apiUrl}/api/slip/verify`);
      console.log(`   Payload:`, JSON.stringify(payload, null, 2));

      const response = await axios.post(
        `${this.apiUrl}/api/slip/verify`,
        form,
        {
          headers: {
            ...form.getHeaders()
          }
        }
      );

      console.log(`   ✅ Response received:`, JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data:`, error.response.data);
      }
      throw error;
    }
  }

  /**
   * ตรวจสอบว่าสลิปตรวจสอบสำเร็จหรือไม่
   * @param {Object} response - Response จาก Slip2Go API
   * @returns {boolean}
   */
  isVerified(response) {
    return response?.code === '200000' || response?.code === '200200' || response?.success === true;
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
