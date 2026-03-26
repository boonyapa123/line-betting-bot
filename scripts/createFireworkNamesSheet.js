/**
 * สร้างชีท FireworkNames ใน Google Sheets
 * สำหรับเก็บชื่อบั้งไฟที่ช่างไม่ต่อย (ร้องราคาเอง)
 * 
 * รัน: node scripts/createFireworkNamesSheet.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function createSheet() {
  const credentialsPath = path.join(__dirname, '..', 'credentials.json');
  const credentials = JSON.parse(fs.readFileSync(credentialsPath));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  console.log(`📊 Spreadsheet ID: ${spreadsheetId}`);

  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheet = spreadsheet.data.sheets.find(
      s => s.properties.title === 'FireworkNames'
    );

    if (existingSheet) {
      console.log('⚠️  ชีท FireworkNames มีอยู่แล้ว — ข้ามการสร้าง');
    } else {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: 'FireworkNames',
                gridProperties: { rowCount: 1000, columnCount: 4 },
              },
            },
          }],
        },
      });
      console.log('✅ สร้างชีท FireworkNames สำเร็จ');
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'FireworkNames!A1:D1',
      valueInputOption: 'RAW',
      resource: {
        values: [['GroupID', 'SlipName', 'Type', 'AnnouncedAt']],
      },
    });
    console.log('✅ เพิ่ม header สำเร็จ');

    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const fwSheet = sheetMeta.data.sheets.find(s => s.properties.title === 'FireworkNames');
    const sheetId = fwSheet.properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.5, blue: 0.2 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          {
            updateDimensionProperties: {
              range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
              properties: { pixelSize: 300 },
              fields: 'pixelSize',
            },
          },
          {
            updateDimensionProperties: {
              range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 },
              properties: { pixelSize: 200 },
              fields: 'pixelSize',
            },
          },
          {
            setBasicFilter: {
              filter: {
                range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: 4 },
              },
            },
          },
        ],
      },
    });
    console.log('✅ จัดรูปแบบ header สำเร็จ');
    console.log('\n🎉 เสร็จสิ้น — ชีท FireworkNames พร้อมใช้งาน');
    console.log('   คอลัมน์: GroupID | SlipName | Type | AnnouncedAt');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createSheet();
