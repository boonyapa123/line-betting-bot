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

    // Define headers - MUST be exactly 18 columns
    const headers = [
      'Timestamp',           // A - 0
      'User A ID',           // B - 1
      'ชื่อ User A',         // C - 2
      'ข้อความ A',           // D - 3
      'ชื่อบั้งไฟ',          // E - 4
      'รายการเล่น',          // F - 5
      'ยอดเงิน',             // G - 6
      'ยอดเงิน B',           // H - 7
      'ผลที่ออก',            // I - 8
      'ผลแพ้ชนะ A',          // J - 9
      'ผลแพ้ชนะ B',          // K - 10
      'User B ID',           // L - 11
      'ชื่อ User B',         // M - 12
      'รายการแทง B',         // N - 13
      'ชื่อกลุ่มแชท',        // O - 14
      'User A Token',        // P - 15
      'Group ID',            // Q - 16
      'User B Token'         // R - 17
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
