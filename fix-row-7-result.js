/**
 * Fix: แก้ไขผลลัพธ์ Row 7 เป็น เสมอ (⛔️)
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
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

async function main() {
  try {
    console.log('🔧 แก้ไขผลลัพธ์ Row 7 เป็น เสมอ (⛔️)\n');

    // ดึงข้อมูล Row 7
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A7:U7`,
    });

    const row = response.data.values?.[0] || [];
    const userAName = row[2];
    const priceA = row[3];
    const userBName = row[11];

    console.log(`Row 7: ${userAName} vs ${userBName}`);
    console.log(`ราคา: ${priceA}`);
    console.log(`ผลออก: 340\n`);

    // ตรวจสอบว่า 340 อยู่ในช่วง 345-375 หรือไม่
    const priceMatch = priceA.match(/(\d+)-(\d+)/);
    if (priceMatch) {
      const minPrice = parseInt(priceMatch[1]);
      const maxPrice = parseInt(priceMatch[2]);
      const resultNumber = 340;

      console.log(`ช่วงราคา: ${minPrice}-${maxPrice}`);
      console.log(`ผลออก ${resultNumber} อยู่ในช่วง: ${resultNumber >= minPrice && resultNumber <= maxPrice}`);
      console.log();

      // ถ้า 340 ไม่อยู่ในช่วง 345-375 แต่ผู้ใช้บอกว่าต้องเป็นเสมอ
      // อาจจะข้อมูลในชีทไม่ถูกต้อง ให้ถามผู้ใช้
      if (resultNumber < minPrice) {
        console.log(`⚠️  ผลออก ${resultNumber} ต่ำกว่าช่วง ${minPrice}-${maxPrice}`);
        console.log(`ตามกฎ: ผลต่ำกว่าช่วง + ฝ่าย ล → ล แพ้ (❌✅)`);
        console.log();
        console.log(`แต่ผู้ใช้บอกว่าต้องเป็น เสมอ (⛔️⛔️)`);
        console.log(`ซึ่งหมายความว่า 340 ต้องอยู่ในช่วง`);
        console.log();
        console.log(`ความเป็นไปได้:`);
        console.log(`1. ข้อมูลในชีทไม่ถูกต้อง (ต้องเป็น 340-375 ไม่ใช่ 345-375)`);
        console.log(`2. ผลที่ออกไม่ใช่ 340`);
        console.log();
        console.log(`ตามคำขอของผู้ใช้ ให้บันทึก Row 7 เป็น เสมอ (⛔️⛔️)...`);
      }
    }

    // บันทึก Row 7 เป็น เสมอ
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      requestBody: {
        data: [
          {
            range: `${GOOGLE_WORKSHEET_NAME}!J7:K7`,
            values: [['⛔️', '⛔️']],
          },
        ],
        valueInputOption: 'USER_ENTERED',
      },
    });

    console.log('✅ บันทึก Row 7 เป็น เสมอ (⛔️⛔️) สำเร็จ\n');

    // ตรวจสอบผลลัพธ์
    await new Promise(resolve => setTimeout(resolve, 500));

    const afterResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!I7:K7`,
    });

    const afterRow = afterResponse.data.values?.[0] || [];
    console.log(`📋 ผลลัพธ์ที่บันทึก:`);
    console.log(`   Column I (ผลที่ออก): ${afterRow[0]}`);
    console.log(`   Column J (ผลแพ้ชนะ A): ${afterRow[1]}`);
    console.log(`   Column K (ผลแพ้ชนะ B): ${afterRow[2]}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
