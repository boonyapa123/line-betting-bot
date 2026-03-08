const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'bets';

async function checkSheetColumns() {
  try {
    // Load credentials
    const credentialsPath = './credentials.json';
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get all data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!1:2`,
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      console.log('❌ ไม่มีข้อมูลในชีท');
      return;
    }

    const headerRow = rows[0];
    const dataRow = rows[1] || [];

    console.log(`\n📊 ชีท: ${GOOGLE_WORKSHEET_NAME}`);
    console.log(`📋 จำนวนคอลัมน์ทั้งหมด: ${headerRow.length}`);
    console.log(`\n${'='.repeat(100)}`);
    console.log(`\n📝 รายละเอียดคอลัมน์:\n`);

    for (let i = 0; i < headerRow.length; i++) {
      const colLetter = String.fromCharCode(65 + (i % 26));
      const header = headerRow[i] || '(ว่าง)';
      const data = dataRow[i] || '(ว่าง)';
      
      console.log(`${colLetter}${Math.floor(i / 26) > 0 ? Math.floor(i / 26) : ''} (${i}): ${header}`);
      console.log(`   └─ ตัวอย่าง: ${data}`);
    }

    console.log(`\n${'='.repeat(100)}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSheetColumns();
