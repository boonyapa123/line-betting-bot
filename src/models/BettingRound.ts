/**
 * BettingRound Model - รอบการแข่ง
 */

import mongoose, { Schema, Document } from 'mongoose';
import { IBettingRound } from '../types/models';

export interface IBettingRoundDocument extends IBettingRound, Document {}

const BettingRoundSchema = new Schema<IBettingRoundDocument>(
  {
    venue: {
      type: String,
      required: true,
      index: true,
    },
    fireNumber: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'settled'],
      default: 'open',
      index: true,
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
      index: true,
    },
    closedAt: {
      type: Date,
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
BettingRoundSchema.index({ groupId: 1, createdAt: -1 });
BettingRoundSchema.index({ groupId: 1, venue: 1, createdAt: -1 });
BettingRoundSchema.index({ groupId: 1, status: 1 });

export const BettingRound = mongoose.model<IBettingRoundDocument>(
  'BettingRound',
  BettingRoundSchema
);

/**
 * BettingRound Repository - Data access layer
 */
export class BettingRoundRepository {
  /**
   * Create a new betting round
   */
  static async create(roundData: IBettingRound): Promise<IBettingRoundDocument> {
    const round = new BettingRound(roundData);
    return await round.save();
  }

  /**
   * Find round by ID
   */
  static async findById(id: string): Promise<IBettingRoundDocument | null> {
    return await BettingRound.findById(id);
  }

  /**
   * Find all rounds by group
   */
  static async findByGroup(groupId: string): Promise<IBettingRoundDocument[]> {
    return await BettingRound.find({ groupId }).sort({ createdAt: -1 });
  }

  /**
   * Find all open rounds
   */
  static async findOpenRounds(groupId: string): Promise<IBettingRoundDocument[]> {
    return await BettingRound.find({ groupId, status: 'open' }).sort({
      createdAt: -1,
    });
  }

  /**
   * Find all closed rounds
   */
  static async findClosedRounds(groupId: string): Promise<IBettingRoundDocument[]> {
    return await BettingRound.find({ groupId, status: 'closed' }).sort({
      createdAt: -1,
    });
  }

  /**
   * Find rounds by venue
   */
  static async findByVenue(
    venue: string,
    groupId: string
  ): Promise<IBettingRoundDocument[]> {
    return await BettingRound.find({ venue, groupId }).sort({ createdAt: -1 });
  }

  /**
   * Find rounds by date range
   */
  static async findByDateRange(
    groupId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IBettingRoundDocument[]> {
    return await BettingRound.find({
      groupId,
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ createdAt: -1 });
  }

  /**
   * Update round status
   */
  static async updateStatus(
    id: string,
    status: 'open' | 'closed' | 'settled'
  ): Promise<IBettingRoundDocument | null> {
    const updateData: any = { status };

    if (status === 'closed') {
      updateData.closedAt = new Date();
    }

    return await BettingRound.findByIdAndUpdate(id, updateData, { new: true });
  }

  /**
   * Set winners
   */
  static async setWinners(
    id: string,
    winners: string[]
  ): Promise<IBettingRoundDocument | null> {
    return await BettingRound.findByIdAndUpdate(
      id,
      { winners },
      { new: true }
    );
  }

  /**
   * Update financial data
   */
  static async updateFinancials(
    id: string,
    totalBets: number,
    totalRevenue: number,
    totalPayout: number,
    profit: number
  ): Promise<IBettingRoundDocument | null> {
    return await BettingRound.findByIdAndUpdate(
      id,
      {
        totalBets,
        totalRevenue,
        totalPayout,
        profit,
      },
      { new: true }
    );
  }

  /**
   * Delete round
   */
  static async delete(id: string): Promise<boolean> {
    const result = await BettingRound.findByIdAndDelete(id);
    return result !== null;
  }

  /**
   * Get total profit by group
   */
  static async getTotalProfit(groupId: string): Promise<number> {
    const result = await BettingRound.aggregate([
      {
        $match: { groupId, status: 'settled' },
      },
      {
        $group: {
          _id: null,
          totalProfit: { $sum: '$profit' },
        },
      },
    ]);

    return result.length > 0 ? result[0].totalProfit : 0;
  }

  /**
   * Get statistics by venue
   */
  static async getVenueStatistics(
    groupId: string
  ): Promise<any[]> {
    return await BettingRound.aggregate([
      {
        $match: { groupId, status: 'settled' },
      },
      {
        $group: {
          _id: '$venue',
          totalRounds: { $sum: 1 },
          totalRevenue: { $sum: '$totalRevenue' },
          totalPayout: { $sum: '$totalPayout' },
          totalProfit: { $sum: '$profit' },
        },
      },
      {
        $sort: { totalProfit: -1 },
      },
    ]);
  }

  /**
   * Get recent rounds
   */
  static async getRecentRounds(
    groupId: string,
    limit: number = 10
  ): Promise<IBettingRoundDocument[]> {
    return await BettingRound.find({ groupId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}
