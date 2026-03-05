/**
 * ตรวจสอบการบันทึกผลลัพธ์เมื่อมีประกาศผล
 * ตัวอย่าง: 350-410 ฟ้า 370⛔️
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

async function verifyResultRecording() {
  try {
    console.log('🔍 === ตรวจสอบการบันทึกผลลัพธ์ ===\n');

    // 1️⃣ ตั้งค่า Google Sheets API
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

    // 2️⃣ ดึงข้อมูลทั้งหมดจากชีท
    console.log('📊 ดึงข้อมูลจากชีท...\n');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A2:U`,
    });

    const values = response.data.values || [];
    console.log(`✅ พบ ${values.length} แถว\n`);

    // 3️⃣ ตรวจสอบแถวที่มีผลลัพธ์
    console.log('🎯 === ตรวจสอบแถวที่มีผลลัพธ์ ===\n');

    const resultsFound = [];

    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const rowIndex = i + 2; // +2 เพราะ header + 0-indexed

      // ตรวจสอบคอลัมน์ที่เกี่ยวข้อง
      const userAName = row[2] || '';        // C: ชื่อ User A
      const slipName = row[4] || '';         // E: ชื่อบั้งไฟ
      const userBAmount = row[7] || '';      // H: ยอดเงิน User B (ถ้ามี = MATCHED)
      const resultNumber = row[8] || '';     // I: ผลที่ออก
      const resultStatus = row[9] || '';     // J: ผลแพ้ชนะ
      const resultA = row[18] || '';         // S: ผลลัพธ์ A
      const resultB = row[19] || '';         // T: ผลลัพธ์ B

      // ถ้ามีผลลัพธ์ (คอลัมน์ I มีค่า)
      if (resultNumber) {
        resultsFound.push({
          rowIndex,
          userAName,
          slipName,
          resultNumber,
          resultStatus,
          resultA,
          resultB,
          isMatched: userBAmount !== '' && userBAmount !== undefined,
        });
      }
    }

    if (resultsFound.length === 0) {
      console.log('❌ ไม่พบแถวที่มีผลลัพธ์\n');
      return;
    }

    // 4️⃣ แสดงรายละเอียดผลลัพธ์
    console.log(`📋 พบ ${resultsFound.length} แถวที่มีผลลัพธ์:\n`);

    resultsFound.forEach((result, idx) => {
      console.log(`${idx + 1}. แถว ${result.rowIndex}`);
      console.log(`   👤 ผู้เล่น A: ${result.userAName}`);
      console.log(`   🎆 บั้งไฟ: ${result.slipName}`);
      console.log(`   📊 ผลที่ออก: ${result.resultNumber}`);
      console.log(`   ✅ สถานะ: ${result.resultStatus}`);
      console.log(`   💰 ผลลัพธ์ A: ${result.resultA}`);
      console.log(`   💰 ผลลัพธ์ B: ${result.resultB}`);
      console.log(`   🔗 จับคู่: ${result.isMatched ? '✅ ใช่' : '❌ ไม่ใช่'}`);
      console.log('');
    });

    // 5️⃣ ตรวจสอบความสมบูรณ์ของข้อมูล
    console.log('🔎 === ตรวจสอบความสมบูรณ์ ===\n');

    const issues = [];

    resultsFound.forEach((result) => {
      // ตรวจสอบว่าจับคู่หรือไม่
      if (!result.isMatched) {
        issues.push(`⚠️  แถว ${result.rowIndex}: ไม่ได้จับคู่ (User B ไม่มีข้อมูล)`);
      }

      // ตรวจสอบว่ามีผลลัพธ์ A และ B หรือไม่
      if (!result.resultA) {
        issues.push(`⚠️  แถว ${result.rowIndex}: ไม่มีผลลัพธ์ A`);
      }
      if (!result.resultB) {
        issues.push(`⚠️  แถว ${result.rowIndex}: ไม่มีผลลัพธ์ B`);
      }

      // ตรวจสอบสถานะ
      if (!result.resultStatus) {
        issues.push(`⚠️  แถว ${result.rowIndex}: ไม่มีสถานะผลลัพธ์`);
      }
    });

    if (issues.length === 0) {
      console.log('✅ ข้อมูลทั้งหมดสมบูรณ์\n');
    } else {
      console.log('❌ พบปัญหา:\n');
      issues.forEach((issue) => console.log(`   ${issue}`));
      console.log('');
    }

    // 6️⃣ ตรวจสอบการคำนวณยอดเงิน
    console.log('💰 === ตรวจสอบการคำนวณยอดเงิน ===\n');

    resultsFound.forEach((result) => {
      // แยกข้อมูลจากผลลัพธ์
      const resultAMatch = result.resultA.match(/(\w+)\s+([\d.]+)\s+บาท/);
      const resultBMatch = result.resultB.match(/(\w+)\s+([\d.]+)\s+บาท/);

      if (resultAMatch && resultBMatch) {
        const statusA = resultAMatch[1];
        const amountA = parseFloat(resultAMatch[2]);
        const statusB = resultBMatch[1];
        const amountB = parseFloat(resultBMatch[2]);

        console.log(`📍 แถว ${result.rowIndex}:`);
        console.log(`   User A: ${statusA} ${amountA} บาท`);
        console.log(`   User B: ${statusB} ${amountB} บาท`);

        // ตรวจสอบว่าเป็นการออกกลาง (เสมอ) หรือชนะ-แพ้
        if (statusA === 'เสมอ' && statusB === 'เสมอ') {
          console.log(`   ✅ ออกกลาง (ทั้งสองฝั่งหัก 5%)`);
        } else if (
          (statusA === 'ชนะ' && statusB === 'แพ้') ||
          (statusA === 'แพ้' && statusB === 'ชนะ')
        ) {
          console.log(`   ✅ ชนะ-แพ้ (ผู้ชนะหัก 10%)`);
        } else {
          console.log(`   ⚠️  สถานะไม่ตรงกัน`);
        }
        console.log('');
      }
    });

    // 7️⃣ สรุป
    console.log('📊 === สรุป ===\n');
    console.log(`✅ บันทึกผลลัพธ์: ${resultsFound.length} แถว`);
    console.log(`⚠️  ปัญหาที่พบ: ${issues.length} รายการ`);
    console.log(`✅ ข้อมูลสมบูรณ์: ${issues.length === 0 ? 'ใช่' : 'ไม่ใช่'}\n`);

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  }
}

// รัน
verifyResultRecording();
