const jsQR = require('jsqr');
const Jimp = require('jimp');

/**
 * ระบบสแกน QR Code จากรูปภาพ
 */
class QRCodeScannerService {
  /**
   * สแกน QR Code จากไฟล์รูปภาพ
   * @param {string} imagePath - เส้นทางไฟล์รูปภาพ
   * @returns {Promise<string>} QR Code String
   */
  async scanQRCodeFromFile(imagePath) {
    try {
      console.log(`📸 สแกน QR Code จากไฟล์: ${imagePath}`);
      
      const image = await Jimp.read(imagePath);
      const qrCode = await this._extractQRCode(image);
      
      if (!qrCode) {
        throw new Error('ไม่พบ QR Code ในรูปภาพ');
      }
      
      console.log(`✅ พบ QR Code: ${qrCode}`);
      return qrCode;
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      throw error;
    }
  }

  /**
   * สแกน QR Code จาก Buffer
   * @param {Buffer} imageBuffer - Buffer ของรูปภาพ
   * @returns {Promise<string>} QR Code String
   */
  async scanQRCodeFromBuffer(imageBuffer) {
    try {
      console.log(`📸 สแกน QR Code จาก Buffer`);
      
      const image = await Jimp.read(imageBuffer);
      const qrCode = await this._extractQRCode(image);
      
      if (!qrCode) {
        throw new Error('ไม่พบ QR Code ในรูปภาพ');
      }
      
      console.log(`✅ พบ QR Code: ${qrCode}`);
      return qrCode;
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      throw error;
    }
  }

  /**
   * สแกน QR Code จาก URL
   * @param {string} imageUrl - URL ของรูปภาพ
   * @returns {Promise<string>} QR Code String
   */
  async scanQRCodeFromUrl(imageUrl) {
    try {
      console.log(`📸 สแกน QR Code จาก URL: ${imageUrl}`);
      
      const image = await Jimp.read(imageUrl);
      const qrCode = await this._extractQRCode(image);
      
      if (!qrCode) {
        throw new Error('ไม่พบ QR Code ในรูปภาพ');
      }
      
      console.log(`✅ พบ QR Code: ${qrCode}`);
      return qrCode;
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      throw error;
    }
  }

  /**
   * แยก QR Code จากรูปภาพ
   * @private
   */
  async _extractQRCode(image) {
    try {
      // แปลงรูปภาพเป็น grayscale เพื่อให้ง่ายต่อการสแกน
      const width = image.bitmap.width;
      const height = image.bitmap.height;
      const imageData = {
        data: new Uint8ClampedArray(image.bitmap.data),
        width: width,
        height: height,
      };

      // สแกน QR Code
      const code = jsQR(imageData.data, width, height);

      if (code) {
        return code.data;
      }

      return null;
    } catch (error) {
      console.error(`❌ ข้อผิดพลาดในการแยก QR Code: ${error.message}`);
      throw error;
    }
  }
}

module.exports = QRCodeScannerService;
