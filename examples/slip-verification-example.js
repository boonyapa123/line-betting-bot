/**
 * ตัวอย่างการใช้งานระบบตรวจสอบสลิป
 */

const LineSlipVerificationService = require('../services/betting/lineSlipVerificationService');
const QRCodeScannerService = require('../services/betting/qrCodeScannerService');
const Slip2GoQRVerificationService = require('../services/betting/slip2GoQRVerificationService');

// ตั้งค่า
const SLIP2GO_SECRET_KEY = process.env.SLIP2GO_SECRET_KEY;

// ============================================
// ตัวอย่างที่ 1: ตรวจสอบสลิปจาก URL
// ============================================
async function example1_VerifySlipFromUrl() {
  console.log('\n📌 ตัวอย่างที่ 1: ตรวจสอบสลิปจาก URL\n');

  const service = new LineSlipVerificationService(SLIP2GO_SECRET_KEY);
  
  // URL ของรูปภาพสลิป (จาก LINE)
  const imageUrl = 'https://example.com/slip-image.jpg';

  // ตรวจสอบสลิป
  const result = await service.verifySlipFromLineImage(imageUrl, {
    checkDuplicate: true,
    checkReceiver: [
      {
        accountNumber: 'xxxxxx1234',
        accountType: '01004' // ธนาคารกสิกรไทย
      }
    ]
  });

  // แสดงผลลัพธ์
  console.log('ผลการตรวจสอบ:', result);

  // สร้างข้อความตอบกลับ
  const message = service.createLineMessage(result);
  console.log('\nข้อความตอบกลับ:');
  console.log(message);

  // ดึงข้อมูลสลิป
  if (result.success) {
    const slipData = service.extractSlipData(result);
    console.log('\nข้อมูลสลิป:', slipData);
  }
}

// ============================================
// ตัวอย่างที่ 2: ตรวจสอบสลิปจาก QR Code
// ============================================
async function example2_VerifySlipFromQRCode() {
  console.log('\n📌 ตัวอย่างที่ 2: ตรวจสอบสลิปจาก QR Code\n');

  const service = new LineSlipVerificationService(SLIP2GO_SECRET_KEY);
  
  // QR Code String จากสลิป
  const qrCode = '0041000600000101030040220014242082547BPM049885102TH9104xxxx';

  // ตรวจสอบสลิป
  const result = await service.verifySlipFromQRCode(qrCode, {
    checkDuplicate: true,
    checkReceiver: [
      {
        accountNumber: 'xxxxxx1234',
        accountType: '01004'
      }
    ]
  });

  console.log('ผลการตรวจสอบ:', result);

  // สร้างข้อความตอบกลับ
  const message = service.createLineMessage(result);
  console.log('\nข้อความตอบกลับ:');
  console.log(message);
}

// ============================================
// ตัวอย่างที่ 3: สแกน QR Code จากรูปภาพ
// ============================================
async function example3_ScanQRCodeFromImage() {
  console.log('\n📌 ตัวอย่างที่ 3: สแกน QR Code จากรูปภาพ\n');

  const scanner = new QRCodeScannerService();
  
  // สแกน QR Code จากไฟล์
  const qrCode = await scanner.scanQRCodeFromFile('./slip-image.jpg');
  console.log('QR Code ที่พบ:', qrCode);

  // ตรวจสอบสลิปจาก QR Code ที่สแกนได้
  const verifier = new Slip2GoQRVerificationService(SLIP2GO_SECRET_KEY);
  const result = await verifier.verifySlipFromQRCode(qrCode);
  console.log('ผลการตรวจสอบ:', result);
}

// ============================================
// ตัวอย่างที่ 4: ตรวจสอบสลิปพร้อมเงื่อนไขหลายประการ
// ============================================
async function example4_VerifyWithMultipleConditions() {
  console.log('\n📌 ตัวอย่างที่ 4: ตรวจสอบสลิปพร้อมเงื่อนไขหลายประการ\n');

  const service = new LineSlipVerificationService(SLIP2GO_SECRET_KEY);
  
  const imageUrl = 'https://example.com/slip-image.jpg';

  // ตรวจสอบสลิปพร้อมเงื่อนไขหลายประการ
  const result = await service.verifySlipFromLineImage(imageUrl, {
    checkDuplicate: true,
    checkReceiver: [
      {
        accountNumber: 'xxxxxx1234',
        accountType: '01004',
        accountNameTH: 'บริษัท สลิปทูโก จำกัด'
      }
    ],
    checkAmount: {
      type: 'gte', // greater than or equal
      amount: '1000'
    },
    checkDate: {
      type: 'gte',
      date: '2025-10-01T00:00:00.000Z'
    }
  });

  console.log('ผลการตรวจสอบ:', result);

  // สร้างข้อความตอบกลับ
  const message = service.createLineMessage(result);
  console.log('\nข้อความตอบกลับ:');
  console.log(message);
}

// ============================================
// ตัวอย่างที่ 5: จัดการ Error
// ============================================
async function example5_ErrorHandling() {
  console.log('\n📌 ตัวอย่างที่ 5: จัดการ Error\n');

  const service = new LineSlipVerificationService(SLIP2GO_SECRET_KEY);
  
  try {
    // ลองตรวจสอบสลิปที่ไม่มีอยู่
    const result = await service.verifySlipFromQRCode('invalid-qr-code');
    
    if (!result.success) {
      console.log('❌ ข้อผิดพลาด:', result.message);
      console.log('   Code:', result.code);
    }
  } catch (error) {
    console.error('❌ Exception:', error.message);
  }
}

// ============================================
// รัน Examples
// ============================================
async function runExamples() {
  try {
    // เลือกตัวอย่างที่ต้องการรัน
    // await example1_VerifySlipFromUrl();
    // await example2_VerifySlipFromQRCode();
    // await example3_ScanQRCodeFromImage();
    // await example4_VerifyWithMultipleConditions();
    // await example5_ErrorHandling();

    console.log('✅ ตัวอย่างเสร็จสิ้น');
  } catch (error) {
    console.error('❌ ข้อผิดพลาด:', error.message);
  }
}

// Export functions
module.exports = {
  example1_VerifySlipFromUrl,
  example2_VerifySlipFromQRCode,
  example3_ScanQRCodeFromImage,
  example4_VerifyWithMultipleConditions,
  example5_ErrorHandling,
  runExamples
};

// รัน examples ถ้าเรียกไฟล์นี้โดยตรง
if (require.main === module) {
  runExamples();
}
