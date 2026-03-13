const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'bets';

let googleAuth;

async function initializeGoogleAuth() {
  try {
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json';
    
    if (!fs.existsSync(keyFile)) {
      console.error('❌ Service account key file not found:', keyFile);
      return false;
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    googleAuth = await auth.getClient();
    console.log('✅ Google Auth initialized');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Google Auth:', error.message);
    return false;
  }
}

async function checkBetResults() {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth: googleAuth });

    // ดึงข้อมูลทั้งหมดจาก Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });

    const rows = response.data.values || [];
    
    console.log('\n📊 === Checking Current Bet Results Format ===\n');
    console.log(`📋 Total rows: ${rows.length}`);
    console.log(`📋 Worksheet: ${GOOGLE_WORKSHEET_NAME}\n`);

    // แสดง Header
    if (rows.length > 0) {
      console.log('📌 Column Headers:');
      const headers = rows[0];
      headers.forEach((header, index) => {
        const colLetter = String.fromCharCode(65 + index);
        console.log(`   ${colLetter}: ${header}`);
      });
      console.log('\n');
    }

    // ตรวจสอบแต่ละแถว
    let resultCount = 0;
    let noResultCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Column I = Result Number (ผลที่ออก)
      // Column J = Result Symbol (ผลแพ้ชนะ)
      // Column K = Opposite Result
      // Column T = User A Result Text
      // Column U = User B Result Text
      
      const resultNumber = row[8] || '';
      const resultSymbol = row[9] || '';
      const oppositeResult = row[10] || '';
      const userAResultText = row[18] || '';  // Column S (18)
      const userBResultText = row[19] || '';  // Column T (19)

      if (resultNumber || resultSymbol || userAResultText || userBResultText) {
        resultCount++;
        
        console.log(`\n🔍 Row ${i + 1}:`);
        console.log(`   User A: ${row[2] || '(ว่าง)'}`);
        console.log(`   User B: ${row[11] || '(ว่าง)'}`);
        console.log(`   Bet Type A (Col F): ${row[5] || '(ว่าง)'}`);
        console.log(`   Price A (Col D): ${row[3] || '(ว่าง)'}`);
        console.log(`   Price B (Col M): ${row[12] || '(ว่าง)'}`);
        console.log(`   ─────────────────────────────────`);
        console.log(`   📊 Result Number (Col I): ${resultNumber}`);
        console.log(`   ✅ Result Symbol (Col J): ${resultSymbol}`);
        console.log(`   ❌ Opposite Result (Col K): ${oppositeResult}`);
        console.log(`   📝 User A Result (Col S): ${userAResultText}`);
        console.log(`   📝 User B Result (Col T): ${userBResultText}`);
      } else {
        noResultCount++;
      }
    }

    console.log(`\n\n📊 === Summary ===`);
    console.log(`✅ Rows with results: ${resultCount}`);
    console.log(`⚪ Rows without results: ${noResultCount}`);
    console.log(`📋 Total data rows: ${rows.length - 1}`);

    // ตรวจสอบรูปแบบการบันทึก
    console.log(`\n\n📋 === Result Format Analysis ===\n`);
    
    const resultFormats = {
      symbolOnly: 0,
      textOnly: 0,
      symbolAndText: 0,
      noResult: 0,
    };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const resultSymbol = row[9] || '';
      const userAResultText = row[18] || '';  // Column S (18)
      const userBResultText = row[19] || '';  // Column T (19)

      if (!resultSymbol && !userAResultText && !userBResultText) {
        resultFormats.noResult++;
      } else if (resultSymbol && !userAResultText && !userBResultText) {
        resultFormats.symbolOnly++;
      } else if (!resultSymbol && (userAResultText || userBResultText)) {
        resultFormats.textOnly++;
      } else if (resultSymbol && (userAResultText || userBResultText)) {
        resultFormats.symbolAndText++;
      }
    }

    console.log(`📊 Format Distribution:`);
    console.log(`   🔹 Symbol Only (Col J): ${resultFormats.symbolOnly}`);
    console.log(`   🔹 Text Only (Col T/U): ${resultFormats.textOnly}`);
    console.log(`   🔹 Symbol + Text: ${resultFormats.symbolAndText}`);
    console.log(`   🔹 No Result: ${resultFormats.noResult}`);

  } catch (error) {
    console.error('❌ Error checking bet results:', error.message);
    console.error('   Details:', error);
  }
}

async function main() {
  const initialized = await initializeGoogleAuth();
  if (initialized) {
    await checkBetResults();
  }
}

main().catch(console.error);
