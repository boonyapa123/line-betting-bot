const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function testFullResultFlow() {
  try {
    const credentialsPath = path.join(__dirname, 'credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const worksheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

    console.log('\n📊 ทดสอบการประกาศผล "ฟ้า 340 ✅️" แบบสมบูรณ์');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    // Step 1: Parse result message
    console.log('Step 1: Parse result message\n');
    const message = 'ฟ้า 340 ✅️';
    console.log(`📝 ข้อความ: "${message}"\n`);

    const priceRangeMatch = message.match(/(\d+[\-\.\/\*]\d+)/);
    let priceRange = null;
    let messageWithoutPrice = message;

    if (priceRangeMatch) {
      priceRange = priceRangeMatch[1];
      messageWithoutPrice = message.replace(priceRange, '').trim();
    }

    const resultMatch = messageWithoutPrice.match(/(.+?)\s+(\d+)\s*(✅|❌|⛔️)/);
    if (!resultMatch) {
      console.log('❌ ไม่สามารถแยกข้อมูลได้');
      return;
    }

    const resultData = {
      priceRange: priceRange,
      fireworkName: resultMatch[1].trim(),
      resultNumber: resultMatch[2],
      result: resultMatch[3]
    };

    console.log(`✅ แยกข้อมูลสำเร็จ:`);
    console.log(`   - priceRange: ${resultData.priceRange || '(ไม่มี)'}`);
    console.log(`   - fireworkName: ${resultData.fireworkName}`);
    console.log(`   - resultNumber: ${resultData.resultNumber}`);
    console.log(`   - result: ${resultData.result}\n`);

    // Step 2: Find matching bets
    console.log('Step 2: Find matching bets\n');

    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: sheetId,
      range: `${worksheetName}!A:U`,
    });

    const rows = response.data.values || [];
    const matchingRows = [];

    console.log(`🔍 ค้นหา: priceRange="${resultData.priceRange}", fireworkName="${resultData.fireworkName}"\n`);

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 5) continue;

      const messageA = row[3] || '';
      const rowFireworkName = row[4] || '';
      const userBAmount = row[7] || '';
      const resultNumber = row[8] || '';

      const priceRangeMatchRow = messageA.match(/(\d+)-(\d+)/);
      const rowPriceRange = priceRangeMatchRow ? priceRangeMatchRow[0] : null;

      const nameMatch = resultData.fireworkName && rowFireworkName === resultData.fireworkName;
      
      // ถ้า priceRange เป็น null ให้ match ทั้งหมด
      let priceMatch = true;
      if (resultData.priceRange && resultData.priceRange !== 'null') {
        priceMatch = rowPriceRange === resultData.priceRange;
      }

      if (priceMatch && nameMatch && userBAmount && !resultNumber) {
        matchingRows.push({
          rowIndex: i + 1,
          data: row,
        });
      }
    }

    console.log(`✅ พบ ${matchingRows.length} รายการที่ตรงกัน\n`);

    if (matchingRows.length === 0) {
      console.log('⚠️ ไม่พบรายการที่ตรงกัน');
      return;
    }

    // Step 3: Show matching bets
    console.log('Step 3: Matching bets details\n');

    matchingRows.forEach((match, idx) => {
      const row = match.data;
      const userA = row[2];
      const userB = row[11];
      const betAmount = row[6];
      const priceA = row[3];

      console.log(`${idx + 1}. Row ${match.rowIndex}: ${userA} vs ${userB}`);
      console.log(`   ราคา A: ${priceA}`);
      console.log(`   ยอดเงิน: ${betAmount} บาท`);
      console.log('');
    });

    // Step 4: Calculate results
    console.log('Step 4: Calculate results for each bet\n');

    const bettingResultService = require('./services/betting/bettingResultService');

    matchingRows.forEach((match, idx) => {
      const row = match.data;
      const userAId = row[1];
      const userAName = row[2];
      const userBId = row[10];
      const userBName = row[11];
      const priceA = row[3];
      const priceB = row[12];
      const betAmountA = parseFloat(row[6]) || 0;
      const betAmountB = parseFloat(row[7]) || 0;
      const betAmount = betAmountB > 0 ? Math.min(betAmountA, betAmountB) : betAmountA;

      const extractSide = (priceStr) => {
        if (!priceStr) return null;
        const match = priceStr.match(/[ยลยั้งไล่ชลชถบถ]/);
        return match ? match[0] : null;
      };

      const sideA = extractSide(priceA);
      const hasPriceRangeA = priceA && priceA.includes('-');
      const hasPriceRangeB = priceB && priceB.includes('-');

      const pair = {
        bet1: {
          userId: userAId,
          displayName: userAName,
          amount: betAmount,
          price: priceA,
          side: sideA,
          method: hasPriceRangeA ? 2 : 1,
        },
        bet2: {
          userId: userBId,
          displayName: userBName,
          amount: betAmount,
          price: hasPriceRangeB ? priceB : null,
          side: sideA,
          method: hasPriceRangeB ? 2 : 'REPLY',
        },
      };

      try {
        const result = bettingResultService.calculateResultWithFees(
          pair,
          resultData.fireworkName,
          resultData.resultNumber
        );

        let userAResultText = '';
        let userBResultText = '';

        if (result.isDraw) {
          userAResultText = '⛔️';
          userBResultText = '⛔️';
        } else {
          if (result.winner.userId === userAId) {
            userAResultText = '✅';
            userBResultText = '❌';
          } else {
            userAResultText = '❌';
            userBResultText = '✅';
          }
        }

        console.log(`${idx + 1}. Row ${match.rowIndex}: ${userAName} vs ${userBName}`);
        console.log(`   ผลลัพธ์: ${result.isDraw ? 'เสมอ' : result.winner.displayName + ' ชนะ'}`);
        console.log(`   Column I (ผลที่ออก): ${resultData.resultNumber}`);
        console.log(`   Column J (ผลแพ้ชนะ A): ${userAResultText}`);
        console.log(`   Column K (ผลแพ้ชนะ B): ${userBResultText}`);
        console.log('');
      } catch (error) {
        console.error(`❌ Error calculating result for row ${match.rowIndex}:`, error.message);
      }
    });

    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');
    console.log('✅ ทดสอบสำเร็จ! ระบบพร้อมบันทึกผลลัพธ์\n');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  }
}

testFullResultFlow();
