/**
 * Test Row 2 Parsing
 * ตรวจสอบว่า ไล่/370-400/50/เป็ด ถูก parse อย่างไร
 */

const BettingMessageParserService = require('./services/betting/bettingMessageParserService');

console.log('🧪 Testing Row 2 Message Parsing\n');

const message = 'ไล่/370-400/50/เป็ด';
console.log(`📝 Message: ${message}\n`);

const result = BettingMessageParserService.parseMessage(message);

console.log('Parsed Result:');
console.log(`  Success: ${result.success}`);
console.log(`  Method: ${result.method}`);
console.log(`  Price: ${result.price}`);
console.log(`  Side: ${result.side} (${resul