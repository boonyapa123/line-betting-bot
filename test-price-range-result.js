// ทดสอบกรณี 1: ฟ้า 340 ✅️ (ผลออกในช่วง)
// A เล่น 300-340 ล 30 บาท
// B reply (ฝั่งตรงข้าม)
// ผลออก 340

console.log('\n\n========== ทดสอบกรณี 1: ผลออก 340 (ในช่วง 300-340) ==========\n');

const resultService = require('./services/betting/bettingResultService');

// Mock data
const bet1 = {
  userId: 'userA123',
  displayName: 'ฟ้า',
  price: '300-340 ล',  // Column D: ช่วงราคา 300-340 ล (สูง)
  amount: 30,
  method: 2,
  userBName: 'B_Name'
};

const bet2 = {
  userId: 'userB456',
  displayName: 'B_Name',
  price: null,  // reply - ไม่มีช่วงราคา
  amount: 30,
  method: 'REPLY'
};

const pair = { bet1, bet2 };
const slipName = 'SLIP001';
const score = 340;  // ผลออก 340

// ทดสอบ calculateResultWithFees
const fullResult = resultService.calculateResultWithFees(pair, slipName, score);
console.log('ผลจาก calculateResultWithFees:');
console.log('  isDraw:', fullResult.isDraw);
console.log('  drawFee:', fullResult.drawFee);
console.log('');

// ทดสอบการบันทึก
console.log('=== ผลการบันทึก ===');
const isDraw = fullResult.isDraw;
const winner = fullResult.winner;
console.log('Column I (ผลที่ออก):', score);
console.log('Column J (ผลแพ้ชนะ A):', isDraw ? '⛔️' : (winner.userId === bet1.userId ? '✅' : '❌'));
console.log('Column K (ผลแพ้ชนะ B):', isDraw ? '⛔️' : (winner.userId === bet1.userId ? '❌' : '✅'));
console.log('Column S (ยอดเงิน A):', isDraw ? -fullResult.drawFee : (winner.userId === bet1.userId ? fullResult.winner.netAmount : fullResult.loser.netAmount));
console.log('Column T (ยอดเงิน B):', isDraw ? -fullResult.drawFee : (winner.userId === bet2.userId ? fullResult.winner.netAmount : fullResult.loser.netAmount));

// ========== ทดสอบกรณี 2: ผลออก 250 (ต่ำกว่าช่วง 300-340 ล) ==========
console.log('\n\n========== ทดสอบกรณี 2: ผลออก 250 (ต่ำกว่าช่วง 300-340 ล) ==========\n');

const score2 = 250;  // ผลออก 250 - ต่ำกว่าช่วง
const fullResult2 = resultService.calculateResultWithFees(pair, slipName, score2);
console.log('ผลจาก calculateResultWithFees:');
console.log('  isDraw:', fullResult2.isDraw);
console.log('  winner:', fullResult2.winner.displayName);
console.log('  loser:', fullResult2.loser.displayName);
console.log('  fee:', fullResult2.fee);
console.log('');

console.log('=== ผลการบันทึก ===');
const isDraw2 = fullResult2.isDraw;
const winner2 = fullResult2.winner;
console.log('Column I (ผลที่ออก):', score2);
console.log('Column J (ผลแพ้ชนะ A):', isDraw2 ? '⛔️' : (winner2.userId === bet1.userId ? '✅' : '❌'));
console.log('Column K (ผลแพ้ชนะ B):', isDraw2 ? '⛔️' : (winner2.userId === bet1.userId ? '❌' : '✅'));
console.log('Column S (ยอดเงิน A):', isDraw2 ? -fullResult2.drawFee : (winner2.userId === bet1.userId ? fullResult2.winner.netAmount : fullResult2.loser.netAmount));
console.log('Column T (ยอดเงิน B):', isDraw2 ? -fullResult2.drawFee : (winner2.userId === bet2.userId ? fullResult2.winner.netAmount : fullResult2.loser.netAmount));

// ========== ทดสอบกรณี 3: ผลออก 350 (สูงกว่าช่วง 300-340 ล) ==========
console.log('\n\n========== ทดสอบกรณี 3: ผลออก 350 (สูงกว่าช่วง 300-340 ล) ==========\n');

const score3 = 350;  // ผลออก 350 - สูงกว่าช่วง
const fullResult3 = resultService.calculateResultWithFees(pair, slipName, score3);
console.log('ผลจาก calculateResultWithFees:');
console.log('  isDraw:', fullResult3.isDraw);
console.log('  winner:', fullResult3.winner.displayName);
console.log('  loser:', fullResult3.loser.displayName);
console.log('  fee:', fullResult3.fee);
console.log('');

console.log('=== ผลการบันทึก ===');
const isDraw3 = fullResult3.isDraw;
const winner3 = fullResult3.winner;
console.log('Column I (ผลที่ออก):', score3);
console.log('Column J (ผลแพ้ชนะ A):', isDraw3 ? '⛔️' : (winner3.userId === bet1.userId ? '✅' : '❌'));
console.log('Column K (ผลแพ้ชนะ B):', isDraw3 ? '⛔️' : (winner3.userId === bet1.userId ? '❌' : '✅'));
console.log('Column S (ยอดเงิน A):', isDraw3 ? -fullResult3.drawFee : (winner3.userId === bet1.userId ? fullResult3.winner.netAmount : fullResult3.loser.netAmount));
console.log('Column T (ยอดเงิน B):', isDraw3 ? -fullResult3.drawFee : (winner3.userId === bet2.userId ? fullResult3.winner.netAmount : fullResult3.loser.netAmount));
