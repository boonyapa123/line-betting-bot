const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

let googleAuth;
let sheets;

async function initializeGoogleAuth() {
  try {
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json';
    
    if (!fs.existsSync(keyFile)) {
      console.error('❌ Service account key file not found:', keyFile);
      return false;
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    googleAuth = await auth.getClient();
    sheets = google.sheets({ version: 'v4', auth: googleAuth });
    console.log('✅ Google Auth initialized\n');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Google Auth:', error.message);
    return false;
  }
}

async function clearOldResults() {
  try {
    // ดึงข้อมูลทั้งหมดจาก Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });

    const rows = response.data.values || [];
    
    console.log('📊 === Clearing Old Results ===\n');
    console.log(`📋 Total rows: ${rows.length}`);
    console.log(`📋 Worksheet: ${GOOGLE_WORKSHEET_NAME}\n`);

    // ลบข้อมูลเก่า (Column I-J, S-T)
    for (let i = 1; i < rows.length; i++) {
      // ลบ Column I-J (ผลที่ออก, ผลแพ้ชนะ)
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${GOOGLE_WORKSHEET_NAME}!I${i + 1}:J${i + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['', '']],
        },
      });

      // ลบ Column S-T (ผลลัพธ์ A, ผลลัพธ์ B)
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${GOOGLE_WORKSHEET_NAME}!S${i + 1}:T${i + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['', '']],
        },
      });

      console.log(`✅ Cleared row ${i + 1}`);
    }

    console.log(`\n✅ All old results cleared`);

  } catch (error) {
    console.error('❌ Error clearing results:', error.message);
    console.error('   Details:', error);
  }
}

async function main() {
  const initialized = await initializeGoogleAuth();
  if (initialized) {
    await clearOldResults();
  }
}

main().catch(console.error);
