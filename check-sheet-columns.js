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
    console.log('✅ Google Sheets initialized\n');
  } catch (error) {
    console.error('❌ Error initializing:', error);
    throw error;
  }
}

async function checkColumns() {
  try {
    // ดึงข้อมูล header row
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A1:U1`,
    });

    const headers = headerResponse.data.values?.[0] || [];

    console.log('═══════════════════════════════════════════════════════════════════════════════════');
    console.log('📋 SHEET COLUMNS MAPPING');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    // แสดงทุกคอลัมน์
    const columnLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
    console.log('📊 Header Row (Row 1):\n');
    for (let i = 0; i < headers.length; i++) {
      const letter = columnLetters[i];
      const index = i + 1;
      const header = headers[i] || '(ว่าง)';
      console.log(`   ${letter}${index} [${index}]: ${header}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════════════════');
    console.log('🎯 COLUMNS FOR RESULT RECORDING');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    // ตรวจสอบคอลัมน์ที่ใช้บันทึกผล
    const resultColumns = {
      'I': { index: 8, name: 'ผลที่ออก', current: headers[8] },
      'J': { index: 9, name: 'ผลแพ้ชนะ A', current: headers[9] },
      'K': { index: 10, name: 'ผลแพ้ชนะ B (Opposite)', current: headers[10] },
      'S': { index: 18, name: 'ผลลัพธ์ A', current: headers[18] },
      'T': { index: 19, name: 'ผลลัพธ์ B', current: headers[19] },
    };

    for (const [letter, info] of Object.entries(resultColumns)) {
      console.log(`${letter}${info.index + 1} [${info.index + 1}]: ${info.name}`);
      console.log(`   ปัจจุบัน: "${info.current || '(ว่าง)'}"`);
      console.log();
    }

    // ดึงข้อมูลแถวแรก (row 2) เพื่อดูตัวอย่าง
    console.log('═══════════════════════════════════════════════════════════════════════════════════');
    console.log('📝 SAMPLE DATA (Row 2)');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A2:U2`,
    });

    const row = dataResponse.data.values?.[0] || [];

    console.log('📊 All Columns Data:\n');
    for (let i = 0; i < Math.max(headers.length, row.length); i++) {
      const letter = columnLetters[i];
      const index = i + 1;
      const header = headers[i] || '(ว่าง)';
      const value = row[i] || '(ว่าง)';
      
      console.log(`${letter}${index} [${index}]: ${header}`);
      console.log(`   ค่า: ${value}`);
      console.log();
    }

    // ตรวจสอบคอลัมน์ที่ใช้บันทึกผล
    console.log('═══════════════════════════════════════════════════════════════════════════════════');
    console.log('✅ RESULT COLUMNS STATUS');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    for (const [letter, info] of Object.entries(resultColumns)) {
      const value = row[info.index] || '(ว่าง)';
      const status = value === '(ว่าง)' ? '⏳ ว่าง' : '✅ มีข้อมูล';
      console.log(`${letter}${info.index + 1}: ${info.name}`);
      console.log(`   ค่าปัจจุบัน: ${value}`);
      console.log(`   สถานะ: ${status}`);
      console.log();
    }

    // บันทึกรายละเอียดลงไฟล์
    const report = {
      headers: headers.map((h, i) => ({
        column: columnLetters[i] + (i + 1),
        index: i + 1,
        name: h || '(ว่าง)',
      })),
      resultColumns: Object.entries(resultColumns).map(([letter, info]) => ({
        column: letter + (info.index + 1),
        index: info.index + 1,
        name: info.name,
        currentHeader: info.current,
        currentValue: row[info.index] || '(ว่าง)',
      })),
      sampleRow: row.map((v, i) => ({
        column: columnLetters[i] + (i + 1),
        index: i + 1,
        value: v || '(ว่าง)',
      })),
    };

    const reportPath = 'sheet-columns-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 รายละเอียดบันทึกไว้ที่: ${reportPath}\n`);

  } catch (error) {
    console.error('❌ Error checking columns:', error);
  }
}

async function main() {
  await initialize();
  await checkColumns();
}

main().catch(console.error);
