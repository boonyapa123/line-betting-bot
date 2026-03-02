/**
 * ตัวอย่างการใช้งาน Slip Validation Service
 * 
 * ระบบตรวจสอบสลิปแบบครอบคลุม:
 * 1. ตรวจสอบสลิปซ้ำ (Duplicate Check)
 * 2. ตรวจสอบสลิปปลอม (Fake Check)
 * 3. ตรวจสอบบัญชีตรงกันหรือไม่ (Receiver Account Check)
 * 4. ตรวจสอบจำนวนเงิน (Amount Check)
 * 5. ตรวจสอบวันที่ (Date Check)
 */

const SlipValidationService = require('../services/betting/slipValidationService');

// ตัวอย่างข้อมูลสลิปจาก Slip2Go API
const exampleSlipData = {
  referenceId: '1d850070-d4c6-4cfa-8a7c-46b40b8918bb-9901',
  transRef: '2026030227nk4DEnoNH4T6PsU',
  amount: 100,
  dateTime: '2026-03-02T09:57:09+07:00',
  senderName: 'นาง ลดาวัลย์ ว',
  senderAccount: 'xxxx-xx237-0',
  senderBank: 'ธนาคารไทยพาณิชย์',
  receiverName: 'น.ส.ชญาภา พ',
  receiverAccount: 'XXXXX5901X',
  receiverBank: 'ธนาคารกรุงไทย',
  status: 'verified'
};

/**
 * ตัวอย่าง 1: ตรวจสอบสลิปแบบพื้นฐาน
 */
async function example1_BasicValidation() {
  console.log('\n=== ตัวอย่าง 1: ตรวจสอบสลิปแบบพื้นฐาน ===\n');
  
  const validationService = new SlipValidationService(
    googleAuth,
    GOOGLE_SHEET_ID
  );

  const result = await validationService.validateSlip(exampleSlipData);
  
  console.log('ผลการตรวจสอบ:');
  console.log(`- Valid: ${result.isValid}`);
  console.log(`- Errors: ${result.errors.length}`);
  console.log(`- Warnings: ${result.warnings.length}`);
  console.log(`- Checks:`, result.checks);
}

/**
 * ตัวอย่าง 2: ตรวจสอบสลิปพร้อมตรวจสอบบัญชี
 */
async function example2_WithReceiverCheck() {
  console.log('\n=== ตัวอย่าง 2: ตรวจสอบสลิปพร้อมตรวจสอบบัญชี ===\n');
  
  const validationService = new SlipValidationService(
    googleAuth,
    GOOGLE_SHEET_ID
  );

  const result = await validationService.validateSlip(exampleSlipData, {
    expectedReceiverAccount: 'XXXXX5901X'
  });
  
  console.log('ผลการตรวจสอบ:');
  console.log(`- Valid: ${result.isValid}`);
  console.log(`- Receiver Matched: ${result.checks.isReceiverMatched}`);
  
  if (!result.isValid) {
    console.log('- Errors:');
    result.errors.forEach(error => console.log(`  • ${error}`));
  }
}

/**
 * ตัวอย่าง 3: ตรวจสอบสลิปพร้อมตรวจสอบจำนวนเงิน
 */
async function example3_WithAmountCheck() {
  console.log('\n=== ตัวอย่าง 3: ตรวจสอบสลิปพร้อมตรวจสอบจำนวนเงิน ===\n');
  
  const validationService = new SlipValidationService(
    googleAuth,
    GOOGLE_SHEET_ID
  );

  const result = await validationService.validateSlip(exampleSlipData, {
    expectedAmount: 100
  });
  
  console.log('ผลการตรวจสอบ:');
  console.log(`- Valid: ${result.isValid}`);
  console.log(`- Amount Valid: ${result.checks.isAmountValid}`);
  
  if (result.warnings.length > 0) {
    console.log('- Warnings:');
    result.warnings.forEach(warning => console.log(`  • ${warning}`));
  }
}

/**
 * ตัวอย่าง 4: ตรวจสอบสลิปแบบครอบคลุม
 */
async function example4_ComprehensiveValidation() {
  console.log('\n=== ตัวอย่าง 4: ตรวจสอบสลิปแบบครอบคลุม ===\n');
  
  const validationService = new SlipValidationService(
    googleAuth,
    GOOGLE_SHEET_ID
  );

  const result = await validationService.validateSlip(exampleSlipData, {
    expectedReceiverAccount: 'XXXXX5901X',
    expectedAmount: 100,
    expectedDate: '2026-03-02'
  });
  
  console.log('ผลการตรวจสอบ:');
  console.log(`- Valid: ${result.isValid}`);
  console.log(`- Checks:`, result.checks);
  
  if (!result.isValid) {
    console.log('- Errors:');
    result.errors.forEach(error => console.log(`  • ${error}`));
  }
  
  if (result.warnings.length > 0) {
    console.log('- Warnings:');
    result.warnings.forEach(warning => console.log(`  • ${warning}`));
  }
}

/**
 * ตัวอย่าง 5: ตรวจสอบสลิปซ้ำ
 */
async function example5_DuplicateCheck() {
  console.log('\n=== ตัวอย่าง 5: ตรวจสอบสลิปซ้ำ ===\n');
  
  const validationService = new SlipValidationService(
    googleAuth,
    GOOGLE_SHEET_ID
  );

  // ตรวจสอบสลิปซ้ำ
  const result = await validationService.validateSlip(exampleSlipData);
  
  console.log('ผลการตรวจสอบ:');
  console.log(`- Is Duplicate: ${result.checks.isDuplicate}`);
  
  if (result.checks.isDuplicate) {
    console.log('- Error:');
    result.errors.forEach(error => console.log(`  • ${error}`));
  } else {
    console.log('- ✅ ไม่ใช่สลิปซ้ำ');
  }
}

/**
 * ตัวอย่าง 6: ตรวจสอบสลิปปลอม
 */
async function example6_FakeCheck() {
  console.log('\n=== ตัวอย่าง 6: ตรวจสอบสลิปปลอม ===\n');
  
  const validationService = new SlipValidationService(
    googleAuth,
    GOOGLE_SHEET_ID
  );

  // ตรวจสอบสลิปปลอม
  const result = await validationService.validateSlip(exampleSlipData);
  
  console.log('ผลการตรวจสอบ:');
  console.log(`- Is Fake: ${result.checks.isFake}`);
  
  if (result.checks.isFake) {
    console.log('- Error:');
    result.errors.forEach(error => console.log(`  • ${error}`));
  } else {
    console.log('- ✅ ไม่ใช่สลิปปลอม');
  }
}

// ตัวอย่างการใช้งาน
console.log('🔐 Slip Validation Service Examples');
console.log('====================================\n');

// เรียกใช้ตัวอย่าง
// await example1_BasicValidation();
// await example2_WithReceiverCheck();
// await example3_WithAmountCheck();
// await example4_ComprehensiveValidation();
// await example5_DuplicateCheck();
// await example6_FakeCheck();

module.exports = {
  example1_BasicValidation,
  example2_WithReceiverCheck,
  example3_WithAmountCheck,
  example4_ComprehensiveValidation,
  example5_DuplicateCheck,
  example6_FakeCheck
};
