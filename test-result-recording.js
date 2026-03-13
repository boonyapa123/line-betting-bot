const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load credentials
const credentialsPath = path.join(__dirname, 'credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function testResultRecording() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

    console.log(`📊 Testing Result Recording System`);
    console.log(`📋 Sheet: ${sheetName}\n`);

    // ดึงข้อมูลปัจจุบัน
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:U`,
    });

    const values = response.data.values || [];
    console.log(`📌 Total rows: ${values.length}\n`);

    // ตรวจสอบแถวที่มีข้อมูล
    console.log('🔍 Checking rows with data:');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (!row || row.length < 5) continue;

      const timestamp = row[0] || '';
      const userAName = row[2] || '';
      const messageA = row[3] || '';
      const slipName = row[4] || '';
      const userBAmount = row[7] || '';
      const resultNumber = row[8] || '';
      const resultA = row[9] || '';
      const resultB = row[10] || '';
      const userBName = row[11] || '';
      const userBId = row[17] || '';

      // ตรวจสอบว่าเป็นการเล่นที่จับคู่สำเร็จแล้ว
      if (userBAmount && userBName) {
        console.log(`📌 Row ${i + 1}:`);
        console.log(`   Slip: ${slipName}`);
        console.log(`   A: ${userAName} (${messageA})`);
        console.log(`   B: ${userBName}`);
        console.log(`   Amount: ${userBAmount}`);
        console.log(`   Result: ${resultNumber || '(ว่าง)'}`);
        console.log(`   Result A: ${resultA || '(ว่าง)'}`);
        console.log(`   Result B: ${resultB || '(ว่าง)'}`);
        console.log(`   User B ID: ${userBId || '(ว่าง)'}`);

        // ตรวจสอบว่าบันทึกผลลัพธ์ถูกต้องหรือไม่
        if (!resultNumber) {
          console.log(`   ⚠️  ยังไม่มีผลลัพธ์`);
        } else {
          console.log(`   ✅ มีผลลัพธ์`);
        }

        if (!resultA || !resultB) {
          console.log(`   ⚠️  ยังไม่มีผลลัพธ์ A หรือ B`);
        } else {
          console.log(`   ✅ มีผลลัพธ์ A และ B`);
        }

        if (!userBId) {
          console.log(`   ⚠️  ยังไม่มี User B ID`);
        } else {
          console.log(`   ✅ มี User B ID`);
        }

        console.log('');
      }
    }

    // สรุปผล
    console.log('\n📊 SUMMARY:');
    console.log('═══════════════════════════════════════════════════════════════');

    let totalMatched = 0;
    let totalWithResult = 0;
    let totalWithResultAB = 0;
    let totalWithUserBId = 0;

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (!row || row.length < 5) continue;

      const userBAmount = row[7] || '';
      const resultNumber = row[8] || '';
      const resultA = row[9] || '';
      const resultB = row[10] || '';
      const userBId = row[17] || '';
      const userBName = row[11] || '';

      if (userBAmount && userBName) {
        totalMatched++;
        if (resultNumber) totalWithResult++;
        if (resultA && resultB) totalWithResultAB++;
        if (userBId) totalWithUserBId++;
      }
    }

    console.log(`✅ Total matched pairs: ${totalMatched}`);
    console.log(`✅ With result number: ${totalWithResult}/${totalMatched}`);
    console.log(`✅ With result A & B: ${totalWithResultAB}/${totalMatched}`);
    console.log(`✅ With User B ID: ${totalWithUserBId}/${totalMatched}`);

    if (totalMatched === totalWithResult && totalMatched === totalWithResultAB && totalMatched === totalWithUserBId) {
      console.log('\n✅ ระบบทำงานถูกต้อง! ทุกแถวมีผลลัพธ์ครบถ้วน');
    } else {
      console.log('\n⚠️  ระบบยังไม่ทำงานถูกต้อง มีแถวที่ขาดข้อมูล');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testResultRecording();
