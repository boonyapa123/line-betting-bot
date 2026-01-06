const { client } = require('../config/line');
const { parseAdminCommand } = require('../utils/messageParser');
const { closeRound, settleRound } = require('../services/roundService');
const { addVenue } = require('../services/venueService');
const { generateRoundReport } = require('../services/reportService');
const logger = require('../utils/logger');

/**
 * Handle admin commands
 */
const handleAdminCommand = async (event) => {
  try {
    const userId = event.source.userId;

    const messageText = event.message.text;
    const parseResult = parseAdminCommand(messageText);

    if (!parseResult.isValid) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '❌ คำสั่งไม่ถูกต้อง\n\nคำสั่งที่ใช้ได้:\n' +
          '- ปิดรอบ [roundId]\n' +
          '- ประกาศผู้ชนะ [roundId] [userId1,userId2,...]\n' +
          '- เพิ่มสนาม [name] [roomLink]\n' +
          '- รายงาน [roundId]',
      });
      return;
    }

    // Route to appropriate handler
    switch (parseResult.command) {
      case 'closeRound':
        await handleCloseRound(event, messageText);
        break;
      case 'setWinner':
        await handleSetWinner(event, messageText);
        break;
      case 'addVenue':
        await handleAddVenue(event, messageText);
        break;
      case 'getReport':
        await handleGetReport(event, messageText);
        break;
      default:
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ คำสั่งไม่รู้จัก',
        });
    }
  } catch (error) {
    console.error('Error handling admin command:', error);
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่',
    });
  }
};

/**
 * Handle close round command
 */
const handleCloseRound = async (event, messageText) => {
  try {
    // Extract roundId from message
    const parts = messageText.split(' ');
    const roundId = parts[1];

    if (!roundId) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '❌ กรุณาระบุ roundId\n\nตัวอย่าง: ปิดรอบ 507f1f77bcf86cd799439011',
      });
      return;
    }

    const result = await closeRound(roundId);

    if (!result.success) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `❌ ${result.error}`,
      });
      return;
    }

    // Notify admins
    // await notifyRoundClosed({
    //   ...result.round,
    //   userId: event.source.userId,
    // });

    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `✅ ปิดรอบการแข่งสำเร็จ\n\n` +
        `สนาม: ${result.round.venue}\n` +
        `บั้งไฟ: ${result.round.fireNumber}\n` +
        `สถานะ: ${result.round.status}`,
    });

    logger.info('Round closed', result.round);
  } catch (error) {
    logger.error('Error closing round', error);
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ ไม่สามารถปิดรอบได้',
    });
  }
};

/**
 * Handle set winner command
 */
const handleSetWinner = async (event, messageText) => {
  try {
    // Extract roundId and winner userIds
    const parts = messageText.split(' ');
    const roundId = parts[1];
    const winnerIds = parts[2]?.split(',') || [];

    if (!roundId || winnerIds.length === 0) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '❌ กรุณาระบุ roundId และ userIds\n\n' +
          'ตัวอย่าง: ประกาศผู้ชนะ 507f1f77bcf86cd799439011 userId1,userId2',
      });
      return;
    }

    const result = await settleRound(roundId, winnerIds);

    if (!result.success) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `❌ ${result.error}`,
      });
      return;
    }

    // Notify admins
    // await notifyRoundSettled({
    //   ...result.round,
    //   userId: event.source.userId,
    // });

    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `✅ ประกาศผู้ชนะสำเร็จ\n\n` +
        `สนาม: ${result.round.venue}\n` +
        `บั้งไฟ: ${result.round.fireNumber}\n` +
        `จำนวนผู้ชนะ: ${result.round.winnerCount}\n` +
        `ยอดรายรับ: ${result.round.totalRevenue} บาท\n` +
        `ยอดจ่าย: ${result.round.totalPayout} บาท\n` +
        `กำไร: ${result.round.profit} บาท`,
    });

    logger.info('Round settled', result.round);
  } catch (error) {
    logger.error('Error setting winner', error);
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ ไม่สามารถประกาศผู้ชนะได้',
    });
  }
};

/**
 * Handle add venue command
 */
const handleAddVenue = async (event, messageText) => {
  try {
    // Extract venue name and room link
    const parts = messageText.split(' ');
    const venueName = parts[1];
    const roomLink = parts[2];

    if (!venueName || !roomLink) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '❌ กรุณาระบุชื่อสนามและลิงค์ห้องแทง\n\n' +
          'ตัวอย่าง: เพิ่มสนาม ต https://example.com/room',
      });
      return;
    }

    const result = await addVenue(venueName, roomLink);

    if (!result.success) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `❌ ${result.error}`,
      });
      return;
    }

    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `✅ เพิ่มสนามสำเร็จ\n\n` +
        `ชื่อสนาม: ${result.venue.name}\n` +
        `ลิงค์ห้องแทง: ${result.venue.roomLink}`,
    });
  } catch (error) {
    console.error('Error adding venue:', error);
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ ไม่สามารถเพิ่มสนามได้',
    });
  }
};

/**
 * Handle get report command
 */
const handleGetReport = async (event, messageText) => {
  try {
    // Extract roundId
    const parts = messageText.split(' ');
    const roundId = parts[1];

    if (!roundId) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '❌ กรุณาระบุ roundId\n\nตัวอย่าง: รายงาน 507f1f77bcf86cd799439011',
      });
      return;
    }

    const result = await generateRoundReport(roundId);

    if (!result.success) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `❌ ${result.error}`,
      });
      return;
    }

    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: result.report,
    });

    logger.info('Report generated', { roundId });
  } catch (error) {
    logger.error('Error getting report', error);
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ ไม่สามารถสร้างรายงานได้',
    });
  }
};

module.exports = {
  handleAdminCommand,
};
