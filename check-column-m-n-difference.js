const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function checkColumnMNDifference() {
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

    // Get first 10 rows to see data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${worksheetName}!A:R`,
    });

    const data = response.data.values || [];

    console.log('\n📋 ตรวจสอบความแตกต่างระหว่าง M และ N:');
    console.log('=====================================\n');

    // Show header
    console.log('Header (Row 1):');
    console.log(`  M: ${data[0]?.[12] || '(ว่างเปล่า)'}`);
    console.log(`  N: ${data[0]?.[13] || '(ว่างเปล่า)'}`);
    console.log();

    // Show data rows
    console.log('Data rows:');
    data.slice(1, 10).forEach((row, index) => {
      const rowNum = index + 2;
      const colM = row[12] || '(ว่างเปล่า)';
      const colN = row[13] || '(ว่างเปล่า)';
      
      console.log(`Row ${rowNum}:`);
      console.log(`  M (รายการแทง): ${colM}`);
      console.log(`  N (รายการแทง B): ${colN}`);
      console.log(`  → ต่างกัน: ${colM !== colN ? 'ใช่' : 'ไม่'}`);
      console.log();
    });

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

require('dotenv').config();
checkColumnMNDifference();
