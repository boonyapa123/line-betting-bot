/**
 * Core Data Models and Interfaces
 */

/**
 * Bet Model - บันทึกการแทงของผู้เล่น
 */
export interface IBet {
  _id?: string;
  userId: string;
  lineName: string;
  venue: string;
  amount: number;
  roundId?: string;
  timestamp: Date;
  result?: 'win' | 'lose' | 'pending';
  groupId: string;
}

/**
 * Betting Round Model - รอบการแข่ง
 */
export interface IBettingRound {
  _id?: string;
  venue: string;
  fireNumber: string;
  status: 'open' | 'closed' | 'settled';
  winners: string[]; // userId array
  totalBets: number;
  totalRevenue: number;
  totalPayout: number;
  profit: number;
  createdAt: Date;
  closedAt?: Date;
  groupId: string;
}

/**
 * Venue Model - สนามแทง
 */
export interface IVenue {
  _id?: string;
  name: string;
  roomLink: string;
  paymentLink?: string;
  isActive: boolean;
  groupId: string;
}

/**
 * Admin User Model - ผู้ดูแลระบบ
 */
export interface IAdminUser {
  _id?: string;
  userId: string;
  groupId: string;
  lineName: string;
  permissions: string[];
  createdAt: Date;
}

/**
 * Chat Aggregation Model - ข้อมูลรวบรวมแชท
 */
export interface IPlayerBetSummary {
  lineName: string;
  userId: string;
  totalAmount: number;
  bets: Array<{
    venue: string;
    amount: number;
    fireNumber?: string;
    timestamp: Date;
  }>;
}

export interface IVenueBetSummary {
  venue: string;
  totalBets: number;
  playerCount: number;
  players: IPlayerBetSummary[];
}

export interface IChatAggregation {
  groupId: string;
  date: Date;
  playerSummary: IPlayerBetSummary[];
  venueSummary: IVenueBetSummary[];
  totalRevenue: number;
}

/**
 * Betting Result Model - ผลการแข่ง
 */
export interface IBettingResult {
  roundId: string;
  venue: string;
  fireNumber: string;
  winners: string[];
  losers: string[];
  totalRevenue: number;
  totalPayout: number;
  profit: number;
}

/**
 * Report Model - รายงาน
 */
export interface IReport {
  roundId: string;
  venue: string;
  fireNumber: string;
  players: Array<{
    lineName: string;
    userId: string;
    amount: number;
    result: 'win' | 'lose';
    payout?: number;
  }>;
  totalRevenue: number;
  totalPayout: number;
  profit: number;
  generatedAt: Date;
}
