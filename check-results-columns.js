const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'bets';

async function checkResultsColumns() {
  try {
    const credentialsPath = './credentials.json';
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });

    const rows = response.data.values || [];
    
    console.log(`\n📊 ตรวจสอบคอลัมน์ผลลัพธ์\n`);
    console.log(`${'='.repeat(120)}\n`);

    // Show header
    const header = rows[0] || [];
    console.log(`📋 Header Row (Column S, T, U):`);
    console.log(`   S (18): ${header[18] || '(ว่าง)'}`);
    console.log(`   T (19): ${header[19] || '(ว่าง)'}`);
    console.log(`   U (20): ${header[20] || '(ว่าง)'}`);
    console.log(`\n${'='.repeat(120)}\n`);

    // Show data rows
    console.log(`📝 Data Rows (Column A-U):\n`);
    for (let i = 1; i < Math.min(rows.length, 8); i++) {
      const row = rows[i] || [];
      console.log(`Row ${i}:`);
      console.log(`   A (0): ${row[0] || '(ว่าง)'}`);
      console.log(`   C (2): ${row[2] || '(ว่าง)'}`);
      console.log(`   D (3): ${row[3] || '(ว่าง)'}`);
      console.log(`   E (4): ${row[4] || '(ว่าง)'}`);
      console.log(`   I (8): ${row[8] || '(ว่าง)'}`);
      console.log(`   J (9): ${row[9] || '(ว่าง)'}`);
      console.log(`   S (18): ${row[18] || '(ว่าง)'}`);
      console.log(`   T (19): ${row[19] || '(ว่าง)'}`);
      console.log(`   U (20): ${row[20] || '(ว่าง)'}`);
      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkResultsColumns();
