const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function testResultRecordingFlow() {
  try {
    const credentialsPath = path.join(__dirname, 'credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const worksheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

    console.log('\n📊 ทดสอบการบันทึกผลเมื่อประกาศ "ฟ้า 340 ✅️"');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    // ดึงข้อมูลทั้งหมด
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: sheetId,
      range: `${worksheetName}!A:U`,
    });

    const rows = response.data.values || [];
    const headers = rows[0] || [];
    const dataRows = rows.slice(1);

    console.log('📋 ข้อมูลปัจจุบันในชีท Bets:\n');

    // แสดงเฉพาะคอลั่มที่เกี่ยวข้อง
    const relevantCols = {
      'E': 'ชื่อบั้งไฟ',
      'I': 'ผลที่ออก',
      'J': 'ผลแพ้ชนะ A',
      'K': 'ผลแพ้ชนะ B',
      'L': 'ชื่อ User B',
      'C': 'ชื่อ User A',
    };

    console.log('┌─────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐');
    console.log('│ Row │ ชื่อบั้งไฟ   │ ผลที่ออก     │ ผลแพ้ชนะ A   │ ผลแพ้ชนะ B   │ ชื่อ User A  │ ชื่อ User B  │');
    console.log('├─────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤');

    dataRows.forEach((row, idx) => {
      const slipName = row[4] || '(ว่าง)';
      const resultNumber = row[8] || '(ว่าง)';
      const resultA = row[9] || '(ว่าง)';
      const resultB = row[10] || '(ว่าง)';
      const userA = row[2] || '(ว่าง)';
      const userB = row[11] || '(ว่าง)';

      console.log(`│ ${idx + 1}   │ ${slipName.padEnd(12)} │ ${resultNumber.toString().padEnd(12)} │ ${resultA.toString().padEnd(12)} │ ${resultB.toString().padEnd(12)} │ ${userA.substring(0, 12).padEnd(12)} │ ${userB.substring(0, 12).padEnd(12)} │`);
    });

    console.log('└─────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘\n');

    // ตรวจสอบว่าคอลั่มไหนว่าง
    console.log('📊 สถานะคอลั่มผลลัพธ์:\n');
    console.log(`  [I] ผลที่ออก (Column I):        ${dataRows.filter(r => r[8]).length}/${dataRows.length} แถว`);
    console.log(`  [J] ผลแพ้ชนะ A (Column J):      ${dataRows.filter(r => r[9]).length}/${dataRows.length} แถว`);
    console.log(`  [K] ผลแพ้ชนะ B (Column K):      ${dataRows.filter(r => r[10]).length}/${dataRows.length} แถว`);

    console.log('\n📝 ข้อมูลรายละเอียด:\n');

    // ตรวจสอบแต่ละแถว
    dataRows.forEach((row, idx) => {
      const slipName = row[4];
      const resultNumber = row[8];
      const resultA = row[9];
      const resultB = row[10];
      const userA = row[2];
      const userB = row[11];
      const priceA = row[3];

      if (slipName === 'ฟ้า') {
        console.log(`🔹 Row ${idx + 1}: ${userA} vs ${userB}`);
        console.log(`   ข้อความ A: ${priceA}`);
        console.log(`   ช่วงราคา: ${priceA.match(/\d+-\d+/)?.[0] || '(ไม่มี)'}`);
        console.log(`   ผลที่ออก: ${resultNumber || '(ยังไม่บันทึก)'}`);
        console.log(`   ผลแพ้ชนะ A: ${resultA || '(ยังไม่บันทึก)'}`);
        console.log(`   ผลแพ้ชนะ B: ${resultB || '(ยังไม่บันทึก)'}`);
        console.log('');
      }
    });

    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');
    console.log('🔍 ผลการวิเคราะห์:\n');

    const blueSlips = dataRows.filter(r => r[4] === 'ฟ้า');
    const withResults = blueSlips.filter(r => r[8]);
    const withoutResults = blueSlips.filter(r => !r[8]);

    console.log(`✅ รายการเล่น "ฟ้า": ${blueSlips.length} รายการ`);
    console.log(`   - มีผลลัพธ์: ${withResults.length} รายการ`);
    console.log(`   - ยังไม่มีผลลัพธ์: ${withoutResults.length} รายการ`);

    if (withoutResults.length > 0) {
      console.log('\n⚠️ ปัญหา: ยังไม่มีการบันทึกผลลัพธ์ในคอลั่ม I, J, K');
      console.log('   ต้องตรวจสอบว่า updateBetResult() ทำงานถูกต้องหรือไม่');
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  }
}

testResultRecordingFlow();
