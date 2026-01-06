/**
 * Integration Tests
 */

import { BetRepository } from '../models/Bet';
import { BettingRoundRepository } from '../models/BettingRound';
import { VenueRepository } from '../models/Venue';
import { AdminUserRepository } from '../models/AdminUser';
import { BettingService } from '../services/bettingService';
import { ChatAggregationService } from '../services/chatAggregationService';
import { parseBettingMessage, parseAdminCommand } from '../utils/parsers';

describe('Integration Tests', () => {
  const testGroupId = 'test-group-123';
  const testUserId = 'test-user-123';
  const testLineName = 'Test User';

  describe('Message Parsing', () => {
    test('should parse betting message correctly', () => {
      const result = parseBettingMessage('ต200');
      expect(result.isValid).toBe(true);
      expect(result.venue).toBe('ต');
      expect(result.amount).toBe(200);
    });

    test('should reject invalid betting message', () => {
      const result = parseBettingMessage('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should parse admin command correctly', () => {
      const result = parseAdminCommand('/สรุป');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('/สรุป');
    });
  });

  describe('Betting Service', () => {
    test('should record a bet', async () => {
      const betData = {
        userId: testUserId,
        lineName: testLineName,
        venue: 'ต',
        amount: 200,
        timestamp: new Date(),
        groupId: testGroupId,
      };

      const bet = await BetRepository.create(betData);
      expect(bet).toBeDefined();
      expect(bet.userId).toBe(testUserId);
      expect(bet.amount).toBe(200);
    });

    test('should get bet history', async () => {
      const bets = await BetRepository.findByUser(testUserId, testGroupId);
      expect(Array.isArray(bets)).toBe(true);
    });

    test('should calculate total amount by user', async () => {
      const total = await BetRepository.getTotalAmountByUser(
        testUserId,
        testGroupId,
        new Date()
      );
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Betting Round Service', () => {
    test('should create a betting round', async () => {
      const roundData = {
        venue: 'ต',
        fireNumber: '310-35',
        status: 'open' as const,
        winners: [],
        totalBets: 0,
        totalRevenue: 0,
        totalPayout: 0,
        profit: 0,
        createdAt: new Date(),
        groupId: testGroupId,
      };

      const round = await BettingRoundRepository.create(roundData);
      expect(round).toBeDefined();
      expect(round.venue).toBe('ต');
      expect(round.fireNumber).toBe('310-35');
    });

    test('should get open rounds', async () => {
      const rounds = await BettingRoundRepository.findOpenRounds(testGroupId);
      expect(Array.isArray(rounds)).toBe(true);
    });
  });

  describe('Venue Service', () => {
    test('should create a venue', async () => {
      const venueData = {
        name: 'ต',
        roomLink: 'https://example.com/room',
        paymentLink: 'https://example.com/payment',
        isActive: true,
        groupId: testGroupId,
      };

      const venue = await VenueRepository.create(venueData);
      expect(venue).toBeDefined();
      expect(venue.name).toBe('ต');
    });

    test('should find venue by name', async () => {
      const venue = await VenueRepository.findByName('ต', testGroupId);
      expect(venue).toBeDefined();
    });

    test('should get all active venues', async () => {
      const venues = await VenueRepository.findActiveVenues(testGroupId);
      expect(Array.isArray(venues)).toBe(true);
    });
  });

  describe('Admin User Service', () => {
    test('should create an admin user', async () => {
      const adminData = {
        userId: testUserId,
        groupId: testGroupId,
        lineName: testLineName,
        permissions: ['manage_rounds', 'view_reports'],
        createdAt: new Date(),
      };

      const admin = await AdminUserRepository.create(adminData);
      expect(admin).toBeDefined();
      expect(admin.userId).toBe(testUserId);
    });

    test('should check if user is admin', async () => {
      const isAdmin = await AdminUserRepository.isAdmin(testUserId, testGroupId);
      expect(typeof isAdmin).toBe('boolean');
    });

    test('should check user permissions', async () => {
      const hasPermission = await AdminUserRepository.hasPermission(
        testUserId,
        testGroupId,
        'manage_rounds'
      );
      expect(typeof hasPermission).toBe('boolean');
    });
  });

  describe('Chat Aggregation Service', () => {
    test('should aggregate bets by player', async () => {
      const aggregation = await ChatAggregationService.aggregateByPlayer(
        testGroupId,
        new Date()
      );
      expect(Array.isArray(aggregation)).toBe(true);
    });

    test('should aggregate bets by venue', async () => {
      const aggregation = await ChatAggregationService.aggregateByVenue(
        testGroupId,
        new Date()
      );
      expect(Array.isArray(aggregation)).toBe(true);
    });

    test('should generate daily summary', async () => {
      const summary = await ChatAggregationService.generateDailySummary(
        testGroupId,
        new Date()
      );
      expect(summary).toBeDefined();
      expect(summary.groupId).toBe(testGroupId);
      expect(Array.isArray(summary.playerSummary)).toBe(true);
      expect(Array.isArray(summary.venueSummary)).toBe(true);
    });

    test('should format summary report', async () => {
      const summary = await ChatAggregationService.generateDailySummary(
        testGroupId,
        new Date()
      );
      const report = ChatAggregationService.formatSummaryReport(summary);
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Betting Flow', () => {
    test('should complete full betting flow', async () => {
      // 1. Create venue
      const venueData = {
        name: 'ชล',
        roomLink: 'https://example.com/room',
        paymentLink: 'https://example.com/payment',
        isActive: true,
        groupId: testGroupId,
      };
      const venue = await VenueRepository.create(venueData);
      expect(venue).toBeDefined();

      // 2. Record bets
      const bet1 = await BetRepository.create({
        userId: 'user1',
        lineName: 'Player 1',
        venue: 'ชล',
        amount: 100,
        timestamp: new Date(),
        groupId: testGroupId,
      });

      const bet2 = await BetRepository.create({
        userId: 'user2',
        lineName: 'Player 2',
        venue: 'ชล',
        amount: 200,
        timestamp: new Date(),
        groupId: testGroupId,
      });

      expect(bet1).toBeDefined();
      expect(bet2).toBeDefined();

      // 3. Create betting round
      const round = await BettingRoundRepository.create({
        venue: 'ชล',
        fireNumber: '320-50',
        status: 'open',
        winners: [],
        totalBets: 0,
        totalRevenue: 0,
        totalPayout: 0,
        profit: 0,
        createdAt: new Date(),
        groupId: testGroupId,
      });

      expect(round).toBeDefined();

      // 4. Set winners
      const winners = ['user1'];
      await BettingRoundRepository.setWinners(round._id!, winners);

      // 5. Generate report
      const updatedRound = await BettingRoundRepository.findById(round._id!);
      expect(updatedRound?.winners).toContain('user1');

      // 6. Get aggregation
      const aggregation = await ChatAggregationService.generateDailySummary(
        testGroupId,
        new Date()
      );

      expect(aggregation.playerSummary.length).toBeGreaterThan(0);
      expect(aggregation.totalRevenue).toBeGreaterThan(0);
    });
  });
});
