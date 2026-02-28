const axios = require('axios');
const QRCodeScannerService = require('./qrCodeScannerService');
const Slip2GoQRVerificationService = require('./slip2GoQRVerificationService');
const Slip2GoVerificationService = require('./slip2GoVerificationService');

/**
 * ระบบตรวจสอบสลิปจาก LINE OA
 */
class LineSlipVerificationService {
  constructor(slip2GoSecretKey, slip2GoApiUrl = 'https://api.slip2go.com') {
    this.qrScanner = new QRCodeScannerService();
    this.qrVerifier = new Slip2GoQRVerificationService(slip2GoSecretKey, slip2GoApiUrl);
    this.imageVerifier = new Slip2GoVerificationService(slip2GoSecretKey, slip2GoApiUrl);
  }

  /**
   * ตรวจสอบสลิปจาก LINE Message (รูปภาพ)
   * @param {Buffer|string} imageData - Buffer ของรูปภาพหรือ URL
   * @param {Object} checkCondition - เงื่อนไขการตรวจสอบ
   * @returns {Promise<Object>} ผลการตรวจสอบ
   */
  async verifySlipFromLineImage(imageData, checkCondition = {}) {
    try {
      console.log(`🔍 ตรวจสอบสลิปจาก LINE Image`);

      // วิธีที่ 1: ลองสแกน QR Code จากรูปภาพ
      try {
        console.log(`   📸 พยายามสแกน QR Code จากรูปภาพ...`);
        const qrCode = Buffer.isBuffer(imageData) 
          ? await this.qrScanner.scanQRCodeFromBuffer(imageData)
          : await this.qrScanner.scanQRCodeFromUrl(imageData);
        
        console.log(`   ✅ พบ QR Code: ${qrCode}`);
        
        // ตรวจสอบสลิปจาก QR Code
        const result = await this.qrVerifier.verifySlipFromQRCode(qrCode, checkCondition);
        return result;
      } catch (qrError) {
        console.log(`   ⚠️  ไม่สามารถสแกน QR Code: ${qrError.message}`);
        console.log(`   📸 พยายามตรวจสอบจากรูปภาพโดยตรง...`);
        
        // วิธีที่ 2: ตรวจสอบจากรูปภาพโดยตรง
        const result = Buffer.isBuffer(imageData)
          ? await this.imageVerifier.verifySlipFromBuffer(imageData, checkCondition)
          : await this.imageVerifier.verifySlipFromUrl(imageData, checkCondition);
        return result;
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
   * ตรวจสอบสลิปจาก QR Code String
   * @param {string} qrCode - QR Code String
   * @param {Object} checkCondition - เงื่อนไขการตรวจสอบ
   * @returns {Promise<Object>} ผลการตรวจสอบ
   */
  async verifySlipFromQRCode(qrCode, checkCondition = {}) {
    try {
      console.log(`🔍 ตรวจสอบสลิปจาก QR Code`);
      const result = await this.qrVerifier.verifySlipFromQRCode(qrCode, checkCondition);
      return result;
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * สร้างข้อความตอบกลับสำหรับ LINE
   * @param {Object} verificationResult - ผลการตรวจสอบ
   * @returns {string} ข้อความตอบกลับ
   */
  createLineMessage(verificationResult) {
    if (!verificationResult.success) {
      return this._createErrorMessage(verificationResult.code, verificationResult.message);
    }

    const data = verificationResult.data;
    if (!data) {
      return '❌ ไม่สามารถดึงข้อมูลสลิปได้';
    }

    const amount = data.amount || 0;
    const senderName = data.sender?.account?.name || 'ไม่ทราบ';
    const receiverName = data.receiver?.account?.name || 'ไม่ทราบ';
    const dateTime = data.dateTime ? new Date(data.dateTime).toLocaleString('th-TH') : 'ไม่ทราบ';

    return `✅ ได้รับยอดเงินแล้ว

📊 รายละเอียดสลิป:
━━━━━━━━━━━━━━━━━━━━━━
💰 จำนวนเงิน: ${amount.toLocaleString('th-TH')} บาท
👤 ผู้ส่ง: ${senderName}
👥 ผู้รับ: ${receiverName}
📅 วันที่: ${dateTime}
🔖 เลขอ้างอิง: ${data.transRef || 'ไม่ทราบ'}
━━━━━━━━━━━━━━━━━━━━━━

ขอบคุณที่ใช้บริการ 🙏`;
  }

  /**
   * สร้างข้อความข้อผิดพลาด
   * @private
   */
  _createErrorMessage(code, message) {
    const errorMessages = {
      '200401': '❌ บัญชีผู้รับไม่ถูกต้อง\nโปรดโอนเข้าบัญชีบริษัทเท่านั้น',
      '200402': '❌ ยอดโอนเงินไม่ตรงเงื่อนไข\nกรุณาตรวจสอบจำนวนเงิน',
      '200403': '❌ วันที่โอนไม่ตรงเงื่อนไข\nกรุณาตรวจสอบวันที่',
      '200404': '❌ ไม่พบข้อมูลสลิปในระบบธนาคาร\nกรุณาตรวจสอบรูปภาพสลิป',
      '200500': '❌ สลิปเสีย/สลิปปลอม\nกรุณาส่งสลิปที่ถูกต้อง',
      '200501': '❌ สลิปซ้ำ\nสลิปนี้ถูกใช้ไปแล้ว',
    };

    return errorMessages[code] || `❌ ข้อผิดพลาด: ${message}`;
  }

  /**
   * ดึงข้อมูลสลิปที่สำคัญ
   * @param {Object} verificationResult - ผลการตรวจสอบ
   * @returns {Object} ข้อมูลสลิป
   */
  extractSlipData(verificationResult) {
    if (!verificationResult.success || !verificationResult.data) {
      return null;
    }

    const data = verificationResult.data;
    return {
      referenceId: data.referenceId,
      amount: data.amount,
      dateTime: data.dateTime,
      transRef: data.transRef,
      senderName: data.sender?.account?.name,
      senderAccount: data.sender?.account?.bank?.account,
      senderBank: data.sender?.bank?.name,
      receiverName: data.receiver?.account?.name,
      receiverAccount: data.receiver?.account?.bank?.account,
      receiverBank: data.receiver?.bank?.name,
    };
  }
}

module.exports = LineSlipVerificationService;
