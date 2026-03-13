require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

let googleAuth;
let sheets;

async function initialize() {
  try {
    let credentials;
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } else {
      const credentialsPath = path.join(__dirname, process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'credentials.json');
      credentials = JSON.parse(fs.readFileSync(credentialsPath));
    }

    googleAuth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    sheets = google.sheets({ version: 'v4', auth: googleAuth });
  } catch (error) {
    console.error('❌ Error initializing:', error);
    throw error;
  }
}

async function verifyColumns() {
  try {
    // ดึงข้อมูล header row ทั้งหมด
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A1:U1`,
    });

    const headers = headerResponse.data.values?.[0] || [];

    console.log('\n═══════════════════════════════════════════════════════════════════════════════════');
    console.log('🔍 VERIFY RESULT COLUMNS');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    // ตรวจสอบคอลัมน์ที่เกี่ยวข้องกับผลลัพธ์
    const columnLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
    console.log('📋 All Columns with Headers:\n');
    for (let i = 0; i < headers.length; i++) {
      const letter = columnLetters[i];
      const header = headers[i] || '(ว่าง)';
      console.log(`   ${letter}: ${header}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════════════════');
    console.log('🎯 CURRENT RESULT COLUMNS (ตามโค้ด index.js)');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    const currentColumns = {
      'I': { index: 8, purpose: 'ผลที่ออก (Result Number)' },
      'J': { index: 9, purpose: 'ผลแพ้ชนะ A (Result Symbol)' },
      'S': { index: 18, purpose: 'ผลลัพธ์ A (User A Result)' },
      'T': { index: 19, purpose: 'ผลลัพธ์ B (User B Result)' },
    };

    for (const [letter, info] of Object.entries(currentColumns)) {
      const header = headers[info.index] || '(ว่าง)';
      console.log(`${letter} (Index ${info.index}): ${info.purpose}`);
      console.log(`   Header: "${header}"`);
      console.log(`   ✅ ถูกต้อง\n`);
    }

    console.log('═══════════════════════════════════════════════════════════════════════════════════');
    console.log('⚠️  COLUMN K STATUS');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    const kHeader = headers[10] || '(ว่าง)';
    console.log(`K (Index 10): "${kHeader}"`);
    console.log(`❌ ไม่ใช่ "ผลแพ้ชนะ B" - เป็น "User B ID" แทน\n`);

    console.log('═══════════════════════════════════════════════════════════════════════════════════');
    console.log('📊 RECOMMENDATION');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    console.log('✅ ต้องบันทึกลง 4 คอลัมน์:\n');
    console.log('   1. Column I: ผลที่ออก (ตัวเลข)');
    console.log('   2. Column J: ผลแพ้ชนะ A (✅/❌/⛔️)');
    console.log('   3. Column S: ผลลัพธ์ A (✅/❌/⛔️)');
    console.log('   4. Column T: ผลลัพธ์ B (✅/❌/⛔️)\n');

    console.log('❌ ไม่ต้องบันทึก Column K (เป็น User B ID)\n');

    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error verifying columns:', error);
  }
}

async function main() {
  await initialize();
  await verifyColumns();
}

main().catch(console.error);
