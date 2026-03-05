/**
 * Export All Columns Data
 * ดึงข้อมูลทั้งหมดจากชีท Bets พร้อมชื่อคอลัมน์
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');

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
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    console.log('\n📊 === Fetching All Data from Bets Sheet ===\n');

    // ดึงข้อมูลทั้งหมด
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Bets!A:U',
    });

    const values = response.data.values || [];
    console.log(`✅ Found ${values.length} rows (including header)\n`);

    // แสดง Header
    console.log('📋 === HEADER (Row 1) ===\n');
    const header = values[0] || [];
    header.forEach((value, index) => {
      console.log(`   [${String.fromCharCode(65 + index)}] ${COLUMNS[index] || `Column ${index}`}: ${value}`);
    });

    // แสดงข้อมูล
    console.log('\n\n📊 === DATA ROWS ===\n');
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      console.log(`\n🔹 Row ${i + 1}:`);
      console.log('═'.repeat(100));

      for (let j = 0; j < 21; j++) {
        const value = row[j] || '(ว่างเปล่า)';
        const colName = COLUMNS[j] || `Column ${j}`;
        const colLetter = String.fromCharCode(65 + j);
        
        // แสดงค่าที่ยาว
        if (value.length > 50) {
          console.log(`   [${colLetter}] ${colName}:`);
          console.log(`       ${value.substring(0, 50)}...`);
        } else {
          console.log(`   [${colLetter}] ${colName}: ${value}`);
        }
      }
    }

    // สรุป
    console.log('\n\n📈 === SUMMARY ===\n');
    console.log(`   Total Rows: ${values.length - 1} (excluding header)`);
    console.log(`   Total Columns: 21 (A-U)`);
    
    // นับข้อมูลที่มีใน Column R (User B ID)
    let userBIdCount = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i][17]) userBIdCount++;
    }
    console.log(`   Rows with User B ID (Column R): ${userBIdCount}`);

    // นับข้อมูลที่มีใน Column J (ผลแพ้ชนะ)
    let resultCount = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i][9]) resultCount++;
    }
    console.log(`   Rows with Result (Column J): ${resultCount}`);

    // บันทึกลงไฟล์
    const outputFile = 'bets-sheet-export.txt';
    let output = '📊 === BETS SHEET EXPORT ===\n\n';
    output += `Export Date: ${new Date().toISOString()}\n`;
    output += `Total Rows: ${values.length - 1}\n\n`;

    output += '📋 === HEADER ===\n';
    header.forEach((value, index) => {
      output += `[${String.fromCharCode(65 + index)}] ${COLUMNS[index]}: ${value}\n`;
    });

    output += '\n\n📊 === DATA ===\n';
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      output += `\n🔹 Row ${i + 1}:\n`;
      output += '─'.repeat(100) + '\n';

      for (let j = 0; j < 21; j++) {
        const value = row[j] || '(ว่างเปล่า)';
        const colName = COLUMNS[j];
        const colLetter = String.fromCharCode(65 + j);
        output += `[${colLetter}] ${colName}: ${value}\n`;
      }
    }

    fs.writeFileSync(outputFile, output);
    console.log(`\n✅ Data exported to ${outputFile}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
