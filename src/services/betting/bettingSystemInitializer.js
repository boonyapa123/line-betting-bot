const logger = require('../../utils/logger');
const ScheduledTaskService = require('./scheduledTaskService');
const PlayerBettingHandler = require('../../handlers/betting/playerBettingHandler');
const AdminCommandHandler = require('../../handlers/betting/adminCommandHandler');

/**
 * Betting System Initializer
 * Initializes all betting system components on app startup
 */
class BettingSystemInitializer {
  constructor(spreadsheetId, liffId) {
    this.spreadsheetId = spreadsheetId;
    this.liffId = liffId;
    this.scheduledTaskService = null;
    this.playerBettingHandler = null;
    this.adminCommandHandler = null;
  }

  /**
   * Initialize betting system
   */
  async initialize() {
    try {
      logger.info('Initializing betting system');

      // Initialize scheduled tasks
      this.scheduledTaskService = new ScheduledTaskService(this.spreadsheetId);
      const scheduledTasksResult = await this.scheduledTaskService.initialize();

      if (!scheduledTasksResult.success) {
        logger.error('Failed to initialize scheduled tasks:', scheduledTasksResult.error);
        // Continue anyway, don't fail the whole initialization
      } else {
        logger.info('Scheduled tasks initialized successfully');
      }

      // Initialize handlers
      this.playerBettingHandler = new PlayerBettingHandler(this.spreadsheetId);
      this.adminCommandHandler = new AdminCommandHandler(this.spreadsheetId, this.liffId);

      logger.info('Betting system handlers initialized');

      logger.info('Betting system initialized successfully');

      return {
        success: true,
        message: 'Betting system initialized successfully',
        components: {
          scheduledTasks: scheduledTasksResult.success,
          playerBettingHandler: true,
          adminCommandHandler: true,
        },
      };
    } catch (error) {
      logger.error('Error initializing betting system:', error);
      return {
        success: false,
        error: 'Failed to initialize betting system',
      };
    }
  }

  /**
   * Get betting system status
   */
  getStatus() {
    try {
      const status = {
        initialized: true,
        scheduledTasks: this.scheduledTaskService ? this.scheduledTaskService.getTasksStatus() : null,
        handlers: {
          playerBettingHandler: !!this.playerBettingHandler,
          adminCommandHandler: !!this.adminCommandHandler,
        },
      };

      return {
        success: true,
        status,
      };
    } catch (error) {
      logger.error('Error getting betting system status:', error);
      return {
        success: false,
        error: 'Failed to get betting system status',
      };
    }
  }

  /**
   * Shutdown betting system
   */
  async shutdown() {
    try {
      logger.info('Shutting down betting system');

      if (this.scheduledTaskService) {
        const stopResult = this.scheduledTaskService.stopAllTasks();
        if (stopResult.success) {
          logger.info('Scheduled tasks stopped');
        }
      }

      logger.info('Betting system shut down successfully');

      return {
        success: true,
        message: 'Betting system shut down successfully',
      };
    } catch (error) {
      logger.error('Error shutting down betting system:', error);
      return {
        success: false,
        error: 'Failed to shut down betting system',
      };
    }
  }

  /**
   * Get player betting handler
   */
  getPlayerBettingHandler() {
    return this.playerBettingHandler;
  }

  /**
   * Get admin command handler
   */
  getAdminCommandHandler() {
    return this.adminCommandHandler;
  }

  /**
   * Get scheduled task service
   */
  getScheduledTaskService() {
    return this.scheduledTaskService;
  }
}

module.exports = BettingSystemInitializer;
