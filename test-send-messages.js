/**
 * Test: ทดสอบการส่งข้อความแจ้งผลให้ผู้เล่นและกลุ่ม
 */

require('dotenv').config();

const PriceRangeCalculator = require('./services/betting/priceRangeCalculator');

async function main() {
  try {
    console.log('📊 ทดสอบการส่งข้อความแจ้งผล\n');

    // ข้อมูลตัวอย่าง
    const testCases = [
      {
        rowIndex: 2,
        userAName: 'paa"BOY"',
        userBName: 'นุช519',
        priceA: '300-320 ล 20 ฟ้า',
        resultNumber: 340,
        betAmount: 20,
        fireworkName: 'ฟ้า',
      },
      {
        rowIndex: 3,
        userAName: 'paa"BOY"',
        userBName: 'นุช519',
        priceA: '300-340 ล 30 ฟ้า',
        resultNumber: 340,
        betAmount: 30,
        fireworkName: 'ฟ้า',
      },
    ];

    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const testCase of testCases) {
      console.log(`Row ${testCase.rowIndex}: ${testCase.userAName} vs ${testCase.userBName}`);
      console.log(`ราคา: ${testCase.priceA}`);
      console.log(`ผลออก: ${testCase.resultNumber}\n`);

      // คำนวณผลลัพธ์
      const priceRange = PriceRangeCalculator.parsePriceRange(testCase.priceA);
      const result = PriceRangeCalculator.calculateResult(testCase.resultNumber, priceRange);

      // คำนวณยอดเงิน
      const FEE_PERCENTAGE = 0.1;
      const DRAW_FEE_PERCENTAGE = 0.05;

      let userAWinnings = 0;
      let userBWinnings = 0;

      if (result.isDraw) {
        const drawFee = Math.round(testCase.betAmount * DRAW_FEE_PERCENTAGE);
        userAWinnings = -drawFee;
        userBWinnings = -drawFee;
      } else {
        const fee = Math.round(testCase.betAmount * FEE_PERCENTAGE);
        const netWinAmount = testCase.betAmount - fee;

        if (result.winner === 'A') {
          userAWinnings = netWinAmount;
          userBWinnings = -testCase.betAmount;
        } else {
          userAWinnings = -testCase.betAmount;
          userBWinnings = netWinAmount;
        }
      }

      // สร้างข้อความ
      let finalResultSymbol = result.isDraw ? '⛔️' : (result.winner === 'A' ? '✅' : '❌');
      let userAResultText = result.isDraw ? '⛔️' : (result.winner === 'A' ? '✅' : '❌');
      let userBResultText = result.isDraw ? '⛔️' : (result.winner === 'A' ? '❌' : '✅');

      console.log(`📊 ผลลัพธ์:`);
      console.log(`   isDraw: ${result.isDraw}`);
      console.log(`   winner: ${result.winner}`);
      console.log(`   userAWinnings: ${userAWinnings}`);
      console.log(`   userBWinnings: ${userBWinnings}\n`);

      // สร้างข้อความให้ผู้เล่น A
      let messageA = '';
      if (finalResultSymbol === '✅') {
        messageA = `✅ ชนะแล้ว\n\n🎆 บั้งไฟ: ${testCase.fireworkName}\n💰 เดิมพัน: ${testCase.betAmount} บาท\n🏆 ได้รับ: ${userAWinnings.toFixed(0)} บาท\n💵 ยอดคงเหลือ: 1000 บาท\n👤 ผู้แพ้: ${testCase.userBName}\n\nยินดีด้วย! 🎉`;
      } else if (finalResultSymbol === '❌') {
        messageA = `❌ แพ้แล้ว\n\n🎆 บั้งไฟ: ${testCase.fireworkName}\n💰 เดิมพัน: ${testCase.betAmount} บาท\n💸 เสีย: ${Math.abs(userAWinnings).toFixed(0)} บาท\n💵 ยอดคงเหลือ: 1000 บาท\n👤 ผู้ชนะ: ${testCase.userBName}\n\nลองใหม่นะ 💪`;
      } else {
        messageA = `🤝 เสมอ\n\n🎆 บั้งไฟ: ${testCase.fireworkName}\n💰 เดิมพัน: ${testCase.betAmount} บาท\n💸 ค่าธรรมเนียม: ${Math.abs(userAWinnings).toFixed(0)} บาท\n💵 ยอดคงเหลือ: 1000 บาท\n\nเสมอกันครับ`;
      }

      console.log(`📤 ข้อความให้ ${testCase.userAName}:`);
      console.log(messageA);
      console.log();

      // สร้างข้อความให้ผู้เล่น B
      let messageB = '';
      if (finalResultSymbol === '✅') {
        messageB = `❌ แพ้แล้ว\n\n🎆 บั้งไฟ: ${testCase.fireworkName}\n💰 เดิมพัน: ${testCase.betAmount} บาท\n💸 เสีย: ${Math.abs(userBWinnings).toFixed(0)} บาท\n💵 ยอดคงเหลือ: 1000 บาท\n👤 ผู้ชนะ: ${testCase.userAName}\n\nลองใหม่นะ 💪`;
      } else if (finalResultSymbol === '❌') {
        messageB = `✅ ชนะแล้ว\n\n🎆 บั้งไฟ: ${testCase.fireworkName}\n💰 เดิมพัน: ${testCase.betAmount} บาท\n🏆 ได้รับ: ${userBWinnings.toFixed(0)} บาท\n💵 ยอดคงเหลือ: 1000 บาท\n👤 ผู้แพ้: ${testCase.userAName}\n\nยินดีด้วย! 🎉`;
      } else {
        messageB = `🤝 เสมอ\n\n🎆 บั้งไฟ: ${testCase.fireworkName}\n💰 เดิมพัน: ${testCase.betAmount} บาท\n💸 ค่าธรรมเนียม: ${Math.abs(userBWinnings).toFixed(0)} บาท\n💵 ยอดคงเหลือ: 1000 บาท\n\nเสมอกันครับ`;
      }

      console.log(`📤 ข้อความให้ ${testCase.userBName}:`);
      console.log(messageB);
      console.log();

      // สร้างข้อความให้กลุ่ม
      let groupMessage = `📊 ประกาศผลแทง\n`;
      groupMessage += `🎆 บั้งไฟ: ${testCase.fireworkName}\n`;
      groupMessage += `ผลที่ออก: ${testCase.resultNumber}\n`;
      groupMessage += `═══════════════════\n\n`;

      if (finalResultSymbol === '✅') {
        groupMessage += `✅ ${testCase.userAName} ชนะ\n`;
        groupMessage += `   เดิมพัน: ${testCase.betAmount} บาท\n`;
        groupMessage += `   ได้รับ: ${userAWinnings.toFixed(0)} บาท\n\n`;
        groupMessage += `❌ ${testCase.userBName} แพ้\n`;
        groupMessage += `   เดิมพัน: ${testCase.betAmount} บาท\n`;
        groupMessage += `   เสีย: ${Math.abs(userBWinnings).toFixed(0)} บาท\n`;
      } else if (finalResultSymbol === '❌') {
        groupMessage += `❌ ${testCase.userAName} แพ้\n`;
        groupMessage += `   เดิมพัน: ${testCase.betAmount} บาท\n`;
        groupMessage += `   เสีย: ${Math.abs(userAWinnings).toFixed(0)} บาท\n\n`;
        groupMessage += `✅ ${testCase.userBName} ชนะ\n`;
        groupMessage += `   เดิมพัน: ${testCase.betAmount} บาท\n`;
        groupMessage += `   ได้รับ: ${userBWinnings.toFixed(0)} บาท\n`;
      } else {
        groupMessage += `🤝 เสมอ\n`;
        groupMessage += `${testCase.userAName}: เดิมพัน ${testCase.betAmount} บาท | ค่าธรรมเนียม ${Math.abs(userAWinnings).toFixed(0)} บาท\n`;
        groupMessage += `${testCase.userBName}: เดิมพัน ${testCase.betAmount} บาท | ค่าธรรมเนียม ${Math.abs(userBWinnings).toFixed(0)} บาท\n`;
      }

      groupMessage += `═══════════════════`;

      console.log(`📢 ข้อความให้กลุ่ม:`);
      console.log(groupMessage);
      console.log();

      console.log('═══════════════════════════════════════════════════════════════\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
