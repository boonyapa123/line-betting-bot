const { google } = require('googleapis');
const logger = require('../utils/logger');
const { getGoogleCredentials, getGoogleAuthClient } = require('../config/googleCredentials');

let sheets = null;
let spreadsheetId = process.env.GOOGLE_SHEETS_ID;
let authClient = null;

/**
 * Initialize Google Sheets as Database
 */
const initializeDatabase = async () => {
  try {
    // ใช้ helper function เพื่ออ่าน credentials
    const credentials = getGoogleCredentials();
    
    authClient = getGoogleAuthClient(credentials);

    sheets = google.sheets({ version: 'v4', auth: authClient });
    logger.info('Google Sheets Database initialized');
    return true;
  } catch (error) {
    logger.error('Error initializing Google Sheets Database', error);
    return false;
  }
};

/**
 * Record a bet to Google Sheets
 */
const recordBet = async (userId, lineName, venue, amount) => {
  try {
    if (!sheets || !spreadsheetId) {
      logger.warn('Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    const timestamp = new Date().toLocaleString('th-TH');
    const values = [[timestamp, lineName, venue, amount, 'pending', userId]];

    const request = {
      spreadsheetId,
      range: 'Bets!A:F',
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    };

    const response = await sheets.spreadsheets.values.append(request);
    logger.info('Bet recorded to Google Sheets', { lineName, venue, amount });
    
    return {
      success: true,
      bet: {
        id: response.data.updates.updatedRange,
        userId,
        lineName,
        venue,
        amount,
        timestamp,
        result: 'pending',
      },
    };
  } catch (error) {
    logger.error('Error recording bet to Google Sheets', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all bets from Google Sheets
 */
const getBets = async (filters = {}) => {
  try {
    if (!sheets || !spreadsheetId) {
      logger.warn('Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    const request = {
      spreadsheetId,
      range: 'Bets!A:F',
    };

    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values || [];

    // Skip header row
    const bets = rows.slice(1).map((row, index) => ({
      id: index,
      timestamp: row[0],
      lineName: row[1],
      venue: row[2],
      amount: parseInt(row[3], 10),
      result: row[4] || 'pending',
      userId: row[5],
    }));

    // Apply filters
    let filtered = bets;
    if (filters.venue) {
      filtered = filtered.filter((b) => b.venue === filters.venue);
    }
    if (filters.lineName) {
      filtered = filtered.filter((b) => b.lineName === filters.lineName);
    }

    return {
      success: true,
      bets: filtered,
      count: filtered.length,
    };
  } catch (error) {
    logger.error('Error getting bets from Google Sheets', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get bets for a specific venue
 */
const getVenueBets = async (venue) => {
  try {
    const result = await getBets({ venue });
    return result;
  } catch (error) {
    logger.error('Error getting venue bets', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update bet result
 */
const updateBetResult = async (lineName, venue, amount, result) => {
  try {
    if (!sheets || !spreadsheetId) {
      logger.warn('Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    const request = {
      spreadsheetId,
      range: 'Bets!A:F',
    };

    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values || [];

    // Find matching bet
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (
        rows[i][1] === lineName &&
        rows[i][2] === venue &&
        parseInt(rows[i][3], 10) === amount
      ) {
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
    logger.info('Bet result updated', { lineName, venue, amount, result });
    
    return { success: true };
  } catch (error) {
    logger.error('Error updating bet result', error);
    return { success: false, error: error.message };
  }
};

/**
 * Record round summary
 */
const recordRoundSummary = async (round, bets) => {
  try {
    if (!sheets || !spreadsheetId) {
      logger.warn('Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    const timestamp = new Date(round.createdAt).toLocaleString('th-TH');
    const totalBets = bets.reduce((sum, b) => sum + b.amount, 0);
    const winningBets = bets.filter((b) => round.winners.includes(b.userId));
    const winnerCount = winningBets.length;

    const values = [
      [
        timestamp,
        round.venue,
        round.fireNumber,
        bets.length,
        winnerCount,
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
      resource: { values },
    };

    const response = await sheets.spreadsheets.values.append(request);
    logger.info('Round summary recorded', { roundId: round._id });
    
    return {
      success: true,
      updatedRange: response.data.updates.updatedRange,
    };
  } catch (error) {
    logger.error('Error recording round summary', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get summary data
 */
const getSummary = async () => {
  try {
    if (!sheets || !spreadsheetId) {
      logger.warn('Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    const request = {
      spreadsheetId,
      range: 'Summary!A:I',
    };

    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values || [];

    // Skip header row
    const summaries = rows.slice(1).map((row) => ({
      timestamp: row[0],
      venue: row[1],
      fireNumber: row[2],
      totalPlayers: parseInt(row[3], 10),
      winners: parseInt(row[4], 10),
      totalBets: parseInt(row[5], 10),
      totalPayout: parseInt(row[6], 10),
      profit: parseInt(row[7], 10),
      status: row[8],
    }));

    return {
      success: true,
      summaries,
      count: summaries.length,
    };
  } catch (error) {
    logger.error('Error getting summary', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clear all data (for testing)
 */
const clearAllData = async () => {
  try {
    if (!sheets || !spreadsheetId) {
      logger.warn('Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    // Clear Bets sheet
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Bets!A2:F',
    });

    // Clear Summary sheet
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Summary!A2:I',
    });

    logger.info('All data cleared');
    return { success: true };
  } catch (error) {
    logger.error('Error clearing data', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  initializeDatabase,
  recordBet,
  getBets,
  getVenueBets,
  updateBetResult,
  recordRoundSummary,
  getSummary,
  clearAllData,
};


/**
 * Record a bet cancellation to Google Sheets
 */
const recordCancellation = async (userId, lineName, originalMessage, cancelTime) => {
  try {
    if (!sheets || !spreadsheetId) {
      logger.warn('Google Sheets not initialized');
      return { success: false, error: 'Google Sheets not initialized' };
    }

    const timestamp = new Date().toLocaleString('th-TH');
    const values = [[timestamp, lineName, 'CANCELLED', originalMessage, 'cancelled', userId, cancelTime]];

    const request = {
      spreadsheetId,
      range: 'Cancellations!A:G',
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    };

    const response = await sheets.spreadsheets.values.append(request);
    logger.info('Cancellation recorded to Google Sheets', { lineName, originalMessage });
    
    return {
      success: true,
      cancellation: {
        id: response.data.updates.updatedRange,
        userId,
        lineName,
        originalMessage,
        timestamp,
        cancelTime,
        status: 'cancelled',
      },
    };
  } catch (error) {
    logger.error('Error recording cancellation to Google Sheets', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  initializeDatabase,
  recordBet,
  getBets,
  recordCancellation,
};


/**
 * Update bet status to cancelled
 */
const updateBetStatusToCancelled = async (originalMessage) => {
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

    // Find the LATEST pending bet matching the message
    let latestMatchingRow = null;
    let latestRowIndex = null;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const venue = row[2];
      const amount = row[3];
      const status = row[4];
      const betMessage = `${venue}${amount}`;

      // Only consider pending bets
      if (betMessage === originalMessage.trim() && status === 'pending') {
        latestMatchingRow = row;
        latestRowIndex = i + 1; // Google Sheets is 1-indexed
      }
    }

    if (latestRowIndex) {
      // Update the latest matching bet to cancelled
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Bets!E${latestRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [['cancelled']],
        },
      });

      logger.info(`Latest bet status updated to cancelled: ${originalMessage} (row ${latestRowIndex})`);
      return { success: true, rowIndex: latestRowIndex };
    } else {
      logger.warn(`No pending bets found for cancellation: ${originalMessage}`);
      return { success: false, error: 'No pending bets found' };
    }
  } catch (error) {
    logger.error('Error updating bet status', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  initializeDatabase,
  recordBet,
  getBets,
  recordCancellation,
  updateBetStatusToCancelled,
};
