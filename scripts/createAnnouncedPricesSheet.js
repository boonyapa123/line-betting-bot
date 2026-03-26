/**
 * สร้างชีท AnnouncedPrices ใน Google Sheets
 * สำหรับเก็บราคาช่างที่แอดมินประกาศ
 * 
 * รัน: node scripts/createAnnouncedPricesSheet.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function createSheet() {
  // โหลด credentials
  let credentials;
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  } else {
    const credentialsPath = path.join(__dirname, '..', 'credentials.json');
    if (!fs.existsSync(credentialsPath)) {
      console.error('❌ ไม่พบไฟล์ credentials.json');
      process.exit(1);
    }
    credentials = JSON.parse(fs.readFileSync(credentialsPath));
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    console.error('❌ ไม่พบ GOOGLE_SHEET_ID ใน .env');
    process.exit(1);
  }

  console.log(`📊 Spreadsheet ID: ${spreadsheetId}`);

  // ตรวจสอบว่าชีท AnnouncedPrices มีอยู่แล้วหรือไม่
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheet = spreadsheet.data.sheets.find(
      s => s.properties.title === 'AnnouncedPrices'
    );

    if (existingSheet) {
      console.log('⚠️  ชีท AnnouncedPrices มีอยู่แล้ว — ข้ามการสร้าง');
    } else {
      // สร้างชีทใหม่
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'AnnouncedPrices',
                  gridProperties: { rowCount: 1000, columnCount: 6 },
                },
              },
            },
          ],
        },
      });
      console.log('✅ สร้างชีท AnnouncedPrices สำเร็จ');
    }

    // เพิ่ม header
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'AnnouncedPrices!A1:F1',
      valueInputOption: 'RAW',
      resource: {
        values: [['GroupID', 'SlipName', 'PriceRange', 'Min', 'Max', 'AnnouncedAt']],
      },
    });
    console.log('✅ เพิ่ม header สำเร็จ');

    // จัดรูปแบบ header (bold + สีพื้นหลัง)
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const announcedSheet = sheetMeta.data.sheets.find(
      s => s.properties.title === 'AnnouncedPrices'
    );
    const sheetId = announcedSheet.properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.6, blue: 0.9 },
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
              properties: { pixelSize: 150 },
              fields: 'pixelSize',
            },
          },
          {
            updateDimensionProperties: {
              range: { sheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 },
              properties: { pixelSize: 120 },
              fields: 'pixelSize',
            },
          },
          {
            updateDimensionProperties: {
              range: { sheetId, dimension: 'COLUMNS', startIndex: 5, endIndex: 6 },
              properties: { pixelSize: 180 },
              fields: 'pixelSize',
            },
          },
          {
            setBasicFilter: {
              filter: {
                range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: 6 },
              },
            },
          },
        ],
      },
    });
    console.log('✅ จัดรูปแบบ header สำเร็จ');

    console.log('\n🎉 เสร็จสิ้น — ชีท AnnouncedPrices พร้อมใช้งาน');
    console.log('   คอลัมน์: GroupID | SlipName | PriceRange | Min | Max | AnnouncedAt');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createSheet();
