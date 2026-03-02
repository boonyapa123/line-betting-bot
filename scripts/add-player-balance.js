const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function addPlayerBalance() {
  try {
    const credentialsPath = path.join(__dirname, '../credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // ดึงข้อมูลผู้เล่นปัจจุบัน
    console.log('📋 Fetching Players sheet...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Players!A:D',
    });

    const rows = response.data.values || [];
    console.log(`📊 Total rows: ${rows.length}`);
    console.log(`📋 Headers: ${rows[0]?.join(', ')}`);

    // แสดงผู้เล่นทั้งหมด
    console.log('\n👥 Current players:');
    for (let i = 1; i < rows.length; i++) {
      const [name, linkedIds, balance] = rows[i];
      console.log(`   Row ${i + 1}: ${name} | Balance: ${balance} บาท`);
    }

    // เพิ่มเงินให้ผู้เล่น
    console.log('\n💰 Adding balance...');
    
    // เพิ่มเงินให้ 💓Noon💓 (Row 2)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Players!C2',
      valueInputOption: 'RAW',
      resource: {
        values: [['1000']],
      },
    });
    console.log('✅ Added 1000 บาท to 💓Noon💓');

    // เพิ่มเงินให้ Pam Yuthida (สร้างผู้เล่นใหม่)
    console.log('\n✅ Adding new player: Pam Yuthida');
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Players!A:D',
      valueInputOption: 'RAW',
      resource: {
        values: [['Pam Yuthida', '', '1000']],
      },
    });
    console.log('✅ Added Pam Yuthida with 1000 บาท');

    // ตรวจสอบข้อมูลใหม่
    console.log('\n📋 Updated Players sheet:');
    const updatedResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Players!A:D',
    });

    const updatedRows = updatedResponse.data.values || [];
    for (let i = 1; i < updatedRows.length; i++) {
      const [name, linkedIds, balance] = updatedRows[i];
      console.log(`   Row ${i + 1}: ${name} | Balance: ${balance} บาท`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addPlayerBalance();
