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

      // Build payload object
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

      // Append payload as JSON string
      form.append('payload', JSON.stringify(payload));

      console.log(`   📤 Sending request to Slip2Go API...`);
      console.log(`   URL: ${this.apiUrl}`);
      console.log(`   Payload:`, JSON.stringify(payload, null, 2));

      const response = await axios.post(
        `${this.apiUrl}`,
        form,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
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
    // Code 200000 = สลิปถูกต้อง (ไม่ได้ตรวจสอบเงื่อนไข)
    // Code 200200 = สลิปถูกต้อง + บัญชีตรงกัน
    // Code 200100 = สลิปซ้ำ
    // Code 200300 = บัญชีไม่ตรงกัน
    // Code 200400 = จำนวนเงินไม่ตรงกัน
    
    return response?.code === '200000' || response?.code === '200200' || response?.success === true;
  }

  /**
   * ตรวจสอบว่าสลิปซ้ำหรือไม่
   * @param {Object} response - Response จาก Slip2Go API
   * @returns {boolean}
   */
  isDuplicate(response) {
    // Code 200100 = สลิปซ้ำ
    if (response?.code === '200100') {
      console.log(`⚠️  Duplicate slip detected (Code: 200100)`);
      return true;
    }

    // ตรวจสอบจาก error message
    if (response?.message && response.message.toLowerCase().includes('duplicate')) {
      console.log(`⚠️  Duplicate slip detected`);
      return true;
    }

    return false;
  }

  /**
   * ตรวจสอบว่าบัญชีตรงกันหรือไม่
   * @param {Object} response - Response จาก Slip2Go API
   * @returns {boolean}
   */
  isReceiverMatched(response) {
    // Code 200200 = สลิปถูกต้อง + บัญชีตรงกัน
    if (response?.code === '200200') {
      console.log(`✅ Receiver account matched (Code: 200200)`);
      return true;
    }

    // Code 200401 = บัญชีไม่ตรงกัน
    if (response?.code === '200401' || response?.code === '200300') {
      console.log(`❌ Receiver account not matched (Code: ${response?.code})`);
      return false;
    }

    // Code 200000 = สลิปถูกต้อง แต่ไม่ได้ตรวจสอบบัญชี (ถือว่าผ่าน)
    if (response?.code === '200000') {
      console.log(`⚠️  Receiver account not checked (Code: 200000)`);
      return true;
    }

    // Code อื่นๆ (เช่น 200500 fraud, 200501 duplicate) ไม่เกี่ยวกับบัญชี → ข้ามไป
    return true;
  }

  /**
   * ตรวจสอบว่าชื่อผู้รับตรงกันหรือไม่
   * @param {Object} response - Response จาก Slip2Go API
   * @returns {boolean}
   */
  isReceiverNameMatched(response) {
    // ตรวจสอบว่ามีข้อมูลชื่อผู้รับ
    if (!response?.data?.receiver?.account?.name) {
      console.log(`⚠️  Receiver name not found`);
      return false;
    }

    console.log(`✅ Receiver name found: ${response.data.receiver.account.name}`);
    return true;
  }

  /**
   * ดึงข้อความแสดงเหตุผลการตรวจสอบ
   * @param {Object} response - Response จาก Slip2Go API
   * @returns {string}
   */
  getValidationMessage(response) {
    const code = response?.code;
    const message = response?.message || 'ไม่ทราบเหตุผล';

    switch (code) {
      case '200000':
        return '✅ สลิปถูกต้อง (ไม่ได้ตรวจสอบเงื่อนไข)';
      case '200200':
        return '✅ สลิปถูกต้อง + บัญชีตรงกัน';
      case '200100':
        return '❌ สลิปซ้ำ';
      case '200300':
        return '❌ บัญชีไม่ตรงกัน';
      case '200400':
        return '❌ จำนวนเงินไม่ตรงกัน';
      default:
        return `❌ ${message}`;
    }
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
    const code = response?.code;

    // ✅ สลิปถูกต้อง
    if (code === '200000' || code === '200200') {
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
    }

    // ❌ สลิปซ้ำ
    if (code === '200100') {
      return `❌ ตรวจสอบสลิปไม่สำเร็จ\n\n` +
        `🚫 เหตุผล: สลิปซ้ำ (เคยบันทึกไปแล้ว)\n\n` +
        `📸 กรุณาส่งสลิปใหม่`;
    }

    // ❌ บัญชีไม่ตรงกัน
    if (code === '200300') {
      return `❌ ตรวจสอบสลิปไม่สำเร็จ\n\n` +
        `🚫 เหตุผล: บัญชีผู้รับไม่ตรงกัน\n\n` +
        `📸 กรุณาส่งสลิปใหม่`;
    }

    // ❌ ข้อผิดพลาดอื่น ๆ
    const message = response?.message || 'ไม่ทราบเหตุผล';
    return `❌ ตรวจสอบสลิปไม่สำเร็จ\n\n` +
      `🚫 เหตุผล: ${message}\n\n` +
      `📸 กรุณาส่งสลิปใหม่`;
  }
}

module.exports = Slip2GoImageVerificationService;
