const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

let googleAuth;
let sheets;

async function initializeGoogleAuth() {
  try {
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json';
    
    if (!fs.existsSync(keyFile)) {
      console.error('❌ Service account key file not found:', keyFile);
      return false;
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    googleAuth = await auth.getClient();
    sheets = google.sheets({ version: 'v4', auth: googleAuth });
    console.log('✅ Google Auth initialized\n');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Google Auth:', error.message);
    return false;
  }
}

async function recordAllResults() {
  try {
    // ดึงข้อมูลทั้งหมดจาก Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });

    const rows = response.data.values || [];
    
    console.log('📊 === Recording Results for All Bets (Result: 340 ✅️) ===\n');
    console.log(`📋 Total rows: ${rows.length}`);
    console.log(`📋 Worksheet: ${GOOGLE_WORKSHEET_NAME}\n`);

    const resultNumber = 340;
    const resultSymbol = '✅';
    const oppositeResult = '❌';

    let recordedCount = 0;
    let skippedCount = 0;

    // ประมวลผลแต่ละแถว
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // ตรวจสอบว่ามีข้อมูลการเดิมพันหรือไม่
      const userAId = row[1] || '';
      const userAName = row[2] || '';
      const userBId = row[10] || '';
      const userBName = row[11] || '';
      const betTypeA = row[5] || '';
      const priceA = row[3] || '';
      const priceB = row[12] || '';
      const betAmountA = parseFloat(row[6]) || 0;
      const betAmountB = parseFloat(row[7]) || 0;
      const betAmount = betAmountB > 0 ? Math.min(betAmountA, betAmountB) : betAmountA;

      // ตรวจสอบว่ามีผลบันทึกแล้วหรือไม่
      const existingResult = row[8] || '';
      
      if (!userAId || !userBId) {
        console.log(`⏭️  Row ${i + 1}: ข้ามเพราะไม่มีคู่เล่นที่สมบูรณ์`);
        skippedCount++;
        continue;
      }

      if (existingResult) {
        console.log(`⏭️  Row ${i + 1}: ข้ามเพราะมีผลบันทึกแล้ว (${existingResult})`);
        skippedCount++;
        continue;
      }

      // คำนวนผลแพ้ชนะตามประเภทการเดิมพัน
      let finalResultSymbol = resultSymbol;
      let userAWinnings = 0;
      let userBWinnings = 0;

      // ตรวจสอบการเล่นแบบช่วงราคา
      if (priceA && priceA.includes('-')) {
        console.log(`\n🔍 Row ${i + 1}: ช่วงราคา`);
        console.log(`   User A: ${userAName}`);
        console.log(`   User B: ${userBName}`);
        console.log(`   Bet Type: ${betTypeA}`);
        console.log(`   Price Range: ${priceA}`);

        // ดึงช่วงราคา
        const match = priceA.match(/(\d+)-(\d+)/);
        if (match) {
          const minPrice = parseInt(match[1]);
          const maxPrice = parseInt(match[2]);
          
          console.log(`   Range: ${minPrice}-${maxPrice}, Result: ${resultNumber}`);

          const isInRange = resultNumber >= minPrice && resultNumber <= maxPrice;
          
          if (isInRange) {
            // คะแนนอยู่ในช่วง → เสมอ
            console.log(`   ✅ Result ${resultNumber} is IN range → Draw`);
            finalResultSymbol = '⛔️';
            const commission = betAmount * 0.05;
            userAWinnings = -commission;
            userBWinnings = -commission;
          } else {
            // คะแนนนอกช่วง → ตรวจสอบประเภทการเดิมพัน
            const lowBetTypes = ['ชถ', 'ย'];
            const highBetTypes = ['ชล', 'ล'];

            if (lowBetTypes.includes(betTypeA)) {
              if (resultNumber < minPrice) {
                console.log(`   ✅ Result ${resultNumber} < ${minPrice} → Low side (${betTypeA}) wins`);
                finalResultSymbol = '✅';
                const commission = betAmount * 0.1;
                userAWinnings = betAmount - commission;
                userBWinnings = -betAmount;
              } else {
                console.log(`   ❌ Result ${resultNumber} > ${maxPrice} → High side wins`);
                finalResultSymbol = '❌';
                const commission = betAmount * 0.1;
                userAWinnings = -betAmount;
                userBWinnings = betAmount - commission;
              }
            } else if (highBetTypes.includes(betTypeA)) {
              if (resultNumber < minPrice) {
                console.log(`   ❌ Result ${resultNumber} < ${minPrice} → Low side wins`);
                finalResultSymbol = '❌';
                const commission = betAmount * 0.1;
                userAWinnings = -betAmount;
                userBWinnings = betAmount - commission;
              } else {
                console.log(`   ✅ Result ${resultNumber} > ${maxPrice} → High side (${betTypeA}) wins`);
                finalResultSymbol = '✅';
                const commission = betAmount * 0.1;
                userAWinnings = betAmount - commission;
                userBWinnings = -betAmount;
              }
            }
          }
        }
      } else {
        // การเล่นแบบเดิม (ไม่มีช่วงราคา)
        console.log(`\n🔍 Row ${i + 1}: การเล่นแบบเดิม`);
        console.log(`   User A: ${userAName}`);
        console.log(`   User B: ${userBName}`);
        console.log(`   Bet Type: ${betTypeA}`);
        console.log(`   Price: ${priceA}`);

        // ตรวจสอบประเภทการเดิมพัน
        if (resultSymbol === '✅' && (betTypeA === 'ชล' || betTypeA === 'ล')) {
          console.log(`   ✅ Result ✅️ + ${betTypeA} → User A wins`);
          finalResultSymbol = '✅';
          const commission = betAmount * 0.1;
          userAWinnings = betAmount - commission;
          userBWinnings = -betAmount;
        } else if (resultSymbol === '✅' && (betTypeA === 'ชถ' || betTypeA === 'ย')) {
          console.log(`   ❌ Result ✅️ + ${betTypeA} → User A loses`);
          finalResultSymbol = '❌';
          const commission = betAmount * 0.1;
          userAWinnings = -betAmount;
          userBWinnings = betAmount - commission;
        } else if (resultSymbol === '❌' && (betTypeA === 'ชล' || betTypeA === 'ล')) {
          console.log(`   ❌ Result ❌️ + ${betTypeA} → User A loses`);
          finalResultSymbol = '❌';
          const commission = betAmount * 0.1;
          userAWinnings = -betAmount;
          userBWinnings = betAmount - commission;
        } else if (resultSymbol === '❌' && (betTypeA === 'ชถ' || betTypeA === 'ย')) {
          console.log(`   ✅ Result ❌️ + ${betTypeA} → User A wins`);
          finalResultSymbol = '✅';
          const commission = betAmount * 0.1;
          userAWinnings = betAmount - commission;
          userBWinnings = -betAmount;
        }
      }

      const oppositeResultSymbol = finalResultSymbol === '✅' ? '❌' : finalResultSymbol === '❌' ? '✅' : '⛔️';

      // สร้างข้อความผลลัพธ์ที่ถูกต้อง
      let userAResultText = '';
      let userBResultText = '';

      if (finalResultSymbol === '✅') {
        userAResultText = `ชนะ ${Math.abs(userAWinnings).toFixed(0)} บาท`;
        userBResultText = `แพ้ ${Math.abs(userBWinnings).toFixed(0)} บาท`;
      } else if (finalResultSymbol === '❌') {
        userAResultText = `แพ้ ${Math.abs(userAWinnings).toFixed(0)} บาท`;
        userBResultText = `ชนะ ${Math.abs(userBWinnings).toFixed(0)} บาท`;
      } else if (finalResultSymbol === '⛔️') {
        userAResultText = `เสมอ หัก ${Math.abs(userAWinnings).toFixed(0)} บาท`;
        userBResultText = `เสมอ หัก ${Math.abs(userBWinnings).toFixed(0)} บาท`;
      }

      console.log(`   💰 Bet Amount: ${betAmount} บาท`);
      console.log(`   📊 Final Result: ${finalResultSymbol}`);
      console.log(`   📝 User A: ${userAResultText}`);
      console.log(`   📝 User B: ${userBResultText}`);

      // อัปเดตผลลัพธ์ในชีท (Column I-U)
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${GOOGLE_WORKSHEET_NAME}!I${i + 1}:U${i + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            resultNumber,           // I: ผลที่ออก
            finalResultSymbol,      // J: ผลแพ้ชนะ
            oppositeResultSymbol,   // K: Opposite Result
            row[11] || '',          // L
            row[12] || '',          // M
            row[13] || '',          // N
            row[14] || '',          // O
            row[15] || '',          // P
            row[16] || '',          // Q
            row[17] || '',          // R
            userAResultText,        // S: ผลลัพธ์ A
            userBResultText,        // T: ผลลัพธ์ B
            '',                     // U: สถานะคู่
          ]],
        },
      });

      console.log(`   ✅ Updated row ${i + 1}`);
      recordedCount++;
    }

    console.log(`\n\n📊 === Summary ===`);
    console.log(`✅ Recorded: ${recordedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`📋 Total: ${recordedCount + skippedCount}`);

  } catch (error) {
    console.error('❌ Error recording results:', error.message);
    console.error('   Details:', error);
  }
}

async function main() {
  const initialized = await initializeGoogleAuth();
  if (initialized) {
    await recordAllResults();
  }
}

main().catch(console.error);
