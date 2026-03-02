/**
 * Test Betting Round System - Both Methods
 * ทดสอบระบบจัดการรอบการเล่นพนัน (วิธีที่ 1 + วิธีที่ 2 + Reply Method)
 */

const BettingMessageParserService = require('./services/betting/bettingMessageParserService');
const bettingPairingService = require('./services/betting/bettingPairingService');

console.log('='.repeat(70));
console.log('🎰 BETTING ROUND SYSTEM - BOTH METHODS TEST SUITE');
console.log('='.repeat(70));

// ============================================
// TEST 1: Parse Reply Method
// ============================================
console.log('\n📝 TEST 1: Parse Reply Method');
console.log('-'.repeat(70));

const replyTests = [
  'ต',
  'ต.',
  'ตอบ', // Should fail
];

replyTests.forEach((msg) => {
  const result = BettingMessageParserService.parseReplyMessage(msg);
  console.log(`\n✓ ข้อความ: "${msg}"`);
  console.log(`  ผลลัพธ์: ${result.success ? '✅ สำเร็จ' : '❌ ล้มเหลว'}`);
  if (result.success) {
    console.log(`  - ประเภท: ${result.type}`);
    console.log(`  - ฝั่ง: ${result.side}`);
  } else {
    console.log(`  - ข้อผิดพลาด: ${result.error}`);
  }
});

// ============================================
// TEST 2: Parse วิธีที่ 1 (ราคาช่าง)
// ============================================
console.log('\n\n📝 TEST 2: Parse วิธีที่ 1 (ราคาช่าง)');
console.log('-'.repeat(70));

const method1Tests = [
  'ฟ้าหลังฝน ชล. 500',
  'พายุ ชถ. 1000',
  'เมฆา ชล. 250',
];

method1Tests.forEach((msg) => {
  const result = BettingMessageParserService.parseMessage(msg);
  console.log(`\n✓ ข้อความ: "${msg}"`);
  console.log(`  ผลลัพธ์: ${result.success ? '✅ สำเร็จ' : '❌ ล้มเหลว'}`);
  if (result.success) {
    console.log(`  - วิธี: ${result.method}`);
    console.log(`  - บั้งไฟ: ${result.slipName}`);
    console.log(`  - ฝั่ง: ${result.side} (${result.sideCode})`);
    console.log(`  - จำนวนเงิน: ${result.amount} บาท`);
  }
});

// ============================================
// TEST 3: Parse วิธีที่ 2 (ราคาคะแนน)
// ============================================
console.log('\n\n📝 TEST 3: Parse วิธีที่ 2 (ราคาคะแนน)');
console.log('-'.repeat(70));

const method2Tests = [
  '0/3(300-330) ล. 500 ฟ้าหลังฝน',
  '0/4(400-440) ย. 1000 พายุ',
  '1/2(200-220) ล. 750 เมฆา',
];

method2Tests.forEach((msg) => {
  const result = BettingMessageParserService.parseMessage(msg);
  console.log(`\n✓ ข้อความ: "${msg}"`);
  console.log(`  ผลลัพธ์: ${result.success ? '✅ สำเร็จ' : '❌ ล้มเหลว'}`);
  if (result.success) {
    console.log(`  - วิธี: ${result.method}`);
    console.log(`  - ราคา: ${result.price}`);
    console.log(`  - ฝั่ง: ${result.side} (${result.sideCode})`);
    console.log(`  - จำนวนเงิน: ${result.amount} บาท`);
    console.log(`  - บั้งไฟ: ${result.slipName}`);
  }
});

// ============================================
// TEST 4: Validate Bet - Reply Method
// ============================================
console.log('\n\n📝 TEST 4: Validate Bet - Reply Method');
console.log('-'.repeat(70));

const replyBet = {
  success: true,
  method: 'REPLY',
  slipName: 'ฟ้าหลังฝน',
  side: 'ต',
  sideCode: 'ต',
  amount: null,
  price: null,
};

const replyValidation = BettingMessageParserService.validateBet(replyBet);
console.log(`\n✓ ข้อมูล: REPLY Method`);
console.log(`  ผลลัพธ์: ${replyValidation.valid ? '✅ ถูกต้อง' : '❌ ผิด'}`);
if (!replyValidation.valid) {
  console.log(`  - ข้อผิดพลาด: ${replyValidation.error}`);
}

// ============================================
// TEST 5: Validate Bet - Direct Method
// ============================================
console.log('\n\n📝 TEST 5: Validate Bet - Direct Method');
console.log('-'.repeat(70));

const directBets = [
  {
    success: true,
    method: 1,
    slipName: 'ฟ้าหลังฝน',
    side: 'ไล่',
    sideCode: 'ชล',
    amount: 500,
    price: null,
  },
  {
    success: true,
    method: 2,
    slipName: 'ฟ้าหลังฝน',
    side: 'ไล่',
    sideCode: 'ล',
    amount: 500,
    price: '0/3(300-330)',
  },
];

directBets.forEach((bet, idx) => {
  const validation = BettingMessageParserService.validateBet(bet);
  console.log(`\n✓ ข้อมูล ${idx + 1}: วิธีที่ ${bet.method}`);
  console.log(`  ผลลัพธ์: ${validation.valid ? '✅ ถูกต้อง' : '❌ ผิด'}`);
  if (!validation.valid) {
    console.log(`  - ข้อผิดพลาด: ${validation.error}`);
  }
});

// ============================================
// TEST 6: Find Pairs - Reply Method
// ============================================
console.log('\n\n📝 TEST 6: Find Pairs - Reply Method');
console.log('-'.repeat(70));

const replyBets = [
  {
    timestamp: '2024-03-02T10:30:00Z',
    userId: 'U001',
    displayName: 'Alice',
    method: 'REPLY',
    price: '',
    side: 'ต',
    amount: null,
    slipName: 'ฟ้าหลังฝน',
    status: 'OPEN',
  },
  {
    timestamp: '2024-03-02T10:31:00Z',
    userId: 'U002',
    displayName: 'Bob',
    method: 'REPLY',
    price: '',
    side: 'ต',
    amount: null,
    slipName: 'ฟ้าหลังฝน',
    status: 'OPEN',
  },
];

const replyPairs = bettingPairingService.constructor.findPairs(replyBets);
console.log(`\n✓ ข้อมูล: ${replyBets.length} การเล่น`);
console.log(`  พบคู่: ${replyPairs.length} คู่`);
replyPairs.forEach((pair, idx) => {
  console.log(`\n  คู่ที่ ${idx + 1}:`);
  console.log(`    - ${pair.bet1.displayName} (${pair.bet1.userId})`);
  console.log(`    - ${pair.bet2.displayName} (${pair.bet2.userId})`);
});

// ============================================
// TEST 7: Find Pairs - Direct Method (วิธีที่ 1)
// ============================================
console.log('\n\n📝 TEST 7: Find Pairs - Direct Method (วิธีที่ 1)');
console.log('-'.repeat(70));

const directBets1 = [
  {
    timestamp: '2024-03-02T10:30:00Z',
    userId: 'U001',
    displayName: 'Alice',
    method: 1,
    price: '',
    side: 'ชล',
    amount: 500,
    slipName: 'ฟ้าหลังฝน',
    status: 'OPEN',
  },
  {
    timestamp: '2024-03-02T10:31:00Z',
    userId: 'U002',
    displayName: 'Bob',
    method: 1,
    price: '',
    side: 'ชถ',
    amount: 500,
    slipName: 'ฟ้าหลังฝน',
    status: 'OPEN',
  },
];

const directPairs1 = bettingPairingService.constructor.findPairs(directBets1);
console.log(`\n✓ ข้อมูล: ${directBets1.length} การเล่น`);
console.log(`  พบคู่: ${directPairs1.length} คู่`);
directPairs1.forEach((pair, idx) => {
  console.log(`\n  คู่ที่ ${idx + 1}:`);
  console.log(`    - ${pair.bet1.displayName} (${pair.bet1.side})`);
  console.log(`    - ${pair.bet2.displayName} (${pair.bet2.side})`);
});

// ============================================
// TEST 8: Find Pairs - Direct Method (วิธีที่ 2)
// ============================================
console.log('\n\n📝 TEST 8: Find Pairs - Direct Method (วิธีที่ 2)');
console.log('-'.repeat(70));

const directBets2 = [
  {
    timestamp: '2024-03-02T10:30:00Z',
    userId: 'U001',
    displayName: 'Alice',
    method: 2,
    price: '0/3(300-330)',
    side: 'ล',
    amount: 500,
    slipName: 'ฟ้าหลังฝน',
    status: 'OPEN',
  },
  {
    timestamp: '2024-03-02T10:31:00Z',
    userId: 'U002',
    displayName: 'Bob',
    method: 2,
    price: '0/3(300-330)',
    side: 'ย',
    amount: 500,
    slipName: 'ฟ้าหลังฝน',
    status: 'OPEN',
  },
];

const directPairs2 = bettingPairingService.constructor.findPairs(directBets2);
console.log(`\n✓ ข้อมูล: ${directBets2.length} การเล่น`);
console.log(`  พบคู่: ${directPairs2.length} คู่`);
directPairs2.forEach((pair, idx) => {
  console.log(`\n  คู่ที่ ${idx + 1}:`);
  console.log(`    - ${pair.bet1.displayName} (${pair.bet1.side})`);
  console.log(`    - ${pair.bet2.displayName} (${pair.bet2.side})`);
});

// ============================================
// TEST 9: Calculate Result - Reply Method
// ============================================
console.log('\n\n📝 TEST 9: Calculate Result - Reply Method');
console.log('-'.repeat(70));

const replyPair = replyPairs[0];
if (replyPair) {
  const replyResult = bettingPairingService.constructor.calculateResult(
    replyPair,
    'ฟ้าหลังฝน',
    null
  );
  console.log(`\n✓ บั้งไฟ: ฟ้าหลังฝน`);
  console.log(`  🏆 ชนะ: ${replyResult.winner.displayName}`);
  console.log(`  ❌ แพ้: ${replyResult.loser.displayName}`);
}

// ============================================
// TEST 10: Calculate Result - Direct Method
// ============================================
console.log('\n\n📝 TEST 10: Calculate Result - Direct Method');
console.log('-'.repeat(70));

const directPair1 = directPairs1[0];
if (directPair1) {
  const directResult1 = bettingPairingService.constructor.calculateResult(
    directPair1,
    'ฟ้าหลังฝน',
    null
  );
  console.log(`\n✓ บั้งไฟ: ฟ้าหลังฝน (วิธีที่ 1)`);
  console.log(`  🏆 ชนะ: ${directResult1.winner.displayName} (${directResult1.winner.side})`);
  console.log(`  ❌ แพ้: ${directResult1.loser.displayName} (${directResult1.loser.side})`);
}

const directPair2 = directPairs2[0];
if (directPair2) {
  const directResult2 = bettingPairingService.constructor.calculateResult(
    directPair2,
    'ฟ้าหลังฝน',
    315
  );
  console.log(`\n✓ บั้งไฟ: ฟ้าหลังฝน (วิธีที่ 2, คะแนน: 315)`);
  console.log(`  🏆 ชนะ: ${directResult2.winner.displayName}`);
  console.log(`  ❌ แพ้: ${directResult2.loser.displayName}`);
}

// ============================================
// TEST 11: Admin Commands
// ============================================
console.log('\n\n📝 TEST 11: Admin Commands');
console.log('-'.repeat(70));

const adminCommands = [
  ':เริ่ม ฟ้าหลังฝน',
  ':หยุด',
  ':สรุป ฟ้าหลังฝน 315',
];

adminCommands.forEach((cmd) => {
  const result = BettingMessageParserService.parseAdminCommand(cmd);
  console.log(`\n✓ คำสั่ง: "${cmd}"`);
  console.log(`  ผลลัพธ์: ${result.isCommand ? '✅ คำสั่ง' : '❌ ไม่ใช่คำสั่ง'}`);
  if (result.isCommand) {
    console.log(`  - ประเภท: ${result.command}`);
    if (result.slipName) console.log(`  - บั้งไฟ: ${result.slipName}`);
    if (result.score) console.log(`  - คะแนน: ${result.score}`);
  }
});

console.log('\n' + '='.repeat(70));
console.log('✅ ทดสอบเสร็จสิ้น');
console.log('='.repeat(70));
