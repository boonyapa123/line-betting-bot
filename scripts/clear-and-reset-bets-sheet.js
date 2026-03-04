require('dotenv').config();
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = 'Bets';

async function clearAndResetBetsSheet() {
  try {
    console.log('🧹 Clearing and resetting Bets sheet...\n');

    if (!GOOGLE_SHEET_ID) {
      console.error('❌ GOOGLE_SHEET_ID not found in .env');
      return;
    }

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

    // First, clear all data in the sheet
    console.log('�� Clearing all data from Bets sheet...');
    await sheets.spreadsheets.values.clear({
      auth: auth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:Z`,
    });
    console.log('✅ Sheet cleared');

    // Now add headers
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

    console.log('📝 Adding headers...');
    await sheets.spreadsheets.values.update({
      auth: auth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A1:R1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers],
      },
    });

    console.log('\n✅ Bets sheet reset successfully!');
    console.log(`   Sheet: ${GOOGLE_WORKSHEET_NAME}`);
    console.log(`   Total columns: ${headers.length}`);
    console.log(`   Range: A1:R1`);

  } catch (error) {
    console.error('❌ Error resetting sheet:', error.message);
    console.error(error);
  }
}

clearAndResetBetsSheet();
