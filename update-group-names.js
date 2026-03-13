const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function updateGroupNames() {
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

    console.log('📝 อัปเดตชื่อกลุ่มในชีท\n');

    // Get all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${worksheetName}!A:U`,
    });

    const rows = response.data.values || [];
    const updates = [];

    // สร้าง map ของ groupId -> groupName
    const groupMap = {};
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 17) continue;

      const groupId = row[16]; // Column Q
      const groupName = row[14]; // Column O

      if (groupId && !groupName) {
        // ถ้า groupId มีแต่ groupName ว่าง ให้ดึงชื่อจาก groupMap
        if (groupMap[groupId]) {
          console.log(`Row ${i + 1}: อัปเดต groupName = ${groupMap[groupId]}`);
          updates.push({
            range: `${worksheetName}!O${i + 1}`,
            values: [[groupMap[groupId]]]
          });
        }
      } else if (groupId && groupName) {
        // เก็บ groupId -> groupName mapping
        groupMap[groupId] = groupName;
      }
    }

    if (updates.length > 0) {
      console.log(`\n📤 ส่งการอัปเดต ${updates.length} แถว...\n`);
      
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        resource: {
          data: updates,
          valueInputOption: 'RAW'
        }
      });

      console.log('✅ อัปเดตสำเร็จ');
    } else {
      console.log('ℹ️  ไม่มีแถวที่ต้องอัปเดต');
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

updateGroupNames();
