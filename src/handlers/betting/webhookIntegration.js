const logger = require('../../utils/logger');
const PlayerBettingHandler = require('./playerBettingHandler');
const AdminCommandHandler = require('./adminCommandHandler');

/**
 * Webhook Integration
 * Integrates betting handlers with main webhook
 */
class WebhookIntegration {
  constructor(spreadsheetId, liffId) {
    this.spreadsheetId = spreadsheetId;
    this.liffId = liffId;
    this.playerBettingHandler = new PlayerBettingHandler(spreadsheetId);
    this.adminCommandHandler = new AdminCommandHandler(spreadsheetId, liffId);
  }

  /**
   * Handle webhook event
   */
  async handleEvent(event) {
    try {
      const { source, message } = event;

      // Check if it's a text message
      if (message.type !== 'text') {
        return;
      }

      const { text } = message;

      logger.info('Processing webhook event', {
        sourceType: source.type,
        messageText: text,
      });

      // Check if it's from 1-on-1 chat (admin command)
      if (source.type === 'user' || source.type === 'room') {
        // Check if it's an admin command
        if (AdminCommandHandler.isAdminCommand(text)) {
          logger.info('Detected admin command', { sourceType: source.type });
          await this.adminCommandHandler.handleAdminCommand(event);
        }
      }
      // Check if it's from group chat (player betting)
      else if (source.type === 'group') {
        // Check if it's a betting message
        if (PlayerBettingHandler.isBettingMessage(text)) {
          logger.info('Detected betting message');
          await this.playerBettingHandler.handleBettingMessage(event);
        }
      }
    } catch (error) {
      logger.error('Error handling webhook event:', error);
    }
  }

  /**
   * Handle multiple events
   */
  async handleEvents(events) {
    try {
      logger.info('Processing multiple webhook events', { count: events.length });

      for (const event of events) {
        try {
          await this.handleEvent(event);
        } catch (error) {
          logger.error('Error handling individual event:', error);
          // Continue processing other events
        }
      }

      logger.info('Finished processing webhook events');
    } catch (error) {
      logger.error('Error handling multiple events:', error);
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
}

module.exports = WebhookIntegration;
