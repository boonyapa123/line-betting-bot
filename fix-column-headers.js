const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function fixColumnHeaders() {
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

    console.log('\n📊 แก้ไขชื่อคอลั่ม\n');

    // ดึงข้อมูล header ปัจจุบัน
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: sheetId,
      range: `${worksheetName}!A1:U1`,
    });

    const headers = response.data.values?.[0] || [];

    console.log('ก่อนแก้ไข:');
    console.log(`  Column J: "${headers[9]}"`);
    console.log(`  Column K: "${headers[10]}"`);
    console.log(`  Column R: "${headers[17]}"\n`);

    // แก้ไขชื่อคอลั่ม
    headers[9] = 'ผลแพ้ชนะ A';  // Column J
    headers[10] = 'ผลแพ้ชนะ B'; // Column K
    // Column R ถูกต้องแล้ว

    console.log('หลังแก้ไข:');
    console.log(`  Column J: "${headers[9]}"`);
    console.log(`  Column K: "${headers[10]}"`);
    console.log(`  Column R: "${headers[17]}"\n`);

    // อัปเดต header
    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId: sheetId,
      range: `${worksheetName}!A1:U1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers],
      },
    });

    console.log('✅ แก้ไขชื่อคอลั่มสำเร็จ\n');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  }
}

fixColumnHeaders();
