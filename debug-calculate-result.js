/**
 * Debug Calculate Result
 * ตรวจสอบว่า calculateResult ส่ง userId ถูกต้องหรือไม่
 */

require('dotenv').config();
const { google } = require('googleapis');
const BetsSheetColumns = require('./services/betting/betsSheetColumns');
const BettingPairingService = require('./services/betting/bettingPairingService');

(async () => {
  try {
    // สร้าง Google Sheets client
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // ดึงข้อมูลจากชีท Bets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Bets!A2:U',
    });

    const values = response.data.values || [];
    console.log(`\n📊 Found ${values.length} rows in Bets sheet\n`);

    // แสดงข้อมูล bet1 และ bet2
    if (values.length >= 2) {
      const row1 = values[0];
      const row2 = values[1];

      const bet1 = BetsSheetColumns.parseRow(row1);
      const bet2 = BetsSheetColumns.parseRow(row2);

      console.log('📋 Bet 1 (Row 2):');
      console.log(`   userId: ${bet1.userId}`);
      console.log(`   displayName: ${bet1.displayName}`);
      console.log(`   userBId: ${bet1.userBId}`);
      console.log(`   userBName: ${bet1.userBName}`);
      console.log(`   side: ${bet1.side}`);
      console.log(`   amount: ${bet1.amount}`);

      console.log('\n📋 Bet 2 (Row 3):');
      console.log(`   userId: ${bet2.userId}`);
      console.log(`   displayName: ${bet2.displayName}`);
      console.log(`   userBId: ${bet2.userBId}`);
      console.log(`   userBName: ${bet2.userBName}`);
      console.log(`   side: ${bet2.side}`);
      console.log(`   amount: ${bet2.amount}`);

      // ทดสอบ calculateResult
      const pair = { bet1, bet2 };
      const result = BettingPairingService.calculateResult(pair, 'ฟ้า', 370);

      console.log('\n🎯 Calculate Result:');
      console.log(`   Winner userId: ${result.winner.userId}`);
      console.log(`   Winner displayName: ${result.winner.displayName}`);
      console.log(`   Loser userId: ${result.loser.userId}`);
      console.log(`   Loser displayName: ${result.loser.displayName}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
})();
