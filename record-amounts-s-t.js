/**
 * Record: บันทึกยอดเงิน Column S และ T
 */

require('dotenv').config();

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const PriceRangeCalculator = require('./services/betting/priceRangeCalculator');

// Load credentials
const credentialsPath = path.join(__dirname, 'credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

// ฟังก์ชันคำนวณยอดเงิน
function calculateAmounts(priceStr, resultNumber, betAmount) {
  const priceRange = PriceRangeCalculator.parsePriceRange(priceStr);
  if (!priceRange) return { amountA: 0, amountB: 0 };

  const result = PriceRangeCalculator.calculateResult(resultNumber, priceRange);
  if (!result) return { amountA: 0, amountB: 0 };

  const FEE_PERCENTAGE = 0.1; // 10%
  const DRAW_FEE_PERCENTAGE = 0.05; // 5%

  if (result.isDraw) {
    // เสมอ: หัก 5% ทั้งสองฝั่ง
    const drawFee = Math.round(betAmount * DRAW_FEE_PERCENTAGE);
    return { amountA: -drawFee, amountB: -drawFee };
  }

  // ชนะ-แพ้: หัก 10% จากยอดเล่น
  const fee = Math.round(betAmount * FEE_PERCENTAGE);
  const netWinAmount = betAmount - fee;

  if (result.winner === 'A') {
    // A ชนะ
    return { amountA: netWinAmount, amountB: -betAmount };
  } else {
    // B ชนะ
    return { amountA: -betAmount, amountB: netWinAmount };
  }
}

async function main() {
  try {
    console.log('📊 บันทึกยอดเงิน Column S และ T\n');

    // ดึงข้อมูล
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });

    const rows = response.data.values || [];
    const resultNumber = 340;
    const updates = [];

    console.log(`ผลที่ออก: ${resultNumber}\n`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // เตรียมการอัปเดต
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const slipName = row[4] || '';
      const userAName = row[2] || '';
      const userBName = row[11] || '';
      const priceA = row[3] || '';
      const userBAmount = row[7] || '';
      const betAmount = parseInt(userBAmount) || 0;
      const resultA = row[9] || '';
      const resultB = row[10] || '';

      if (!slipName.includes('ฟ้า') || !userBAmount || !resultA || !resultB) continue;

      const rowIndex = i + 1;
      console.log(`Row ${rowIndex}: ${userAName} vs ${userBName}`);
      console.log(`   ราคา: ${priceA}`);
      console.log(`   ยอดเดิมพัน: ${betAmount} บาท`);

      const amounts = calculateAmounts(priceA, resultNumber, betAmount);
      console.log(`   ยอดเงิน A: ${amounts.amountA}`);
      console.log(`   ยอดเงิน B: ${amounts.amountB}`);
      console.log();

      // เพิ่มการอัปเดต
      updates.push({
        range: `${GOOGLE_WORKSHEET_NAME}!S${rowIndex}:T${rowIndex}`,
        values: [[amounts.amountA, amounts.amountB]],
      });
    }

    if (updates.length === 0) {
      console.log('❌ ไม่มีแถวที่ต้องอัปเดต');
      return;
    }

    // บันทึกยอดเงิน
    console.log(`📤 บันทึกยอดเงิน ${updates.length} แถว...`);
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      requestBody: {
        data: updates,
        valueInputOption: 'USER_ENTERED',
      },
    });

    console.log('✅ บันทึกสำเร็จ\n');

    // ตรวจสอบผลลัพธ์
    console.log('📋 ตรวจสอบผลลัพธ์ที่บันทึก...\n');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const afterResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });

    const afterRows = afterResponse.data.values || [];
    for (let i = 1; i < afterRows.length; i++) {
      const row = afterRows[i];
      const slipName = row[4] || '';
      const userBAmount = row[7] || '';

      if (!slipName.includes('ฟ้า') || !userBAmount) continue;

      const resultI = row[8] || '';
      const resultJ = row[9] || '';
      const resultK = row[10] || '';
      const resultS = row[18] || '';
      const resultT = row[19] || '';

      console.log(`Row ${i + 1}: ${resultI} | ${resultJ} | ${resultK} | ${resultS} | ${resultT}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
