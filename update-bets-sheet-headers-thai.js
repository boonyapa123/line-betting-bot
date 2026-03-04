const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function updateBetsSheetHeaders() {
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

    // ชื่อคอลัมน์ภาษาไทยที่เข้าใจง่าย
    const headers = [
      'วันเวลา',             // A: Timestamp
      'ID ผู้เล่น A',        // B: User A ID
      'ชื่อผู้เล่น A',       // C: User A Name
      'ข้อความ',             // D: Message
      'ชื่อบั้งไฟ',          // E: Slip Name
      'ฝั่ง A',              // F: Side A
      'เงิน A',              // G: Amount A
      'เงิน B',              // H: Amount B
      'ผลลัพธ์',             // I: Result
      'ผู้ชนะ',              // J: Winner
      'ID ผู้เล่น B',        // K: User B ID
      'ชื่อผู้เล่น B',       // L: User B Name
      'ฝั่ง B',              // M: Side B
      'ฝั่ง A (รหัส)',       // N: Side A Code
      'ชื่อกลุ่ม',           // O: Group Name
      'Token A',             // P: User A Token
      'ID กลุ่ม',            // Q: Group ID
      'Token B',             // R: User B Token
    ];

    console.log('\n📋 อัปเดตชื่อคอลัมน์ในชีท Bets (ภาษาไทย):');
    console.log('=====================================\n');

    headers.forEach((header, index) => {
      const columnLetter = String.fromCharCode(65 + index);
      console.log(`${columnLetter}: ${header}`);
    });

    // Update headers
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${worksheetName}!A1:R1`,
      valueInputOption: 'RAW',
      resource: {
        values: [headers],
      },
    });

    console.log('\n✅ อัปเดตชื่อคอลัมน์สำเร็จ');
    console.log('=====================================\n');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

require('dotenv').config();
updateBetsSheetHeaders();
