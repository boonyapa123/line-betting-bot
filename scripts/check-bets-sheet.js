require('dotenv').config();
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = 'Bets';

async function checkBetsSheet() {
  try {
    console.log('📋 Checking Bets sheet data...\n');

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

    // Get all data from Bets sheet
    const response = await sheets.spreadsheets.values.get({
      auth: auth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:R`,
    });

    const rows = response.data.values || [];
    
    console.log(`📊 Total rows: ${rows.length}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Display headers
    if (rows.length > 0) {
      console.log('📌 HEADERS (Row 1):');
      rows[0].forEach((header, idx) => {
        const colLetter = String.fromCharCode(65 + idx);
        console.log(`   [${colLetter}]: ${header}`);
      });
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    }

    // Display data rows
    if (rows.length > 1) {
      console.log(`📝 DATA ROWS (${rows.length - 1} rows):\n`);
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        console.log(`Row ${i + 1}:`);
        
        // Create a map of column letters to values
        const colMap = {};
        for (let j = 0; j < 18; j++) {
          const colLetter = String.fromCharCode(65 + j);
          colMap[colLetter] = row[j] || '(empty)';
        }
        
        console.log(`   [A] Timestamp: ${colMap.A}`);
        console.log(`   [B] User A ID: ${colMap.B}`);
        console.log(`   [C] ชื่อ User A: ${colMap.C}`);
        console.log(`   [D] ข้อความ A: ${colMap.D}`);
        console.log(`   [E] ชื่อบั้งไฟ: ${colMap.E}`);
        console.log(`   [F] รายการเล่น: ${colMap.F}`);
        console.log(`   [G] ยอดเงิน: ${colMap.G}`);
        console.log(`   [H] ยอดเงิน B: ${colMap.H}`);
        console.log(`   [I] ผลที่ออก: ${colMap.I}`);
        console.log(`   [J] ผลแพ้ชนะ A: ${colMap.J}`);
        console.log(`   [K] ผลแพ้ชนะ B: ${colMap.K}`);
        console.log(`   [L] User B ID: ${colMap.L}`);
        console.log(`   [M] ชื่อ User B: ${colMap.M}`);
        console.log(`   [N] รายการแทง B: ${colMap.N}`);
        console.log(`   [O] ชื่อกลุ่มแชท: ${colMap.O}`);
        console.log(`   [P] User A Token: ${colMap.P ? '✅ (present)' : '❌ (empty)'}`);
        console.log(`   [Q] Group ID: ${colMap.Q}`);
        console.log(`   [R] User B Token: ${colMap.R ? '✅ (present)' : '❌ (empty)'}`);
        console.log();
      }
    } else {
      console.log('❌ No data rows found (only headers)');
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  } catch (error) {
    console.error('❌ Error checking sheet:', error.message);
    console.error(error);
  }
}

checkBetsSheet();
