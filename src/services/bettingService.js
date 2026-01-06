const { recordBet: recordBetToGoogleSheets } = require('./googleSheetsDatabaseService');

/**
 * Record a new bet
 */
const recordBet = async (userId, lineName, venue, amount) => {
  try {
    // Validate amount
    if (amount <= 0) {
      return {
        success: false,
        error: 'Amount must be greater than 0',
      };
    }

    // Record to Google Sheets (only database)
    const gsResult = await recordBetToGoogleSheets(userId, lineName, venue, amount);
    if (!gsResult.success) {
      return {
        success: false,
        error: gsResult.error || 'Failed to record bet',
      };
    }

    return {
      success: true,
      bet: gsResult.bet,
    };
  } catch (error) {
    console.error('Error recording bet:', error);
    return {
      success: false,
      error: 'Failed to record bet',
    };
  }
};

/**
 * Get bet history with filters
 */
const getBetHistory = async (filters = {}) => {
  return {
    success: true,
    bets: [],
    count: 0,
  };
};

/**
 * Get bets for a specific round
 */
const getRoundBets = async (roundId) => {
  return {
    success: true,
    bets: [],
    count: 0,
  };
};

/**
 * Update bet result
 */
const updateBetResult = async (betId, result) => {
  return {
    success: true,
    bet: null,
  };
};

module.exports = {
  recordBet,
  getBetHistory,
  getRoundBets,
  updateBetResult,
};
