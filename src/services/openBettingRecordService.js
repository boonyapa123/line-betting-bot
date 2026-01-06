/**
 * Open Betting Record Service
 * บันทึกข้อมูลการเปิดรับแทงลงใน Google Sheets เป็นรายวัน
 */

const { google } = require('googleapis');
const { getGoogleCredentials, getGoogleAuthClient } = require('../config/googleCredentials');

let sheets = null;
let spreadsheetId = process.env.GOOGLE_SHEETS_ID || '';
let authClient = null;

/**
 * Initialize Google Sheets connection
 */
const initialize = async () => {
  try {
    // ใช้ helper function เพื่ออ่าน credentials
    const credentials = getGoogleCredentials();
    
    authClient = getGoogleAuthClient(credentials);

    sheets = google.sheets({ version: 'v4', auth: authClient });
    console.log('✅ Open Betting Record Service initialized');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Open Betting Record Service:', error);
    return false;
  }
};

/**
 * Get sheet name for today (format: YYYY-MM-DD)
 */
const getTodaySheetName = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Create sheet for today if not exists
 */
const ensureTodaySheetExists = async () => {
  try {
    const sheetName = getTodaySheetName();

    // Get all sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetsList = spreadsheet.data.sheets || [];
    const sheetExists = sheetsList.some((s) => s.properties.title === sheetName);

    if (!sheetExists) {
      console.log(`📝 Creating new sheet for today: ${sheetName}`);

      // Create new sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 6,
                  },
                },
              },
            },
          ],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetName}'!A1:F1`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [['เวลา', 'สนาม', 'บั้งไฟ', 'ลิงค์ห้องแข่ง', 'หมายเหตุ', 'Admin ID']],
        },
      });

      console.log(`✅ Sheet created: ${sheetName}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Error ensuring today sheet exists:', error);
    return false;
  }
};

/**
 * Record open betting data
 */
const recordOpenBetting = async (data) => {
  try {
    if (!sheets || !spreadsheetId) {
      console.warn('⚠️ Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    // Ensure today's sheet exists
    const sheetExists = await ensureTodaySheetExists();
    if (!sheetExists) {
      return { success: false, error: 'Failed to create today sheet' };
    }

    const sheetName = getTodaySheetName();
    const timestamp = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const values = [
      [
        timestamp,
        data.venue,
        data.fireNumber,
        data.roomLink || '',
        data.note || '',
        data.adminId || '',
      ],
    ];

    const request = {
      spreadsheetId,
      range: `'${sheetName}'!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    };

    const response = await sheets.spreadsheets.values.append(request);

    console.log('✅ Open betting recorded:', {
      date: data.date,
      venue: data.venue,
      fireNumber: data.fireNumber,
      timestamp,
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Error recording open betting:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get today's open betting records
 */
const getTodayRecords = async () => {
  try {
    if (!sheets || !spreadsheetId) {
      console.warn('⚠️ Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    const sheetName = getTodaySheetName();

    const request = {
      spreadsheetId,
      range: `'${sheetName}'!A:F`,
    };

    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values || [];

    // Skip header row
    const records = rows.slice(1).map((row) => ({
      date: sheetName,
      timestamp: row[0] || '',
      venue: row[1] || '',
      fireNumber: row[2] || '',
      roomLink: row[3] || '',
      note: row[4] || '',
      adminId: row[5] || '',
    }));

    console.log(`✅ Retrieved ${records.length} records for today`);

    return { success: true, records };
  } catch (error) {
    console.error('❌ Error getting today records:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get records for specific date
 */
const getRecordsByDate = async (date) => {
  try {
    if (!sheets || !spreadsheetId) {
      console.warn('⚠️ Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    const request = {
      spreadsheetId,
      range: `'${date}'!A:F`,
    };

    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values || [];

    // Skip header row
    const records = rows.slice(1).map((row) => ({
      date,
      timestamp: row[0] || '',
      venue: row[1] || '',
      fireNumber: row[2] || '',
      roomLink: row[3] || '',
      note: row[4] || '',
      adminId: row[5] || '',
    }));

    console.log(`✅ Retrieved ${records.length} records for ${date}`);

    return { success: true, records };
  } catch (error) {
    console.error('❌ Error getting records by date:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get summary report for today
 */
const getTodaySummary = async () => {
  try {
    const result = await getTodayRecords();

    if (!result.success || !result.records) {
      return { success: false, error: result.error };
    }

    const records = result.records;

    // Group by venue
    const venueMap = new Map();
    records.forEach((record) => {
      const key = `${record.venue}-${record.fireNumber}`;
      if (!venueMap.has(key)) {
        venueMap.set(key, []);
      }
      venueMap.get(key).push(record);
    });

    const summary = {
      date: getTodaySheetName(),
      totalRecords: records.length,
      venues: Array.from(venueMap.entries()).map(([key, records]) => ({
        key,
        venue: records[0].venue,
        fireNumber: records[0].fireNumber,
        count: records.length,
        records,
      })),
    };

    console.log('✅ Today summary generated');

    return { success: true, summary };
  } catch (error) {
    console.error('❌ Error generating today summary:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  initialize,
  recordOpenBetting,
  getTodayRecords,
  getRecordsByDate,
  getTodaySummary,
  getTodaySheetName,
  getSheets: () => sheets,
  getSpreadsheetId: () => spreadsheetId,
};
