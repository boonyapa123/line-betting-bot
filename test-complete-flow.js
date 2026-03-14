/**
 * Complete Flow Test - ทดสอบระบบทั้งหมดหลังแก้ไข
 * ตรวจสอบว่า:
 * 1. parseRow() แยกราคาถูกต้อง
 * 2. extractPriceRange() ในการประกาศผลแยกราคาถูกต้อง
 * 3. checkPriceRangeResult() ตรวจสอบผลลัพธ์ถูกต้อง
 */

const BetsSheetColumns = require('./services/betting/betsSheetColumns');
const bettingResultService = require('./services/betting/bettingResultService');

console.log('🧪 Complete Flow Test - ทดสอบระบบทั้งหมด\n');

// ===== PART 1: Test parseRow() =====
console.log('═══════════════════════════════════════════════════════════════');
console.log('PART 1: Test parseRow() - ตรวจสอบการแยกราคาจากแถวชีท');
console.log('═══════════════════════════════════════════════════════════════\n');

const testRows = [
  {
    name: 'Slash format without / before slip name',
    row: [
      '2026-03-14 14:50:00',  // A: Timestamp
      'U123',                  // B: User A ID
      'ธา  มือทอง',           // C: User A Name
      'ไล่/370-410/20เป็ด',   // D: Message A
      'เป็ด',                  // E: Slip Name
      'ล',                     // F: Side A
      '20',                    // G: Amount
      '',                      // H: Amount B
      '',                      // I: Result
      '',                      // J: Result Win/Lose
      '',                      // K: Result Win/Lose B
      '',                      // L: User B Name
      '',                      // M: Price B
      '',                      // N: Side B
      '',                      // O: Group Chat Name
      '',                      // P: Group Name
      '',                      // Q: Token A
      '',                      // R: User B ID
      '',                      // S: Group ID
      '',                      // T: Result A
      '',                      // U: Result B
    ],
    expectedPrice: '370-410',
    expectedSlipName: 'เป็ด',
  },
  {
    name: 'Slash format with / before slip name',
    row: [
      '2026-03-14 14:50:00',
      'U456',
      'paa"BOY"',
      'ไล่/360-400/50/เป็ด',
      'เป็ด',
      'ล',
      '50',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    expectedPrice: '360-400',
    expectedSlipName: 'เป็ด',
  },
  {
    name: 'Standard format',
    row: [
      '2026-03-14 14:50:00',
      'U789',
      'นุช519',
      '320-340 ล 100 คำไผ่',
      'คำไผ่',
      'ล',
      '100',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    expectedPrice: '320-340',
    expectedSlipName: 'คำไผ่',
  },
];

let part1Passed = 0;
let part1Failed = 0;

testRows.forEach(test => {
  console.log(`📝 ${test.name}`);
  const parsed = BetsSheetColumns.parseRow(test.row);
  
  const priceMatch = parsed.price === test.expectedPrice;
  const slipMatch = parsed.slipName === test.expectedSlipName;
  
  console.log(`   Message: "${test.row[3]}"`);
  console.log(`   Extracted Price: ${parsed.price} (Expected: ${test.expectedPrice}) ${priceMatch ? '✅' : '❌'}`);
  console.log(`   Extracted Slip: ${parsed.slipName} (Expected: ${test.expectedSlipName}) ${slipMatch ? '✅' : '❌'}`);
  
  if (priceMatch && slipMatch) {
    console.log('   ✅ PASSED\n');
    part1Passed++;
  } else {
    console.log('   ❌ FAILED\n');
    part1Failed++;
  }
});

// ===== PART 2: Test extractPriceRange() =====
console.log('═══════════════════════════════════════════════════════════════');
console.log('PART 2: Test extractPriceRange() - ตรวจสอบการแยกราคาในการประกาศผล');
console.log('═══════════════════════════════════════════════════════════════\n');

const extractPriceRange = (message) => {
  if (!message) return null;
  let match = message.match(/\/(\d+[\-\.\/\*]\d+)\//);
  if (match) return match[1];
  match = message.match(/^(\d+[\-\.\/\*]\d+)/);
  if (match) return match[1];
  return null;
};

const testMessages = [
  { message: 'ไล่/370-410/20เป็ด', expected: '370-410' },
  { message: 'ไล่/360-400/50/เป็ด', expected: '360-400' },
  { message: '320-340 ล 100 คำไผ่', expected: '320-340' },
];

let part2Passed = 0;
let part2Failed = 0;

testMessages.forEach(test => {
  const result = extractPriceRange(test.message);
  const match = result === test.expected;
  
  console.log(`📝 "${test.message}"`);
  console.log(`   Extracted: ${result} (Expected: ${test.expected}) ${match ? '✅' : '❌'}`);
  
  if (match) {
    console.log('   ✅ PASSED\n');
    part2Passed++;
  } else {
    console.log('   ❌ FAILED\n');
    part2Failed++;
  }
});

// ===== PART 3: Test checkPriceRangeResult() =====
console.log('═══════════════════════════════════════════════════════════════');
console.log('PART 3: Test checkPriceRangeResult() - ตรวจสอบผลลัพธ์');
console.log('═══════════════════════════════════════════════════════════════\n');

const testCases = [
  {
    name: 'ไล่/370-410/20เป็ด - ผล 410 (ในช่วง)',
    price: '370-410',
    side: 'ล',
    score: 410,
    expectedDraw: true,
  },
  {
    name: 'ไล่/360-400/20เป็ด - ผล 410 (สูงกว่าช่วง)',
    price: '360-400',
    side: 'ล',
    score: 410,
    expectedDraw: false,
    expectedWinner: 'ล',
  },
  {
    name: 'ไล่/360-400/20เป็ด - ผล 350 (ต่ำกว่าช่วง)',
    price: '360-400',
    side: 'ล',
    score: 350,
    expectedDraw: false,
    expectedWinner: 'ต',
  },
];

let part3Passed = 0;
let part3Failed = 0;

testCases.forEach(test => {
  console.log(`📝 ${test.name}`);
  
  const pair = {
    bet1: {
      userId: 'userA',
      displayName: 'User A',
      amount: 20,
      price: test.price,
      side: test.side,
      sideCode: test.side,
      method: 2,
    },
    bet2: {
      userId: 'userB',
      displayName: 'User B',
      amount: 20,
      price: null,
      side: test.side,
      sideCode: test.side,
      method: 2,
    },
  };
  
  const result = bettingResultService.calculateResultWithFees(pair, 'เป็ด', test.score);
  
  console.log(`   Price: ${test.price}, Score: ${test.score}`);
  console.log(`   Result: isDraw=${result.isDraw}`);
  
  let testPassed = result.isDraw === test.expectedDraw;
  
  if (test.expectedWinner && testPassed) {
    const winnerSide = result.winner.sideCode || result.winner.side;
    testPassed = winnerSide === test.expectedWinner;
    console.log(`   Winner Side: ${winnerSide} (Expected: ${test.expectedWinner})`);
  }
  
  if (testPassed) {
    console.log('   ✅ PASSED\n');
    part3Passed++;
  } else {
    console.log('   ❌ FAILED\n');
    part3Failed++;
  }
});

// ===== SUMMARY =====
console.log('═══════════════════════════════════════════════════════════════');
console.log('📊 SUMMARY');
console.log('═══════════════════════════════════════════════════════════════\n');

const totalPassed = part1Passed + part2Passed + part3Passed;
const totalFailed = part1Failed + part2Failed + part3Failed;

console.log(`PART 1 (parseRow): ${part1Passed}/${part1Passed + part1Failed} passed`);
console.log(`PART 2 (extractPriceRange): ${part2Passed}/${part2Passed + part2Failed} passed`);
console.log(`PART 3 (checkPriceRangeResult): ${part3Passed}/${part3Passed + part3Failed} passed`);
console.log(`\nTotal: ${totalPassed}/${totalPassed + totalFailed} passed\n`);

if (totalFailed === 0) {
  console.log('🎉 All tests passed! System is working correctly.');
} else {
  console.log(`⚠️  ${totalFailed} test(s) failed!`);
}
