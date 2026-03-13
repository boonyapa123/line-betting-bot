const bettingPairingService = require('./services/betting/bettingPairingService');

// ทดสอบกรณี: ฟ้า 340 ✅️
// A เล่น 300-340 ล 30 ฟ้า
// B reply A อยู่ฝั่งตรงข้าม (ย)

const pair = {
  bet1: {
    userId: 'Ua01232445a58162e1518b510fcaf01b5',
    displayName: 'paa"BOY"',
    slipName: 'ฟ้า',
    side: 'ล',
    sideCode: 'ล',
    amount: 30,
    price: '300-340',
    method: 2,
    userBId: 'Uc2a009fe53d51946657363bdbb7d1374',
    userBName: '💓Noon💓',
  },
  bet2: {
    userId: 'Uc2a009fe53d51946657363bdbb7d1374',
    displayName: '💓Noon💓',
    slipName: 'ฟ้า',
    side: 'ย',
    sideCode: 'ย',
    amount: 30,
    price: null,
    method: 1,
  },
};

const score = 340;

console.log('📊 Test Case: ฟ้า 340 ✅️');
console.log('A: paa"BOY" - 300-340 ล 30 ฟ้า');
console.log('B: 💓Noon💓 - reply (ย)');
console.log(`Score: ${score}\n`);

const result = bettingPairingService.constructor.calculateResult(pair, 'ฟ้า', score);

console.log('Result:');
console.log(`  isDraw: ${result.isDraw}`);
console.log(`  Winner: ${result.winner.displayName} (${result.winner.userId})`);
console.log(`  Loser: ${result.loser.displayName} (${result.loser.userId})`);

console.log('\n✅ Expected: isDraw = true (ผลออกในช่วง 300-340)');
console.log(`✅ Actual: isDraw = ${result.isDraw}`);

if (result.isDraw) {
  console.log('\n✅ PASS: ผลลัพธ์ถูกต้อง');
} else {
  console.log('\n❌ FAIL: ผลลัพธ์ไม่ถูกต้อง');
}
