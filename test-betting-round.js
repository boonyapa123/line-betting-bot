/**
 * Test Betting Round System
 * ทดสอบระบบจัดการรอบการเล่นพนัน
 */

const BettingMessageParserService = require('./services/betting/bettingMessageParserService');
const bettingPairingService = require('./services/betting/bettingPairingService');

console.log('='.repeat(60));
console.log('🎰 BETTING ROUND SYSTEM - TEST SUITE');
console.log('='.repeat(60));

// ============================================
// TEST 1: Parse วิธีที่ 1 (ราคาช่าง)
// ============================================
console.log('\n📝 TEST 1: Parse วิธีที่ 1 (ราคาช่าง)');
console.log('-'.repeat(60));

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
    console.log(`  - บั้งไฟ: ${result.slipName}`);
    console.log(`  - ฝั่ง: ${result.side} (${result.sideCode})`);
    console.log(`  - จำนวนเงิน: ${result.amount} บาท`);
  }
});

// ============================================
// TEST 2: Parse วิธีที่ 2 (ราคาคะแนน)
// ============================================
console.log('\n\n📝 TEST 2: Parse วิธีที่ 2 (ราคาคะแนน)');
console.log('-'.repeat(60));

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
    console.log(`  - ราคา: ${result.price}`);
    console.log(`  - ฝั่ง: ${result.side} (${result.sideCode})`);
    console.log(`  - จำนวนเงิน: ${result.amount} บาท`);
    console.log(`  - บั้งไฟ: ${result.slipName}`);
  }
});

// ============================================
// TEST 3: ข้อความผิดรูปแบบ
// ============================================
console.log('\n\n📝 TEST 3: ข้อความผิดรูปแบบ');
console.log('-'.repeat(60));

const invalidTests = [
  'ฟ้าหลังฝนชล.500', // ลืมเว้นวรรค
  '0/3(300-330)ล.500ฟ้าหลังฝน', // ลืมเว้นวรรค
  'ฟ้าหลังฝน ชล 500', // ลืมจุด
  'random text', // ไม่ตรงรูปแบบ
];

invalidTests.forEach((msg) => {
  const result = BettingMessageParserService.parseMessage(msg);
  console.log(`\n✗ ข้อความ: "${msg}"`);
  console.log(`  ผลลัพธ์: ${result.success ? '✅ สำเร็จ' : '❌ ล้มเหลว'}`);
  if (!result.success) {
    console.log(`  - ข้อผิดพลาด: ${result.error}`);
  }
});

// ============================================
// TEST 4: Parse คำสั่งแอดมิน
// ============================================
console.log('\n\n📝 TEST 4: Parse คำสั่งแอดมิน');
console.log('-'.repeat(60));

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
    console.log(`  - Command: ${result.command}`);
    if (result.slipName) console.log(`  - Slip Name: ${result.slipName}`);
    if (result.score !== undefined) console.log(`  - Score: ${result.score}`);
  }
});

// ============================================
// TEST 5: Validate ข้อมูลการเล่น
// ============================================
console.log('\n\n📝 TEST 5: Validate ข้อมูลการเล่น');
console.log('-'.repeat(60));

const validateTests = [
  {
    name: 'ข้อมูลถูกต้อง',
    data: {
      success: true,
      method: 1,
      slipName: 'ฟ้าหลังฝน',
      side: 'ไล่',
      amount: 500,
    },
  },
  {
    name: 'จำนวนเงิน 0',
    data: {
      success: true,
      method: 1,
      slipName: 'ฟ้าหลังฝน',
      side: 'ไล่',
      amount: 0,
    },
  },
  {
    name: 'จำนวนเงินเกินขีดจำกัด',
    data: {
      success: true,
      method: 1,
      slipName: 'ฟ้าหลังฝน',
      side: 'ไล่',
      amount: 2000000,
    },
  },
  {
    name: 'ชื่อบั้งไฟว่าง',
    data: {
      success: true,
      method: 1,
      slipName: '',
      side: 'ไล่',
      amount: 500,
    },
  },
];

validateTests.forEach(({ name, data }) => {
  const result = BettingMessageParserService.validateBet(data);
  console.log(`\n✓ ${name}`);
  console.log(`  ผลลัพธ์: ${result.valid ? '✅ ถูกต้อง' : '❌ ผิด'}`);
  if (!result.valid) {
    console.log(`  - ข้อผิดพลาด: ${result.error}`);
  }
});

// ============================================
// TEST 6: จับคู่การเล่น (Pairing)
// ============================================
console.log('\n\n📝 TEST 6: จับคู่การเล่น (Pairing)');
console.log('-'.repeat(60));

const bets = [
  {
    userId: 'U001',
    displayName: 'Alice',
    method: 1,
    price: null,
    side: 'ชล',
    amount: 500,
    slipName: 'ฟ้าหลังฝน',
    status: 'OPEN',
  },
  {
    userId: 'U002',
    displayName: 'Bob',
    method: 1,
    price: null,
    side: 'ชถ',
    amount: 500,
    slipName: 'ฟ้าหลังฝน',
    status: 'OPEN',
  },
  {
    userId: 'U003',
    displayName: 'Charlie',
    method: 2,
    price: '0/3(300-330)',
    side: 'ล',
    amount: 1000,
    slipName: 'พายุ',
    status: 'OPEN',
  },
  {
    userId: 'U004',
    displayName: 'David',
    method: 2,
    price: '0/3(300-330)',
    side: 'ย',
    amount: 1000,
    slipName: 'พายุ',
    status: 'OPEN',
  },
  {
    userId: 'U005',
    displayName: 'Eve',
    method: 2,
    price: '0/3(300-330)',
    side: 'ล',
    amount: 500,
    slipName: 'เมฆา',
    status: 'OPEN',
  },
];

console.log('\nข้อมูลการเล่น:');
bets.forEach((bet, i) => {
  console.log(
    `${i + 1}. ${bet.displayName} - ${bet.slipName} ${bet.side} ${bet.amount} บาท`
  );
});

const pairs = bettingPairingService.constructor.findPairs(bets);

console.log(`\nคู่ที่จับได้: ${pairs.length} คู่`);
pairs.forEach((pair, i) => {
  console.log(`\n✓ คู่ที่ ${i + 1}:`);
  console.log(
    `  ${pair.bet1.displayName} (${pair.bet1.side}) vs ${pair.bet2.displayName} (${pair.bet2.side})`
  );
  console.log(`  บั้งไฟ: ${pair.bet1.slipName}, จำนวนเงิน: ${pair.bet1.amount} บาท`);
});

// ============================================
// TEST 7: คำนวณผลลัพธ์
// ============================================
console.log('\n\n📝 TEST 7: คำนวณผลลัพธ์');
console.log('-'.repeat(60));

const testPair = {
  bet1: {
    userId: 'U003',
    displayName: 'Charlie',
    method: 2,
    price: '0/3(300-330)',
    side: 'ไล่',
    amount: 1000,
    slipName: 'พายุ',
  },
  bet2: {
    userId: 'U004',
    displayName: 'David',
    method: 2,
    price: '0/3(300-330)',
    side: 'ยั้ง',
    amount: 1000,
    slipName: 'พายุ',
  },
};

console.log('\nคู่การเล่น:');
console.log(
  `${testPair.bet1.displayName} (${testPair.bet1.side}) vs ${testPair.bet2.displayName} (${testPair.bet2.side})`
);
console.log(`ราคา: ${testPair.bet1.price}, จำนวนเงิน: ${testPair.bet1.amount} บาท\n`);

const testScores = [315, 325, 335];

testScores.forEach((score) => {
  const result = bettingPairingService.constructor.calculateResult(
    testPair,
    'พายุ',
    score
  );

  console.log(`✓ คะแนนที่ออก: ${score}`);
  console.log(`  🏆 ชนะ: ${result.winner.displayName} +${result.winner.amount} บาท`);
  console.log(`  ❌ แพ้: ${result.loser.displayName} -${result.loser.amount} บาท\n`);
});

// ============================================
// SUMMARY
// ============================================
console.log('\n' + '='.repeat(60));
console.log('✅ ทดสอบเสร็จสิ้น');
console.log('='.repeat(60));
