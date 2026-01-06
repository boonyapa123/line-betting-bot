/**
 * Script to add columns G and H to Google Sheets "Bets" sheet
 * Run this once to add the columns
 * 
 * Usage: node scripts/add-columns-to-sheets.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';

async function addColumnsToSheets() {
  try {
    console.log('🔄 Starting to add columns to Google Sheets...');
    console.log('📊 Spreadsheet ID:', SPREADSHEET_ID);

    // Read credentials
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.error('❌ Credentials file not found:', CREDENTIALS_PATH);
      process.exit(1);
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get current sheet data to find the last column
    console.log('📥 Fetching current sheet data...');
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Bets!A1:Z1',
    });

    const headerRow = getResponse.data.values?.[0] || [];
    console.log('📋 Current headers:', headerRow);

    // Add headers for columns G and H if they don't exist
    const updates = [];

    // Check if column G exists
    if (!headerRow[6]) {
      console.log('➕ Adding Column G header: "ยอดเงิน"');
      updates.push({
        range: 'Bets!G1',
        values: [['ยอดเงิน']],
      });
    } else {
      console.log('✅ Column G already exists:', headerRow[6]);
    }

    // Check if column H exists
    if (!headerRow[7]) {
      console.log('➕ Adding Column H header: "สถานะอัปเดต"');
      updates.push({
        range: 'Bets!H1',
        values: [['สถานะอัปเดต']],
      });
    } else {
      console.log('✅ Column H already exists:', headerRow[7]);
    }

    // Apply updates
    if (updates.length > 0) {
      console.log('📤 Applying updates...');
      const batchUpdateResponse = await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          data: updates,
          valueInputOption: 'USER_ENTERED',
        },
      });

      console.log('✅ Updates applied successfully');
      console.log('📊 Updated ranges:', batchUpdateResponse.data.responses.map(r => r.updatedRange));
    } else {
      console.log('✅ All columns already exist');
    }

    // Get updated headers
    const finalResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Bets!A1:H1',
    });

    console.log('\n📋 Final headers:');
    const finalHeaders = finalResponse.data.values?.[0] || [];
    finalHeaders.forEach((header, index) => {
      const columnLetter = String.fromCharCode(65 + index);
      console.log(`  ${columnLetter}: ${header}`);
    });

    console.log('\n✅ Done! Columns have been added to Google Sheets');
    console.log('\n📝 Next steps:');
    console.log('1. Open Google Sheets');
    console.log('2. Go to sheet "Bets"');
    console.log('3. Admin can now fill in Column G (ยอดเงิน) and Column H (สถานะอัปเดต)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
addColumnsToSheets();
