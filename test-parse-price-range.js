/**
 * Test parsePriceRange
 * ทดสอบ parsePriceRange method
 */

const bettingPairingService = require('./services/betting/bettingPairingService');

console.log('🧪 Testing parsePriceRange\n');

const testCases = [
  { input: '360-400', expected: { min: 360, max: 400 } },
  { input: '370-410', expected: { min: 370, max: 410 } },
  { input: '(360-400)', expected: { min: 360, max: 400 } },
  { input: '(370-410)', expected: { min: 370, max: 410 } },
];

testCases.forEach(test => {
  const result = bettingPairingService.constructor.parsePriceRange(test.input);
  const match = result.min === test.expected.min && result.max === test.expected.max;
  
  console.log(`📝 Input: ${test.input}`);
  console.log(`   Expected: ${test.expected.min}-${test.expected.max}`);
  console.log(`   Actual: ${result.min}-${result.max}`);
  console.log(`   ${match ? '✅' : '❌'} ${match ? 'PASS' : 'FAIL'}`);
  console.log('');
});

// Test inRange logic
console.log('\n🧪 Testing inRange Logic\n');

const inRangeTests = [
  { price: '360-400', score: 360, expected: true },
  { price: '360-400', score: 380, expected: true },
  { price: '360-400', score: 400, expected: true },
  { price: '360-400', score: 410, expected: false },
  { price: '360-400', score: 350, expected: false },
  { price: '370-410', score: 370, expected: true },
  { price: '370-410', score: 410, expected: true },
  { price: '370-410', score: 411, expected: false },
];

inRangeTests.forEach(test => {
  const priceRange = bettingPairingService.constructor.parsePriceRange(test.price);
  const inRange = test.score >= priceRange.min && test.score <= priceRange.max;
  const match = inRange === test.expected;
  
  console.log(`📝 Price: ${test.price}, Score: ${test.score}`);
  console.log(`   Expected: ${test.expected}`);
  console.log(`   Actual: ${inRange}`);
  console.log(`   ${match ? '✅' : '❌'} ${match ? 'PASS' : 'FAIL'}`);
  console.log('');
});
