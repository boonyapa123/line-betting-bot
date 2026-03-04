const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function checkColumnsNO() {
  try {
    const credentialsPath = path.join(__dirname, 'credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const worksheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

    // Get first 5 rows to see data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${worksheetName}!N:O`,
    });

    const data = response.data.values || [];

    console.log('\n📋 ตรวจสอบคอลัมน์ N และ O:');
    console.log('=====================================\n');

    data.slice(0, 10).forEach((row, index) => {
      const rowNum = index + 1;
      const colN = row[0] || '(ว่างเปล่า)';
      const colO = row[1] || '(ว่างเปล่า)';
      console.log(`Row ${rowNum}:`);
      console.log(`  N: ${colN}`);
      console.log(`  O: ${colO}`);
      console.log();
    });

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

require('dotenv').config();
checkColumnsNO();
