require('dotenv').config();
const bettingResultService = require('./services/betting/bettingResultService');

async function testCalculations() {
  await bettingResultService.ensureInitialized();

  console.log('\n═══════════════════════════════════════════════════════════════════════════════════');
  console.log('🧪 TEST RESULT CALCULATIONS');
  console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

  // Test Case 1: ผลออกในช่วง (เสมอ)
  console.log('📌 Test Case 1: ผลออกในช่วง (เสมอ)');
  console.log('   paa"BOY" เล่น 300-340 ล 30 ฟ้า vs นุช519 reply ล');
  console.log('   ผลออก: 320 (อยู่ในช่วง 300-340)\n');

  const pair1 = {
    bet1: {
      userId: 'Ua01232445a58162e1518b510fcaf01b5',
      displayName: 'paa"BOY"',
      userBName: 'นุช519',
      amount: 30,
      price: '300-340 ล 30 ฟ้า',
      method: 2,
    },
    bet2: {
      userId: 'Uf00f7dcba844fbc87a181897bcb863e3',
      displayName: 'นุช519',
      userBName: 'paa"BOY"',
      amount: 30,
      price: 'ล',
      method: 1,
    },
  };

  const result1 = bettingResultService.calculateResultWithFees(pair1, 'ฟ้า', 320);
  console.log(`   ✅ ผลลัพธ์:`);
  console.log(`      isDraw: ${result1.isDraw}`);
  console.log(`      Winner: ${result1.winner.displayName}`);
  console.log(`      Loser: ${result1.loser.displayName}`);
  console.log(`      Winner Net: ${result1.winner.netAmount} บาท`);
  console.log(`      Loser Net: ${result1.loser.netAmount} บาท`);
  console.log(`      Expected Symbol: ${result1.isDraw ? '⛔️' : '✅'}\n`);

  // Test Case 2: ผลออกต่ำกว่าช่วง (ฝ่าย ย ชนะ)
  console.log('📌 Test Case 2: ผลออกต่ำกว่าช่วง (ฝ่าย ย ชนะ)');
  console.log('   💓Noon💓 เล่น 310-320 ย 20 ฟ้า vs ธา มือทอง reply ต');
  console.log('   ผลออก: 305 (ต่ำกว่าช่วง 310-320)\n');

  const pair2 = {
    bet1: {
      userId: 'Uc2a009fe53d51946657363bdbb7d1374',
      displayName: '💓Noon💓',
      userBName: 'ธา  มือทอง',
      amount: 20,
      price: '310-320 ย 20 ฟ้า',
      method: 2,
    },
    bet2: {
      userId: 'U123456789',
      displayName: 'ธา  มือทอง',
      userBName: '💓Noon💓',
      amount: 20,
      price: 'ต',
      method: 1,
    },
  };

  const result2 = bettingResultService.calculateResultWithFees(pair2, 'ฟ้า', 305);
  console.log(`   ✅ ผลลัพธ์:`);
  console.log(`      isDraw: ${result2.isDraw}`);
  console.log(`      Winner: ${result2.winner.displayName}`);
  console.log(`      Loser: ${result2.loser.displayName}`);
  console.log(`      Winner Net: ${result2.winner.netAmount} บาท`);
  console.log(`      Loser Net: ${result2.loser.netAmount} บาท`);
  console.log(`      Expected Symbol: ${result2.isDraw ? '⛔️' : (result2.winner.userId === 'Uc2a009fe53d51946657363bdbb7d1374' ? '✅' : '❌')}\n`);

  // Test Case 3: ผลออกสูงกว่าช่วง (ฝ่าย ล ชนะ)
  console.log('📌 Test Case 3: ผลออกสูงกว่าช่วง (ฝ่าย ล ชนะ)');
  console.log('   paa"BOY" เล่น 300-340 ล 30 ฟ้า vs นุช519 reply ล');
  console.log('   ผลออก: 350 (สูงกว่าช่วง 300-340)\n');

  const pair3 = {
    bet1: {
      userId: 'Ua01232445a58162e1518b510fcaf01b5',
      displayName: 'paa"BOY"',
      userBName: 'นุช519',
      amount: 30,
      price: '300-340 ล 30 ฟ้า',
      method: 2,
    },
    bet2: {
      userId: 'Uf00f7dcba844fbc87a181897bcb863e3',
      displayName: 'นุช519',
      userBName: 'paa"BOY"',
      amount: 30,
      price: 'ล',
      method: 1,
    },
  };

  const result3 = bettingResultService.calculateResultWithFees(pair3, 'ฟ้า', 350);
  console.log(`   ✅ ผลลัพธ์:`);
  console.log(`      isDraw: ${result3.isDraw}`);
  console.log(`      Winner: ${result3.winner.displayName}`);
  console.log(`      Loser: ${result3.loser.displayName}`);
  console.log(`      Winner Net: ${result3.winner.netAmount} บาท`);
  console.log(`      Loser Net: ${result3.loser.netAmount} บาท`);
  console.log(`      Expected Symbol: ${result3.isDraw ? '⛔️' : '✅'}\n`);

  console.log('═══════════════════════════════════════════════════════════════════════════════════\n');
}

testCalculations().catch(console.error);
