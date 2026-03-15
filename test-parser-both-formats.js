const BettingMessageParserService = require('./services/betting/bettingMessageParserService');

console.log('🧪 Testing Parser for Both Formats\n');

// Test 1: ยั้ง/360-380/40เทพ
console.log('Test 1: ยั้ง/360-380/40เทพ');
const result1 = BettingMessageParserService.parseMessage('ยั้ง/360-380/40เทพ');
console.log('Result:', JSON.stringify(result1, null, 2));
console.log('✅ Success:', result1.success);
console.log('Side Code:', result1.sideCode);
console.log('Price:', result1.price);
console.log('Amount:', result1.amount);
console.log('Slip Name:', result1.slipName);
console.log('');

// Test 2: ยั้ง/390-410/10เทพ
console.log('Test 2: ยั้ง/390-410/10เทพ');
const result2 = BettingMessageParserService.parseMessage('ยั้ง/390-410/10เทพ');
console.log('Result:', JSON.stringify(result2, null, 2));
console.log('✅ Success:', result2.success);
console.log('Side Code:', result2.sideCode);
console.log('Price:', result2.price);
console.log('Amount:', result2.amount);
console.log('Slip Name:', result2.slipName);
console.log('');

// Test 3: ไล่/360-380/40เทพ (for comparison)
console.log('Test 3: ไล่/360-380/40เทพ (for comparison)');
const result3 = BettingMessageParserService.parseMessage('ไล่/360-380/40เทพ');
console.log('Result:', JSON.stringify(result3, null, 2));
console.log('✅ Success:', result3.success);
console.log('Side Code:', result3.sideCode);
console.log('');

// Test 4: ต/390-410/10เทพ (for comparison)
console.log('Test 4: ต/390-410/10เทพ (for comparison)');
const result4 = BettingMessageParserService.parseMessage('ต/390-410/10เทพ');
console.log('Result:', JSON.stringify(result4, null, 2));
console.log('✅ Success:', result4.success);
console.log('Side Code:', result4.sideCode);
