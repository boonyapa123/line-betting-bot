const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = 'Bets';

async function checkDuplicateBets() {
  try {
    console.log('🔍 Checking for duplicate bets in Bets Sheet...\n');

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

    // Group bets by firework name
    const betsByFirework = {};

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 1) continue;

      const fireworkName = row[4] || '(empty)'; // Column E
      const userAName = row[2] || '(empty)'; // Column C
      const messageA = row[3] || '(empty)'; // Column D
      const resultSymbol = row[9] || ''; // Column J
      const resultNumber = row[8] || ''; // Column I

      if (!betsByFirework[fireworkName]) {
        betsByFirework[fireworkName] = [];
      }

      betsByFirework[fireworkName].push({
        rowIndex: i + 1,
        userAName,
        messageA,
        resultNumber,
        resultSymbol,
        fullRow: row
      });
    }

    // Check for duplicates
    console.log('🎆 Bets grouped by Firework:\n');
    for (const [firework, bets] of Object.entries(betsByFirework)) {
      console.log(`\n📍 Firework: ${firework}`);
      console.log(`   Total bets: ${bets.length}`);

      bets.forEach((bet, idx) => {
        console.log(`\n   Bet ${idx + 1} (Row ${bet.rowIndex}):`);
        console.log(`      User A: ${bet.userAName}`);
        console.log(`      Message: ${bet.messageA}`);
        console.log(`      Result Number: ${bet.resultNumber}`);
        console.log(`      Result Symbol: ${bet.resultSymbol || '(empty)'}`);
        console.log(`      Bet Type A: ${bet.fullRow[5] || '(empty)'}`);
        console.log(`      Price A: ${bet.fullRow[3] || '(empty)'}`);
        console.log(`      User B: ${bet.fullRow[11] || '(empty)'}`);
        console.log(`      Bet Type B: ${bet.fullRow[12] || '(empty)'}`);
      });

      // Check if same firework has multiple results
      if (bets.length > 1) {
        const resultsSet = new Set(bets.map(b => b.resultSymbol).filter(r => r));
        if (resultsSet.size > 1) {
          console.log(`\n   ⚠️  WARNING: Multiple different results for same firework!`);
          console.log(`      Results: ${Array.from(resultsSet).join(', ')}`);
        }
      }
    }

    // Check for same user betting on same firework multiple times
    console.log('\n\n🔍 Checking for same user betting on same firework multiple times:\n');
    const userFireworkBets = {};

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 1) continue;

      const userAName = row[2] || '(empty)';
      const fireworkName = row[4] || '(empty)';
      const key = `${userAName}|${fireworkName}`;

      if (!userFireworkBets[key]) {
        userFireworkBets[key] = [];
      }

      userFireworkBets[key].push({
        rowIndex: i + 1,
        messageA: row[3],
        resultSymbol: row[9],
        resultNumber: row[8]
      });
    }

    for (const [key, bets] of Object.entries(userFireworkBets)) {
      if (bets.length > 1) {
        const [userAName, fireworkName] = key.split('|');
        console.log(`\n⚠️  ${userAName} bet on ${fireworkName} ${bets.length} times:`);
        bets.forEach((bet, idx) => {
          console.log(`   ${idx + 1}. Row ${bet.rowIndex}: ${bet.messageA} → Result: ${bet.resultSymbol || '(no result)'}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDuplicateBets();
