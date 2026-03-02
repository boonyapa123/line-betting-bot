/**
 * ตัวอย่างการใช้งาน BettingRoundController
 * 
 * ขั้นตอนการทำงาน:
 * 1. Admin: :เริ่ม ฟ้าหลังฝน
 * 2. User: ฟ้าหลังฝน ชล. 500 (วิธีที่ 1)
 * 3. User: 0/3(300-330) ล. 500 ฟ้าหลังฝน (วิธีที่ 2)
 * 4. Admin: :หยุด
 * 5. Admin: :สรุป ฟ้าหลังฝน 315
 */

const bettingRoundController = require('../services/betting/bettingRoundController');
const BettingMessageParserService = require('../services/betting/bettingMessageParserService');

/**
 * ตัวอย่างที่ 1: Parse ข้อความวิธีที่ 1
 */
function example1_parseMethod1() {
  console.log('\n=== ตัวอย่างที่ 1: Parse วิธีที่ 1 (ราคาช่าง) ===\n');

  const message = 'ฟ้าหลังฝน ชล. 500';
  const result = BettingMessageParserService.parseMessage(message);

  console.log('ข้อความ:', message);
  console.log('ผลลัพธ์:', JSON.stringify(result, null, 2));
}

/**
 * ตัวอย่างที่ 2: Parse ข้อความวิธีที่ 2
 */
function example2_parseMethod2() {
  console.log('\n=== ตัวอย่างที่ 2: Parse วิธีที่ 2 (ราคาคะแนน) ===\n');

  const message = '0/3(300-330) ล. 500 ฟ้าหลังฝน';
  const result = BettingMessageParserService.parseMessage(message);

  console.log('ข้อความ:', message);
  console.log('ผลลัพธ์:', JSON.stringify(result, null, 2));
}

/**
 * ตัวอย่างที่ 3: Parse คำสั่งแอดมิน
 */
function example3_parseAdminCommands() {
  console.log('\n=== ตัวอย่างที่ 3: Parse คำสั่งแอดมิน ===\n');

  const commands = [':เริ่ม ฟ้าหลังฝน', ':หยุด', ':สรุป ฟ้าหลังฝน 315'];

  for (const cmd of commands) {
    const result = BettingMessageParserService.parseAdminCommand(cmd);
    console.log(`คำสั่ง: ${cmd}`);
    console.log('ผลลัพธ์:', JSON.stringify(result, null, 2));
    console.log('---');
  }
}

/**
 * ตัวอย่างที่ 4: ตรวจสอบข้อความผิดรูปแบบ
 */
function example4_invalidMessages() {
  console.log('\n=== ตัวอย่างที่ 4: ข้อความผิดรูปแบบ ===\n');

  const invalidMessages = [
    'ฟ้าหลังฝนชล.500', // ลืมเว้นวรรค
    '0/3(300-330)ล.500ฟ้าหลังฝน', // ลืมเว้นวรรค
    'ฟ้าหลังฝน ชล 500', // ลืมจุด
  ];

  for (const msg of invalidMessages) {
    const result = BettingMessageParserService.parseMessage(msg);
    console.log(`ข้อความ: ${msg}`);
    console.log('ข้อผิดพลาด:', result.error);
    console.log('คำแนะนำ:', result.hint);
    console.log('---');
  }
}

/**
 * ตัวอย่างที่ 5: จับคู่การเล่น
 */
function example5_findPairs() {
  console.log('\n=== ตัวอย่างที่ 5: จับคู่การเล่น ===\n');

  const bettingPairingService = require('../services/betting/bettingPairingService');

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
  ];

  const pairs = bettingPairingService.constructor.findPairs(bets);

  console.log('ข้อมูลการเล่น:');
  bets.forEach((bet, i) => {
    console.log(
      `${i + 1}. ${bet.displayName} - ${bet.slipName} ${bet.side} ${bet.amount} บาท`
    );
  });

  console.log('\nคู่ที่จับได้:');
  pairs.forEach((pair, i) => {
    console.log(`\nคู่ที่ ${i + 1}:`);
    console.log(`  ${pair.bet1.displayName} (${pair.bet1.side}) vs ${pair.bet2.displayName} (${pair.bet2.side})`);
    console.log(`  บั้งไฟ: ${pair.bet1.slipName}, จำนวนเงิน: ${pair.bet1.amount} บาท`);
  });
}

/**
 * ตัวอย่างที่ 6: คำนวณผลลัพธ์
 */
function example6_calculateResult() {
  console.log('\n=== ตัวอย่างที่ 6: คำนวณผลลัพธ์ ===\n');

  const bettingPairingService = require('../services/betting/bettingPairingService');

  // คู่การเล่นวิธีที่ 2
  const pair = {
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

  console.log('คู่การเล่น:');
  console.log(`${pair.bet1.displayName} (${pair.bet1.side}) vs ${pair.bet2.displayName} (${pair.bet2.side})`);
  console.log(`ราคา: ${pair.bet1.price}, จำนวนเงิน: ${pair.bet1.amount} บาท\n`);

  // ทดสอบคะแนนต่างๆ
  const scores = [315, 325, 335];

  for (const score of scores) {
    const result = bettingPairingService.constructor.calculateResult(
      pair,
      'พายุ',
      score
    );

    console.log(`คะแนนที่ออก: ${score}`);
    console.log(`🏆 ชนะ: ${result.winner.displayName} +${result.winner.amount} บาท`);
    console.log(`❌ แพ้: ${result.loser.displayName} -${result.loser.amount} บาท\n`);
  }
}

/**
 * ตัวอย่างที่ 7: Validate ข้อมูลการเล่น
 */
function example7_validateBet() {
  console.log('\n=== ตัวอย่างที่ 7: Validate ข้อมูลการเล่น ===\n');

  const testCases = [
    {
      success: true,
      method: 1,
      slipName: 'ฟ้าหลังฝน',
      side: 'ไล่',
      amount: 500,
    },
    {
      success: true,
      method: 1,
      slipName: 'ฟ้าหลังฝน',
      side: 'ไล่',
      amount: 0, // จำนวนเงิน 0
    },
    {
      success: true,
      method: 1,
      slipName: 'ฟ้าหลังฝน',
      side: 'ไล่',
      amount: 2000000, // เกินขีดจำกัด
    },
    {
      success: true,
      method: 1,
      slipName: '',
      side: 'ไล่',
      amount: 500, // ชื่อบั้งไฟว่าง
    },
  ];

  for (const testCase of testCases) {
    const validation = BettingMessageParserService.validateBet(testCase);
    console.log('ข้อมูล:', JSON.stringify(testCase, null, 2));
    console.log('ผลลัพธ์:', validation);
    console.log('---');
  }
}

// รัน examples
if (require.main === module) {
  example1_parseMethod1();
  example2_parseMethod2();
  example3_parseAdminCommands();
  example4_invalidMessages();
  example5_findPairs();
  example6_calculateResult();
  example7_validateBet();
}

module.exports = {
  example1_parseMethod1,
  example2_parseMethod2,
  example3_parseAdminCommands,
  example4_invalidMessages,
  example5_findPairs,
  example6_calculateResult,
  example7_validateBet,
};
