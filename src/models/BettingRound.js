const mongoose = require('mongoose');

const bettingRoundSchema = new mongoose.Schema({
  venue: {
    type: String,
    required: true,
  },
  fireNumber: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'settled'],
    default: 'open',
  },
  winners: [
    {
      type: String,
    },
  ],
  totalBets: {
    type: Number,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
  totalPayout: {
    type: Number,
    default: 0,
  },
  profit: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  closedAt: {
    type: Date,
  },
});

module.exports = mongoose.model('BettingRound', bettingRoundSchema);
