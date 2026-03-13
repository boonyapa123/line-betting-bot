require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

let googleAuth;
let sheets;

async function initialize() {
  try {
    let credentials;
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } else {
      const credentialsPath = path.join(__dirname, process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'credentials.json');
      credentials = JSON.parse(fs.readFileSync(credentialsPath));
    }

    googleAuth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    sheets = google.sheets({ version: 'v4', auth: googleAuth });
    console.log('✅ Google Sheets initialized');
  } catch (error) {
    console.error('❌ Error initializing:', error);
    throw error;
  }
}

async function analyzeBets() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A2:U`,
    });

    const values = response.data.values || [];
    console.log(`\n📊 Found ${values.length} rows in Bets sheet\n`);

    const bettingPairingService = require('./services/betting/bettingPairingService');
    const bettingResultService = require('./services/betting/bettingResultService');

    let analysis = [];
    let withResults = [];
    let withoutResults = [];

    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const rowIndex = i + 2; // +2 เพราะ header + 0-indexed

      const userAId = row[1] || '';
      const userAName = row[2] || '';
      const priceA = row[3] || '';
      const slipName = row[4] || '';
      const betTypeA = row[5] || '';
      const betAmountA = parseFloat(row[6]) || 0;
      const betAmountB = parseFloat(row[7]) || 0;
      const resultNumber = row[8] || '';
      const resultSymbol = row[9] || '';
      const userBId = row[10] || '';
      const userBName = row[11] || '';
      const priceB = row[12] || '';
      const betTypeB = row[13] || '';

      // ข้ามแถวที่ไม่มีคู่เล่น
      if (!userAId || !userBId) continue;

      const betAmount = Math.min(betAmountA, betAmountB) || betAmountA || betAmountB;

      // สร้าง pair object
      const pair = {
        bet1: {
          userId: userAId,
          displayName: userAName,
          userBName: userBName,
          amount: betAmount,
          price: priceA,
          method: priceA && priceA.includes('-') ? 2 : 1,
        },
        bet2: {
          userId: userBId,
          displayName: userBName,
          userBName: userAName,
          amount: betAmount,
          price: priceB,
          method: priceB && priceB.includes('-') ? 2 : 1,
        },
      };

      const item = {
        rowIndex,
        userAName,
        userBName,
        slipName,
        resultNumber,
        priceA,
        priceB,
        betAmount,
        currentSymbol: resultSymbol || '(ว่าง)',
      };

      // ถ้ามีผลลัพธ์ ให้คำนวณ
      if (resultNumber) {
        const result = bettingResultService.calculateResultWithFees(pair, slipName, parseInt(resultNumber));

        const isDraw = result.isDraw;
        const winner = result.winner;
        const loser = result.loser;

        // กำหนด symbol
        let expectedSymbol = isDraw ? '⛔️' : (winner.userId === userAId ? '✅' : '❌');

        // ตรวจสอบว่าตรงกับปัจจุบันหรือไม่
        const isCorrect = resultSymbol === expectedSymbol;

        item.expectedSymbol = expectedSymbol;
        item.isCorrect = isCorrect;
        item.isDraw = isDraw;
        item.winner = winner.displayName;
        item.loser = loser.displayName;
        item.winnerNetAmount = winner.netAmount;
        item.loserNetAmount = loser.netAmount;

        withResults.push(item);
      } else {
        withoutResults.push(item);
      }

      analysis.push(item);
    }

    // แสดงผลลัพธ์
    console.log('═══════════════════════════════════════════════════════════════════════════════════');
    console.log('📋 ANALYSIS RESULTS');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    if (withResults.length > 0) {
      console.log(`\n📊 รายการที่มีผลลัพธ์ (${withResults.length} รายการ):\n`);
      
      let correctCount = 0;
      let incorrectCount = 0;

      for (const item of withResults) {
        const status = item.isCorrect ? '✅' : '❌';
        console.log(`${status} Row ${item.rowIndex}: ${item.userAName} vs ${item.userBName}`);
        console.log(`   บั้งไฟ: ${item.slipName} | ผลออก: ${item.resultNumber}`);
        console.log(`   ราคา A: ${item.priceA || '(ไม่มี)'} | ราคา B: ${item.priceB || '(ไม่มี)'}`);
        console.log(`   ยอดเดิมพัน: ${item.betAmount} บาท`);
        console.log(`   ผลลัพธ์: ${item.isDraw ? '⛔️ เสมอ' : `${item.winner} ชนะ`}`);
        console.log(`   ปัจจุบัน: ${item.currentSymbol} | ควรเป็น: ${item.expectedSymbol}`);
        
        if (!item.isCorrect) {
          console.log(`   ⚠️  ต้องแก้ไข!`);
          incorrectCount++;
        } else {
          correctCount++;
        }
        console.log();
      }

      console.log(`📊 สรุป: ${correctCount} ถูก | ${incorrectCount} ผิด\n`);
    }

    if (withoutResults.length > 0) {
      console.log(`\n📋 รายการที่ยังไม่มีผลลัพธ์ (${withoutResults.length} รายการ):\n`);
      
      for (const item of withoutResults) {
        console.log(`⏳ Row ${item.rowIndex}: ${item.userAName} vs ${item.userBName}`);
        console.log(`   บั้งไฟ: ${item.slipName}`);
        console.log(`   ราคา A: ${item.priceA || '(ไม่มี)'} | ราคา B: ${item.priceB || '(ไม่มี)'}`);
        console.log(`   ยอดเดิมพัน: ${item.betAmount} บาท`);
        console.log();
      }
    }

    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    // บันทึกรายละเอียดลงไฟล์
    const reportPath = 'bets-analysis-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
    console.log(`📄 รายละเอียดบันทึกไว้ที่: ${reportPath}\n`);

  } catch (error) {
    console.error('❌ Error analyzing bets:', error);
  }
}

async function main() {
  await initialize();
  await analyzeBets();
}

main().catch(console.error);
