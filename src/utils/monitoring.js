const Bet = require('../models/Bet');
const BettingRound = require('../models/BettingRound');

let metrics = {
  startTime: Date.now(),
  totalBets: 0,
  totalErrors: 0,
  errors: [],
};

/**
 * Record a bet
 */
const recordBetMetric = () => {
  metrics.totalBets++;
};

/**
 * Record an error
 */
const recordError = (error) => {
  metrics.totalErrors++;
  metrics.errors.push({
    timestamp: new Date(),
    message: error.message,
  });

  // Keep only last 100 errors
  if (metrics.errors.length > 100) {
    metrics.errors.shift();
  }
};

/**
 * Get system health status
 */
const getHealthStatus = async () => {
  try {
    const uptime = Math.floor((Date.now() - metrics.startTime) / 1000);
    
    // Try to get MongoDB stats, but don't fail if MongoDB is not available
    let totalBets = 0;
    let totalRounds = 0;
    try {
      totalBets = await Bet.countDocuments();
      totalRounds = await BettingRound.countDocuments();
    } catch (mongoError) {
      console.warn('MongoDB not available for health check');
    }
    
    const errorRate = metrics.totalBets > 0 
      ? ((metrics.totalErrors / metrics.totalBets) * 100).toFixed(2)
      : 0;

    return {
      status: 'healthy',
      uptime,
      totalBets,
      totalRounds,
      totalErrors: metrics.totalErrors,
      errorRate: `${errorRate}%`,
      recentErrors: metrics.errors.slice(-5),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
};

/**
 * Reset metrics
 */
const resetMetrics = () => {
  metrics = {
    startTime: Date.now(),
    totalBets: 0,
    totalErrors: 0,
    errors: [],
  };
};

module.exports = {
  recordBetMetric,
  recordError,
  getHealthStatus,
  resetMetrics,
};
