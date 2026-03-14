/**
 * Check Result Announcement for 410
 * ตรวจสอบผลประกาศเมื่อผลออก 410 สำหรับบั้งไฟ เป็ด
 */

require('dotenv').config();

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const BetsSheetColumns = require('./services/betting/betsSheetColumns');
const bettingResultService = require('./services/betting/bettingResultService');

// Load credentials
const credentialsPath = path.join(__dirname, 'credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function checkResultAnnouncement() {
  try {
    console.log('📊 Fetching Bets sheet data...\n');

    // ดึงข้อมูลจากชีท Bets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Bets!A:U',
    });

    const rows = response.data.values || [];
    const dataRows = rows.slice(1);

    console.log('🔍 Checking Result Announcement for Score 410\n');

    dataRows.forEach((row, index) => {
      const rowNum = index + 2;
      
      // Parse row
      const parsedRow = BetsSheetColumns.parseRow(row);
      
      const userAName = row[2] || '';
      const userBName = row[11] || '';
      const messageA = row[3] || '';
      const slipName = row[4] || '';
      const sideA = row[5] || '';
      const amount = row[6] || '';
      const amountB = row[7] || '';
      const result = row[8] || '';
      const resultWinLoseA = row[9] || '';
      const resultWinLoseB = row[10] || '';
      const sideB = row[12] || '';

      // ถ้ามี User B และ Result
      if (userBName && result) {
        console.log(`\n🔹 Row ${rowNum}: ${slipName}`);
        console.log(`   User A: ${userAName} (${sideA}) ${amount} บาท`);
        console.log(`   User B: ${userBName} (${sideB}) ${amountB} บาท`);
        console.log(`   Message A: ${messageA}`);
        console.log(`   Result: ${result}`);
        
        // ตรวจสอบ price range
        if (parsedRow.price && parsedRow.price.includes('-')) {
          const priceMatch = parsedRow.price.match(/(\d+)-(\d+)/);
          if (priceMatch) {
            const min = parseInt(priceMatch[1]);
            const max = parseInt(priceMatch[2]);
            const score = parseInt(result);
            
            console.log(`\n   💹 Price Range Analysis:`);
            console.log(`      Price Range: ${min}-${max}`);
            console.log(`      Result Score: ${score}`);
            console.log(`      Side A: ${parsedRow.sideCode} (${sideA})`);
            console.log(`      Side B: ${parsedRow.sideCode === 'ล' ? 'ต' : 'ล'} (${sideB})`);
            
            // ตรวจสอบ logic
            let expectedResult = '';
            let expectedWinnerA = '';
            let expectedWinnerB = '';
            
            if (score >= min && score <= max) {
              // เสมอ
              expectedResult = 'เสมอ (⛔️)';
              expectedWinnerA = '⛔️';
              expectedWinnerB = '⛔️';
              console.log(`      Status: ✅ ผลอยู่ในช่วง → เสมอ`);
            } else if (score < min) {
              // ต่ำกว่าช่วง
              if (parsedRow.sideCode === 'ย') {
                expectedResult = 'ย (ต่ำ) ชนะ (✅)';
                expectedWinnerA = '✅';
                expectedWinnerB = '❌';
              } else {
                expectedResult = 'ล (สูง) แพ้ (❌)';
                expectedWinnerA = '❌';
                expectedWinnerB = '✅';
              }
              console.log(`      Status: ✅ ผลต่ำกว่าช่วง → ${expectedResult}`);
            } else if (score > max) {
              // สูงกว่าช่วง
              if (parsedRow.sideCode === 'ล') {
                expectedResult = 'ล (สูง) ชนะ (✅)';
                expectedWinnerA = '✅';
                expectedWinnerB = '❌';
              } else {
                expectedResult = 'ย (ต่ำ) แพ้ (❌)';
                expectedWinnerA = '❌';
                expectedWinnerB = '✅';
              }
              console.log(`      Status: ✅ ผลสูงกว่าช่วง → ${expectedResult}`);
            }
            
            console.log(`\n   📊 Expected vs Actual:`);
            console.log(`      Expected A: ${expectedWinnerA}`);
            console.log(`      Actual A:   ${resultWinLoseA}`);
            console.log(`      Match: ${expectedWinnerA === resultWinLoseA ? '✅' : '❌'}`);
            
            console.log(`      Expected B: ${expectedWinnerB}`);
            console.log(`      Actual B:   ${resultWinLoseB}`);
            console.log(`      Match: ${expectedWinnerB === resultWinLoseB ? '✅' : '❌'}`);
            
            // ตรวจสอบ fee
            const winAmount = Math.min(parseInt(amount) || 0, parseInt(amountB) || 0);
            if (expectedWinnerA === '⛔️') {
              const drawFee = Math.round(winAmount * 0.05);
              console.log(`\n   💰 Fee Calculation (Draw):`);
              console.log(`      Win Amount: ${winAmount} บาท`);
              console.log(`      Draw Fee (5%): ${drawFee} บาท`);
              console.log(`      User A Net: -${drawFee} บาท`);
              console.log(`      User B Net: -${drawFee} บาท`);
            } else {
              const fee = Math.round(winAmount * 0.10);
              const netWinAmount = winAmount - fee;
              console.log(`\n   💰 Fee Calculation (Win/Lose):`);
              console.log(`      Win Amount: ${winAmount} บาท`);
              console.log(`      Fee (10%): ${fee} บาท`);
              console.log(`      Net Win Amount: ${netWinAmount} บาท`);
              if (expectedWinnerA === '✅') {
                console.log(`      User A Net: +${netWinAmount} บาท`);
                console.log(`      User B Net: -${winAmount} บาท`);
              } else {
                console.log(`      User A Net: -${winAmount} บาท`);
                console.log(`      User B Net: +${netWinAmount} บาท`);
              }
            }
          }
        } else {
          console.log(`\n   ⚠️  No price range found`);
        }
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkResultAnnouncement();
