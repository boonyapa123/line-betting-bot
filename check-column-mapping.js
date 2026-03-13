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

async function checkColumnMapping() {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth: googleAuth });

    // ดึงข้อมูลแถวแรก (Header)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A1:U1`,
    });

    const headers = response.data.values?.[0] || [];
    
    console.log('📊 === Column Mapping ===\n');
    
    headers.forEach((header, index) => {
      const colLetter = String.fromCharCode(65 + index);
      console.log(`${colLetter} (${index}): ${header}`);
    });

    console.log('\n\n📊 === Row 2 Data ===\n');
    
    const row2Response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A2:U2`,
    });

    const row2 = row2Response.data.values?.[0] || [];
    
    row2.forEach((value, index) => {
      const colLetter = String.fromCharCode(65 + index);
      const header = headers[index] || '(ไม่มี header)';
      console.log(`${colLetter} (${index}): ${header} = "${value}"`);
    });

  } catch (error) {
    console.error('❌ Error checking column mapping:', error.message);
    console.error('   Details:', error);
  }
}

async function main() {
  const initialized = await initializeGoogleAuth();
  if (initialized) {
    await checkColumnMapping();
  }
}

main().catch(console.error);
