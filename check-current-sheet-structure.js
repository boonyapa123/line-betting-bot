const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function checkCurrentSheetStructure() {
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

    console.log('\n📊 ตรวจสอบโครงสร้างชีท Bets ปัจจุบัน');
    console.log('=====================================\n');
    console.log(`Sheet ID: ${sheetId}`);
    console.log(`Worksheet: ${worksheetName}\n`);

    // Get header row
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${worksheetName}!1:1`,
    });

    const header = headerResponse.data.values?.[0] || [];

    console.log('📋 Header (Row 1):');
    console.log('=====================================');
    header.forEach((col, idx) => {
      const colLetter = String.fromCharCode(65 + idx);
      console.log(`  [${colLetter}] (${idx}): ${col || '(ว่างเปล่า)'}`);
    });

    console.log(`\n📊 จำนวนคอลัมน์: ${header.length}`);

    // Get all data to count rows
    const allDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${worksheetName}!A:A`,
    });

    const allRows = allDataResponse.data.values || [];
    console.log(`📊 จำนวนแถว: ${allRows.length}`);

    // Show first 3 data rows
    if (allRows.length > 1) {
      const dataResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${worksheetName}!A2:Z4`,
      });

      const dataRows = dataResponse.data.values || [];

      console.log('\n📋 ตัวอย่างข้อมูล (3 แถวแรก):');
      console.log('=====================================');
      dataRows.forEach((row, index) => {
        const rowNum = index + 2;
        console.log(`\nRow ${rowNum}:`);
        row.forEach((col, idx) => {
          const colLetter = String.fromCharCode(65 + idx);
          const headerName = header[idx] || '(ไม่มี header)';
          console.log(`  [${colLetter}] ${headerName}: ${col || '(ว่างเปล่า)'}`);
        });
      });
    }

    // Summary
    console.log('\n\n📊 สรุปโครงสร้าง:');
    console.log('=====================================');
    console.log('ชื่อคอลัมน์ทั้งหมด:');
    header.forEach((col, idx) => {
      const colLetter = String.fromCharCode(65 + idx);
      console.log(`  ${colLetter}: ${col}`);
    });

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

checkCurrentSheetStructure();
