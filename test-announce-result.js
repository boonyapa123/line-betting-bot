/**
 * Test script: ประกาศผล "ฟ้า 340 ✅️" และตรวจสอบการบันทึก
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
    console.log('📊 Test: ประกาศผล "ฟ้า 340 ✅️"\n');

    // 1. ดึงข้อมูลปัจจุบัน
    console.log('1️⃣  ดึงข้อมูลปัจจุบัน...');
    const beforeResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });

    const beforeRows = beforeResponse.data.values || [];
    console.log(`   ✅ ดึงข้อมูล ${beforeRows.length} แถว\n`);

    // 2. ตรวจสอบแถวที่จับคู่แล้ว
    console.log('2️⃣  ตรวจสอบแถวที่จับคู่แล้ว (ฟ้า):');
    const matchedRows = [];
    for (let i = 1; i < beforeRows.length; i++) {
      const row = beforeRows[i];
      const slipName = row[4] || '';
      const userBAmount = row[7] || '';
      const resultNumber = row[8] || '';
      const resultA = row[9] || '';
      const resultB = row[10] || '';

      if (slipName.includes('ฟ้า') && userBAmount && !resultNumber) {
        matchedRows.push({
          rowIndex: i + 1,
          slipName,
          userAName: row[2],
          userBName: row[11],
          amount: row[6],
          amountB: row[7],
          priceA: row[3],
          resultNumber,
          resultA,
          resultB,
        });
        console.log(`   Row ${i + 1}: ${row[2]} vs ${row[11]} (${row[6]} บาท) - ราคา: ${row[3]}`);
      }
    }
    console.log(`   ✅ พบ ${matchedRows.length} แถวที่จับคู่แล้ว\n`);

    if (matchedRows.length === 0) {
      console.log('❌ ไม่มีแถวที่จับคู่แล้ว ไม่สามารถทดสอบได้');
      return;
    }

    // 3. ประกาศผล
    console.log('3️⃣  ประกาศผล "ฟ้า 340 ✅️"...');
    const resultNumber = 340;
    const resultSymbol = '✅';

    // อัปเดตแถวแรก
    const firstRow = matchedRows[0];
    console.log(`   อัปเดต Row ${firstRow.rowIndex}:`);
    console.log(`   - Column I (ผลที่ออก): ${resultNumber}`);
    console.log(`   - Column J (ผลแพ้ชนะ A): ${resultSymbol}`);
    console.log(`   - Column K (ผลแพ้ชนะ B): ❌`);

    // คำนวณผลลัพธ์ตามราคา
    const priceMatch = firstRow.priceA.match(/(\d+)-(\d+)/);
    let resultA = resultSymbol;
    let resultB = resultSymbol === '✅' ? '❌' : '✅';

    if (priceMatch) {
      const minPrice = parseInt(priceMatch[1]);
      const maxPrice = parseInt(priceMatch[2]);
      const isInRange = resultNumber >= minPrice && resultNumber <= maxPrice;

      console.log(`   - ช่วงราคา: ${minPrice}-${maxPrice}`);
      console.log(`   - ผลออก ${resultNumber} อยู่ในช่วง: ${isInRange}`);

      if (isInRange) {
        resultA = '⛔️';
        resultB = '⛔️';
        console.log(`   - ผลลัพธ์: เสมอ (⛔️)`);
      } else {
        console.log(`   - ผลลัพธ์: ${resultSymbol}`);
      }
    }

    // อัปเดตชีท
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      requestBody: {
        data: [
          {
            range: `${GOOGLE_WORKSHEET_NAME}!I${firstRow.rowIndex}:K${firstRow.rowIndex}`,
            values: [[resultNumber, resultA, resultB]],
          },
        ],
        valueInputOption: 'USER_ENTERED',
      },
    });

    console.log(`   ✅ อัปเดตสำเร็จ\n`);

    // 4. ตรวจสอบผลลัพธ์
    console.log('4️⃣  ตรวจสอบผลลัพธ์ที่บันทึก...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const afterResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });

    const afterRows = afterResponse.data.values || [];
    const updatedRow = afterRows[firstRow.rowIndex - 1];

    console.log(`   Row ${firstRow.rowIndex}:`);
    console.log(`   - Column I (ผลที่ออก): ${updatedRow[8] || '(ว่าง)'}`);
    console.log(`   - Column J (ผลแพ้ชนะ A): ${updatedRow[9] || '(ว่าง)'}`);
    console.log(`   - Column K (ผลแพ้ชนะ B): ${updatedRow[10] || '(ว่าง)'}`);
    console.log(`   - Column R (User B ID): ${updatedRow[17] || '(ว่าง)'}`);

    // 5. สรุปผล
    console.log('\n5️⃣  สรุปผล:');
    const hasResult = updatedRow[8];
    const hasResultA = updatedRow[9];
    const hasResultB = updatedRow[10];
    const hasUserBId = updatedRow[17];

    if (hasResult && hasResultA && hasResultB && hasUserBId) {
      console.log('   ✅ ระบบทำงานถูกต้อง - บันทึกผลลัพธ์สำเร็จ');
    } else {
      console.log('   ❌ ระบบไม่ทำงานถูกต้อง - ขาดข้อมูล:');
      if (!hasResult) console.log('      - ขาด Column I (ผลที่ออก)');
      if (!hasResultA) console.log('      - ขาด Column J (ผลแพ้ชนะ A)');
      if (!hasResultB) console.log('      - ขาด Column K (ผลแพ้ชนะ B)');
      if (!hasUserBId) console.log('      - ขาด Column R (User B ID)');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
