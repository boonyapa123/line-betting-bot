const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

/**
 * Setup Google Sheets with required sheets and headers
 */
async function setupGoogleSheets() {
  try {
    const keyFile = './credentials.json';
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    if (!spreadsheetId) {
      console.error('❌ GOOGLE_SHEETS_ID not found in .env');
      process.exit(1);
    }

    if (!fs.existsSync(keyFile)) {
      console.error('❌ credentials.json not found');
      process.exit(1);
    }

    const auth = new google.auth.GoogleAuth({
      keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    console.log('🔄 Setting up Google Sheets...');
    console.log(`📊 Spreadsheet ID: ${spreadsheetId}`);

    // Get current sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const currentSheets = spreadsheet.data.sheets || [];
    console.log(`📋 Current sheets: ${currentSheets.map(s => s.properties.title).join(', ')}`);

    // Setup Bets sheet
    await setupBetsSheet(sheets, spreadsheetId, currentSheets);

    // Setup Summary sheet
    await setupSummarySheet(sheets, spreadsheetId, currentSheets);

    // Setup Cancellations sheet
    await setupCancellationsSheet(sheets, spreadsheetId, currentSheets);

    console.log('✅ Google Sheets setup completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up Google Sheets:', error.message);
    process.exit(1);
  }
}

/**
 * Setup Bets sheet
 */
async function setupBetsSheet(sheets, spreadsheetId, currentSheets) {
  try {
    let betsSheetId = null;
    const betsSheetName = 'Bets';

    // Check if Bets sheet exists
    const betsSheet = currentSheets.find(s => s.properties.title === betsSheetName);

    if (!betsSheet) {
      console.log(`📝 Creating "${betsSheetName}" sheet...`);
      
      // Create new sheet
      const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: betsSheetName,
                },
              },
            },
          ],
        },
      });

      betsSheetId = response.data.replies[0].addSheet.properties.sheetId;
      console.log(`✅ "${betsSheetName}" sheet created`);
    } else {
      betsSheetId = betsSheet.properties.sheetId;
      console.log(`✅ "${betsSheetName}" sheet already exists`);
    }

    // Add headers
    const headers = ['เวลา', 'ชื่อผู้เล่น', 'สนาม', 'ยอดเงิน', 'ผล', 'User ID'];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${betsSheetName}!A1:F1`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [headers],
      },
    });

    console.log(`✅ Headers added to "${betsSheetName}" sheet`);
  } catch (error) {
    console.error(`❌ Error setting up Bets sheet:`, error.message);
    throw error;
  }
}

/**
 * Setup Summary sheet
 */
async function setupSummarySheet(sheets, spreadsheetId, currentSheets) {
  try {
    let summarySheetId = null;
    const summarySheetName = 'Summary';

    // Check if Summary sheet exists
    const summarySheet = currentSheets.find(s => s.properties.title === summarySheetName);

    if (!summarySheet) {
      console.log(`📝 Creating "${summarySheetName}" sheet...`);
      
      // Create new sheet
      const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: summarySheetName,
                },
              },
            },
          ],
        },
      });

      summarySheetId = response.data.replies[0].addSheet.properties.sheetId;
      console.log(`✅ "${summarySheetName}" sheet created`);
    } else {
      summarySheetId = summarySheet.properties.sheetId;
      console.log(`✅ "${summarySheetName}" sheet already exists`);
    }

    // Add headers
    const headers = ['เวลา', 'สนาม', 'บั้งไฟ', 'จำนวนผู้เล่น', 'ผู้ชนะ', 'ยอดรายรับ', 'ยอดจ่าย', 'กำไร', 'สถานะ'];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${summarySheetName}!A1:I1`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [headers],
      },
    });

    console.log(`✅ Headers added to "${summarySheetName}" sheet`);
  } catch (error) {
    console.error(`❌ Error setting up Summary sheet:`, error.message);
    throw error;
  }
}

// Run setup
setupGoogleSheets();


/**
 * Setup Cancellations sheet
 */
async function setupCancellationsSheet(sheets, spreadsheetId, currentSheets) {
  try {
    let cancellationsSheetId = null;
    const cancellationsSheetName = 'Cancellations';

    // Check if Cancellations sheet exists
    const cancellationsSheet = currentSheets.find(s => s.properties.title === cancellationsSheetName);

    if (!cancellationsSheet) {
      console.log(`📝 Creating "${cancellationsSheetName}" sheet...`);
      
      // Create new sheet
      const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: cancellationsSheetName,
                },
              },
            },
          ],
        },
      });

      cancellationsSheetId = response.data.replies[0].addSheet.properties.sheetId;
      console.log(`✅ "${cancellationsSheetName}" sheet created`);
    } else {
      cancellationsSheetId = cancellationsSheet.properties.sheetId;
      console.log(`✅ "${cancellationsSheetName}" sheet already exists`);
    }

    // Add headers
    const headers = ['เวลายกเลิก', 'ชื่อผู้ยกเลิก', 'ประเภท', 'ข้อความเดิม', 'สถานะ', 'User ID', 'เวลาเดิม'];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${cancellationsSheetName}!A1:G1`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [headers],
      },
    });

    console.log(`✅ Headers added to "${cancellationsSheetName}" sheet`);
  } catch (error) {
    console.error(`❌ Error setting up Cancellations sheet:`, error.message);
    throw error;
  }
}
