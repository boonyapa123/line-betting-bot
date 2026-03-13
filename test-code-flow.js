const bettingResultService = require('./services/betting/bettingResultService');
const priceRangeCalculator = require('./services/betting/priceRangeCalculator');

console.log('\n📊 ทดสอบการทำงานของ Code ที่ประกาศผล "ฟ้า 340 ✅️"');
console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

// ข้อมูลจากชีท Bets (Row 1)
const testData = {
  row1: {
    userAId: 'Ua01232445a58162e1518b510fcaf01b5',
    userAName: 'paa"BOY"',
    userBId: 'Uc2a009fe53d51946657363bdbb7d1374',
    userBName: 'นุช519',
    priceA: '300-320 ล 20 ฟ้า',
    priceB: 'ล',
    betAmountA: 20,
    betAmountB: 20,
    fireworkName: 'ฟ้า',
    resultNumber: '340',
    resultSymbol: '✅',
  }
};

console.log('📋 ข้อมูลการเดิมพัน (Row 1):\n');
console.log(`  User A: ${testData.row1.userAName} (${testData.row1.userAId})`);
console.log(`  User B: ${testData.row1.userBName} (${testData.row1.userBId})`);
console.log(`  ราคา A: ${testData.row1.priceA}`);
console.log(`  ราคา B: ${testData.row1.priceB}`);
console.log(`  ยอดเงิน: ${testData.row1.betAmountA} บาท`);
console.log(`  บั้งไฟ: ${testData.row1.fireworkName}`);
console.log(`  ผลประกาศ: ${testData.row1.resultNumber} ${testData.row1.resultSymbol}\n`);

// ทดสอบ priceRangeCalculator
console.log('🔍 ทดสอบ priceRangeCalculator.checkPriceRange():\n');

const priceRangeMatch = testData.row1.priceA.match(/(\d+)-(\d+)/);
if (priceRangeMatch) {
  const minPrice = parseInt(priceRangeMatch[1]);
  const maxPrice = parseInt(priceRangeMatch[2]);
  const resultNumber = parseInt(testData.row1.resultNumber);

  console.log(`  ช่วงราคา: ${minPrice} - ${maxPrice}`);
  console.log(`  ผลที่ออก: ${resultNumber}`);
  console.log(`  ตรวจสอบ: ${minPrice} <= ${resultNumber} <= ${maxPrice}`);

  const isInRange = resultNumber >= minPrice && resultNumber <= maxPrice;
  console.log(`  ผลลัพธ์: ${isInRange ? '✅ อยู่ในช่วง' : '❌ ไม่อยู่ในช่วง'}\n`);
}

// ทดสอบ bettingResultService
console.log('🔍 ทดสอบ bettingResultService.calculateResultWithFees():\n');

const pair = {
  bet1: {
    userId: testData.row1.userAId,
    displayName: testData.row1.userAName,
    amount: testData.row1.betAmountA,
    price: testData.row1.priceA,
    side: 'ล',
    method: 2, // price range
  },
  bet2: {
    userId: testData.row1.userBId,
    displayName: testData.row1.userBName,
    amount: testData.row1.betAmountB,
    price: testData.row1.priceB,
    side: 'ล',
    method: 'REPLY',
  },
};

try {
  const result = bettingResultService.calculateResultWithFees(
    pair,
    testData.row1.fireworkName,
    testData.row1.resultNumber
  );

  console.log(`  ผลลัพธ์:`);
  console.log(`    - isDraw: ${result.isDraw}`);
  console.log(`    - ผู้ชนะ: ${result.winner.displayName}`);
  console.log(`    - ผู้แพ้: ${result.loser.displayName}`);
  console.log(`    - ยอดเงินผู้ชนะ: ${result.winner.netAmount} บาท`);
  console.log(`    - ยอดเงินผู้แพ้: ${result.loser.netAmount} บาท`);
  console.log(`    - ค่าธรรมเนียม: ${result.winner.fee} บาท\n`);

  // กำหนดผลแพ้ชนะ
  let userAResultText = '';
  let userBResultText = '';

  if (result.isDraw) {
    userAResultText = '⛔️';
    userBResultText = '⛔️';
  } else {
    if (result.winner.userId === testData.row1.userAId) {
      userAResultText = '✅';
      userBResultText = '❌';
    } else {
      userAResultText = '❌';
      userBResultText = '✅';
    }
  }

  console.log('📝 ผลลัพธ์ที่จะบันทึกในชีท:\n');
  console.log(`  Column I (ผลที่ออก): ${testData.row1.resultNumber}`);
  console.log(`  Column J (ผลแพ้ชนะ A): ${userAResultText}`);
  console.log(`  Column K (ผลแพ้ชนะ B): ${userBResultText}\n`);

} catch (error) {
  console.error('❌ เกิดข้อผิดพลาด:', error.message);
  console.error(error.stack);
}

console.log('═══════════════════════════════════════════════════════════════════════════════════\n');
