/**
 * Calculate winnings with equal distribution
 */
const calculateEqualDistribution = (totalBets, winnerCount) => {
  if (winnerCount === 0) {
    return {
      payoutPerWinner: 0,
      totalPayout: 0,
      profit: totalBets,
    };
  }

  const payoutPerWinner = totalBets / winnerCount;
  const totalPayout = payoutPerWinner * winnerCount;

  return {
    payoutPerWinner: Math.round(payoutPerWinner * 100) / 100,
    totalPayout: Math.round(totalPayout * 100) / 100,
    profit: Math.round((totalBets - totalPayout) * 100) / 100,
  };
};

/**
 * Calculate winnings with proportional distribution
 * Winners get back their bet amount plus share of losing bets
 */
const calculateProportionalDistribution = (bets, winnerIds) => {
  const totalBets = bets.reduce((sum, b) => sum + b.amount, 0);
  const winningBets = bets.filter((b) => winnerIds.includes(b.userId));
  const totalWinningAmount = winningBets.reduce((sum, b) => sum + b.amount, 0);
  const totalLosingAmount = totalBets - totalWinningAmount;

  if (winningBets.length === 0) {
    return {
      payouts: {},
      totalPayout: 0,
      profit: totalBets,
    };
  }

  const payouts = {};
  winningBets.forEach((bet) => {
    const proportion = bet.amount / totalWinningAmount;
    const share = totalLosingAmount * proportion;
    payouts[bet.userId] = {
      originalBet: bet.amount,
      winnings: share,
      total: bet.amount + share,
    };
  });

  const totalPayout = Object.values(payouts).reduce((sum, p) => sum + p.total, 0);

  return {
    payouts,
    totalPayout: Math.round(totalPayout * 100) / 100,
    profit: Math.round((totalBets - totalPayout) * 100) / 100,
  };
};

/**
 * Calculate winnings with odds
 */
const calculateWithOdds = (bets, winnerIds, odds = 2) => {
  const totalBets = bets.reduce((sum, b) => sum + b.amount, 0);
  const winningBets = bets.filter((b) => winnerIds.includes(b.userId));

  if (winningBets.length === 0) {
    return {
      payouts: {},
      totalPayout: 0,
      profit: totalBets,
    };
  }

  const payouts = {};
  winningBets.forEach((bet) => {
    payouts[bet.userId] = {
      originalBet: bet.amount,
      winnings: bet.amount * (odds - 1),
      total: bet.amount * odds,
    };
  });

  const totalPayout = Object.values(payouts).reduce((sum, p) => sum + p.total, 0);

  return {
    payouts,
    totalPayout: Math.round(totalPayout * 100) / 100,
    profit: Math.round((totalBets - totalPayout) * 100) / 100,
  };
};

/**
 * Format currency for display
 */
const formatCurrency = (amount) => {
  return `${Math.round(amount).toLocaleString('th-TH')} บาท`;
};

/**
 * Calculate round statistics
 */
const calculateRoundStats = (bets, winnerIds) => {
  const totalBets = bets.reduce((sum, b) => sum + b.amount, 0);
  const winningBets = bets.filter((b) => winnerIds.includes(b.userId));
  const losingBets = bets.filter((b) => !winnerIds.includes(b.userId));

  return {
    totalBets,
    totalBetCount: bets.length,
    winnerCount: winningBets.length,
    loserCount: losingBets.length,
    totalWinningAmount: winningBets.reduce((sum, b) => sum + b.amount, 0),
    totalLosingAmount: losingBets.reduce((sum, b) => sum + b.amount, 0),
    averageBetAmount: Math.round((totalBets / bets.length) * 100) / 100,
  };
};

module.exports = {
  calculateEqualDistribution,
  calculateProportionalDistribution,
  calculateWithOdds,
  formatCurrency,
  calculateRoundStats,
};
