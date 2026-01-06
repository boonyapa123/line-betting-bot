const logger = require('../../utils/logger');
const { client } = require('../../config/line');
const BettingRecordService = require('../../services/betting/bettingRecordService');

/**
 * Result Recording Handler
 * Handles result recording for betting events
 */
class ResultRecordingHandler {
  constructor(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
    this.bettingRecordService = new BettingRecordService(spreadsheetId);
  }

  /**
   * Handle result recording from LIFF form
   */
  async handleResultRecording(event) {
    try {
      const { message, source, replyToken } = event;
      const { userId, groupId } = source;

      logger.info('Processing result recording', {
        userId,
        groupId,
        message,
      });

      // Parse result data from message
      const results = this.parseResultData(message);

      if (!results || results.length === 0) {
        logger.warn('No results to record', { userId });

        await client.replyMessage(replyToken, {
          type: 'text',
          text: '❌ ไม่มีข้อมูลผลลัพธ์ที่จะบันทึก',
        });

        return;
      }

      // Update betting records with results
      const updateResults = [];
      for (const result of results) {
        const updateResult = await this.bettingRecordService.updateBettingResult(
          result.playerName,
          result.stadium,
          result.amount,
          result.result
        );

        updateResults.push({
          playerName: result.playerName,
          success: updateResult.success,
          error: updateResult.error,
        });
      }

      // Count successes and failures
      const successCount = updateResults.filter(r => r.success).length;
      const failureCount = updateResults.filter(r => !r.success).length;

      logger.info('Result recording completed', {
        userId,
        successCount,
        failureCount,
      });

      // Send confirmation message
      let confirmationText = `✅ บันทึกผลลัพธ์สำเร็จ\n`;
      confirmationText += `📊 สำเร็จ: ${successCount} รายการ\n`;
      if (failureCount > 0) {
        confirmationText += `❌ ล้มเหลว: ${failureCount} รายการ`;
      }

      await client.replyMessage(replyToken, {
        type: 'text',
        text: confirmationText,
      });

      // Send result summary to group
      await this.sendResultSummaryToGroup(groupId, results);
    } catch (error) {
      logger.error('Error handling result recording:', error);

      try {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาดในการบันทึกผลลัพธ์',
        });
      } catch (replyError) {
        logger.error('Error sending reply message:', replyError);
      }
    }
  }

  /**
   * Parse result data from message
   */
  parseResultData(message) {
    try {
      // Expect JSON format or structured text
      if (typeof message === 'string') {
        try {
          return JSON.parse(message);
        } catch (e) {
          // Try to parse as text format
          return this.parseResultText(message);
        }
      }

      return message;
    } catch (error) {
      logger.error('Error parsing result data:', error);
      return null;
    }
  }

  /**
   * Parse result text format
   * Format: "playerName stadium amount result\n..."
   */
  parseResultText(text) {
    try {
      const lines = text.split('\n').filter(line => line.trim());
      const results = [];

      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 4) {
          results.push({
            playerName: parts[0],
            stadium: parts[1],
            amount: parseInt(parts[2], 10),
            result: parts[3].toLowerCase(), // 'win' or 'loss'
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Error parsing result text:', error);
      return null;
    }
  }

  /**
   * Send result summary to group
   */
  async sendResultSummaryToGroup(groupId, results) {
    try {
      if (!groupId || !results || results.length === 0) {
        return;
      }

      // Create Flex Message for results
      const flexMessage = this.createResultFlexMessage(results);

      await client.pushMessage(groupId, flexMessage);

      logger.info('Result summary sent to group', { groupId });
    } catch (error) {
      logger.error('Error sending result summary to group:', error);
    }
  }

  /**
   * Create Flex Message for results
   */
  createResultFlexMessage(results) {
    const resultItems = results.map(result => ({
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: `${result.playerName} - ${result.stadium}`,
          weight: 'bold',
          size: 'sm',
        },
        {
          type: 'text',
          text: `${result.amount} บาท - ${result.result === 'win' ? '✅ ชนะ' : '❌ แพ้'}`,
          size: 'xs',
          color: result.result === 'win' ? '#00AA00' : '#FF0000',
        },
      ],
      spacing: 'sm',
      margin: 'md',
    }));

    return {
      type: 'flex',
      altText: '🏆 ผลลัพธ์แข่งขัน',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🏆 ผลลัพธ์แข่งขัน',
              weight: 'bold',
              size: 'lg',
            },
            {
              type: 'separator',
              margin: 'md',
            },
            ...resultItems,
          ],
          spacing: 'md',
        },
      },
    };
  }

  /**
   * Get betting events for result recording
   */
  async getBettingEventsForResultRecording(date = null) {
    try {
      logger.info('Fetching betting events for result recording', { date });

      // Get all records for the date
      const response = await this.bettingRecordService.getBettingRecordsByDate(date);

      if (!response.success) {
        return response;
      }

      // Filter pending results
      const pendingRecords = response.records.filter(r => r.result === 'pending');

      // Group by stadium and fireworks
      const events = {};
      pendingRecords.forEach(record => {
        const key = `${record.venue}-${record.message}`;
        if (!events[key]) {
          events[key] = {
            stadium: record.venue,
            fireworks: record.message,
            records: [],
          };
        }
        events[key].records.push(record);
      });

      logger.info('Betting events fetched', {
        date,
        eventCount: Object.keys(events).length,
      });

      return {
        success: true,
        events: Object.values(events),
      };
    } catch (error) {
      logger.error('Error getting betting events:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
        events: [],
      };
    }
  }
}

module.exports = ResultRecordingHandler;
