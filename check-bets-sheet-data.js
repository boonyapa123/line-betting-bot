/**
 * Check Bets Sheet Data
 * ดึงข้อมูลจากชีท Bets เพื่อตรวจสอบ
 */

require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

async function checkBetsSheet() {
  try {
    const credentialsPath = path.join(__dirname, 'credentials.json');
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    console.log('📊 Fetching Bets Sheet Data...\n');

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });

    const rows = response.data.values || [];
    
    console.log(`📋 Total rows: ${rows.length}\n`);
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    // Show header
    if (rows.length > 0) {
      console.log('HEADER:');
      console.log(rows[0].join(' | '));
      console.log('\n═══════════════════════════════════════════════════════════════════════════════════\n');
    }

    // Show data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const messageA = row[3] || '';
      const slipName = row[4] || '';
      const sideA = row[5] || '';
      const amount = row[6] || '';
      const amountB = row[7] || '';
      const result = row[8] || '';
      const userBName = row[11] || '';
      const userBId = row[17] || '';

      console.log(`Row ${i + 1}:`);
      console.log(`  Message A: ${messageA}`);
      console.log(`  Slip Name: ${slipName}`);
      console.log(`  Side A: ${sideA}`);
      console.log(`  Amount A: ${amount}`);
      console.log(`  Amount B: ${amountB}`);
      console.log(`  User B Name: ${userBName}`);
      console.log(`  User B ID: ${userBId}`);
      console.log(`  Result: ${result}`);
      console.log(`  Status: ${amountB ? '✅ MATCHED' : '⏳ PENDING'}`);
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');
    console.log('📊 Summary:');
    
    let matched = 0;
    let pending = 0;
    let withResult = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const amountB = row[7] || '';
      const result = row[8] || '';

      if (amountB) matched++;
      else pending++;
      if (result) withResult++;
    }

    console.log(`  ✅ Matched: ${matched}`);
    console.log(`  ⏳ Pending: ${pending}`);
    console.log(`  📊 With Result: ${withResult}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBetsSheet();
