const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function checkBetsSheetStructure() {
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

    console.log('\n📊 ตรวจสอบโครงสร้างชีท Bets');
    console.log('=====================================\n');

    // Get all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${worksheetName}!A:Z`,
    });

    const data = response.data.values || [];

    if (data.length === 0) {
      console.log('❌ ไม่พบข้อมูลในชีท');
      return;
    }

    // Show header
    console.log('📋 Header (Row 1):');
    console.log('=====================================');
    const header = data[0];
    header.forEach((col, idx) => {
      const colLetter = String.fromCharCode(65 + idx);
      console.log(`  [${colLetter}] (${idx}): ${col || '(ว่างเปล่า)'}`);
    });

    console.log('\n📊 จำนวนคอลัมน์:', header.length);
    console.log('📊 จำนวนแถว:', data.length);

    // Show first 3 data rows
    console.log('\n📋 ตัวอย่างข้อมูล (3 แถวแรก):');
    console.log('=====================================');
    data.slice(1, 4).forEach((row, index) => {
      const rowNum = index + 2;
      console.log(`\nRow ${rowNum}:`);
      row.forEach((col, idx) => {
        const colLetter = String.fromCharCode(65 + idx);
        console.log(`  [${colLetter}] (${idx}): ${col || '(ว่างเปล่า)'}`);
      });
    });

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

require('dotenv').config();
checkBetsSheetStructure();
