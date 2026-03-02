const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function updatePlayerBalance() {
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

    // อัปเดตยอดเงิน
    console.log('\n💰 Updating balances...');
    
    // 💓Noon💓 (Row 2) -> 5000 บาท
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Players!E2',
      valueInputOption: 'RAW',
      resource: {
        values: [['5000']],
      },
    });
    console.log('✅ Updated 💓Noon💓 to 5000 บาท');

    // นุช519 (Row 3) -> 5000 บาท
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Players!E3',
      valueInputOption: 'RAW',
      resource: {
        values: [['5000']],
      },
    });
    console.log('✅ Updated นุช519 to 5000 บาท');

    // paa"BOY" (Row 4) -> 5000 บาท
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Players!E4',
      valueInputOption: 'RAW',
      resource: {
        values: [['5000']],
      },
    });
    console.log('✅ Updated paa"BOY" to 5000 บาท');

    // Pam Yuthida (Row 5) -> 5000 บาท
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Players!E5',
      valueInputOption: 'RAW',
      resource: {
        values: [['5000']],
      },
    });
    console.log('✅ Updated Pam Yuthida to 5000 บาท');

    // Sync ไปยัง UsersBalance
    console.log('\n🔄 Syncing to UsersBalance...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'UsersBalance!A2:C1000',
    });

    const usersBalanceData = [];
    for (let i = 1; i < playerRows.length; i++) {
      const [userId, displayName] = playerRows[i];
      if (displayName) {
        usersBalanceData.push([displayName, displayName, '5000']);
      }
    }

    if (usersBalanceData.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'UsersBalance!A2:C',
        valueInputOption: 'RAW',
        resource: {
          values: usersBalanceData,
        },
      });
    }

    console.log('✅ Synced to UsersBalance');

    // ตรวจสอบข้อมูลใหม่
    console.log('\n📋 Updated Players sheet:');
    const verifyResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Players!B:E',
    });

    const verifyRows = verifyResponse.data.values || [];
    for (let i = 1; i < verifyRows.length; i++) {
      const [displayName, phone, account, balance] = verifyRows[i];
      console.log(`   ${displayName} | Balance: ${balance} บาท`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updatePlayerBalance();
