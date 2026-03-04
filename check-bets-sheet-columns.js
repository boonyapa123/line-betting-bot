const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function checkBetsSheetColumns() {
  try {
    // Load credentials
    const credentialsPath = path.join(__dirname, 'credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    // Create auth client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const sheetId = process.env.GOOGLE_SHEET_ID;
    const worksheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

    // Get the first row (headers)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${worksheetName}!1:1`,
    });

    const headers = response.data.values?.[0] || [];

    console.log('\n📋 ชีท Bets - คอลัมน์ปัจจุบัน:');
    console.log('=====================================');
    console.log(`จำนวนคอลัมน์ทั้งหมด: ${headers.length}\n`);

    headers.forEach((header, index) => {
      const columnLetter = String.fromCharCode(65 + index);
      console.log(`${columnLetter}${index + 1}: ${header || '(ว่างเปล่า)'}`);
    });

    console.log('\n=====================================');
    console.log('✅ ดึงข้อมูลสำเร็จ');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

// Load environment variables
require('dotenv').config();

checkBetsSheetColumns();
