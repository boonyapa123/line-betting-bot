/**
 * Fix: แก้ไขข้อมูล Row 7 จาก 345-375 เป็น 340-375
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
    console.log('🔧 แก้ไขข้อมูล Row 7\n');

    // ดึงข้อมูล Row 7
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!D7`,
    });

    const currentData = response.data.values?.[0]?.[0] || '';
    console.log(`ข้อมูลปัจจุบัน: "${currentData}"`);
    console.log(`ข้อมูลใหม่: "340-375 ล 13 ฟ้า"\n`);

    // แก้ไขข้อมูล
    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!D7`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['340-375 ล 13 ฟ้า']],
      },
    });

    console.log('✅ แก้ไขข้อมูล Row 7 สำเร็จ\n');

    // ตรวจสอบผลลัพธ์
    await new Promise(resolve => setTimeout(resolve, 500));

    const afterResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!D7`,
    });

    const newData = afterResponse.data.values?.[0]?.[0] || '';
    console.log(`📋 ข้อมูลที่แก้ไข: "${newData}"`);

    // ตรวจสอบการคำนวณผลลัพธ์
    console.log('\n📊 ตรวจสอบการคำนวณผลลัพธ์:');
    const priceMatch = newData.match(/(\d+)-(\d+)/);
    if (priceMatch) {
      const minPrice = parseInt(priceMatch[1]);
      const maxPrice = parseInt(priceMatch[2]);
      const resultNumber = 340;

      console.log(`   ช่วงราคา: ${minPrice}-${maxPrice}`);
      console.log(`   ผลออก: ${resultNumber}`);
      console.log(`   อยู่ในช่วง: ${resultNumber >= minPrice && resultNumber <= maxPrice}`);

      if (resultNumber >= minPrice && resultNumber <= maxPrice) {
        console.log(`   ✅ ผลลัพธ์: เสมอ (⛔️⛔️)`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
