const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
require('dotenv').config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = 'Bets';

async function testResultOutput() {
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
    console.log('\n📊 ผลลัพธ์เมื่อประกาศ "ฟ้า 340 ✅️"');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    // แสดงข้อมูลแต่ละแถว
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const userAName = row[2] || '(ว่าง)';
      const messageA = row[3] || '(ว่าง)';
      const slipName = row[4] || '(ว่าง)';
      const userBName = row[11] || '(ว่าง)';
      const priceB = row[12] || '(ว่าง)';
      const resultNumber = row[8] || '(ว่าง)';
      const resultA = row[9] || '(ว่าง)';
      const resultB = row[10] || '(ว่าง)';
      const userBId = row[17] || '(ว่าง)';
      const amountA = row[18] || '(ว่าง)';
      const amountB = row[19] || '(ว่าง)';

      console.log(`📌 Row ${i + 1}:`);
      console.log(`   User A: ${userAName}`);
      console.log(`   Price A (D): ${messageA}`);
      console.log(`   Slip: ${slipName}`);
      console.log(`   User B: ${userBName}`);
      console.log(`   Price B (M): ${priceB}`);
      console.log(`   ─────────────────────────────────`);
      console.log(`   Result (I): ${resultNumber}`);
      console.log(`   Result A (J): ${resultA}`);
      console.log(`   Result B (K): ${resultB}`);
      console.log(`   User B ID (R): ${userBId}`);
      console.log(`   Amount A (S): ${amountA}`);
      console.log(`   Amount B (T): ${amountB}`);
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════════════════════════');
    console.log('\n📊 สรุปผลลัพธ์:');
    console.log('');

    // ตรวจสอบว่า Price B มีช่วงราคาหรือไม่
    let correctPriceB = 0;
    let wrongPriceB = 0;

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const priceB = row[12] || '';
      const userBName = row[11] || '';
      
      if (userBName && priceB) {
        if (priceB.includes('-')) {
          correctPriceB++;
          console.log(`✅ Row ${i + 1}: Price B มีช่วงราคา "${priceB}"`);
        } else {
          wrongPriceB++;
          console.log(`❌ Row ${i + 1}: Price B ไม่มีช่วงราคา "${priceB}"`);
        }
      }
    }

    console.log('');
    console.log(`📊 สรุป:`);
    console.log(`   ✅ Price B ถูกต้อง (มีช่วงราคา): ${correctPriceB} แถว`);
    console.log(`   ❌ Price B ผิด (ไม่มีช่วงราคา): ${wrongPriceB} แถว`);

    // ตรวจสอบผลลัพธ์
    console.log('\n📊 ตรวจสอบผลลัพธ์:');
    let hasResult = 0;
    let noResult = 0;

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const resultNumber = row[8] || '';
      const resultA = row[9] || '';
      const resultB = row[10] || '';
      
      if (resultNumber && resultA && resultB) {
        hasResult++;
      } else {
        noResult++;
      }
    }

    console.log(`   ✅ มีผลลัพธ์ (I, J, K ครบ): ${hasResult} แถว`);
    console.log(`   ❌ ไม่มีผลลัพธ์: ${noResult} แถว`);

  } catch (error) {
    console.error('Error:', error);
  }
}

testResultOutput();
