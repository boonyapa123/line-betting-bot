require('dotenv').config();
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

async function checkSheetStructure() {
  try {
    console.log('🔍 ตรวจสอบโครงสร้าง Google Sheets\n');

    // Load credentials
    let credentials;
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      console.log('✅ Google Sheets credentials loaded from environment');
    } else {
      const credentialsPath = path.join(__dirname, 'credentials.json');
      credentials = JSON.parse(fs.readFileSync(credentialsPath));
      console.log('✅ Google Sheets credentials loaded from file');
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

    console.log(`\n📊 Sheet ID: ${GOOGLE_SHEET_ID}`);
    console.log(`📋 Worksheet Name: ${GOOGLE_WORKSHEET_NAME}\n`);

    // Get first row (headers)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A1:T1`,
    });

    const headers = response.data.values?.[0] || [];

    console.log('📋 Column Headers:\n');
    headers.forEach((header, index) => {
      const columnLetter = String.fromCharCode(65 + index);
      console.log(`  [${columnLetter}] ${index}: ${header || '(ว่างเปล่า)'}`);
    });

    // Get first data row
    console.log('\n\n📝 First Data Row (Row 2):\n');
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A2:T2`,
    });

    const firstRow = dataResponse.data.values?.[0] || [];

    firstRow.forEach((value, index) => {
      const columnLetter = String.fromCharCode(65 + index);
      console.log(`  [${columnLetter}] ${index}: ${value || '(ว่างเปล่า)'}`);
    });

    // Get all data to check structure
    console.log('\n\n📊 Data Summary:\n');
    const allDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:T`,
    });

    const allRows = allDataResponse.data.values || [];
    console.log(`  Total rows: ${allRows.length}`);
    console.log(`  Total columns: ${headers.length}`);

    // Check important columns
    console.log('\n\n🔍 Important Columns Check:\n');

    const importantColumns = {
      'A': 'Timestamp',
      'B': 'User A ID',
      'C': 'User A Name',
      'D': 'Message A',
      'E': 'Slip Name',
      'F': 'Side A',
      'G': 'Amount A',
      'H': 'Amount B',
      'I': 'Result (ผลแพ้ชนะ)',
      'J': 'Result Win/Lose',
      'K': 'User B ID',
      'L': 'User B Name',
      'M': 'Side B',
      'N': 'Group Chat Name',
      'O': 'Group Name',
      'P': 'Token A',
      'Q': 'Group ID',
      'R': 'Token B',
      'S': 'Result A',
      'T': 'Result B',
    };

    for (const [col, desc] of Object.entries(importantColumns)) {
      const index = col.charCodeAt(0) - 65;
      const header = headers[index] || '(ว่างเปล่า)';
      const value = firstRow[index] || '(ว่างเปล่า)';
      console.log(`  [${col}] ${desc}`);
      console.log(`      Header: ${header}`);
      console.log(`      Value: ${value}\n`);
    }

    console.log('\n✅ Sheet structure check completed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSheetStructure();
