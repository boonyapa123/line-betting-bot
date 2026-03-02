const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function checkAndCreateBetsSheet() {
  try {
    const credentialsPath = path.join(__dirname, '../credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // ดึงข้อมูลชีททั้งหมด
    console.log('📋 Fetching spreadsheet metadata...');
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetNames = spreadsheet.data.sheets.map(s => s.properties.title);
    console.log('📊 Available sheets:', sheetNames);

    const betsSheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';
    const betsSheetExists = sheetNames.includes(betsSheetName);

    if (!betsSheetExists) {
      console.log(`\n❌ Sheet "${betsSheetName}" does not exist!`);
      console.log(`\n✅ Creating sheet "${betsSheetName}"...`);

      // สร้างชีทใหม่
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

      console.log(`✅ Sheet "${betsSheetName}" created successfully!`);

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
    } else {
      console.log(`\n✅ Sheet "${betsSheetName}" already exists!`);

      // ตรวจสอบข้อมูลในชีท
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${betsSheetName}!A1:J100`,
      });

      const rows = response.data.values || [];
      console.log(`📊 Total rows in "${betsSheetName}": ${rows.length}`);
      console.log(`📋 Headers: ${rows[0]?.join(', ')}`);
      console.log(`📝 Data rows: ${rows.length - 1}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAndCreateBetsSheet();
