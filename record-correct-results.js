/**
 * Script: บันทึกผลลัพธ์ที่ถูกต้องตามช่วงราคา
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

  console.log(`      Debug: minPrice=${minPrice}, maxPrice=${maxPrice}, resultNumber=${resultNumber}, isInRange=${resultNumber >= minPrice && resultNumber <= maxPrice}`);

  const isInRange = resultNumber >= minPrice && resultNumber <= maxPrice;

  if (isInRange) {
    return { resultA: '⛔️', resultB: '⛔️', reason: 'ผลออกในช่วง → เสมอ' };
  }

  if (resultNumber < minPrice) {
    if (side === 'ย') {
      return { resultA: '✅', resultB: '❌', reason: 'ผลต่ำกว่าช่วง + ฝ่าย ย → ย ชนะ' };
    } else {
      return { resultA: '❌', resultB: '✅', reason: 'ผลต่ำกว่าช่วง + ฝ่าย ล → ล แพ้' };
    }
  }

  if (resultNumber > maxPrice) {
    if (side === 'ล') {
      return { resultA: '✅', resultB: '❌', reason: 'ผลสูงกว่าช่วง + ฝ่าย ล → ล ชนะ' };
    } else {
      return { resultA: '❌', resultB: '✅', reason: 'ผลสูงกว่าช่วง + ฝ่าย ย → ย แพ้' };
    }
  }

  return null;
}

async function main() {
  try {
    console.log('📊 บันทึกผลลัพธ์ที่ถูกต้อง\n');

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
      const userBId = row[17] || '';

      if (!slipName.includes('ฟ้า') || !userBAmount) continue;

      const result = calculatePriceRangeResult(priceA, resultNumber);
      if (!result) continue;

      const rowIndex = i + 1;
      console.log(`Row ${rowIndex}: ${userAName} vs ${userBName}`);
      console.log(`   ราคา: ${priceA}`);
      console.log(`   ผลลัพธ์ A: ${result.resultA}`);
      console.log(`   ผลลัพธ์ B: ${result.resultB}`);
      console.log(`   เหตุผล: ${result.reason}`);
      console.log();

      // เพิ่มการอัปเดต
      updates.push({
        range: `${GOOGLE_WORKSHEET_NAME}!I${rowIndex}:K${rowIndex}`,
        values: [[resultNumber, result.resultA, result.resultB]],
      });

      // บันทึก User B ID ในคอลัมน์ R (ถ้ายังไม่มี)
      if (!userBId) {
        updates.push({
          range: `${GOOGLE_WORKSHEET_NAME}!R${rowIndex}`,
          values: [['']],
        });
      }
    }

    if (updates.length === 0) {
      console.log('❌ ไม่มีแถวที่ต้องอัปเดต');
      return;
    }

    // บันทึกผลลัพธ์
    console.log(`📤 บันทึกผลลัพธ์ ${updates.length} แถว...`);
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
    let successCount = 0;

    for (let i = 1; i < afterRows.length; i++) {
      const row = afterRows[i];
      const slipName = row[4] || '';
      const userBAmount = row[7] || '';

      if (!slipName.includes('ฟ้า') || !userBAmount) continue;

      const resultI = row[8] || '';
      const resultJ = row[9] || '';
      const resultK = row[10] || '';

      if (resultI && resultJ && resultK) {
        successCount++;
        console.log(`✅ Row ${i + 1}: ${resultI} | ${resultJ} | ${resultK}`);
      } else {
        console.log(`❌ Row ${i + 1}: ขาดข้อมูล`);
      }
    }

    console.log(`\n📊 สรุป: บันทึกสำเร็จ ${successCount} แถว`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
