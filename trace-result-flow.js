/**
 * ติดตามขั้นตอนการบันทึกผลลัพธ์
 * ตัวอย่าง: 350-410 ฟ้า 370⛔️
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

async function traceResultFlow() {
  try {
    console.log('🔍 === ติดตามขั้นตอนการบันทึกผลลัพธ์ ===\n');

    // ตั้งค่า Google Sheets API
    let credentials;
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } else {
      const credentialsPath = path.join(__dirname, 'credentials.json');
      credentials = JSON.parse(fs.readFileSync(credentialsPath));
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ดึงข้อมูลทั้งหมด
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A1:U`,
    });

    const allValues = response.data.values || [];
    const headers = allValues[0] || [];
    const values = allValues.slice(1);

    console.log('📋 === ขั้นตอนการบันทึกผลลัพธ์ ===\n');

    console.log('1️⃣  ขั้นตอนแรก: ตรวจสอบการจับคู่');
    console.log('   - ค้นหาแถวที่มี User A และ User B (Column H มีค่า)');
    console.log('   - ตรวจสอบว่าบั้งไฟตรงกันหรือไม่\n');

    // ค้นหาแถวที่จับคู่แล้ว
    const matchedRows = [];
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const userAName = row[2] || '';        // C
      const slipName = row[4] || '';         // E
      const userBAmount = row[7] || '';      // H
      const userBName = row[11] || '';       // L

      if (userBAmount !== '' && userBAmount !== undefined) {
        matchedRows.push({
          rowIndex: i + 2,
          userAName,
          userBName,
          slipName,
          userBAmount,
        });
      }
    }

    console.log(`   ✅ พบแถวที่จับคู่: ${matchedRows.length} แถว\n`);
    matchedRows.forEach((row) => {
      console.log(`      - แถว ${row.rowIndex}: ${row.userAName} vs ${row.userBName} (${row.slipName})`);
    });
    console.log('');

    console.log('2️⃣  ขั้นตอนที่สอง: คำนวณผลลัพธ์');
    console.log('   - ตรวจสอบว่าคะแนนที่ออกอยู่ในเกณฑ์ของใครบ้าง');
    console.log('   - คำนวณค่าธรรมเนียม (10% ชนะ, 5% ออกกลาง)\n');

    console.log('3️⃣  ขั้นตอนที่สาม: บันทึกผลลัพธ์ลงชีท');
    console.log('   - อัปเดตคอลัมน์ I (ผลที่ออก)');
    console.log('   - อัปเดตคอลัมน์ J (ผลแพ้ชนะ)');
    console.log('   - อัปเดตคอลัมน์ S (ผลลัพธ์ A)');
    console.log('   - อัปเดตคอลัมน์ T (ผลลัพธ์ B)\n');

    // ตรวจสอบแถวที่มีผลลัพธ์
    const resultsRecorded = [];
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const resultNumber = row[8] || '';     // I
      const resultStatus = row[9] || '';     // J
      const resultA = row[18] || '';         // S
      const resultB = row[19] || '';         // T

      if (resultNumber) {
        resultsRecorded.push({
          rowIndex: i + 2,
          resultNumber,
          resultStatus,
          resultA,
          resultB,
        });
      }
    }

    console.log(`   ✅ บันทึกผลลัพธ์: ${resultsRecorded.length} แถว\n`);
    resultsRecorded.forEach((row) => {
      console.log(`      - แถว ${row.rowIndex}: ${row.resultNumber} | ${row.resultStatus}`);
      console.log(`        └─ A: ${row.resultA}`);
      console.log(`        └─ B: ${row.resultB}`);
    });
    console.log('');

    console.log('4️⃣  ขั้นตอนที่สี่: อัปเดตยอดเงิน');
    console.log('   - ดึงยอดเงินปัจจุบันของผู้เล่น');
    console.log('   - คำนวณยอดเงินใหม่ (ยอดเดิม + ผลลัพธ์)');
    console.log('   - บันทึกยอดเงินใหม่\n');

    console.log('5️⃣  ขั้นตอนที่ห้า: ส่งแจ้งเตือน');
    console.log('   - ส่งข้อความส่วนตัวให้ผู้ชนะ');
    console.log('   - ส่งข้อความส่วนตัวให้ผู้แพ้');
    console.log('   - ส่งข้อความกลุ่ม\n');

    // ตรวจสอบความสมบูรณ์
    console.log('📊 === ตรวจสอบความสมบูรณ์ ===\n');

    const completeness = {
      matched: matchedRows.length,
      recorded: resultsRecorded.length,
      complete: matchedRows.length === resultsRecorded.length,
    };

    console.log(`✅ แถวที่จับคู่: ${completeness.matched}`);
    console.log(`✅ แถวที่บันทึกผลลัพธ์: ${completeness.recorded}`);
    console.log(`${completeness.complete ? '✅' : '❌'} สมบูรณ์: ${completeness.complete ? 'ใช่' : 'ไม่ใช่'}\n`);

    if (!completeness.complete) {
      console.log('⚠️  ปัญหา: จำนวนแถวที่จับคู่ไม่ตรงกับจำนวนแถวที่บันทึกผลลัพธ์');
      console.log(`   - จับคู่: ${completeness.matched}`);
      console.log(`   - บันทึก: ${completeness.recorded}`);
      console.log(`   - ส่วนต่าง: ${Math.abs(completeness.matched - completeness.recorded)}\n`);
    }

    // ตรวจสอบรายละเอียด
    console.log('🔎 === ตรวจสอบรายละเอียด ===\n');

    const detailIssues = [];

    resultsRecorded.forEach((result) => {
      // ตรวจสอบว่ามีผลลัพธ์ A และ B หรือไม่
      if (!result.resultA) {
        detailIssues.push(`❌ แถว ${result.rowIndex}: ไม่มีผลลัพธ์ A`);
      }
      if (!result.resultB) {
        detailIssues.push(`❌ แถว ${result.rowIndex}: ไม่มีผลลัพธ์ B`);
      }

      // ตรวจสอบสถานะ
      if (!result.resultStatus) {
        detailIssues.push(`❌ แถว ${result.rowIndex}: ไม่มีสถานะผลลัพธ์`);
      }

      // ตรวจสอบรูปแบบผลลัพธ์
      const validFormats = ['ชนะ', 'แพ้', 'เสมอ'];
      const hasValidStatus = validFormats.some((status) => result.resultStatus.includes(status));
      if (!hasValidStatus) {
        detailIssues.push(`⚠️  แถว ${result.rowIndex}: สถานะไม่ถูกต้อง (${result.resultStatus})`);
      }
    });

    if (detailIssues.length === 0) {
      console.log('✅ ไม่พบปัญหา\n');
    } else {
      detailIssues.forEach((issue) => console.log(`${issue}`));
      console.log('');
    }

    // สรุป
    console.log('📊 === สรุป ===\n');
    console.log(`✅ ขั้นตอนที่ 1 (จับคู่): ${completeness.matched} แถว`);
    console.log(`✅ ขั้นตอนที่ 3 (บันทึก): ${completeness.recorded} แถว`);
    console.log(`${detailIssues.length === 0 ? '✅' : '❌'} ปัญหา: ${detailIssues.length} รายการ\n`);

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  }
}

// รัน
traceResultFlow();
