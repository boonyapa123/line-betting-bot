const BettingRound = require('../models/BettingRound');
const Bet = require('../models/Bet');

/**
 * Create new betting round
 */
const createRound = async (venue, fireNumber) => {
  try {
    if (!venue || !fireNumber) {
      return {
        success: false,
        error: 'Venue and fire number are required',
      };
    }

    const round = new BettingRound({
      venue,
      fireNumber,
      status: 'open',
      winners: [],
      totalBets: 0,
      totalRevenue: 0,
      totalPayout: 0,
      profit: 0,
      createdAt: new Date(),
    });

    await round.save();

    return {
      success: true,
      round: {
        id: round._id,
        venue: round.venue,
        fireNumber: round.fireNumber,
        status: round.status,
      },
    };
  } catch (error) {
    console.error('Error creating betting round:', error);
    return {
      success: false,
      error: 'Failed to create betting round',
    };
  }
};

/**
 * Close betting for a round
 */
const closeRound = async (roundId) => {
  try {
    const round = await BettingRound.findByIdAndUpdate(
      roundId,
      {
        status: 'closed',
        closedAt: new Date(),
      },
      { new: true }
    );

    if (!round) {
      return {
        success: false,
        error: 'Betting round not found',
      };
    }

    return {
      success: true,
      round: {
        id: round._id,
        venue: round.venue,
        fireNumber: round.fireNumber,
        status: round.status,
      },
    };
  } catch (error) {
    console.error('Error closing round:', error);
    return {
      success: false,
      error: 'Failed to close betting round',
    };
  }
};

/**
 * Settle round with winners
 */
const settleRound = async (roundId, winnerUserIds = []) => {
  try {
    const round = await BettingRound.findById(roundId);

    if (!round) {
      return {
        success: false,
        error: 'Betting round not found',
      };
    }

    // Get all bets for this round
    const allBets = await Bet.find({ roundId });

    // Update bet results
    for (const bet of allBets) {
      const isWinner = winnerUserIds.includes(bet.userId);
      await Bet.findByIdAndUpdate(bet._id, {
        result: isWinner ? 'win' : 'lose',
      });
    }

    // Calculate payouts
    const winningBets = allBets.filter((b) => winnerUserIds.includes(b.userId));
    const totalWinningAmount = winningBets.reduce((sum, b) => sum + b.amount, 0);
    const totalBets = allBets.reduce((sum, b) => sum + b.amount, 0);

    // Equal distribution of winnings
    const payoutPerWinner = totalWinningAmount > 0 ? totalBets / winningBets.length : 0;

    // Update round
    const updatedRound = await BettingRound.findByIdAndUpdate(
      roundId,
      {
        status: 'settled',
        winners: winnerUserIds,
        totalBets,
        totalRevenue: totalBets,
        totalPayout: payoutPerWinner * winningBets.length,
        profit: totalBets - payoutPerWinner * winningBets.length,
      },
      { new: true }
    );

    return {
      success: true,
      round: {
        id: updatedRound._id,
        venue: updatedRound.venue,
        fireNumber: updatedRound.fireNumber,
        status: updatedRound.status,
        totalBets: updatedRound.totalBets,
        totalRevenue: updatedRound.totalRevenue,
        totalPayout: updatedRound.totalPayout,
        profit: updatedRound.profit,
        winnerCount: winnerUserIds.length,
      },
    };
  } catch (error) {
    console.error('Error settling round:', error);
    return {
      success: false,
      error: 'Failed to settle betting round',
    };
  }
};

/**
 * Get round details
 */
const getRound = async (roundId) => {
  try {
    const round = await BettingRound.findById(roundId);

    if (!round) {
      return {
        success: false,
        error: 'Betting round not found',
      };
    }

    return {
      success: true,
      round: {
        id: round._id,
        venue: round.venue,
        fireNumber: round.fireNumber,
        status: round.status,
        totalBets: round.totalBets,
        totalRevenue: round.totalRevenue,
        totalPayout: round.totalPayout,
        profit: round.profit,
        winners: round.winners,
        createdAt: round.createdAt,
        closedAt: round.closedAt,
      },
    };
  } catch (error) {
    console.error('Error getting round:', error);
    return {
      success: false,
      error: 'Failed to retrieve betting round',
    };
  }
};

/**
 * Get all rounds for a venue
 */
const getVenueRounds = async (venue, limit = 10) => {
  try {
    const rounds = await BettingRound.find({ venue })
      .sort({ createdAt: -1 })
      .limit(limit);

    return {
      success: true,
      rounds: rounds.map((r) => ({
        id: r._id,
        venue: r.venue,
        fireNumber: r.fireNumber,
        status: r.status,
        totalBets: r.totalBets,
        profit: r.profit,
        createdAt: r.createdAt,
      })),
      count: rounds.length,
    };
  } catch (error) {
    console.error('Error getting venue rounds:', error);
    return {
      success: false,
      error: 'Failed to retrieve venue rounds',
    };
  }
};

module.exports = {
  createRound,
  closeRound,
  settleRound,
  getRound,
  getVenueRounds,
};
