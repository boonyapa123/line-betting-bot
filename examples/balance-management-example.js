/**
 * ตัวอย่างการใช้งาน Balance Management System
 */

const balanceCheckService = require('../services/betting/balanceCheckService');
const pendingBalanceService = require('../services/betting/pendingBalanceService');
const bettingPairingService = require('../services/betting/bettingPairingService');
const bettingMatchingService = require('../services/betting/bettingMatchingService');

/**
 * ตัวอย่างที่ 1: ตรวจสอบยอดเงิน (รวมเงินค้าง)
 */
async function example1_checkBalance() {
  console.log('\n=== ตัวอย่างที่ 1: ตรวจสอบยอดเงิน ===\n');

  // ตรวจสอบยอดเงินของ John
  const checkResult = await balanceCheckService.checkBalance('John', 300);

  console.log('ผลการตรวจสอบ:');
  console.log(`- ยอดเงินคงเหลือ: ${checkResult.currentBalance} บาท`);
  console.log(`- เงินค้าง: ${checkResult.pendingAmount} บาท`);
  console.log(`- เงินที่สามารถใช้ได้: ${checkResult.availableBalance} บาท`);
  console.log(`- ต้องการเงิน: ${checkResult.requiredAmount} บาท`);
  console.log(`- เพียงพอ: ${checkResult.sufficient ? 'ใช่' : 'ไม่ใช่'}`);
  console.log(`- ข้อความ: ${checkResult.message}`);
}

/**
 * ตัวอย่างที่ 2: ดึงรายละเอียดเงินค้าง
 */
async function example2_getPendingBetsDetails() {
  console.log('\n=== ตัวอย่างที่ 2: ดึงรายละเอียดเงินค้าง ===\n');

  // ดึงรายละเอียดเงินค้างของ John
  const pendingBets = await pendingBalanceService.getPendingBetsDetails('John');

  console.log(`จำนวนการเล่นที่ค้าง: ${pendingBets.length}`);
  pendingBets.forEach((bet, index) => {
    console.log(`\n${index + 1}. ${bet.slipName}`);
    console.log(`   ฝั่ง: ${bet.side}`);
    console.log(`   เงิน: ${bet.amount} บาท`);
    console.log(`   คู่ต่อสู้: ${bet.opponent}`);
    console.log(`   เวลา: ${new Date(bet.timestamp).toLocaleString('th-TH')}`);
  });
}

/**
 * ตัวอย่างที่ 3: ตรวจสอบยอดเงินก่อนจับคู่
 */
async function example3_checkBalanceBeforeMatching() {
  console.log('\n=== ตัวอย่างที่ 3: ตรวจสอบยอดเงินก่อนจับคู่ ===\n');

  // ตรวจสอบว่า John มีเงินเพียงพอสำหรับการเดิมพัน 400 บาทหรือไม่
  const checkResult = await bettingMatchingService.checkBalanceBeforeMatching('John', 400);

  console.log('ผลการตรวจสอบ:');
  console.log(`- ยอดเงินคงเหลือ: ${checkResult.currentBalance} บาท`);
  console.log(`- เงินค้าง: ${checkResult.pendingAmount} บาท`);
  console.log(`- เงินที่สามารถใช้ได้: ${checkResult.availableBalance} บาท`);
  console.log(`- ต้องการเงิน: ${checkResult.requiredAmount} บาท`);
  console.log(`- เพียงพอ: ${checkResult.isSufficient ? 'ใช่' : 'ไม่ใช่'}`);

  if (!checkResult.isSufficient) {
    console.log(`- เงินขาด: ${checkResult.shortfall} บาท`);
  }
}

/**
 * ตัวอย่างที่ 4: หักเงินเดิมพัน
 */
async function example4_deductBetAmount() {
  console.log('\n=== ตัวอย่างที่ 4: หักเงินเดิมพัน ===\n');

  // หักเงิน 300 บาทจาก John
  const deductResult = await bettingPairingService.deductBetAmount('John', 300);

  if (deductResult.success) {
    console.log('✅ หักเงินสำเร็จ');
    console.log(`- ชื่อ: ${deductResult.displayName}`);
    console.log(`- ยอดเงินเดิม: ${deductResult.previousBalance} บาท`);
    console.log(`- หักเงิน: ${deductResult.deductedAmount} บาท`);
    console.log(`- ยอดเงินใหม่: ${deductResult.newBalance} บาท`);
  } else {
    console.log(`❌ เกิดข้อผิดพลาด: ${deductResult.error}`);
  }
}

/**
 * ตัวอย่างที่ 5: ค้นหาคู่เดิมพันและหักเงิน
 */
async function example5_findPairsAndDeductBalance() {
  console.log('\n=== ตัวอย่างที่ 5: ค้นหาคู่เดิมพันและหักเงิน ===\n');

  // ข้อมูลการเล่นตัวอย่าง
  const bets = [
    {
      timestamp: new Date().toISOString(),
      userId: 'U001',
      displayName: 'John',
      method: 1,
      slipName: 'ฟ้าหลังฝน',
      side: 'ชล',
      sideCode: 'ชล',
      amount: 500,
      status: '',
    },
    {
      timestamp: new Date().toISOString(),
      userId: 'U002',
      displayName: 'Jane',
      method: 1,
      slipName: 'ฟ้าหลังฝน',
      side: 'ชถ',
      sideCode: 'ชถ',
      amount: 300,
      status: '',
    },
  ];

  // ค้นหาคู่และหักเงิน
  const matchingResult = await bettingMatchingService.findPairsAndDeductBalance(bets);

  if (matchingResult.success) {
    console.log('✅ ค้นหาคู่สำเร็จ');
    console.log(`- จำนวนคู่ที่จับได้: ${matchingResult.pairsFound}`);

    matchingResult.deductionResults.forEach((result, index) => {
      const { pair, deductions } = result;
      console.log(`\n${index + 1}. ${pair.bet1.displayName} vs ${pair.bet2.displayName}`);
      console.log(`   เงินเดิมพัน: ${pair.betAmount} บาท`);
      console.log(`   ${pair.bet1.displayName}: ${deductions[0].previousBalance} → ${deductions[0].newBalance} บาท`);
      console.log(`   ${pair.bet2.displayName}: ${deductions[1].previousBalance} → ${deductions[1].newBalance} บาท`);
    });
  } else {
    console.log(`❌ เกิดข้อผิดพลาด: ${matchingResult.error}`);
  }
}

/**
 * ตัวอย่างที่ 6: ตรวจสอบและแจ้งเตือนยอดเงิน
 */
async function example6_checkAndNotify() {
  console.log('\n=== ตัวอย่างที่ 6: ตรวจสอบและแจ้งเตือนยอดเงิน ===\n');

  // ตรวจสอบและแจ้งเตือน
  const checkResult = await balanceCheckService.checkAndNotify(
    'John',
    500,
    'U001',
    1,
    'C123456789'
  );

  console.log('ผลการตรวจสอบ:');
  console.log(`- เพียงพอ: ${checkResult.sufficient ? 'ใช่' : 'ไม่ใช่'}`);
  console.log(`- ลงทะเบียน: ${checkResult.registered ? 'ใช่' : 'ไม่ใช่'}`);
  console.log(`- ข้อความ: ${checkResult.message}`);

  if (!checkResult.sufficient) {
    console.log(`- เงินขาด: ${checkResult.shortfall} บาท`);
    console.log('- ส่งการแจ้งเตือนแล้ว');
  }
}

/**
 * ตัวอย่างที่ 7: สร้างข้อความแจ้งเตือนเงินค้าง
 */
async function example7_buildPendingBetsMessage() {
  console.log('\n=== ตัวอย่างที่ 7: สร้างข้อความแจ้งเตือนเงินค้าง ===\n');

  // ดึงรายละเอียดเงินค้าง
  const pendingBets = await pendingBalanceService.getPendingBetsDetails('John');

  // สร้างข้อความ
  const message = pendingBalanceService.buildPendingBetsMessage(pendingBets);

  console.log('ข้อความแจ้งเตือน:');
  console.log(message);
}

/**
 * ตัวอย่างที่ 8: ดึงเงินค้างทั้งหมด
 */
async function example8_getPendingAmount() {
  console.log('\n=== ตัวอย่างที่ 8: ดึงเงินค้างทั้งหมด ===\n');

  // ดึงเงินค้างของ John
  const pendingAmount = await pendingBalanceService.getPendingAmount('John');

  console.log(`เงินค้างของ John: ${pendingAmount} บาท`);
}

/**
 * ตัวอย่างที่ 9: ตรวจสอบยอดเงินเพียงพอ
 */
async function example9_checkSufficientBalance() {
  console.log('\n=== ตัวอย่างที่ 9: ตรวจสอบยอดเงินเพียงพอ ===\n');

  // ตรวจสอบว่า John มีเงินเพียงพอสำหรับการเดิมพัน 400 บาทหรือไม่
  const checkResult = await pendingBalanceService.checkSufficientBalance(
    'John',
    1000,  // ยอดคงเหลือ
    400    // เงินเดิมพันใหม่
  );

  console.log('ผลการตรวจสอบ:');
  console.log(`- ยอดเงินคงเหลือ: ${checkResult.currentBalance} บาท`);
  console.log(`- เงินค้าง: ${checkResult.pendingAmount} บาท`);
  console.log(`- เงินที่สามารถใช้ได้: ${checkResult.availableBalance} บาท`);
  console.log(`- ต้องการเงิน: ${checkResult.requiredAmount} บาท`);
  console.log(`- เพียงพอ: ${checkResult.isSufficient ? 'ใช่' : 'ไม่ใช่'}`);

  if (!checkResult.isSufficient) {
    console.log(`- เงินขาด: ${checkResult.shortfall} บาท`);
  }
}

/**
 * ตัวอย่างที่ 10: สร้างรายงานการจับคู่
 */
async function example10_buildMatchingReport() {
  console.log('\n=== ตัวอย่างที่ 10: สร้างรายงานการจับคู่ ===\n');

  // ข้อมูลการเล่นตัวอย่าง
  const bets = [
    {
      timestamp: new Date().toISOString(),
      userId: 'U001',
      displayName: 'John',
      method: 1,
      slipName: 'ฟ้าหลังฝน',
      side: 'ชล',
      sideCode: 'ชล',
      amount: 500,
      status: '',
    },
    {
      timestamp: new Date().toISOString(),
      userId: 'U002',
      displayName: 'Jane',
      method: 1,
      slipName: 'ฟ้าหลังฝน',
      side: 'ชถ',
      sideCode: 'ชถ',
      amount: 300,
      status: '',
    },
  ];

  // ค้นหาคู่และหักเงิน
  const matchingResult = await bettingMatchingService.findPairsAndDeductBalance(bets);

  // สร้างรายงาน
  const report = bettingMatchingService.buildMatchingReport(matchingResult);

  console.log('รายงานการจับคู่:');
  console.log(report);
}

/**
 * รันตัวอย่างทั้งหมด
 */
async function runAllExamples() {
  try {
    // Initialize services
    await balanceCheckService.initialize();
    await pendingBalanceService.initialize();
    await bettingPairingService.initialize();

    // Run examples
    await example1_checkBalance();
    await example2_getPendingBetsDetails();
    await example3_checkBalanceBeforeMatching();
    await example4_deductBetAmount();
    await example5_findPairsAndDeductBalance();
    await example6_checkAndNotify();
    await example7_buildPendingBetsMessage();
    await example8_getPendingAmount();
    await example9_checkSufficientBalance();
    await example10_buildMatchingReport();

    console.log('\n✅ ตัวอย่างทั้งหมดเสร็จสิ้น\n');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

// Export functions
module.exports = {
  example1_checkBalance,
  example2_getPendingBetsDetails,
  example3_checkBalanceBeforeMatching,
  example4_deductBetAmount,
  example5_findPairsAndDeductBalance,
  example6_checkAndNotify,
  example7_buildPendingBetsMessage,
  example8_getPendingAmount,
  example9_checkSufficientBalance,
  example10_buildMatchingReport,
  runAllExamples,
};

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}
