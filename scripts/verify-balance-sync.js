const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function verifyBalanceSync() {
  try {
    const credentialsPath = path.join(__dirname, '../credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    console.log('📊 ตรวจสอบการทำงานของทั้งสามชีท\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ดึงข้อมูลจากชีท Players
    console.log('1️⃣  ตรวจสอบชีท Players');
    const playersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Players!A:E',
    });
    const playerRows = playersResponse.data.values || [];
    console.log(`   📊 Total rows: ${playerRows.length}`);
    console.log(`   📋 Headers: ${playerRows[0]?.join(', ')}\n`);

    const playersData = {};
    for (let i = 1; i < playerRows.length; i++) {
      const [userId, displayName, phone, account, balance] = playerRows[i];
      if (displayName) {
        playersData[displayName] = {
          userId,
          displayName,
          balance: parseInt(balance) || 0,
        };
        console.log(`   ✅ ${displayName} | Balance: ${balance} บาท`);
      }
    }

    // ดึงข้อมูลจากชีท UsersBalance
    console.log('\n2️⃣  ตรวจสอบชีท UsersBalance');
    const usersBalanceResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'UsersBalance!A:C',
    });
    const usersBalanceRows = usersBalanceResponse.data.values || [];
    console.log(`   📊 Total rows: ${usersBalanceRows.length}`);
    console.log(`   📋 Headers: ${usersBalanceRows[0]?.join(', ')}\n`);

    const usersBalanceData = {};
    for (let i = 1; i < usersBalanceRows.length; i++) {
      const [lineName, displayName, balance] = usersBalanceRows[i];
      if (displayName) {
        usersBalanceData[displayName] = {
          lineName,
          displayName,
          balance: parseInt(balance) || 0,
        };
        console.log(`   ✅ ${displayName} | Balance: ${balance} บาท`);
      }
    }

    // ดึงข้อมูลจากชีท Transactions
    console.log('\n3️⃣  ตรวจสอบชีท Transactions');
    const transactionsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Transactions!A:J',
    });
    const transactionRows = transactionsResponse.data.values || [];
    console.log(`   📊 Total rows: ${transactionRows.length}`);
    console.log(`   📋 Headers: ${transactionRows[0]?.join(', ')}\n`);

    if (transactionRows.length > 1) {
      for (let i = 1; i < Math.min(transactionRows.length, 6); i++) {
        const row = transactionRows[i];
        console.log(`   ✅ Row ${i}: ${row.join(' | ')}`);
      }
      if (transactionRows.length > 6) {
        console.log(`   ... และอีก ${transactionRows.length - 6} แถว`);
      }
    } else {
      console.log(`   ⚠️  ไม่มีข้อมูลในชีท Transactions`);
    }

    // ตรวจสอบความสอดคล้อง
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔍 ตรวจสอบความสอดคล้องระหว่างชีท\n');

    let isConsistent = true;

    // ตรวจสอบว่า Players และ UsersBalance ตรงกันหรือไม่
    for (const displayName in playersData) {
      const playersBalance = playersData[displayName].balance;
      const usersBalance = usersBalanceData[displayName]?.balance || 0;

      if (playersBalance === usersBalance) {
        console.log(`   ✅ ${displayName}: Players (${playersBalance}) = UsersBalance (${usersBalance})`);
      } else {
        console.log(`   ❌ ${displayName}: Players (${playersBalance}) ≠ UsersBalance (${usersBalance})`);
        isConsistent = false;
      }
    }

    // ตรวจสอบว่า Transactions มีข้อมูลหรือไม่
    console.log('\n📝 ตรวจสอบชีท Transactions:');
    if (transactionRows.length <= 1) {
      console.log(`   ⚠️  ชีท Transactions ว่างเปล่า - ต้องบันทึกรายการเงิน`);
      isConsistent = false;
    } else {
      console.log(`   ✅ ชีท Transactions มีข้อมูล ${transactionRows.length - 1} แถว`);
    }

    // สรุปผล
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (isConsistent) {
      console.log('\n✅ ทั้งสามชีททำงานสัมพันธ์กันอย่างถูกต้อง');
    } else {
      console.log('\n❌ พบปัญหาในการทำงานของชีท - ต้องแก้ไข');
      console.log('\n💡 วิธีแก้ไข:');
      console.log('   1. ตรวจสอบว่า Transactions มีข้อมูลหรือไม่');
      console.log('   2. Sync ข้อมูลจาก Players ไปยัง UsersBalance');
      console.log('   3. ตรวจสอบว่ายอดเงินตรงกันหรือไม่');
    }

    console.log('\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyBalanceSync();
