/**
 * Debug: ตรวจสอบการแยก price จากข้อมูลชีท
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
    console.log('🔍 Debug: ตรวจสอบการแยก price\n');

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
      const priceA = row[3] || '';
      const userBAmount = row[7] || '';

      if (!slipName.includes('ฟ้า') || !userBAmount) continue;

      console.log(`Row ${i + 1}: ${userAName}`);
      console.log(`   Column D (ข้อความ A): "${priceA}"`);
      console.log(`   Column E (ชื่อบั้งไฟ): "${slipName}"`);

      // ทดสอบการแยก regex
      const priceMatch = priceA.match(/(\d+)-(\d+)\s+([ยล])/);
      if (priceMatch) {
        console.log(`   ✅ Match: min=${priceMatch[1]}, max=${priceMatch[2]}, side=${priceMatch[3]}`);
      } else {
        console.log(`   ❌ No match`);
      }

      // ทดสอบการแยกแบบอื่น
      const priceMatch2 = priceA.match(/(\d+)-(\d+)/);
      if (priceMatch2) {
        console.log(`   Alternative: ${priceMatch2[1]}-${priceMatch2[2]}`);
      }

      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
