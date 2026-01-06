const express = require('express');
const logger = require('../utils/logger');
const BettingSummaryService = require('../services/betting/bettingSummaryService');

const router = express.Router();

// Initialize betting summary service
const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
const bettingSummaryService = new BettingSummaryService(spreadsheetId);

/**
 * GET /api/betting/summary
 * Get daily betting summary
 */
router.get('/summary', async (req, res) => {
  try {
    const { date } = req.query;

    logger.info('Fetching daily betting summary', { date });

    const result = await bettingSummaryService.generateDailySummary(date);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    const formattedSummary = bettingSummaryService.formatSummaryForDisplay(
      result.summary,
      'daily'
    );

    res.json({
      success: true,
      summary: result.summary,
      formatted: formattedSummary,
    });
  } catch (error) {
    logger.error('Error fetching daily betting summary:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
    });
  }
});

/**
 * GET /api/betting/summary/player/:playerName
 * Get player betting summary
 */
router.get('/summary/player/:playerName', async (req, res) => {
  try {
    const { playerName } = req.params;
    const { date } = req.query;

    logger.info('Fetching player betting summary', { playerName, date });

    const result = await bettingSummaryService.generatePlayerSummary(playerName, date);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    const formattedSummary = bettingSummaryService.formatSummaryForDisplay(
      result.summary,
      'player'
    );

    res.json({
      success: true,
      summary: result.summary,
      formatted: formattedSummary,
    });
  } catch (error) {
    logger.error('Error fetching player betting summary:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
    });
  }
});

/**
 * GET /api/betting/summary/stadium/:stadium
 * Get stadium betting summary
 */
router.get('/summary/stadium/:stadium', async (req, res) => {
  try {
    const { stadium } = req.params;
    const { date } = req.query;

    logger.info('Fetching stadium betting summary', { stadium, date });

    const result = await bettingSummaryService.generateStadiumSummary(stadium, date);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    const formattedSummary = bettingSummaryService.formatSummaryForDisplay(
      result.summary,
      'stadium'
    );

    res.json({
      success: true,
      summary: result.summary,
      formatted: formattedSummary,
    });
  } catch (error) {
    logger.error('Error fetching stadium betting summary:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
    });
  }
});

/**
 * GET /api/betting/records
 * Get all betting records for a date
 */
router.get('/records', async (req, res) => {
  try {
    const { date } = req.query;

    logger.info('Fetching betting records', { date });

    const BettingRecordService = require('../services/betting/bettingRecordService');
    const bettingRecordService = new BettingRecordService(spreadsheetId);

    const result = await bettingRecordService.getBettingRecordsByDate(date);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      records: result.records,
      count: result.count,
    });
  } catch (error) {
    logger.error('Error fetching betting records:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
    });
  }
});

/**
 * POST /api/betting/submit-results
 * Submit betting results and send to group/user
 */
router.post('/submit-results', async (req, res) => {
  try {
    const { results, groupSelect, notes, userId, groupId } = req.body;

    // Validate input
    if (!results || !Array.isArray(results) || results.length === 0) {
      logger.warn('Invalid results data', { results });
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลผลลัพธ์ไม่ถูกต้อง',
      });
    }

    if (!groupSelect || !['group', 'user'].includes(groupSelect)) {
      logger.warn('Invalid groupSelect', { groupSelect });
      return res.status(400).json({
        success: false,
        error: 'กรุณาเลือกห้องแชท',
      });
    }

    if (!userId) {
      logger.warn('Missing userId');
      return res.status(400).json({
        success: false,
        error: 'ไม่พบ userId',
      });
    }

    logger.info('Submitting betting results', {
      resultCount: results.length,
      groupSelect,
      userId,
    });

    const { client } = require('../config/line');
    const ResultUpdateService = require('../services/betting/resultUpdateService');
    const resultUpdateService = new ResultUpdateService(spreadsheetId);

    // Prepare data for update
    const recordsToUpdate = [];
    results.forEach(r => {
      if (r.records && Array.isArray(r.records)) {
        r.records.forEach(record => {
          recordsToUpdate.push({
            playerName: record.lineName || record.playerName,
            stadium: r.stadium,
            amount: record.amount,
            result: r.result
          });
        });
      }
    });

    if (recordsToUpdate.length === 0) {
      logger.warn('No records to update', { results });
      return res.status(400).json({
        success: false,
        error: 'ไม่มีข้อมูลการแทงที่จะบันทึก',
      });
    }

    logger.info('Records to update:', { recordsToUpdate });

    // Update betting results
    const updateResult = await resultUpdateService.updateBettingResults(recordsToUpdate);

    if (!updateResult.success) {
      logger.error('Failed to update results:', updateResult);
      return res.status(400).json({
        success: false,
        error: updateResult.error,
      });
    }

    // Send result summary to group or user
    if (groupSelect === 'group' && groupId) {
      // Send to group
      const message = {
        type: 'text',
        text: `✅ ผลลัพธ์แข่งขันได้รับการบันทึกแล้ว\n\n${updateResult.message || ''}${notes ? `\n\nหมายเหตุ: ${notes}` : ''}`,
      };

      try {
        await client.pushMessage(groupId, message);
        logger.info('Results sent to group', { groupId });
      } catch (error) {
        logger.warn('Could not send message to group:', error);
      }
    } else if (groupSelect === 'user' && userId) {
      // Send to user 1-on-1
      const message = {
        type: 'text',
        text: `✅ ผลลัพธ์แข่งขันได้รับการบันทึกแล้ว\n\n${updateResult.message || ''}${notes ? `\n\nหมายเหตุ: ${notes}` : ''}`,
      };

      try {
        await client.pushMessage(userId, message);
        logger.info('Results sent to user', { userId });
      } catch (error) {
        logger.warn('Could not send message to user:', error);
      }
    }

    res.json({
      success: true,
      message: 'ส่งผลลัพธ์สำเร็จ',
      updatedCount: recordsToUpdate.length,
    });
  } catch (error) {
    logger.error('Error submitting betting results:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการส่งข้อมูล',
    });
  }
});

module.exports = router;
