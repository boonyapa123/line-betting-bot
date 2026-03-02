const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function recreateBetsSheet() {
  try {
    const credentialsPath = path.join(__dirname, '../credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const betsSheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

    // ดึงข้อมูลชีททั้งหมด
    console.log('📋 Fetching spreadsheet metadata...');
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetNames = spreadsheet.data.sheets.map(s => s.properties.title);
    const betsSheet = spreadsheet.data.sheets.find(s => s.properties.title === betsSheetName);

    if (!betsSheet) {
      console.log(`❌ Sheet "${betsSheetName}" not found!`);
      return;
    }

    const sheetId = betsSheet.properties.sheetId;

    // ลบชีทเก่า
    console.log(`\n🗑️  Deleting old "${betsSheetName}" sheet...`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            deleteSheet: {
              sheetId,
            },
          },
        ],
      },
    });

    console.log(`✅ Old sheet deleted`);

    // สร้างชีทใหม่
    console.log(`\n✅ Creating new "${betsSheetName}" sheet...`);
    const addSheetResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            addSheet: {
              properties: {
                title: betsSheetName,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 10,
                },
              },
            },
          },
        ],
      },
    });

    console.log(`✅ New sheet created successfully!`);

    // เพิ่มหัวข้อคอลัมน์
    const headers = [
      'Timestamp',
      'UserID',
      'DisplayName',
      'LineName',
      'Method',
      'Price',
      'Side',
      'Amount',
      'SlipName',
      'Status',
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${betsSheetName}!A1:J1`,
      valueInputOption: 'RAW',
      resource: {
        values: [headers],
      },
    });

    console.log(`✅ Headers added to "${betsSheetName}"`);
    console.log(`\n📊 Sheet structure:`);
    headers.forEach((h, i) => {
      console.log(`   ${String.fromCharCode(65 + i)}: ${h}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

recreateBetsSheet();
