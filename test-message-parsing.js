const BettingMessageParserService = require('./services/betting/bettingMessageParserService');

const testMessages = [
  "340-370 ย 100 ศ.ราช",
  "320-340 ย 100 คำไผ่",
  "ชล 500 ฟ้าหลังฝน"
];

console.log('='.repeat(60));
console.log('ทดสอบการถอดข้อความ');
console.log('='.repeat(60));

testMessages.forEach((message) => {
  console.log('\n📝 ข้อความ:', message);
  
  const parsedBet = BettingMessageParserService.parseMessage(message);
  
  if (parsedBet.success) {
    console.log('✅ สำเร็จ');
    console.log('   - ชื่อบั้งไฟ:', parsedBet.slipName);
    console.log('   - ยอดเงิน:', parsedBet.amount);
    console.log('   - เดิมพัน:', parsedBet.sideCode);
    console.log('   - ราคา:', parsedBet.price || '(ไม่มี)');
    console.log('   - วิธี:', parsedBet.method);
    
    console.log('\n   📋 รูปแบบแสดงผล:');
    console.log('   ' + BettingMessageParserService.formatBetInfo(parsedBet));
  } else {
    console.log('❌ ล้มเหลว');
    console.log('   - ข้อผิดพลาด:', parsedBet.error);
  }
  
  console.log('-'.repeat(60));
});
