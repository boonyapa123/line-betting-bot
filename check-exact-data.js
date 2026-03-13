/**
 * Check: ตรวจสอบข้อมูลที่แน่นอนจากชีท
 */

require('dotenv').config();

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load credentials
const credentialsPath = path.join(__dirname, 'credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

async function main() {
  try {
    console.log('📋 ตรวจสอบข้อมูลที่แน่นอนจากชีท\n');

    // ดึงข้อมูล
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });

    const rows = response.data.values || [];

    console.log('═══════════════════════════════════════════════════════════════\n');

    // ตรวจสอบ Row 6 และ 7
    for (let i = 5; i <= 6; i++) {
      const row = rows[i];
      console.log(`Row ${i + 1}:`);
      console.log(`  A (Timestamp): ${row[0]}`);
      console.log(`  B (User A ID): ${row[1]}`);
      console.log(`  C (User A Name): ${row[2]}`);
      console.log(`  D (Message A): ${row[3]}`);
      console.log(`  E (Slip Name): ${row[4]}`);
      console.log(`  F (Side A): ${row[5]}`);
      console.log(`  G (Amount): ${row[6]}`);
      console.log(`  H (Amount B): ${row[7]}`);
      console.log(`  I (Result Number): ${row[8]}`);
      console.log(`  J (Result A): ${row[9]}`);
      console.log(`  K (Result B): ${row[10]}`);
      console.log(`  L (User B Name): ${row[11]}`);
      console.log(`  M (Side B): ${row[12]}`);
      console.log(`  N (Group Chat Name): ${row[13]}`);
      console.log(`  O (Group Name): ${row[14]}`);
      console.log(`  P (Token A): ${row[15]}`);
      console.log(`  Q (Group ID): ${row[16]}`);
      console.log(`  R (User B ID): ${row[17]}`);
      console.log(`  S (Result A): ${row[18]}`);
      console.log(`  T (Result B): ${row[19]}`);
      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
