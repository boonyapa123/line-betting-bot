const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function fixUserBId() {
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

    console.log('\n📊 บันทึก User B ID ลงในคอลั่ม R\n');

    // ดึงข้อมูลทั้งหมด
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: sheetId,
      range: `${worksheetName}!A:U`,
    });

    const rows = response.data.values || [];

    console.log(`📋 ทั้งหมด ${rows.length - 1} แถว\n`);

    // อัปเดต User B ID ในคอลั่ม R สำหรับแถวที่มี User B
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 12) continue;

      const userBId = row[10]; // Column K (index 10) = User B ID (เก่า)
      const currentUserBIdInR = row[17]; // Column R (index 17) = User B ID (ใหม่)

      // ถ้า Column K มี User B ID และ Column R ยังว่าง ให้บันทึก
      if (userBId && userBId.startsWith('U') && !currentUserBIdInR) {
        console.log(`Row ${i + 1}: บันทึก User B ID = ${userBId}`);

        await sheets.spreadsheets.values.update({
          auth,
          spreadsheetId: sheetId,
          range: `${worksheetName}!R${i + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[userBId]],
          },
        });
      }
    }

    console.log('\n✅ บันทึก User B ID สำเร็จ\n');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  }
}

fixUserBId();
