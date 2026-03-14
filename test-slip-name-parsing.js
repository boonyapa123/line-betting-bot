// Test regex pattern สำหรับ METHOD2_SLASH_PATTERN

const testMessage = 'ยั้ง/370-400/40เป็ด';

// Regex pattern เดิม
const METHOD2_SLASH_PATTERN_OLD = /^([ก-๙]+)\/(\d+[\-\.\/\*]\d+)\/(\d+)([ก-๙]+)$/;

// Regex pattern ใหม่
const METHOD2_SLASH_PATTERN_NEW = /^([ก-๙]+)\/(\d+[\-\.\/\*]\d+)\/(\d+)([ก-๙\s]+)$/;

console.log('=== Testing Regex Patterns ===\n');
console.log(`Test message: "${testMessage}"\n`);

// Test old pattern
console.log('OLD PATTERN: /^([ก-๙]+)\\/(\d+[\\-\\.\/\\*]\d+)\\/(\d+)([ก-๙]+)$/');
const matchOld = testMessage.match(METHOD2_SLASH_PATTERN_OLD);
if (matchOld) {
  console.log('✅ MATCHED');
  console.log(`  Group 1 (side): "${matchOld[1]}"`);
  console.log(`  Group 2 (price): "${matchOld[2]}"`);
  console.log(`  Group 3 (amount): "${matchOld[3]}"`);
  console.log(`  Group 4 (slipName): "${matchOld[4]}"`);
} else {
  console.log('❌ NOT MATCHED');
}

console.log('\n');

// Test new pattern
console.log('NEW PATTERN: /^([ก-๙]+)\\/(\d+[\\-\\.\/\\*]\d+)\\/(\d+)([ก-๙\\s]+)$/');
const matchNew = testMessage.match(METHOD2_SLASH_PATTERN_NEW);
if (matchNew) {
  console.log('✅ MATCHED');
  console.log(`  Group 1 (side): "${matchNew[1]}"`);
  console.log(`  Group 2 (price): "${matchNew[2]}"`);
  console.log(`  Group 3 (amount): "${matchNew[3]}"`);
  console.log(`  Group 4 (slipName): "${matchNew[4]}"`);
} else {
  console.log('❌ NOT MATCHED');
}

console.log('\n=== Testing parseMethod2Slash ===\n');

// Simulate parseMethod2Slash
function parseMethod2Slash(match) {
  const [, side, price, amount, slipName] = match;

  const sideMap = {
    'ล': 'ไล่',
    'ไล่': 'ไล่',
    'ย': 'ยั้ง',
    'ยั้ง': 'ยั้ง',
    'ต': 'ต่ำ/ยั่ง',
    'ส': 'สูง/ไล่',
  };

  const sideCodeMap = {
    'ล': 'ล',
    'ไล่': 'ล',
    'ย': 'ย',
    'ยั้ง': 'ย',
    'ต': 'ต',
    'ส': 'ส',
  };

  return {
    success: true,
    method: 2,
    price: price.trim(),
    side: sideMap[side] || side,
    sideCode: sideCodeMap[side] || side,
    amount: parseInt(amount),
    slipName: slipName.trim(),
    timestamp: new Date().toISOString(),
  };
}

if (matchNew) {
  const parsed = parseMethod2Slash(matchNew);
  console.log('Parsed result:');
  console.log(JSON.stringify(parsed, null, 2));
}
