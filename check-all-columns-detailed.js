/**
 * Check All Columns Detailed
 * ตรวจสอบข้อมูลทั้งหมดในทุกคอลัมน์
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const COLUMNS = {
  0: 'A - Timestamp',
  1: 'B - User A ID',
  2: 'C - ชื่อ User A',
  3: 'D - ข้อความ A',
  4: 'E - ชื่อบั้งไฟ',
  5: 'F - รายการเล่น (ฝั่ง A)',
  6: 'G - ยอดเงิน',
  7: 'H - ยอดเงิน B',
  8: 'I - ผลที่ออก',
  9: 'J - ผลแพ้ชนะ',
  10: 'K - User B ID',
  11: 'L - ชื่อ User B',
  12: 'M - รายการแทง (ฝั่ง B)',
  13: 'N - ชื่อกลุ่มแชท',
  14: 'O - ชื่อกลุ่ม',
  15: 'P - Token A',
  16: 'Q - ID กลุ่ม',
  17: 'R - Token B (User B ID)',
  18: 'S - ผลลัพธ์ A',
  19: 'T - ผลลัพธ์ B',
  20: 'U - MATCHED Auto',
};

(async () => {
  try {
    // สร้าง Google Sheets client
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({
      keyFile: path.join(__dirname, 'credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    console.log('\n📊 === CHECKING ALL COLUMNS IN BETS SHEET ===\n');

    // ดึงข้อมูลทั้งหมด
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Bets!A:U',
    });

    const values = response.data.values || [];
    console.log(`✅ Found ${values.length} rows\n`);

    // แสดง Header
    console.log('📋 === HEADER (Row 1) ===\n');
    const header = values[0] || [];
    for (let i = 0; i < 21; i++) {
      const colLetter = String.fromCharCode(65 + i);
      const headerValue = header[i] || '(ว่างเปล่า)';
      const colName = COLUMNS[i];
      console.log(`   [${colLetter}] ${colName}`);
      console.log(`       Header: ${headerValue}`);
    }

    // แสดงข้อมูลแต่ละแถว
    console.log('\n\n📊 === DATA ROWS ===\n');
    for (let rowIdx = 1; rowIdx < values.length; rowIdx++) {
      const row = values[rowIdx];
      console.log(`\n${'═'.repeat(120)}`);
      console.log(`🔹 ROW ${rowIdx + 1}`);
      console.log(`${'═'.repeat(120)}\n`);

      for (let colIdx = 0; colIdx < 21; colIdx++) {
        const colLetter = String.fromCharCode(65 + colIdx);
        const colName = COLUMNS[colIdx];
        const value = row[colIdx] || '(ว่างเปล่า)';
        
        // ตรวจสอบว่าเป็นข้อมูลสำคัญหรือไม่
        let status = '';
        if (colIdx === 17 && !value) {
          status = ' ⚠️ EMPTY - Should have User B ID';
        } else if (colIdx === 11 && !value) {
          status = ' ⚠️ EMPTY - Should have User B Name';
        } else if (colIdx === 9 && value) {
          status = ' ✅ HAS RESULT';
        }

        console.log(`   [${colLetter}] ${colName}${status}`);
        console.log(`       Value: ${value}`);
      }
    }

    // สรุป
    console.log('\n\n📈 === SUMMARY ===\n');
    console.log(`   Total Rows: ${values.length - 1} (excluding header)`);
    console.log(`   Total Columns: 21 (A-U)\n`);

    // ตรวจสอบคอลัมน์สำคัญ
    console.log('🔍 === IMPORTANT COLUMNS CHECK ===\n');
    
    let colRCount = 0;
    let colLCount = 0;
    let colJCount = 0;
    let colUCount = 0;

    for (let i = 1; i < values.length; i++) {
      if (values[i][17]) colRCount++;  // Column R
      if (values[i][11]) colLCount++;  // Column L
      if (values[i][9]) colJCount++;   // Column J
      if (values[i][20]) colUCount++;  // Column U
    }

    console.log(`   Column R (User B ID): ${colRCount}/${values.length - 1} rows filled`);
    console.log(`   Column L (User B Name): ${colLCount}/${values.length - 1} rows filled`);
    console.log(`   Column J (Result): ${colJCount}/${values.length - 1} rows filled`);
    console.log(`   Column U (MATCHED Auto): ${colUCount}/${values.length - 1} rows filled\n`);

    // บันทึกลงไฟล์
    const outputFile = 'bets-sheet-all-columns.txt';
    let output = '📊 === BETS SHEET - ALL COLUMNS DETAILED ===\n\n';
    output += `Export Date: ${new Date().toISOString()}\n`;
    output += `Total Rows: ${values.length - 1}\n\n`;

    output += '📋 === HEADER ===\n';
    for (let i = 0; i < 21; i++) {
      const colLetter = String.fromCharCode(65 + i);
      const headerValue = header[i] || '(ว่างเปล่า)';
      const colName = COLUMNS[i];
      output += `[${colLetter}] ${colName}\n`;
      output += `    Header: ${headerValue}\n\n`;
    }

    output += '\n📊 === DATA ROWS ===\n';
    for (let rowIdx = 1; rowIdx < values.length; rowIdx++) {
      const row = values[rowIdx];
      output += `\n${'═'.repeat(120)}\n`;
      output += `ROW ${rowIdx + 1}\n`;
      output += `${'═'.repeat(120)}\n\n`;

      for (let colIdx = 0; colIdx < 21; colIdx++) {
        const colLetter = String.fromCharCode(65 + colIdx);
        const colName = COLUMNS[colIdx];
        const value = row[colIdx] || '(ว่างเปล่า)';
        
        output += `[${colLetter}] ${colName}\n`;
        output += `    ${value}\n\n`;
      }
    }

    fs.writeFileSync(outputFile, output);
    console.log(`✅ Detailed data exported to: ${outputFile}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
