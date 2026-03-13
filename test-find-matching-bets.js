const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function testFindMatchingBets() {
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

    console.log('\n📊 ทดสอบ findMatchingBets() เมื่อประกาศ "ฟ้า 340 ✅️"');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    // ดึงข้อมูลทั้งหมด
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: sheetId,
      range: `${worksheetName}!A:U`,
    });

    const rows = response.data.values || [];
    const matchingRows = [];

    const priceRange = null; // ไม่มีช่วงราคา
    const fireworkName = 'ฟ้า';

    console.log(`🔍 ค้นหา: priceRange="${priceRange}", fireworkName="${fireworkName}"\n`);

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 5) continue;

      // Column E (index 4) = ชื่อบั้งไฟ
      const rowPriceAndName = row[4] || '';

      // Column H (index 7) = ยอดเงิน B
      const userBAmount = row[7] || '';

      // Column I (index 8) = ผลที่ออก
      const resultNumber = row[8] || '';

      // ตรวจสอบชื่อบั้งไฟ
      const nameMatch = fireworkName && rowPriceAndName.includes(fireworkName);

      // ตรวจสอบช่วงราคา
      let priceMatch = true;
      if (priceRange && priceRange !== 'null') {
        priceMatch = rowPriceAndName.startsWith(priceRange);
      }

      console.log(`Row ${i + 1}:`);
      console.log(`  ชื่อบั้งไฟ: "${rowPriceAndName}"`);
      console.log(`  ยอดเงิน B: "${userBAmount}"`);
      console.log(`  ผลที่ออก: "${resultNumber}"`);
      console.log(`  ตรวจสอบ:`);
      console.log(`    - nameMatch: ${nameMatch} (ชื่อบั้งไฟตรงกัน)`);
      console.log(`    - priceMatch: ${priceMatch} (ช่วงราคาตรงกัน)`);
      console.log(`    - hasUserB: ${!!userBAmount} (มี User B)`);
      console.log(`    - noResult: ${!resultNumber} (ยังไม่มีผลลัพธ์)`);

      if (priceMatch && nameMatch && userBAmount && !resultNumber) {
        console.log(`  ✅ MATCH!\n`);
        matchingRows.push({
          rowIndex: i + 1,
          data: row,
        });
      } else {
        console.log(`  ❌ NO MATCH\n`);
      }
    }

    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');
    console.log(`📊 ผลการค้นหา: พบ ${matchingRows.length} รายการ\n`);

    if (matchingRows.length > 0) {
      console.log('✅ รายการที่พบ:\n');
      matchingRows.forEach((match, idx) => {
        const row = match.data;
        console.log(`${idx + 1}. Row ${match.rowIndex}`);
        console.log(`   User A: ${row[2]}`);
        console.log(`   User B: ${row[11]}`);
        console.log(`   ยอดเงิน: ${row[6]} บาท`);
        console.log('');
      });
    } else {
      console.log('⚠️ ไม่พบรายการที่ตรงกัน\n');
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  }
}

testFindMatchingBets();
