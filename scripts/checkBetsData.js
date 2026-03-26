/**
 * ดึงข้อมูลจากชีท Bets มาตรวจสอบ
 * รัน: node scripts/checkBetsData.js
 */
require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function checkData() {
  const credentialsPath = path.join(__dirname, '..', 'credentials.json');
  const credentials = JSON.parse(fs.readFileSync(credentialsPath));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // ดึงข้อมูล Bets sheet
  console.log('=== Bets Sheet (last 10 rows) ===\n');
  const betsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Bets!A1:V',
  });
  const rows = betsRes.data.values || [];
  const header = rows[0];
  const dataRows = rows.slice(Math.max(1, rows.length - 10));

  for (const row of dataRows) {
    const rowIdx = rows.indexOf(row) + 1;
    console.log(`--- Row ${rowIdx} ---`);
    console.log(`  C (User A):    ${row[2] || ''}`);
    console.log(`  D (Message):   ${row[3] || ''}`);
    console.log(`  E (Slip):      ${row[4] || ''}`);
    console.log(`  F (Side A):    ${row[5] || ''}`);
    console.log(`  G (Amount):    ${row[6] || ''}`);
    console.log(`  H (Amount B):  ${row[7] || ''}`);
    console.log(`  I (Result):    ${row[8] || ''}`);
    console.log(`  J (Win/Lose A):${row[9] || ''}`);
    console.log(`  K (Win/Lose B):${row[10] || ''}`);
    console.log(`  L (User B):    ${row[11] || ''}`);
    console.log(`  M (Side B):    ${row[12] || ''}`);
    console.log(`  S (Result A):  ${row[18] || ''}`);
    console.log(`  T (Result B):  ${row[19] || ''}`);
    console.log('');
  }

  // ดึงข้อมูล AnnouncedPrices sheet
  console.log('\n=== AnnouncedPrices Sheet ===\n');
  try {
    const pricesRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'AnnouncedPrices!A1:F',
    });
    const priceRows = pricesRes.data.values || [];
    for (const row of priceRows) {
      console.log(`  ${row.join(' | ')}`);
    }
    if (priceRows.length <= 1) console.log('  (ไม่มีข้อมูล)');
  } catch (e) {
    console.log('  Error:', e.message);
  }
}

checkData().catch(console.error);
