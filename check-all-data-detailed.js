const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function checkAllDataDetailed() {
  try {
    const credentialsPath = path.join(__dirname, 'credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const worksheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

    console.log('\n📊 ดึงข้อมูลทั้งหมดจากชีท Bets');
    console.log('=====================================\n');

    // Get all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${worksheetName}!A:U`,
    });

    const rows = response.data.values || [];
    const header = rows[0] || [];

    console.log(`📋 Header (${header.length} คอลัมน์):`);
    console.log('=====================================');
    header.forEach((col, idx) => {
      const colLetter = String.fromCharCode(65 + idx);
      console.log(`[${colLetter}] ${col}`);
    });

    console.log(`\n\n📊 ข้อมูลทั้งหมด (${rows.length - 1} แถว):`);
    console.log('=====================================\n');

    // Display each row with all columns
    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      console.log(`\n🔹 Row ${rowIdx}:`);
      console.log('─'.repeat(80));
      
      header.forEach((colName, colIdx) => {
        const colLetter = String.fromCharCode(65 + colIdx);
        const value = row[colIdx] || '(ว่างเปล่า)';
        console.log(`  [${colLetter}] ${colName.padEnd(20)} : ${value}`);
      });
    }

    // Summary statistics
    console.log('\n\n📊 สรุปข้อมูล:');
    console.log('=====================================');
    console.log(`จำนวนแถวข้อมูล: ${rows.length - 1}`);
    console.log(`จำนวนคอลัมน์: ${header.length}`);

    // Analyze each column
    console.log('\n\n📈 การวิเคราะห์แต่ละคอลัมน์:');
    console.log('=====================================\n');

    for (let colIdx = 0; colIdx < header.length; colIdx++) {
      const colName = header[colIdx];
      const colLetter = String.fromCharCode(65 + colIdx);
      const values = [];
      const emptyCount = 0;

      for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
        const value = rows[rowIdx][colIdx];
        if (value) {
          values.push(value);
        }
      }

      console.log(`[${colLetter}] ${colName}`);
      console.log(`    ค่าที่มี: ${values.length}/${rows.length - 1}`);
      if (values.length > 0) {
        console.log(`    ค่า: ${values.join(', ')}`);
      }
      console.log();
    }

    // Export to JSON
    const jsonData = {
      header: header,
      rows: rows.slice(1),
      summary: {
        totalRows: rows.length - 1,
        totalColumns: header.length,
        timestamp: new Date().toISOString()
      }
    };

    fs.writeFileSync('bets-data-export.json', JSON.stringify(jsonData, null, 2));
    console.log('\n✅ ส่งออกข้อมูลไปยัง bets-data-export.json');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

checkAllDataDetailed();
