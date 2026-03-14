/**
 * Test Price Range Check
 * ตรวจสอบว่า checkPriceRangeResult ทำงานถูกต้องหรือไม่
 */

require('dotenv').config();

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const BettingResultService = require('./services/betting/bettingResultService');
const BetsSheetColumns = require('./services/betting/betsSheetColumns');

// Load credentials
const credentialsPath = path.join(__dirname, 'credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function testPriceRangeCheck() {
  try {
    console.log('📊 Fetching Bets sheet data...\n');

    // ดึงข้อมูลจากชีท Bets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Bets!A:U',
    });

    const rows = response.data.values || [];
    const dataRows = rows.slice(1);

    console.log('🔍 Testing Price Range Check Logic\n');

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
        console.log(`\n🔹 Row ${rowNum}:`);
        console.log(`   User A: ${userAName} (${sideA}) ${amount} บาท`);
        console.log(`   User B: ${userBName} (${sideB}) ${amountB} บาท`);
        console.log(`   Message A: ${messageA}`);
        console.log(`   Slip Name: "${slipName}"`);
        console.log(`   Result: ${result}`);
        console.log(`   Result Win/Lose A: ${resultWinLoseA}`);
        console.log(`   Result Win/Lose B: ${resultWinLoseB}`);
        
        console.log(`\n   📊 Parsed Data:`);
        console.log(`      Price: ${parsedRow.price}`);
        console.log(`      Side Code: ${parsedRow.sideCode}`);
        console.log(`      Amount: ${parsedRow.amount}`);
        console.log(`      Slip Name: "${parsedRow.slipName}"`);
        
        // ตรวจสอบ price range
        if (parsedRow.price && parsedRow.price.includes('-')) {
          const priceMatch = parsedRow.price.match(/(\d+)-(\d+)/);
          if (priceMatch) {
            const min = parseInt(priceMatch[1]);
            const max = parseInt(priceMatch[2]);
            const score = parseInt(result);
            
            console.log(`\n   💹 Price Range Check:`);
            console.log(`      Price Range: ${min}-${max}`);
            console.log(`      Result Score: ${score}`);
            console.log(`      In Range: ${score >= min && score <= max}`);
            
            if (score >= min && score <= max) {
              console.log(`      ✅ Expected: เสมอ (⛔️)`);
              console.log(`      ✅ Actual: ${resultWinLoseA}`);
              if (resultWinLoseA === '⛔️') {
                console.log(`      ✅ CORRECT`);
              } else {
                console.log(`      ❌ WRONG`);
              }
            } else if (score < min) {
              console.log(`      ✅ Expected: ย (ต่ำ) ชนะ`);
              console.log(`      ✅ Actual: ${resultWinLoseA}`);
              if (parsedRow.sideCode === 'ย' && resultWinLoseA === '✅') {
                console.log(`      ✅ CORRECT`);
              } else if (parsedRow.sideCode === 'ล' && resultWinLoseA === '❌') {
                console.log(`      ✅ CORRECT`);
              } else {
                console.log(`      ❌ WRONG`);
              }
            } else if (score > max) {
              console.log(`      ✅ Expected: ล (สูง) ชนะ`);
              console.log(`      ✅ Actual: ${resultWinLoseA}`);
              if (parsedRow.sideCode === 'ล' && resultWinLoseA === '✅') {
                console.log(`      ✅ CORRECT`);
              } else if (parsedRow.sideCode === 'ย' && resultWinLoseA === '❌') {
                console.log(`      ✅ CORRECT`);
              } else {
                console.log(`      ❌ WRONG`);
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

testPriceRangeCheck();
