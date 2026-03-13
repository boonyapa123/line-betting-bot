const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load credentials
const credentialsPath = path.join(__dirname, 'credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function checkBetsSheetStructure() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

    console.log(`📊 Fetching sheet: ${sheetName}`);
    console.log(`📋 Spreadsheet ID: ${spreadsheetId}\n`);

    // ดึงข้อมูลทั้งหมด
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:U`,
    });

    const values = response.data.values || [];

    if (values.length === 0) {
      console.log('❌ No data found in sheet');
      return;
    }

    // แสดง Header
    console.log('📋 HEADER (Row 1):');
    console.log('═══════════════════════════════════════════════════════════════');
    const header = values[0];
    header.forEach((col, idx) => {
      const colLetter = String.fromCharCode(65 + idx);
      console.log(`  [${colLetter}] (${idx}) ${col}`);
    });

    // แสดงข้อมูล 5 แถวแรก
    console.log('\n📊 DATA (First 5 rows):');
    console.log('═══════════════════════════════════════════════════════════════');
    
    for (let i = 1; i < Math.min(6, values.length); i++) {
      const row = values[i];
      console.log(`\n📌 Row ${i + 1}:`);
      
      // แสดงเฉพาะคอลัมน์ที่มีข้อมูล
      row.forEach((cell, idx) => {
        if (cell !== undefined && cell !== null && cell !== '') {
          const colLetter = String.fromCharCode(65 + idx);
          console.log(`  [${colLetter}] (${idx}) ${cell}`);
        }
      });
    }

    // ตรวจสอบโครงสร้าง
    console.log('\n\n🔍 STRUCTURE VERIFICATION:');
    console.log('═══════════════════════════════════════════════════════════════');

    const expectedColumns = {
      0: 'A - Timestamp',
      1: 'B - User A ID',
      2: 'C - ชื่อ User A',
      3: 'D - ข้อความ A',
      4: 'E - ชื่อบั้งไฟ',
      5: 'F - รายการเล่น (ฝั่ง A)',
      6: 'G - ยอดเงิน',
      7: 'H - ยอดเงิน B',
      8: 'I - ผลที่ออก',
      9: 'J - ผลแพ้ชนะ A',
      10: 'K - ผลแพ้ชนะ B',
      11: 'L - ชื่อ User B',
      12: 'M - รายการแทง (ฝั่ง B)',
      13: 'N - ชื่อกลุ่มแชท',
      14: 'O - ชื่อกลุ่ม',
      15: 'P - Token A',
      16: 'Q - ID กลุ่ม',
      17: 'R - User ID B',
      18: 'S - ผลลัพธ์ A',
      19: 'T - ผลลัพธ์ B',
      20: 'U - MATCHED Auto',
    };

    let structureOk = true;
    for (const [idx, expectedName] of Object.entries(expectedColumns)) {
      const actualName = header[idx] || '(ว่าง)';
      const match = actualName === expectedName.split(' - ')[1];
      const status = match ? '✅' : '❌';
      
      if (!match) {
        structureOk = false;
        console.log(`${status} [${String.fromCharCode(65 + parseInt(idx))}] Expected: "${expectedName.split(' - ')[1]}" | Actual: "${actualName}"`);
      }
    }

    if (structureOk) {
      console.log('✅ โครงสร้างถูกต้อง!');
    } else {
      console.log('\n❌ โครงสร้างไม่ตรงกับที่คาดหวัง');
    }

    // ตรวจสอบข้อมูลในแถว 2
    console.log('\n\n📊 ROW 2 DATA CHECK:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    if (values.length > 1) {
      const row2 = values[1];
      const checks = {
        'I (ผลที่ออก)': row2[8],
        'J (ผลแพ้ชนะ A)': row2[9],
        'K (ผลแพ้ชนะ B)': row2[10],
        'R (User ID B)': row2[17],
      };

      for (const [name, value] of Object.entries(checks)) {
        const status = value ? '✅' : '❌';
        console.log(`${status} ${name}: ${value || '(ว่าง)'}`);
      }
    }

    console.log('\n✅ Check completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBetsSheetStructure();
