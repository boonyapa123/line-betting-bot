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

async function checkAllBetsData() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });

    const values = response.data.values || [];
    const headers = values[0] || [];

    console.log('\n═══════════════════════════════════════════════════════════════════════════════════');
    console.log('📊 CHECK ALL BETS DATA');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    console.log(`📋 Total rows: ${values.length - 1} (excluding header)\n`);

    // ตรวจสอบแต่ละแถว
    let withResults = 0;
    let withoutResults = 0;
    let issues = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowNum = i + 1;

      const userAId = row[1] || '';
      const userAName = row[2] || '';
      const priceA = row[3] || '';
      const slipName = row[4] || '';
      const userBId = row[17] || '';  // Column R
      const userBName = row[11] || '';
      const priceB = row[12] || '';
      const resultNumber = row[8] || '';
      const resultJ = row[9] || '';
      const resultK = row[10] || '';
      const resultS = row[18] || '';
      const resultT = row[19] || '';

      // ข้ามแถวที่ไม่มีคู่เล่น
      if (!userAId || !userBId) continue;

      if (resultNumber) {
        withResults++;
        const status = (resultJ && resultK && resultS && resultT) ? '✅' : '⚠️';
        console.log(`${status} Row ${rowNum}: ${userAName} vs ${userBName}`);
        console.log(`   บั้งไฟ: ${slipName} | ผลออก: ${resultNumber}`);
        console.log(`   ราคา A: ${priceA || '(ไม่มี)'} | ราคา B: ${priceB || '(ไม่มี)'}`);
        console.log(`   ผลลัพธ์: J=${resultJ || '(ว่าง)'} | K=${resultK || '(ว่าง)'} | S=${resultS || '(ว่าง)'} | T=${resultT || '(ว่าง)'}`);

        if (!resultJ || !resultK || !resultS || !resultT) {
          issues.push({
            row: rowNum,
            issue: 'ผลลัพธ์ไม่ครบ',
            details: `J=${resultJ || '(ว่าง)'}, K=${resultK || '(ว่าง)'}, S=${resultS || '(ว่าง)'}, T=${resultT || '(ว่าง)'}`
          });
        }
        console.log();
      } else {
        withoutResults++;
      }
    }

    console.log('═══════════════════════════════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    console.log(`✅ รายการที่มีผลลัพธ์: ${withResults}`);
    console.log(`⏳ รายการที่ยังไม่มีผลลัพธ์: ${withoutResults}\n`);

    if (issues.length > 0) {
      console.log('⚠️  ISSUES FOUND:\n');
      for (const issue of issues) {
        console.log(`   Row ${issue.row}: ${issue.issue}`);
        console.log(`   ${issue.details}\n`);
      }
    } else {
      console.log('✅ ไม่พบปัญหา - ทั้งหมดบันทึกผลถูกต้อง\n');
    }

    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    // บันทึกรายละเอียดลงไฟล์
    const report = {
      timestamp: new Date().toISOString(),
      totalRows: values.length - 1,
      withResults,
      withoutResults,
      issues,
    };

    const reportPath = 'bets-data-check-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 รายละเอียดบันทึกไว้ที่: ${reportPath}\n`);

  } catch (error) {
    console.error('❌ Error checking bets data:', error);
  }
}

async function main() {
  await initialize();
  await checkAllBetsData();
}

main().catch(console.error);
