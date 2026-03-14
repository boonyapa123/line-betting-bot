/**
 * Test checkPriceRangeResult
 * ทดสอบ logic ของ checkPriceRangeResult
 */

const bettingResultService = require('./services/betting/bettingResultService');

console.log('🧪 Testing checkPriceRangeResult Logic\n');

// Test cases
const testCases = [
  {
    name: 'Result in range (360-400, score 410)',
    bet1: { price: '360-400', sideCode: 'ล', amount: 20, userId: 'U1', displayName: 'User A' },
    bet2: { price: '360-400 ต', sideCode: 'ต', amount: 20, userId: 'U2', displayName: 'User B' },
    score: 410,
    expected: 'isDraw: false, ล ชนะ'
  },
  {
    name: 'Result in range (370-410, score 410)',
    bet1: { price: '370-410', sideCode: 'ล', amount: 20, userId: 'U1', displayName: 'User A' },
    bet2: { price: '370-410 ต', sideCode: 'ต', amount: 20, userId: 'U2', displayName: 'User B' },
    score: 410,
    expected: 'isDraw: true'
  },
  {
    name: 'Result below range (360-400, score 350)',
    bet1: { price: '360-400', sideCode: 'ล', amount: 20, userId: 'U1', displayName: 'User A' },
    bet2: { price: '360-400 ต', sideCode: 'ต', amount: 20, userId: 'U2', displayName: 'User B' },
    score: 350,
    expected: 'isDraw: false, ต ชนะ'
  },
  {
    name: 'Result above range (360-400, score 410)',
    bet1: { price: '360-400', sideCode: 'ล', amount: 20, userId: 'U1', displayName: 'User A' },
    bet2: { price: '360-400 ต', sideCode: 'ต', amount: 20, userId: 'U2', displayName: 'User B' },
    score: 410,
    expected: 'isDraw: false, ล ชนะ'
  },
];

testCases.forEach(test => {
  console.log(`📝 ${test.name}`);
  console.log(`   Price: ${test.bet1.price}, Side: ${test.bet1.sideCode}, Score: ${test.score}`);
  
  const result = bettingResultService.checkPriceRangeResult(test.bet1, test.bet2, test.score);
  
  if (result) {
    console.log(`   Result: isDraw=${result.isDraw}, winner=${result.winner?.displayName || 'null'}`);
    console.log(`   Expected: ${test.expected}`);
    
    if (result.isDraw) {
      console.log(`   ✅ DRAW`);
    } else if (result.winner?.displayName === 'User A') {
      console.log(`   ✅ User A (ล) wins`);
    } else if (result.winner?.displayName === 'User B') {
      console.log(`   ✅ User B (ต) wins`);
    }
  } else {
    console.log(`   Result: null (not a price range bet)`);
  }
  
  console.log('');
});
