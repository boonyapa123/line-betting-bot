const logger = require('../../utils/logger');
const cron = require('node-cron');
const DailyDataClearingService = require('./dailyDataClearingService');

/**
 * Scheduled Task Service
 * Manages scheduled tasks for betting system
 */
class ScheduledTaskService {
  constructor(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
    this.dailyDataClearingService = new DailyDataClearingService(spreadsheetId);
    this.tasks = [];
  }

  /**
   * Initialize scheduled tasks
   */
  async initialize() {
    try {
      logger.info('Initializing scheduled tasks');

      // Schedule daily data clearing at 19:00 (7 PM)
      this.scheduleDailyDataClearing();

      logger.info('Scheduled tasks initialized successfully');

      return {
        success: true,
        message: 'Scheduled tasks initialized',
      };
    } catch (error) {
      logger.error('Error initializing scheduled tasks:', error);
      return {
        success: false,
        error: 'Failed to initialize scheduled tasks',
      };
    }
  }

  /**
   * Schedule daily data clearing at 19:00
   */
  scheduleDailyDataClearing() {
    try {
      // Cron expression: 0 19 * * * (19:00 every day)
      const task = cron.schedule('0 19 * * *', async () => {
        logger.info('Running scheduled daily data clearing task');

        try {
          const result = await this.dailyDataClearingService.clearDailyData();

          if (result.success) {
            logger.info('Daily data clearing completed successfully', result);
          } else {
            logger.error('Daily data clearing failed:', result.error);
          }
        } catch (error) {
          logger.error('Error in daily data clearing task:', error);
        }
      });

      this.tasks.push({
        name: 'dailyDataClearing',
        schedule: '0 19 * * *',
        task,
      });

      logger.info('Daily data clearing task scheduled for 19:00');
    } catch (error) {
      logger.error('Error scheduling daily data clearing:', error);
    }
  }

  /**
   * Stop all scheduled tasks
   */
  stopAllTasks() {
    try {
      logger.info('Stopping all scheduled tasks');

      this.tasks.forEach(({ task, name }) => {
        task.stop();
        logger.info(`Stopped task: ${name}`);
      });

      this.tasks = [];

      logger.info('All scheduled tasks stopped');

      return {
        success: true,
        message: 'All scheduled tasks stopped',
      };
    } catch (error) {
      logger.error('Error stopping scheduled tasks:', error);
      return {
        success: false,
        error: 'Failed to stop scheduled tasks',
      };
    }
  }

  /**
   * Get scheduled tasks status
   */
  getTasksStatus() {
    return {
      success: true,
      tasks: this.tasks.map(({ name, schedule }) => ({
        name,
        schedule,
        status: 'running',
      })),
      count: this.tasks.length,
    };
  }

  /**
   * Manually trigger daily data clearing
   */
  async triggerDailyDataClearing() {
    try {
      logger.info('Manually triggering daily data clearing');

      const result = await this.dailyDataClearingService.clearDailyData();

      return result;
    } catch (error) {
      logger.error('Error triggering daily data clearing:', error);
      return {
        success: false,
        error: 'Failed to trigger daily data clearing',
      };
    }
  }
}

module.exports = ScheduledTaskService;
