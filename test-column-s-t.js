/**
 * Test: ตรวจสอบ Column S และ T บันทึกยอดเงิน
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

async function main() {
  try {
    console.log('📊 ตรวจสอบ Column S และ T\n');

    // ดึงข้อมูล
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });

    const rows = response.data.values || [];

    console.log('═══════════════════════════════════════════════════════════════\n');

    // ตรวจสอบแต่ละแถว
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const slipName = row[4] || '';
      const userAName = row[2] || '';
      const userBName = row[11] || '';
      const userBAmount = row[7] || '';
      const resultNumber = row[8] || '';
      const resultA = row[9] || '';
      const resultB = row[10] || '';
      const resultAmountA = row[18] || ''; // Column S
      const resultAmountB = row[19] || ''; // Column T

      if (!slipName.includes('ฟ้า') || !userBAmount) continue;

      console.log(`Row ${i + 1}: ${userAName} vs ${userBName}`);
      console.log(`   ผลที่ออก (I): ${resultNumber}`);
      console.log(`   ผลแพ้ชนะ A (J): ${resultA}`);
      console.log(`   ผลแพ้ชนะ B (K): ${resultB}`);
      console.log(`   ยอดเงิน A (S): ${resultAmountA}`);
      console.log(`   ยอดเงิน B (T): ${resultAmountB}`);

      // ตรวจสอบว่าบันทึกถูกต้องหรือไม่
      if (resultNumber && resultA && resultB) {
        if (resultAmountA !== '' && resultAmountB !== '') {
          console.log(`   ✅ บันทึกครบถ้วน`);
        } else {
          console.log(`   ❌ ขาด Column S หรือ T`);
        }
      } else {
        console.log(`   ⚠️  ยังไม่มีผลลัพธ์`);
      }
      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
