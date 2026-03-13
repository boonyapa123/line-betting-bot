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

    // ชื่อคอลัมน์ใหม่ที่เข้าใจง่าย
    const headers = [
      'Timestamp',           // A: วันเวลา
      'User A ID',           // B: ID ผู้เล่นคนแรก
      'User A Name',         // C: ชื่อผู้เล่นคนแรก
      'Message',             // D: ข้อความที่ส่ง
      'Slip Name',           // E: ชื่อบั้งไฟ
      'Side A',              // F: ฝั่งที่เดิมพัน (ชล/ถอย/ล/ย)
      'Amount A',            // G: ยอดเงินคนแรก
      'Amount B',            // H: ยอดเงินคนที่สอง
      'ผลที่ออก',            // I: ผลลัพธ์ที่ออก
      'ผลแพ้ชนะ A',          // J: ผลแพ้ชนะ A
      'ผลแพ้ชนะ B',          // K: ผลแพ้ชนะ B
      'ชื่อ User B',         // L: ชื่อผู้เล่นคนที่สอง
      'รายการเล่น B',        // M: ฝั่งของผู้เล่นคนที่สอง
      'Side A Code',         // N: รหัสฝั่ง A (ชล/ถอย/ล/ย)
      'Group Name',          // O: ชื่อกลุ่มแชท
      'User A Token',        // P: Token ผู้เล่นคนแรก
      'Group ID',            // Q: ID กลุ่ม
      'User B ID',           // R: ID ผู้เล่นคนที่สอง
    ];

    console.log('\n📋 อัปเดตชื่อคอลัมน์ในชีท Bets:');
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
