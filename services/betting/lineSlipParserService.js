const https = require('https');

/**
 * ระบบแยก QR Code จากรูปภาพสลิปที่ส่งมาจาก LINE
 */
class LineSlipParserService {
  /**
   * ดาวน์โหลดรูปภาพจาก LINE
   * @param {string} messageId - Message ID จาก LINE
   * @param {string} accessToken - LINE Access Token
   * @returns {Promise<Buffer>} รูปภาพ
   */
  async downloadSlipImageFromLine(messageId, accessToken) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'obs.line-scdn.net',
        path: `/web${messageId}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      };

      https.request(options, (res) => {
        let data = '';
        res.setEncoding('binary');
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve(Buffer.from(data, 'binary'));
        });
      }).on('error', (err) => {
        reject(err);
      }).end();
    });
  }

  /**
   * แยก QR Code จากรูปภาพ (ใช้ OCR หรือ QR Code reader)
   * @param {Buffer} imageBuffer - รูปภาพ
   * @returns {Promise<string>} QR Code
   */
  async extractQRCodeFromImage(imageBuffer) {
    // ในการใช้งานจริง ต้องใช้ library เช่น jsQR หรือ qrcode-reader
    // ตัวอย่างนี้เป็นเพียง placeholder
    console.log(`📸 Extracting QR Code from image...`);
    
    // TODO: Implement QR Code extraction using jsQR or similar library
    throw new Error('QR Code extraction not implemented yet');
  }

  /**
   * แยก QR Code จากข้อความ (ถ้าผู้เล่นส่งมาเป็นข้อความ)
   * @param {string} message - ข้อความจากผู้เล่น
   * @returns {string|null} QR Code หรือ null
   */
  extractQRCodeFromText(message) {
    // ค้นหา QR Code pattern (ตัวอักษรและตัวเลข 40+ ตัว)
    const qrCodePattern = /[0-9A-Z]{40,}/;
    const match = message.match(qrCodePattern);
    
    if (match) {
      console.log(`✅ Found QR Code in text: ${match[0]}`);
      return match[0];
    }
    
    return null;
  }
}

module.exports = LineSlipParserService;
