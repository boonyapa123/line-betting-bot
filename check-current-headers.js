const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function checkCurrentHeaders() {
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

    console.log('\n📊 ชื่อคอลั่มปัจจุบันในชีท Bets\n');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    // ดึงข้อมูล header
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: sheetId,
      range: `${worksheetName}!A1:U1`,
    });

    const headers = response.data.values?.[0] || [];

    console.log('📋 Header Row (Row 1):\n');

    headers.forEach((header, idx) => {
      const columnLetter = String.fromCharCode(65 + idx);
      console.log(`[${columnLetter}] ${header || '(ว่างเปล่า)'}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════════════════════════\n');

    // ตรวจสอบคอลั่มที่สำคัญ
    console.log('✅ ตรวจสอบคอลั่มที่สำคัญ:\n');

    const importantColumns = {
      'I': 'ผลที่ออก',
      'J': 'ผลแพ้ชนะ A',
      'K': 'ผลแพ้ชนะ B',
      'R': 'User ID B',
    };

    Object.entries(importantColumns).forEach(([col, expectedName]) => {
      const idx = col.charCodeAt(0) - 65;
      const actualName = headers[idx] || '(ว่างเปล่า)';
      const match = actualName === expectedName ? '✅' : '❌';
      console.log(`${match} Column ${col}: "${actualName}" (ควร: "${expectedName}")`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  }
}

checkCurrentHeaders();
