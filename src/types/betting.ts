// Betting System Types

export interface BettingRecord {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // HH:MM:SS
  playerName: string;
  playerId: string;
  groupId: string;
  amount: number;
  fireworks: string;
  stadium: string;
  result: 'win' | 'loss' | 'pending';
  status: 'active' | 'archived';
  createdAt: number;
  updatedAt: number;
}

export interface BettingEvent {
  id: string;
  date: string;
  stadium: string;
  fireworks: string;
  price: number;
  roomLink?: string;
  note?: string;
  adminId: string;
  status: 'open' | 'closed' | 'completed';
  createdAt: number;
}

export interface PlayerBettingData {
  playerName: string;
  amount: number;
  fireworks: string;
  stadium: string;
}

export interface BettingSummary {
  date: string;
  totalAmount: number;
  totalBets: number;
  byPlayer: PlayerSummary[];
  byStadium: StadiumSummary[];
}

export interface PlayerSummary {
  playerName: string;
  playerId: string;
  totalAmount: number;
  betCount: number;
  wins: number;
  losses: number;
  pending: number;
}

export interface StadiumSummary {
  stadium: string;
  fireworks: string;
  totalAmount: number;
  betCount: number;
  wins: number;
  losses: number;
  pending: number;
}

export interface ParsedBettingMessage {
  success: boolean;
  data?: PlayerBettingData;
  error?: string;
  missingFields?: string[];
}
