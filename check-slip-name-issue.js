/**
 * Check Slip Name Issue
 * ตรวจสอบปัญหา Slip Name เปลี่ยนจาก "เป็ด" เป็น "370-400 เป็ด"
 */

require('dotenv').config();

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load credentials
const credentialsPath = path.join(__dirname, 'credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function checkSlipNameIssue() {
  try {
    console.log('📊 Fetching Bets sheet data...\n');
    console.log(`Sheet ID: ${process.env.GOOGLE_SHEET_ID}\n`);

    // ดึงข้อมูลจากชีท Bets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Bets!A:U',
    });

    const rows = response.data.values || [];
    console.log(`📈 Total rows: ${rows.length}\n`);

    // ข้ามแถวหัวตาราง
    const dataRows = rows.slice(1);

    // ค้นหาแถวที่มี slip name ผิด (มีราคา)
    console.log('🔍 Checking for slip name issues...\n');

    let issueCount = 0;

    dataRows.forEach((row, index) => {
      const rowNum = index + 2; // +2 เพราะ +1 สำหรับ header, +1 สำหรับ 1-indexed
      
      // Column E (index 4) = SLIP_NAME
      const slipName = row[4] || '';
      
      // ตรวจสอบว่า slip name มีรูปแบบ "ราคา ชื่อบั้งไฟ" (ผิด)
      if (slipName && slipName.match(/^\d+-\d+\s+/)) {
        issueCount++;
        
        const userAName = row[2] || 'Unknown';
        const messageA = row[3] || '';
        const sideA = row[5] || '';
        const amount = row[6] || '';
        const userBName = row[11] || '';
        const sideB = row[12] || '';
        
        console.log(`❌ Row ${rowNum}: Slip name has price prefix`);
        console.log(`   Slip Name: "${slipName}"`);
        console.log(`   User A: ${userAName} (${sideA}) ${amount} บาท`);
        console.log(`   Message A: ${messageA}`);
        if (userBName) {
          console.log(`   User B: ${userBName} (${sideB})`);
        }
        console.log('');
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Total rows checked: ${dataRows.length}`);
    console.log(`   Issues found: ${issueCount}`);

    if (issueCount === 0) {
      console.log('\n✅ No slip name issues found!');
    } else {
      console.log(`\n⚠️  Found ${issueCount} rows with slip name issues`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSlipNameIssue();
