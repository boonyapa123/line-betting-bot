const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  lineName: {
    type: String,
    required: true,
  },
  venue: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  roundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BettingRound',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  result: {
    type: String,
    enum: ['win', 'lose', 'pending'],
    default: 'pending',
  },
});

module.exports = mongoose.model('Bet', betSchema);
