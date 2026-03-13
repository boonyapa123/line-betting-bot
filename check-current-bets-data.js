const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
require('dotenv').config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = 'Bets';

async function checkCurrentBetsData() {
  try {
    let credentials;
    
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } else {
      const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'credentials.json';
      credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    }
    
    const googleAuth = new GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets('v4');
    
    // ดึงข้อมูลทั้งหมด
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });

    const values = response.data.values || [];
    console.log('\n📊 ข้อมูลปัจจุบันในชีท Bets');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    // แสดง Header
    console.log('📋 Header Row:');
    const headers = values[0] || [];
    headers.forEach((h, i) => {
      const col = String.fromCharCode(65 + i);
      console.log(`  [${col}] ${h}`);
    });

    console.log('\n📊 Data Rows:\n');

    // แสดงข้อมูลแต่ละแถว
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const userAName = row[2] || '(ว่าง)';
      const messageA = row[3] || '(ว่าง)';
      const slipName = row[4] || '(ว่าง)';
      const userBAmount = row[7] || '(ว่าง)';
      const resultNumber = row[8] || '(ว่าง)';
      const resultA = row[9] || '(ว่าง)';
      const resultB = row[10] || '(ว่าง)';
      const userBName = row[11] || '(ว่าง)';
      const priceB = row[12] || '(ว่าง)';

      console.log(`Row ${i + 1}:`);
      console.log(`  User A: ${userAName}`);
      console.log(`  Price A (D): ${messageA}`);
      console.log(`  Slip: ${slipName}`);
      console.log(`  User B: ${userBName}`);
      console.log(`  Price B (M): ${priceB}`);
      console.log(`  Amount B (H): ${userBAmount}`);
      console.log(`  Result (I): ${resultNumber}`);
      console.log(`  Result A (J): ${resultA}`);
      console.log(`  Result B (K): ${resultB}`);
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════════════════════════');
    console.log('\n🔍 ตรวจสอบปัญหา:');
    console.log('');

    // ตรวจสอบแถวที่ไม่มีผลลัพธ์
    let noResultCount = 0;
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const resultNumber = row[8] || '';
      if (!resultNumber) {
        noResultCount++;
      }
    }

    console.log(`✅ แถวที่ไม่มีผลลัพธ์: ${noResultCount} แถว`);

    // ตรวจสอบแถวที่มี Price B ไม่ครบ
    console.log('\n⚠️  แถวที่มี Price B ไม่ครบ (ไม่มีช่วงราคา):');
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const priceB = row[12] || '';
      const userBName = row[11] || '';
      
      if (userBName && priceB && !priceB.includes('-')) {
        console.log(`  Row ${i + 1}: User B="${userBName}", Price B="${priceB}"`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkCurrentBetsData();
