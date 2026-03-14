/**
 * Test Slash Format Parsing
 * ทดสอบการ parse รูปแบบ slash ที่มี / ระหว่าง amount และ slip name
 */

const BettingMessageParserService = require('./services/betting/bettingMessageParserService');

console.log('🧪 Testing Slash Format Parsing\n');

const testCases = [
  { message: 'ไล่/370-400/50/เป็ด', description: 'With slash before slip name' },
  { message: 'ไล่/370-400/50เป็ด', description: 'Without slash before slip name' },
  { message: 'ต/360-400/20/เป็ด', description: 'ยั้ง with slash' },
  { message: 'ต/360-400/20เป็ด', description: 'ยั้ง without slash' },
  { message: 'ล/325-340/100/ฟ้า', description: 'ไล่ with slash' },
  { message: 'ล/325-340/100ฟ้า', description: 'ไล่ without slash' },
];

testCases.forEach(test => {
  console.log(`📝 Message: ${test.message}`);
  console.log(`   Description: ${test.description}`);
  
  const result = BettingMessageParserService.parseMessage(test.message);
  
  if (result.success) {
    console.log(`   ✅ Success`);
    console.log(`      Method: ${result.method}`);
    console.log(`      Price: ${result.price}`);
    console.log(`      Side: ${result.side} (${result.sideCode})`);
    console.log(`      Amount: ${result.amount}`);
    console.log(`      Slip Name: "${result.slipName}"`);
  } else {
    console.log(`   ❌ Failed`);
    console.log(`      Error: ${result.error}`);
  }
  
  console.log('');
});
