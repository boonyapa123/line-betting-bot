const { client } = require('../config/line');
const { extractUserInfo } = require('../utils/lineUserExtractor');
const { recordCancellation, updateBetStatusToCancelled } = require('../services/googleSheetsDatabaseService');
const logger = require('../utils/logger');

// Store recent messages for tracking deletions
const messageHistory = new Map();

/**
 * Store message for tracking
 */
const storeMessage = (messageId, event) => {
  messageHistory.set(messageId, {
    text: event.message.text,
    userId: event.source.userId,
    timestamp: new Date(event.timestamp),
    sourceType: event.source.type,
    sourceId: event.source.groupId || event.source.roomId || event.source.userId,
  });

  // Keep only last 1000 messages
  if (messageHistory.size > 1000) {
    const firstKey = messageHistory.keys().next().value;
    messageHistory.delete(firstKey);
  }
};

/**
 * Handle message delete event
 */
const handleMessageDelete = async (event) => {
  try {
    const deletedMessageId = event.unsend.messageId;
    const storedMessage = messageHistory.get(deletedMessageId);

    if (!storedMessage) {
      logger.warn(`Deleted message not found in history: ${deletedMessageId}`);
      return;
    }

    // Get user info
    const userInfo = await extractUserInfo(event);

    // Calculate time difference
    const now = new Date();
    const timeDiff = Math.floor((now - storedMessage.timestamp) / 1000);
    let timeText = '';

    if (timeDiff < 60) {
      timeText = `${timeDiff} วินาทีที่แล้ว`;
    } else if (timeDiff < 3600) {
      timeText = `${Math.floor(timeDiff / 60)} นาทีที่แล้ว`;
    } else {
      timeText = `${Math.floor(timeDiff / 3600)} ชั่วโมงที่แล้ว`;
    }

    // Format original message time
    const originalTime = storedMessage.timestamp.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Create notification message
    const notificationMessage = `❌[ พบการยกเลิกข้อความ ]❌\n\n` +
      `•ผู้ยกเลิก: ${userInfo.lineName}\n` +
      `•ยกเลิกเมื่อ: ${timeText}\n` +
      `•ข้อความ: ${storedMessage.text}\n` +
      `•เวลา: ${originalTime} ที่ยกเลิก\n\n` +
      `xxxxxxxxxx`;

    // Update bet status to cancelled in Bets sheet
    const updateResult = await updateBetStatusToCancelled(storedMessage.text);
    if (updateResult.success) {
      logger.info('Bet status updated to cancelled in Bets sheet');
    } else {
      logger.warn('Failed to update bet status', updateResult.error);
    }

    // Record cancellation to Google Sheets
    const cancelResult = await recordCancellation(
      userInfo.userId,
      userInfo.lineName,
      storedMessage.text,
      originalTime
    );

    if (cancelResult.success) {
      logger.info('Cancellation recorded to Google Sheets');
    } else {
      logger.warn('Failed to record cancellation to Google Sheets', cancelResult.error);
    }

    // Send notification to group
    if (storedMessage.sourceType === 'group') {
      await client.pushMessage(storedMessage.sourceId, {
        type: 'text',
        text: notificationMessage,
      });
    } else if (storedMessage.sourceType === 'room') {
      await client.pushMessage(storedMessage.sourceId, {
        type: 'text',
        text: notificationMessage,
      });
    }

    logger.info(`Message deletion detected: ${storedMessage.text} by ${userInfo.lineName}`);

    // Remove from history
    messageHistory.delete(deletedMessageId);
  } catch (error) {
    logger.error('Error handling message delete', error);
  }
};

module.exports = {
  storeMessage,
  handleMessageDelete,
};
