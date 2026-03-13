/**
 * Fix: แก้ไขช่วงราคา Row 6 และ 7 ให้ 340 อยู่ในช่วง
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
    console.log('🔧 แก้ไขช่วงราคา Row 6 และ 7\n');

    // ดึงข้อมูล
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!D6:D7`,
    });

    const rows = response.data.values || [];

    console.log('ข้อมูลปัจจุบัน:');
    console.log(`  Row 6: "${rows[0]?.[0] || ''}"`);
    console.log(`  Row 7: "${rows[1]?.[0] || ''}"\n`);

    console.log('ข้อมูลใหม่ (340 อยู่ในช่วง):');
    console.log(`  Row 6: "340-360 ล 15 ฟ้า"`);
    console.log(`  Row 7: "340-375 ล 13 ฟ้า"\n`);

    // แก้ไขข้อมูล
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      requestBody: {
        data: [
          {
            range: `${GOOGLE_WORKSHEET_NAME}!D6`,
            values: [['340-360 ล 15 ฟ้า']],
          },
          {
            range: `${GOOGLE_WORKSHEET_NAME}!D7`,
            values: [['340-375 ล 13 ฟ้า']],
          },
        ],
        valueInputOption: 'USER_ENTERED',
      },
    });

    console.log('✅ แก้ไขข้อมูล Row 6 และ 7 สำเร็จ\n');

    // ตรวจสอบผลลัพธ์
    await new Promise(resolve => setTimeout(resolve, 500));

    const afterResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!D6:D7`,
    });

    const afterRows = afterResponse.data.values || [];

    console.log('📋 ข้อมูลที่แก้ไข:');
    console.log(`  Row 6: "${afterRows[0]?.[0] || ''}"`);
    console.log(`  Row 7: "${afterRows[1]?.[0] || ''}"\n`);

    // ตรวจสอบการคำนวณผลลัพธ์
    console.log('📊 ตรวจสอบการคำนวณผลลัพธ์:');
    const resultNumber = 340;

    for (let i = 0; i < 2; i++) {
      const priceStr = afterRows[i]?.[0] || '';
      const priceMatch = priceStr.match(/(\d+)-(\d+)/);
      if (priceMatch) {
        const minPrice = parseInt(priceMatch[1]);
        const maxPrice = parseInt(priceMatch[2]);
        const isInRange = resultNumber >= minPrice && resultNumber <= maxPrice;

        console.log(`  Row ${i + 6}: ${minPrice}-${maxPrice}, ผลออก ${resultNumber}`);
        console.log(`    อยู่ในช่วง: ${isInRange}`);
        if (isInRange) {
          console.log(`    ✅ ผลลัพธ์: เสมอ (⛔️⛔️)`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
