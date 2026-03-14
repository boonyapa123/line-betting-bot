/**
 * Test Result Checking Flow with Price Extraction Fix
 * ทดสอบว่าการตรวจสอบผลลัพธ์ทำงานถูกต้องหลังจากแก้ไขการแยกช่วงราคา
 */

const bettingResultService = require('./services/betting/bettingResultService');

console.log('🧪 Testing Result Checking Flow with Price Extraction Fix\n');

// ฟังก์ชันแยกช่วงราคา (เหมือนใน index.js)
const extractPriceRange = (message) => {
  if (!message) return null;
  let match = message.match(/\/(\d+[\-\.\/\*]\d+)\//);
  if (match) return match[1];
  match = message.match(/^(\d+[\-\.\/\*]\d+)/);
  if (match) return match[1];
  return null;
};

// Test cases
const testCases = [
  {
    name: 'Test 1: ไล่/370-410/20เป็ด - Result 410 (in range)',
    messageA: 'ไล่/370-410/20เป็ด',
    score: 410,
    expectedDraw: true,
    description: 'Result 410 is within range 370-410 → Draw'
  },
  {
    name: 'Test 2: ไล่/360-400/20เป็ด - Result 410 (above range)',
    messageA: 'ไล่/360-400/20เป็ด',
    score: 410,
    expectedDraw: false,
    expectedWinner: 'ล',
    description: 'Result 410 is above range 360-400 → ล wins'
  },
  {
    name: 'Test 3: ไล่/360-400/20เป็ด - Result 350 (below range)',
    messageA: 'ไล่/360-400/20เป็ด',
    score: 350,
    expectedDraw: false,
    expectedWinner: 'ต',
    description: 'Result 350 is below range 360-400 → ต wins'
  },
  {
    name: 'Test 4: ต/360-450/20เป็ด - Result 410 (in range)',
    messageA: 'ต/360-450/20เป็ด',
    score: 410,
    expectedDraw: true,
    description: 'Result 410 is within range 360-450 → Draw'
  },
];

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  console.log(`\n${test.name}`);
  console.log(`Description: ${test.description}`);
  console.log(`Message: "${test.messageA}"`);
  console.log(`Score: ${test.score}`);
  
  // Extract price range
  const extractedPrice = extractPriceRange(test.messageA);
  console.log(`Extracted Price: ${extractedPrice}`);
  
  // Extract side
  const sideMatch = test.messageA.match(/[ยลยั้งไล่ชลชถบถ]/);
  const side = sideMatch ? sideMatch[0] : null;
  console.log(`Side: ${side}`);
  
  // Create pair object (like in index.js)
  const pair = {
    bet1: {
      userId: 'userA',
      displayName: 'User A',
      amount: 20,
      price: extractedPrice,  // ✅ Using extracted price
      side: side,
      sideCode: side,
      method: 2,
    },
    bet2: {
      userId: 'userB',
      displayName: 'User B',
      amount: 20,
      price: null,
      side: side,
      sideCode: side,
      method: 2,
    },
  };
  
  // Calculate result
  const result = bettingResultService.calculateResultWithFees(pair, 'เป็ด', test.score);
  
  console.log(`Result: isDraw=${result.isDraw}`);
  
  // Check if result matches expected
  let testPassed = result.isDraw === test.expectedDraw;
  
  if (test.expectedWinner && testPassed) {
    // Check if the winner's side matches expected
    const winnerSide = result.winner.sideCode || result.winner.side;
    testPassed = winnerSide === test.expectedWinner;
    console.log(`Winner Side: ${winnerSide} (Expected: ${test.expectedWinner})`);
  }
  
  if (testPassed) {
    console.log('✅ PASSED');
    passed++;
  } else {
    console.log('❌ FAILED');
    failed++;
  }
});

console.log('\n\n📊 Test Results:');
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   Total: ${passed + failed}\n`);

if (failed === 0) {
  console.log('🎉 All tests passed!');
} else {
  console.log('⚠️  Some tests failed!');
}
