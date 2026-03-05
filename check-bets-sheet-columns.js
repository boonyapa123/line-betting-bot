/**
 * Script: ตรวจสอบคอลัมน์ทั้งหมดของชีท Bets
 * ดึงข้อมูลแถวแรก (header) และแถวข้อมูลเพื่อแสดงคอลัมน์ทั้งหมด
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BetsSheetColumns = require('./services/betting/betsSheetColumns');

async function checkBetsSheetColumns() {
  try {
    console.log('🔍 ตรวจสอบคอลัมน์ของชีท Bets\n');

    // Initialize Google Sheets API
    let credentials;
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } else {
      const credentialsPath = path.join(__dirname, process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'credentials.json');
      credentials = JSON.parse(fs.readFileSync(credentialsPath));
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const betsSheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

    // ดึงข้อมูล Header (Row 1)
    console.log('📋 ดึงข้อมูล Header...\n');
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${betsSheetName}!1:1`,
    });

    const headerRow = headerResponse.data.values?.[0] || [];

    // ดึงข้อมูล 5 แถวแรก (Row 2-6)
    console.log('📊 ดึงข้อมูล 5 แถวแรก...\n');
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${betsSheetName}!2:6`,
    });

    const dataRows = dataResponse.data.values || [];

    // แสดงคอลัมน์ทั้งหมด
    console.log('═'.repeat(100));
    console.log('📊 คอลัมน์ทั้งหมดของชีท Bets');
    console.log('═'.repeat(100));
    console.log();

    // แสดง Header
    console.log('📌 Header (Row 1):');
    console.log('─'.repeat(100));
    headerRow.forEach((header, index) => {
      const colLetter = String.fromCharCode(65 + index);
      const columnInfo = BetsSheetColumns.COLUMN_NAMES[index] || `${colLetter} - (ไม่ระบุ)`;
      console.log(`  [${colLetter}] ${columnInfo}`);
      if (header) {
        console.log(`      └─ Header: "${header}"`);
      }
    });

    console.log();
    console.log('═'.repeat(100));
    console.log('📊 ข้อมูลตัวอย่าง');
    console.log('═'.repeat(100));
    console.log();

    // แสดงข้อมูลแต่ละแถว
    dataRows.forEach((row, rowIndex) => {
      const rowNumber = rowIndex + 2; // Row 2 onwards
      console.log(`📌 Row ${rowNumber}:`);
      console.log('─'.repeat(100));

      // แสดงข้อมูลแต่ละคอลัมน์
      for (let colIndex = 0; colIndex < 21; colIndex++) {
        const colLetter = String.fromCharCode(65 + colIndex);
        const columnInfo = BetsSheetColumns.COLUMN_NAMES[colIndex] || `${colLetter} - (ไม่ระบุ)`;
        const value = row[colIndex] || '(ว่างเปล่า)';

        // ตัดข้อความยาว
        const displayValue = String(value).length > 50 ? String(value).substring(0, 50) + '...' : value;

        console.log(`  [${colLetter}] ${columnInfo}`);
        console.log(`      └─ ค่า: "${displayValue}"`);
      }

      console.log();
    });

    // สรุปข้อมูล
    console.log('═'.repeat(100));
    console.log('📊 สรุปข้อมูล');
    console.log('═'.repeat(100));
    console.log();
    console.log(`✅ จำนวนคอลัมน์ทั้งหมด: 21 (A-U)`);
    console.log(`✅ จำนวนแถวข้อมูล: ${dataRows.length}`);
    console.log();

    // แสดงคอลัมน์ที่มีข้อมูล
    console.log('📌 คอลัมน์ที่มีข้อมูล:');
    const columnsWithData = new Set();
    dataRows.forEach((row) => {
      row.forEach((value, index) => {
        if (value && value !== '') {
          columnsWithData.add(index);
        }
      });
    });

    Array.from(columnsWithData)
      .sort((a, b) => a - b)
      .forEach((colIndex) => {
        const colLetter = String.fromCharCode(65 + colIndex);
        const columnInfo = BetsSheetColumns.COLUMN_NAMES[colIndex];
        console.log(`  [${colLetter}] ${columnInfo}`);
      });

    console.log();
    console.log('═'.repeat(100));
    console.log('✅ ตรวจสอบเสร็จสิ้น');
    console.log('═'.repeat(100));
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

// Run
checkBetsSheetColumns();
