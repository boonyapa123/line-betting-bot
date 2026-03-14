/**
 * Check Bets Data Detailed
 * ตรวจสอบข้อมูลในชีท Bets อย่างละเอียด
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

async function checkBetsData() {
  try {
    console.log('📊 Fetching Bets sheet data...\n');

    // ดึงข้อมูลจากชีท Bets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Bets!A:U',
    });

    const rows = response.data.values || [];
    console.log(`📈 Total rows: ${rows.length}\n`);

    // แสดงหัวตาราง
    if (rows.length > 0) {
      console.log('📋 Column Headers:');
      const headers = rows[0];
      headers.forEach((header, index) => {
        const colLetter = String.fromCharCode(65 + index);
        console.log(`   [${colLetter}] ${header}`);
      });
      console.log('\n');
    }

    // ข้ามแถวหัวตาราง
    const dataRows = rows.slice(1);

    console.log('📊 Data Rows:\n');

    dataRows.forEach((row, index) => {
      const rowNum = index + 2; // +2 เพราะ +1 สำหรับ header, +1 สำหรับ 1-indexed
      
      const timestamp = row[0] || '';
      const userAId = row[1] || '';
      const userAName = row[2] || '';
      const messageA = row[3] || '';
      const slipName = row[4] || '';
      const sideA = row[5] || '';
      const amount = row[6] || '';
      const amountB = row[7] || '';
      const result = row[8] || '';
      const resultWinLoseA = row[9] || '';
      const resultWinLoseB = row[10] || '';
      const userBName = row[11] || '';
      const sideB = row[12] || '';
      const groupChatName = row[13] || '';
      const groupName = row[14] || '';
      const tokenA = row[15] || '';
      const groupId = row[16] || '';
      const userBId = row[17] || '';
      const resultA = row[18] || '';
      const resultB = row[19] || '';
      const matchedAuto = row[20] || '';

      console.log(`\n🔹 Row ${rowNum}:`);
      console.log(`   📅 Timestamp: ${timestamp}`);
      console.log(`   👤 User A: ${userAName} (${userAId})`);
      console.log(`   💬 Message A: ${messageA}`);
      console.log(`   🎆 Slip Name: "${slipName}"`);
      console.log(`   💹 Side A: ${sideA}`);
      console.log(`   💰 Amount A: ${amount}`);
      
      if (userBName) {
        console.log(`   👤 User B: ${userBName} (${userBId})`);
        console.log(`   💹 Side B: ${sideB}`);
        console.log(`   💰 Amount B: ${amountB}`);
        console.log(`   🔗 Matched Auto: ${matchedAuto}`);
      }
      
      if (result) {
        console.log(`   📊 Result: ${result}`);
        console.log(`   ✅ Result Win/Lose A: ${resultWinLoseA}`);
        if (resultWinLoseB) {
          console.log(`   ✅ Result Win/Lose B: ${resultWinLoseB}`);
        }
      }

      // ตรวจสอบปัญหา
      console.log(`\n   🔍 Issues Check:`);
      
      // ตรวจสอบ slip name
      if (slipName && slipName.match(/^\d+-\d+\s+/)) {
        console.log(`   ❌ Slip name has price prefix: "${slipName}"`);
      } else if (slipName) {
        console.log(`   ✅ Slip name is correct: "${slipName}"`);
      } else {
        console.log(`   ⚠️  Slip name is empty`);
      }

      // ตรวจสอบ message format
      if (messageA && !messageA.match(/^[ก-๙]+\/\d+-\d+\/\d+[ก-๙\s]+$/) && 
          !messageA.match(/^\d+-\d+\s+[ล|ต|ย|ส]\s+\d+\s+[ก-๙\s]+$/)) {
        console.log(`   ⚠️  Message format might be non-standard: "${messageA}"`);
      } else if (messageA) {
        console.log(`   ✅ Message format is standard`);
      }
    });

    console.log('\n\n📊 Summary:');
    console.log(`   Total data rows: ${dataRows.length}`);
    
    // นับแถวที่มี User B (จับคู่สำเร็จ)
    const matchedRows = dataRows.filter(row => row[11]);
    console.log(`   Matched bets (with User B): ${matchedRows.length}`);
    
    // นับแถวที่มี Result
    const resultRows = dataRows.filter(row => row[8]);
    console.log(`   Bets with result: ${resultRows.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBetsData();
