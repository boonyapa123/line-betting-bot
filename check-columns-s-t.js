const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

let googleAuth;

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
    console.log('✅ Google Auth initialized\n');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Google Auth:', error.message);
    return false;
  }
}

async function checkColumnsST() {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth: googleAuth });

    // ดึงข้อมูล Row 2 Column S-T
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!S2:T2`,
    });

    const data = response.data.values?.[0] || [];
    
    console.log('📊 === Row 2 Column S-T ===\n');
    console.log(`S (18): ผลลัพธ์ A = "${data[0] || '(ว่าง)'}"`);
    console.log(`T (19): ผลลัพธ์ B = "${data[1] || '(ว่าง)'}"`);

  } catch (error) {
    console.error('❌ Error checking columns:', error.message);
    console.error('   Details:', error);
  }
}

async function main() {
  const initialized = await initializeGoogleAuth();
  if (initialized) {
    await checkColumnsST();
  }
}

main().catch(console.error);
