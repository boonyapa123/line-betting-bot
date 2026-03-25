/**
 * ดึงข้อมูลจาก Bets sheet เพื่อตรวจสอบผลลัพธ์
 */
require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const credentialsPath = path.join(__dirname, 'credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function main() {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Bets!A:U',
  });

  const rows = response.data.values || [];
  const headers = rows[0] || [];

  console.log('📋 Headers:');
  headers.forEach((h, i) => {
    const col = String.fromCharCode(65 + (i < 26 ? i : 0));
    console.log(`   [${col}] ${h}`);
  });

  console.log(`\n📊 Total rows (including header): ${rows.length}\n`);

  // แสดงข้อมูลแต่ละแถว
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    console.log(`--- Row ${i + 1} ---`);
    console.log(`  User A: ${r[2] || ''} | Side A: ${r[5] || ''} | Amount A: ${r[6] || ''}`);
    console.log(`  User B: ${r[11] || ''} | Side B: ${r[12] || ''} | Amount B: ${r[7] || ''}`);
    console.log(`  Slip: ${r[4] || ''} | Message: ${r[3] || ''}`);
    console.log(`  Result: ${r[8] || '-'} | WinLose A: ${r[9] || '-'} | WinLose B: ${r[10] || '-'}`);
    console.log(`  Col S: ${r[18] || '-'} | Col T: ${r[19] || '-'}`);
    console.log('');
  }
}

main().catch(e => console.error('Error:', e.message));
