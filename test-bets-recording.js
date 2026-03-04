require('dotenv').config();
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = 'Bets';

async function testBetsRecording() {
  try {
    console.log('🧪 Testing Bets sheet recording...\n');

    if (!GOOGLE_SHEET_ID) {
      console.error('❌ GOOGLE_SHEET_ID not found in .env');
      return;
    }

    const keyFile = 'credentials.json';
    if (!fs.existsSync(keyFile)) {
      console.error('❌ credentials.json not found');
      return;
    }

    const auth = new GoogleAuth({
      keyFile: keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets('v4');

    // Create test data (18 columns)
    const testRow = [
      '03/04/2026, 07:00:01',           // A: Timestamp
      'Ua01232445a58162e1518b510fcaf01b5',  // B: User A ID
      'paa"BOY"',                        // C: ชื่อ User A
      'ชถ 100 กทม.',                     // D: ข้อความ A
      'กทม.',                            // E: ชื่อบั้งไฟ
      'ชล',                              // F: รายการเล่น
      100,                               // G: ยอดเงิน
      100,                               // H: ยอดเงิน B
      '',                                // I: ผลที่ออก (empty)
      '',                                // J: ผลแพ้ชนะ A (empty)
      '',                                // K: ผลแพ้ชนะ B (empty)
      'Uf00f7dcba844fbc87a181897bcb863e3',  // L: User B ID
      'นุช519',                          // M: ชื่อ User B
      'ถอย',                             // N: รายการแทง B
      'ทดสอบระบบ บั้งไฟ เดิมพัน',      // O: ชื่อกลุ่มแชท
      'token_A_here',                    // P: User A Token
      'C4e522277480703e5eddbf658666ba6a9',  // Q: Group ID
      'token_B_here'                     // R: User B Token
    ];

    console.log('📝 Test row data (18 columns):');
    testRow.forEach((val, idx) => {
      const colLetter = String.fromCharCode(65 + idx);
      console.log(`   [${colLetter}]: ${val}`);
    });

    // Get current row count
    const response = await sheets.spreadsheets.values.get({
      auth: auth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:A`,
    });

    const rows = response.data.values || [];
    const nextRowIndex = rows.length + 1;

    console.log(`\n📊 Current rows: ${rows.length}, appending to row ${nextRowIndex}`);
    console.log(`📍 Range: ${GOOGLE_WORKSHEET_NAME}!A${nextRowIndex}:R${nextRowIndex}`);

    // Write test data
    await sheets.spreadsheets.values.update({
      auth: auth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A${nextRowIndex}:R${nextRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [testRow],
      },
    });

    console.log(`\n✅ Test row written successfully!`);

    // Verify by reading back
    console.log('\n🔍 Verifying written data...\n');
    const verifyResponse = await sheets.spreadsheets.values.get({
      auth: auth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A${nextRowIndex}:R${nextRowIndex}`,
    });

    const verifyRow = verifyResponse.data.values[0] || [];
    console.log('📋 Verified data:');
    verifyRow.forEach((val, idx) => {
      const colLetter = String.fromCharCode(65 + idx);
      console.log(`   [${colLetter}]: ${val}`);
    });

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testBetsRecording();
