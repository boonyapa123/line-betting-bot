const { google } = require('googleapis');
const logger = require('../utils/logger');
const { getGoogleCredentials, getGoogleAuthClient } = require('../config/googleCredentials');

// Google Sheets API setup
let sheets = null;
let spreadsheetId = process.env.GOOGLE_SHEETS_ID;
let authClient = null;

/**
 * Initialize Google Sheets API
 */
const initializeGoogleSheets = async () => {
  try {
    // ใช้ helper function เพื่ออ่าน credentials
    const credentials = getGoogleCredentials();
    
    authClient = getGoogleAuthClient(credentials);

    sheets = google.sheets({ version: 'v4', auth: authClient });
    logger.info('Google Sheets API initialized');
    return true;
  } catch (error) {
    logger.error('Error initializing Google Sheets API', error);
    return false;
  }
};

/**
 * Append bet to Google Sheets
 */
const appendBet = async (bet) => {
  try {
    if (!sheets || !spreadsheetId) {
      logger.warn('Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    const values = [
      [
        new Date(bet.timestamp).toLocaleString('th-TH'),
        bet.lineName,
        bet.venue,
        bet.amount,
        bet.result || 'pending',
        bet.userId,
      ],
    ];

    const request = {
      spreadsheetId,
      range: 'Bets!A:F',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values,
      },
    };

    const response = await sheets.spreadsheets.values.append(request);
    logger.info('Bet appended to Google Sheets', { bet: bet._id });
    
    return {
      success: true,
      updatedRange: response.data.updates.updatedRange,
    };
  } catch (error) {
    logger.error('Error appending bet to Google Sheets', error);
    return { success: false, error: error.message };
  }
};

/**
 * Append round summary to Google Sheets
 */
const appendRoundSummary = async (round, bets) => {
  try {
    if (!sheets || !spreadsheetId) {
      logger.warn('Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    // Calculate statistics
    const totalBets = bets.reduce((sum, b) => sum + b.amount, 0);
    const winningBets = bets.filter((b) => round.winners.includes(b.userId));
    const totalWinningAmount = winningBets.reduce((sum, b) => sum + b.amount, 0);

    const values = [
      [
        new Date(round.createdAt).toLocaleString('th-TH'),
        round.venue,
        round.fireNumber,
        bets.length,
        winningBets.length,
        totalBets,
        round.totalPayout,
        round.profit,
        round.status,
      ],
    ];

    const request = {
      spreadsheetId,
      range: 'Summary!A:I',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values,
      },
    };

    const response = await sheets.spreadsheets.values.append(request);
    logger.info('Round summary appended to Google Sheets', { roundId: round._id });
    
    return {
      success: true,
      updatedRange: response.data.updates.updatedRange,
    };
  } catch (error) {
    logger.error('Error appending round summary to Google Sheets', error);
    return { success: false, error: error.message };
  }
};

/**
 * Extract venue from details string
 */
const extractVenue = (details) => {
  if (!details) return '';
  // Extract first word/stadium name (e.g., "กุหลาบขาว" from "กุหลาบขาว 270-75 น้องรีวิว 270-80")
  const parts = details.split(/\s+/);
  return parts[0] || '';
};

/**
 * Extract amount from details string
 */
const extractAmount = (details) => {
  if (!details) return 0;
  // Try to extract amount from patterns like "270-75", "270/75"
  const match = details.match(/(\d+)[-\/](\d+)/);
  if (match) {
    // Return the second number as amount
    return parseInt(match[2], 10);
  }
  return 0;
};

/**
 * Get all bets from Google Sheets
 */
const getAllBets = async () => {
  try {
    if (!sheets || !spreadsheetId) {
      logger.warn('Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    const request = {
      spreadsheetId,
      range: 'Bets!A:Z',
    };

    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values || [];

    // Skip header row
    const bets = rows.slice(1).map((row) => ({
      timestamp: row[0], // Column A - timestamp
      lineName: row[1], // Column B - player name
      type: row[2] || '', // Column C - type (ข้อความ)
      details: row[3] || '', // Column D - details (สนาม บั้งไฟ)
      result: row[4] || 'pending', // Column E - result (original)
      userId: row[5], // Column F - userId
      // Parse details to extract venue and message
      venue: extractVenue(row[3] || ''),
      message: row[3] || '', // Column D - full message
      amount: row[6] ? parseInt(row[6], 10) : extractAmount(row[3] || ''), // Column G - amount (or extract from details)
      updatedStatus: row[7] || row[4] || 'pending', // Column H - updated status (or use original result)
    }));

    console.log('📊 Sample bets from sheet:');
    bets.slice(0, 3).forEach((bet, i) => {
      console.log(`  ${i + 1}. timestamp=${bet.timestamp}, lineName=${bet.lineName}, venue=${bet.venue}, message=${bet.message}, amount=${bet.amount}, result=${bet.result}`);
    });

    return {
      success: true,
      bets,
      count: bets.length,
    };
  } catch (error) {
    logger.error('Error getting bets from Google Sheets', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update bet result in Google Sheets
 */
const updateBetResult = async (lineName, venue, amount, result) => {
  try {
    if (!sheets || !spreadsheetId) {
      logger.warn('Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    // Get all bets
    const request = {
      spreadsheetId,
      range: 'Bets!A:F',
    };

    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values || [];

    // Find matching bet
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === lineName && rows[i][2] === venue && parseInt(rows[i][3], 10) === amount) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, error: 'Bet not found' };
    }

    // Update result
    const updateRequest = {
      spreadsheetId,
      range: `Bets!E${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[result]],
      },
    };

    await sheets.spreadsheets.values.update(updateRequest);
    logger.info('Bet result updated in Google Sheets', { lineName, venue, amount, result });
    
    return { success: true };
  } catch (error) {
    logger.error('Error updating bet result in Google Sheets', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create new sheet
 */
const createSheet = async (sheetName) => {
  try {
    if (!sheets || !spreadsheetId) {
      logger.warn('Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    const request = {
      spreadsheetId,
      resource: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    };

    const response = await sheets.spreadsheets.batchUpdate(request);
    logger.info('Sheet created in Google Sheets', { sheetName });
    
    return {
      success: true,
      sheetId: response.data.replies[0].addSheet.properties.sheetId,
    };
  } catch (error) {
    logger.error('Error creating sheet in Google Sheets', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clear sheet
 */
const clearSheet = async (sheetName) => {
  try {
    if (!sheets || !spreadsheetId) {
      logger.warn('Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    const request = {
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    };

    await sheets.spreadsheets.values.clear(request);
    logger.info('Sheet cleared in Google Sheets', { sheetName });
    
    return { success: true };
  } catch (error) {
    logger.error('Error clearing sheet in Google Sheets', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update bet status in Google Sheets
 */
const updateBetStatus = async (identifier, status) => {
  try {
    if (!sheets || !spreadsheetId) {
      logger.warn('Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    // Get all bets
    const request = {
      spreadsheetId,
      range: 'Bets!A:Z',
    };

    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values || [];

    // Find matching bet by lineName or any identifier
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      // Check if identifier matches lineName (column B) or any other field
      if (rows[i][1] === identifier || rows[i][0] === identifier) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      logger.warn('Bet not found for cancellation', { identifier });
      return { success: false, error: 'Bet not found' };
    }

    // Update status (column E - result)
    const updateRequest = {
      spreadsheetId,
      range: `Bets!E${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[status]],
      },
    };

    await sheets.spreadsheets.values.update(updateRequest);
    logger.info('Bet status updated in Google Sheets', { identifier, status, rowIndex });
    
    return { success: true, rowIndex };
  } catch (error) {
    logger.error('Error updating bet status in Google Sheets', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all data from a specific sheet
 */
const getSheetData = async (sheetName) => {
  try {
    if (!sheets || !spreadsheetId) {
      logger.warn('Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    const request = {
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    };

    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values || [];

    console.log(`📊 Data from ${sheetName} sheet:`, rows.length, 'rows');

    return {
      success: true,
      data: rows,
      count: rows.length,
    };
  } catch (error) {
    logger.error(`Error getting data from ${sheetName} sheet`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Append a row to a specific sheet
 */
const appendRow = async (sheetName, values) => {
  try {
    // Initialize if not already initialized
    if (!sheets || !spreadsheetId) {
      console.log('📊 Sheets not initialized, initializing now...');
      try {
        const credentials = getGoogleCredentials();
        console.log('✅ Credentials loaded');
        
        authClient = getGoogleAuthClient(credentials);
        sheets = google.sheets({ version: 'v4', auth: authClient });
        console.log('✅ Google Sheets API initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Google Sheets:', error.message);
        return { success: false, error: 'Failed to initialize Google Sheets: ' + error.message };
      }
    }

    if (!sheets || !spreadsheetId) {
      console.error('❌ Google Sheets still not initialized after init attempt');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    console.log(`📝 Appending row to ${sheetName}:`, values);

    const request = {
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [values],
      },
    };

    const response = await sheets.spreadsheets.values.append(request);
    console.log(`✅ Row appended to ${sheetName} sheet:`, values);

    return {
      success: true,
      updatedRange: response.data.updates.updatedRange,
    };
  } catch (error) {
    console.error(`❌ Error appending row to ${sheetName} sheet:`, error.message);
    logger.error(`Error appending row to ${sheetName} sheet`, error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  initializeGoogleSheets,
  appendBet,
  appendRoundSummary,
  getAllBets,
  updateBetResult,
  updateBetStatus,
  createSheet,
  clearSheet,
  getSheetData,
  appendRow,
};
