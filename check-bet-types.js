const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = 'Bets';

async function checkBetTypes() {
  try {
    console.log('🔍 Checking all Bet Types in Bets Sheet...\n');

    const credentialsPath = './credentials.json';
    if (!fs.existsSync(credentialsPath)) {
      console.error('❌ credentials.json not found');
      return;
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets('v4');
    const googleAuth = await auth.getClient();

    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });

    const rows = response.data.values || [];
    console.log(`📊 Total rows: ${rows.length}\n`);

    // Collect all unique bet types
    const betTypesA = new Set();
    const betTypesB = new Set();
    const allBets = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 1) continue;

      const betTypeA = row[5] || '(empty)'; // Column F
      const betTypeB = row[12] || '(empty)'; // Column M
      const userAName = row[2] || '(empty)'; // Column C
      const messageA = row[3] || '(empty)'; // Column D
      const priceA = row[3] || '(empty)'; // Column D (contains price info)

      if (betTypeA !== '(empty)') {
        betTypesA.add(betTypeA);
      }
      if (betTypeB !== '(empty)') {
        betTypesB.add(betTypeB);
      }

      allBets.push({
        rowIndex: i + 1,
        userAName,
        messageA,
        betTypeA,
        betTypeB,
        priceA
      });
    }

    console.log('📋 Bet Type A (Column F) - Unique values:');
    console.log('═══════════════════════════════════════');
    Array.from(betTypesA).sort().forEach((type, idx) => {
      console.log(`   ${idx + 1}. "${type}"`);
    });

    console.log('\n📋 Bet Type B (Column M) - Unique values:');
    console.log('═══════════════════════════════════════');
    Array.from(betTypesB).sort().forEach((type, idx) => {
      console.log(`   ${idx + 1}. "${type}"`);
    });

    console.log('\n\n📊 All Bets with Bet Types:');
    console.log('═══════════════════════════════════════\n');

    allBets.forEach((bet) => {
      console.log(`Row ${bet.rowIndex}:`);
      console.log(`   User: ${bet.userAName}`);
      console.log(`   Message: ${bet.messageA}`);
      console.log(`   Bet Type A: "${bet.betTypeA}"`);
      console.log(`   Bet Type B: "${bet.betTypeB}"`);
      console.log('');
    });

    console.log('\n📈 Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`Total unique Bet Type A: ${betTypesA.size}`);
    console.log(`Total unique Bet Type B: ${betTypesB.size}`);
    console.log(`Total bets: ${allBets.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBetTypes();
