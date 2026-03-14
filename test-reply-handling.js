/**
 * Test Reply Handling Fix
 * ทดสอบการแก้ไข getOppositeSide method
 */

const BetsSheetColumns = require('./services/betting/betsSheetColumns');

console.log('🧪 Testing getOppositeSide method...\n');

// Test cases
const testCases = [
  { input: 'ล', expected: 'ต', description: 'ไล่ → ยั้ง' },
  { input: 'ต', expected: 'ล', description: 'ยั้ง → ไล่' },
  { input: 'ชล', expected: 'ชถ', description: 'ชล → ชถ' },
  { input: 'ชถ', expected: 'ชล', description: 'ชถ → ชล' },
];

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  const result = BetsSheetColumns.getOppositeSide(test.input);
  const status = result === test.expected ? '✅' : '❌';
  
  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${status} ${test.description}`);
  console.log(`   Input: ${test.input} → Output: ${result} (Expected: ${test.expected})\n`);
});

console.log('🧪 Testing createPriceB method...\n');

// Test createPriceB
const priceATests = [
  { priceA: '360-400 ล 20 เป็ด', sideCode: 'ล', expected: '360-400 ต', description: 'ไล่/360-400/20เป็ด → ยั้ง' },
  { priceA: '370-400 ต 40 เป็ด', sideCode: 'ต', expected: '370-400 ล', description: 'ยั้ง/370-400/40เป็ด → ไล่' },
];

priceATests.forEach(test => {
  const result = BetsSheetColumns.createPriceB(test.priceA, test.sideCode);
  const status = result === test.expected ? '✅' : '❌';
  
  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${status} ${test.description}`);
  console.log(`   Input: ${test.priceA} (${test.sideCode}) → Output: ${result} (Expected: ${test.expected})\n`);
});

console.log('📊 Test Results:');
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   Total: ${passed + failed}\n`);

if (failed === 0) {
  console.log('🎉 All tests passed!');
} else {
  console.log('⚠️  Some tests failed!');
}
