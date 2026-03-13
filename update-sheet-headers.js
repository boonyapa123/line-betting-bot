const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load credentials
const credentialsPath = path.join(__dirname, 'credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function updateSheetHeaders() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

    console.log(`📊 Updating sheet: ${sheetName}`);
    console.log(`📋 Spreadsheet ID: ${spreadsheetId}\n`);

    // ดึงข้อมูล header ปัจจุบัน
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:U1`,
    });

    const currentHeaders = response.data.values?.[0] || [];
    console.log('📋 Current Headers:');
    currentHeaders.forEach((header, idx) => {
      const colLetter = String.fromCharCode(65 + idx);
      console.log(`  [${colLetter}] ${header}`);
    });

    // ตั้งค่า headers ใหม่ตามที่ใช้งาน
    const newHeaders = [
      'Timestamp',           // A
      'User A ID',           // B
      'ชื่อ User A',         // C
      'ข้อความ A',           // D
      'ชื่อบั้งไฟ',          // E
      'รายการเล่น',          // F
      'ยอดเงิน',             // G
      'ยอดเงิน B',           // H
      'ผลที่ออก',            // I
      'ผลแพ้ชนะ A',          // J
      'ผลแพ้ชนะ B',          // K
      'ชื่อ User B',         // L
      'รายการแทง',           // M
      'ชื่อกลุ่มแชท',        // N
      'ชื่อกลุ่ม',           // O
      'Token A',             // P
      'ID กลุ่ม',            // Q
      'User ID B',           // R
      'ผลลัพธ์ A',           // S
      'ผลลัพธ์ B',           // T
      'สถานะคู่',            // U
    ];

    console.log('\n📋 New Headers:');
    newHeaders.forEach((header, idx) => {
      const colLetter = String.fromCharCode(65 + idx);
      console.log(`  [${colLetter}] ${header}`);
    });

    // อัปเดต headers
    console.log('\n⏳ Updating headers...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:U1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newHeaders],
      },
    });

    console.log('✅ Headers updated successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateSheetHeaders();
