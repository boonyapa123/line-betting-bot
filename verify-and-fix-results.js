/**
 * Verify and Fix: ตรวจสอบและแก้ไขผลลัพธ์ตามกฎที่ถูกต้อง
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

// ฟังก์ชันคำนวณผลลัพธ์ตามกฎที่ถูกต้อง
function calculateResult(priceStr, resultNumber) {
  const priceMatch = priceStr.match(/(\d+)-(\d+)\s+([ยล])/);
  if (!priceMatch) return null;

  const minPrice = parseInt(priceMatch[1]);
  const maxPrice = parseInt(priceMatch[2]);
  const side = priceMatch[3]; // ย = ต่ำ, ล = สูง

  console.log(`      ช่วงราคา: ${minPrice}-${maxPrice}, ฝ่าย: ${side}, ผลออก: ${resultNumber}`);

  // กฎ 1: ผลออกในช่วง → เสมอ
  if (resultNumber >= minPrice && resultNumber <= maxPrice) {
    console.log(`      ✅ ผลออกในช่วง → เสมอ (⛔️⛔️)`);
    return { resultA: '⛔️', resultB: '⛔️', reason: 'ผลออกในช่วง → เสมอ' };
  }

  // กฎ 2: ผลต่ำกว่าช่วง
  if (resultNumber < minPrice) {
    if (side === 'ย') {
      // ฝ่าย ย (ต่ำ) ชนะ
      console.log(`      ✅ ผลต่ำกว่าช่วง + ฝ่าย ย → ย ชนะ (✅❌)`);
      return { resultA: '✅', resultB: '❌', reason: 'ผลต่ำกว่าช่วง + ฝ่าย ย → ย ชนะ' };
    } else {
      // ฝ่าย ล (สูง) แพ้
      console.log(`      ✅ ผลต่ำกว่าช่วง + ฝ่าย ล → ล แพ้ (❌✅)`);
      return { resultA: '❌', resultB: '✅', reason: 'ผลต่ำกว่าช่วง + ฝ่าย ล → ล แพ้' };
    }
  }

  // กฎ 3: ผลสูงกว่าช่วง
  if (resultNumber > maxPrice) {
    if (side === 'ล') {
      // ฝ่าย ล (สูง) ชนะ
      console.log(`      ✅ ผลสูงกว่าช่วง + ฝ่าย ล → ล ชนะ (✅❌)`);
      return { resultA: '✅', resultB: '❌', reason: 'ผลสูงกว่าช่วง + ฝ่าย ล → ล ชนะ' };
    } else {
      // ฝ่าย ย (ต่ำ) แพ้
      console.log(`      ✅ ผลสูงกว่าช่วง + ฝ่าย ย → ย แพ้ (❌✅)`);
      return { resultA: '❌', resultB: '✅', reason: 'ผลสูงกว่าช่วง + ฝ่าย ย → ย แพ้' };
    }
  }

  return null;
}

async function main() {
  try {
    console.log('📊 ตรวจสอบและแก้ไขผลลัพธ์ตามกฎที่ถูกต้อง\n');

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

    // ตรวจสอบแต่ละแถว
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const slipName = row[4] || '';
      const userAName = row[2] || '';
      const userBName = row[11] || '';
      const priceA = row[3] || '';
      const userBAmount = row[7] || '';
      const currentResultA = row[9] || '';
      const currentResultB = row[10] || '';

      if (!slipName.includes('ฟ้า') || !userBAmount) continue;

      const rowIndex = i + 1;
      console.log(`Row ${rowIndex}: ${userAName} vs ${userBName}`);
      console.log(`   ราคา: ${priceA}`);
      console.log(`   ผลลัพธ์ปัจจุบัน: ${currentResultA} | ${currentResultB}`);

      const result = calculateResult(priceA, resultNumber);
      if (!result) {
        console.log(`   ❌ ไม่สามารถคำนวณผลลัพธ์ได้`);
        console.log();
        continue;
      }

      // ตรวจสอบว่าต้องแก้ไขหรือไม่
      if (currentResultA !== result.resultA || currentResultB !== result.resultB) {
        console.log(`   📝 ต้องแก้ไข: ${result.resultA} | ${result.resultB}`);
        updates.push({
          range: `${GOOGLE_WORKSHEET_NAME}!J${rowIndex}:K${rowIndex}`,
          values: [[result.resultA, result.resultB]],
        });
      } else {
        console.log(`   ✅ ถูกต้องแล้ว`);
      }
      console.log();
    }

    if (updates.length === 0) {
      console.log('✅ ทุกแถวถูกต้องแล้ว ไม่ต้องแก้ไข');
      return;
    }

    // บันทึกการแก้ไข
    console.log(`📤 แก้ไข ${updates.length} แถว...`);
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      requestBody: {
        data: updates,
        valueInputOption: 'USER_ENTERED',
      },
    });

    console.log('✅ แก้ไขสำเร็จ\n');

    // ตรวจสอบผลลัพธ์
    console.log('📋 ตรวจสอบผลลัพธ์ที่แก้ไข...\n');
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

      console.log(`Row ${i + 1}: ${resultI} | ${resultJ} | ${resultK}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
