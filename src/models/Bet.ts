/**
 * Bet Model - บันทึกการแทงของผู้เล่น
 */

import mongoose, { Schema, Document } from 'mongoose';
import { IBet } from '../types/models';

export interface IBetDocument extends IBet, Document {}

const BetSchema = new Schema<IBetDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    lineName: {
      type: String,
      required: true,
    },
    venue: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    roundId: {
      type: Schema.Types.ObjectId,
      ref: 'BettingRound',
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    result: {
      type: String,
      enum: ['win', 'lose', 'pending'],
      default: 'pending',
    },
    groupId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
BetSchema.index({ groupId: 1, timestamp: -1 });
BetSchema.index({ groupId: 1, venue: 1, timestamp: -1 });
BetSchema.index({ groupId: 1, userId: 1, timestamp: -1 });

export const Bet = mongoose.model<IBetDocument>('Bet', BetSchema);

/**
 * Bet Repository - Data access layer
 */
export class BetRepository {
  /**
   * Create a new bet
   */
  static async create(betData: IBet): Promise<IBetDocument> {
    const bet = new Bet(betData);
    return await bet.save();
  }

  /**
   * Find bet by ID
   */
  static async findById(id: string): Promise<IBetDocument | null> {
    return await Bet.findById(id);
  }

  /**
   * Find all bets by user
   */
  static async findByUser(
    userId: string,
    groupId: string
  ): Promise<IBetDocument[]> {
    return await Bet.find({ userId, groupId }).sort({ timestamp: -1 });
  }

  /**
   * Find all bets by venue
   */
  static async findByVenue(
    venue: string,
    groupId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<IBetDocument[]> {
    const query: any = { venue, groupId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    return await Bet.find(query).sort({ timestamp: -1 });
  }

  /**
   * Find all bets by round
   */
  static async findByRound(roundId: string): Promise<IBetDocument[]> {
    return await Bet.find({ roundId }).sort({ timestamp: -1 });
  }

  /**
   * Find all bets in date range
   */
  static async findByDateRange(
    groupId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IBetDocument[]> {
    return await Bet.find({
      groupId,
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ timestamp: -1 });
  }

  /**
   * Find all bets by group and date
   */
  static async findByGroupAndDate(
    groupId: string,
    date: Date
  ): Promise<IBetDocument[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await Bet.find({
      groupId,
      timestamp: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    }).sort({ timestamp: -1 });
  }

  /**
   * Update bet result
   */
  static async updateResult(
    id: string,
    result: 'win' | 'lose' | 'pending'
  ): Promise<IBetDocument | null> {
    return await Bet.findByIdAndUpdate(
      id,
      { result },
      { new: true }
    );
  }

  /**
   * Update bet round
   */
  static async updateRound(
    id: string,
    roundId: string
  ): Promise<IBetDocument | null> {
    return await Bet.findByIdAndUpdate(
      id,
      { roundId },
      { new: true }
    );
  }

  /**
   * Delete bet
   */
  static async delete(id: string): Promise<boolean> {
    const result = await Bet.findByIdAndDelete(id);
    return result !== null;
  }

  /**
   * Get total amount by user and date
   */
  static async getTotalAmountByUser(
    userId: string,
    groupId: string,
    date: Date
  ): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await Bet.aggregate([
      {
        $match: {
          userId,
          groupId,
          timestamp: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Get total revenue by venue and date
   */
  static async getTotalRevenueByVenue(
    venue: string,
    groupId: string,
    date: Date
  ): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await Bet.aggregate([
      {
        $match: {
          venue,
          groupId,
          timestamp: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Get bets grouped by player
   */
  static async getBetsByPlayer(
    groupId: string,
    date: Date
  ): Promise<any[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await Bet.aggregate([
      {
        $match: {
          groupId,
          timestamp: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        },
      },
      {
        $group: {
          _id: '$userId',
          lineName: { $first: '$lineName' },
          totalAmount: { $sum: '$amount' },
          bets: {
            $push: {
              venue: '$venue',
              amount: '$amount',
              timestamp: '$timestamp',
            },
          },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
    ]);
  }

  /**
   * Get bets by venue and fire number
   */
  static async findByVenueAndFire(
    venue: string,
    fireNumber: string
  ): Promise<IBetDocument[]> {
    return await Bet.find({ venue }).sort({ timestamp: -1 });
  }

  /**
   * Get bets grouped by venue
   */
  static async getBetsByVenue(
    groupId: string,
    date: Date
  ): Promise<any[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await Bet.aggregate([
      {
        $match: {
          groupId,
          timestamp: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        },
      },
      {
        $group: {
          _id: '$venue',
          totalBets: { $sum: '$amount' },
          playerCount: { $addToSet: '$userId' },
        },
      },
      {
        $project: {
          venue: '$_id',
          totalBets: 1,
          playerCount: { $size: '$playerCount' },
        },
      },
      {
        $sort: { totalBets: -1 },
      },
    ]);
  }
}
