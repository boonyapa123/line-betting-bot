const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = 'Bets';

async function checkBetsStructure() {
  try {
    console.log('🔍 Checking Bets Sheet Structure...\n');

    // Load credentials
    const credentialsPath = './credentials.json';
    if (!fs.existsSync(credentialsPath)) {
      console.error('❌ credentials.json not found');
      return;
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets('v4');
    const googleAuth = await auth.getClient();

    // Get all data from Bets sheet
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });

    const rows = response.data.values || [];
    console.log(`📊 Total rows: ${rows.length}`);
    console.log(`📋 Header row (Row 1):`);
    
    if (rows.length > 0) {
      rows[0].forEach((col, idx) => {
        const colLetter = String.fromCharCode(65 + idx);
        console.log(`   [${colLetter}] ${col}`);
      });
    }

    console.log(`\n📝 Data rows with results:\n`);

    // Find rows with results
    let resultCount = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 1) continue;

      // Check if row has result (Column I or J should have value)
      const resultCol = row[8] || ''; // Column I (index 8)
      const resultSymbol = row[9] || ''; // Column J (index 9)

      if (resultCol || resultSymbol) {
        resultCount++;
        console.log(`\n📍 Row ${i + 1}:`);
        console.log(`   [A] Timestamp: ${row[0] || '(empty)'}`);
        console.log(`   [B] User A ID: ${row[1] || '(empty)'}`);
        console.log(`   [C] ชื่อ User A: ${row[2] || '(empty)'}`);
        console.log(`   [D] ข้อความ A: ${row[3] || '(empty)'}`);
        console.log(`   [E] ชื่อบั้งไฟ: ${row[4] || '(empty)'}`);
        console.log(`   [F] รายการเล่น: ${row[5] || '(empty)'}`);
        console.log(`   [G] ยอดเงิน A: ${row[6] || '(empty)'}`);
        console.log(`   [H] ยอดเงิน B: ${row[7] || '(empty)'}`);
        console.log(`   [I] แสดงผล: ${row[8] || '(empty)'}`);
        console.log(`   [J] แสดงผลชนะ: ${row[9] || '(empty)'}`);
        console.log(`   [K] User B ID: ${row[10] || '(empty)'}`);
        console.log(`   [L] ชื่อ User B: ${row[11] || '(empty)'}`);
        console.log(`   [M] รายการเล่น B: ${row[12] || '(empty)'}`);
        console.log(`   [N] ผลลัพธ์สุดท้าย: ${row[13] || '(empty)'}`);
        console.log(`   [O] ชื่อกลุ่ม: ${row[14] || '(empty)'}`);
        console.log(`   [P] Token A: ${row[15] ? '✅' : '(empty)'}`);
        console.log(`   [Q] Group ID: ${row[16] || '(empty)'}`);
        console.log(`   [R] User B ID (dup): ${row[17] || '(empty)'}`);
      }
    }

    console.log(`\n\n✅ Found ${resultCount} rows with results`);
    console.log(`\n📊 Summary:`);
    console.log(`   Total rows: ${rows.length}`);
    console.log(`   Header row: 1`);
    console.log(`   Data rows: ${rows.length - 1}`);
    console.log(`   Rows with results: ${resultCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBetsStructure();
