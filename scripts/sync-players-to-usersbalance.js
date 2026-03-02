const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function syncPlayersToUsersBalance() {
  try {
    const credentialsPath = path.join(__dirname, '../credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // ดึงข้อมูลจากชีท Players
    console.log('📋 Fetching Players sheet...');
    const playersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Players!A:E',
    });

    const playerRows = playersResponse.data.values || [];
    console.log(`📊 Total rows in Players: ${playerRows.length}`);

    // สร้างข้อมูลสำหรับ UsersBalance
    const usersBalanceData = [];
    
    for (let i = 1; i < playerRows.length; i++) {
      const [userId, displayName, phone, account, balance] = playerRows[i];
      
      if (displayName) {
        usersBalanceData.push([
          displayName, // LineName
          displayName, // DisplayName
          balance || '0', // Balance
        ]);
        console.log(`✅ Added: ${displayName} | Balance: ${balance || '0'} บาท`);
      }
    }

    // ลบข้อมูลเก่าจาก UsersBalance (เก็บแค่ header)
    console.log('\n🗑️  Clearing UsersBalance sheet...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'UsersBalance!A2:C1000',
    });

    // เพิ่มข้อมูลใหม่
    console.log('\n📝 Adding data to UsersBalance...');
    if (usersBalanceData.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'UsersBalance!A2:C',
        valueInputOption: 'RAW',
        resource: {
          values: usersBalanceData,
        },
      });
      console.log(`✅ Added ${usersBalanceData.length} rows to UsersBalance`);
    }

    // ตรวจสอบข้อมูลใหม่
    console.log('\n📋 Verifying UsersBalance sheet...');
    const verifyResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'UsersBalance!A:C',
    });

    const verifyRows = verifyResponse.data.values || [];
    console.log(`📊 Total rows: ${verifyRows.length}`);
    for (let i = 1; i < verifyRows.length; i++) {
      const [lineName, displayName, balance] = verifyRows[i];
      console.log(`   Row ${i + 1}: ${lineName} | ${displayName} | ${balance} บาท`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

syncPlayersToUsersBalance();
