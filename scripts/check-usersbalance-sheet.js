const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function checkUsersBalanceSheet() {
  try {
    const credentialsPath = path.join(__dirname, '../credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // ตรวจสอบชีท UsersBalance
    console.log('📋 Checking UsersBalance sheet...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'UsersBalance!A:C',
    });

    const rows = response.data.values || [];
    console.log(`📊 Total rows: ${rows.length}`);
    console.log(`📋 Headers: ${rows[0]?.join(', ')}`);

    if (rows.length > 1) {
      console.log('\n👥 Current data:');
      for (let i = 1; i < rows.length; i++) {
        const [userId, displayName, balance] = rows[i];
        console.log(`   Row ${i + 1}: ${userId} | ${displayName} | ${balance} บาท`);
      }
    } else {
      console.log('\n⚠️  No data in UsersBalance sheet');
    }

    // ตรวจสอบชีท Players
    console.log('\n\n📋 Checking Players sheet...');
    const playersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Players!A:E',
    });

    const playerRows = playersResponse.data.values || [];
    console.log(`📊 Total rows: ${playerRows.length}`);
    console.log(`📋 Headers: ${playerRows[0]?.join(', ')}`);

    if (playerRows.length > 1) {
      console.log('\n👥 Current data:');
      for (let i = 1; i < playerRows.length; i++) {
        const row = playerRows[i];
        console.log(`   Row ${i + 1}: ${row.join(' | ')}`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsersBalanceSheet();
