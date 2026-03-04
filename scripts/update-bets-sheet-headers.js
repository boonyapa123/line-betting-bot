require('dotenv').config();
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = 'Bets';

async function updateBetsSheetHeaders() {
  try {
    console.log('📋 Updating Bets sheet headers...\n');

    // Check if GOOGLE_SHEET_ID is set
    if (!GOOGLE_SHEET_ID) {
      console.error('❌ GOOGLE_SHEET_ID not found in .env');
      return;
    }

    console.log(`   Sheet ID: ${GOOGLE_SHEET_ID}`);

    // Initialize Google Auth
    const keyFile = 'credentials.json';
    if (!fs.existsSync(keyFile)) {
      console.error('❌ credentials.json not found');
      return;
    }

    const auth = new GoogleAuth({
      keyFile: keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets('v4');

    // Define headers
    const headers = [
      'Timestamp',           // A
      'User A ID',           // B
      'ชื่อ User A',         // C
      'ข้อความ A',           // D
      'ชื่อบั้งไฟ',          // E
      'รายการเล่น',          // F
      'ยอดเงิน',             // G
      'ยอดเงิน B',           // H
      'ผลที่ออก',            // I
      'ผลแพ้ชนะ A',          // J
      'ผลแพ้ชนะ B',          // K
      'User B ID',           // L
      'ชื่อ User B',         // M
      'รายการแทง B',         // N
      'ชื่อกลุ่มแชท',        // O
      'User A Token',        // P
      'Group ID',            // Q
      'User B Token'         // R
    ];

    console.log('📝 Headers to add:');
    headers.forEach((header, idx) => {
      const colLetter = String.fromCharCode(65 + idx);
      console.log(`   [${colLetter}]: ${header}`);
    });

    // Update headers in row 1
    await sheets.spreadsheets.values.update({
      auth: auth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A1:R1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers],
      },
    });

    console.log('\n✅ Bets sheet headers updated successfully!');
    console.log(`   Sheet: ${GOOGLE_WORKSHEET_NAME}`);
    console.log(`   Total columns: ${headers.length}`);

  } catch (error) {
    console.error('❌ Error updating headers:', error.message);
    console.error(error);
  }
}

updateBetsSheetHeaders();
