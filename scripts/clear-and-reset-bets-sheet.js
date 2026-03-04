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

    // Now add headers - MUST be exactly 18 columns
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
