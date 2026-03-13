/**
 * Test script: ทดสอบการคำนวณผลลัพธ์ตามช่วงราคา
 */

require('dotenv').config();

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

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

// ฟังก์ชันคำนวณผลลัพธ์ตามราคา
function calculatePriceRangeResult(priceStr, resultNumber) {
  const priceMatch = priceStr.match(/(\d+)-(\d+)\s+([ยล])/);
  if (!priceMatch) return null;

  const minPrice = parseInt(priceMatch[1]);
  const maxPrice = parseInt(priceMatch[2]);
  const side = priceMatch[3]; // ย = ต่ำ, ล = สูง

  const isInRange = resultNumber >= minPrice && resultNumber <= maxPrice;

  if (isInRange) {
    // ผลออกในช่วง → เสมอ
    return { resultA: '⛔️', resultB: '⛔️', reason: 'ผลออกในช่วง → เสมอ' };
  }

  if (resultNumber < minPrice) {
    // ผลต่ำกว่าช่วง
    if (side === 'ย') {
      // ฝ่าย ย (ต่ำ) ชนะ
      return { resultA: '✅', resultB: '❌', reason: 'ผลต่ำกว่าช่วง + ฝ่าย ย → ย ชนะ' };
    } else {
      // ฝ่าย ล (สูง) แพ้
      return { resultA: '❌', resultB: '✅', reason: 'ผลต่ำกว่าช่วง + ฝ่าย ล → ล แพ้' };
    }
  }

  if (resultNumber > maxPrice) {
    // ผลสูงกว่าช่วง
    if (side === 'ล') {
      // ฝ่าย ล (สูง) ชนะ
      return { resultA: '✅', resultB: '❌', reason: 'ผลสูงกว่าช่วง + ฝ่าย ล → ล ชนะ' };
    } else {
      // ฝ่าย ย (ต่ำ) แพ้
      return { resultA: '❌', resultB: '✅', reason: 'ผลสูงกว่าช่วง + ฝ่าย ย → ย แพ้' };
    }
  }

  return null;
}

async function main() {
  try {
    console.log('📊 Test: คำนวณผลลัพธ์ตามช่วงราคา\n');

    // ดึงข้อมูล
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });

    const rows = response.data.values || [];
    const resultNumber = 340;

    console.log(`ผลที่ออก: ${resultNumber}\n`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // ทดสอบแต่ละแถว
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const slipName = row[4] || '';
      const userAName = row[2] || '';
      const userBName = row[11] || '';
      const priceA = row[3] || '';
      const userBAmount = row[7] || '';

      if (!slipName.includes('ฟ้า') || !userBAmount) continue;

      console.log(`Row ${i + 1}: ${userAName} vs ${userBName}`);
      console.log(`   ราคา: ${priceA}`);

      const result = calculatePriceRangeResult(priceA, resultNumber);
      if (result) {
        console.log(`   ✅ ผลลัพธ์ A: ${result.resultA}`);
        console.log(`   ✅ ผลลัพธ์ B: ${result.resultB}`);
        console.log(`   📝 เหตุผล: ${result.reason}`);
      } else {
        console.log(`   ❌ ไม่สามารถคำนวณผลลัพธ์ได้`);
      }
      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
