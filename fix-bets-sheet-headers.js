const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function fixBetsSheetHeaders() {
  try {
    const credentialsPath = path.join(__dirname, 'credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const worksheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

    // Update header N1 from "ชื่อกลุ่มแชท" to "รายการแทง B"
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${worksheetName}!N1`,
      valueInputOption: 'RAW',
      resource: {
        values: [['รายการแทง B']],
      },
    });

    console.log('\n✅ แก้ไขสำเร็จ:');
    console.log('=====================================');
    console.log('คอลัมน์ N1: "ชื่อกลุ่มแชท" → "รายการแทง B"');
    console.log('=====================================\n');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

require('dotenv').config();
fixBetsSheetHeaders();
