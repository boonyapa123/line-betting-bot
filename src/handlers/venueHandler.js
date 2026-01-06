const { client } = require('../config/line');
const { parseVenueSelection } = require('../utils/messageParser');
const { replyWithVenueLink, sendAvailableVenues } = require('../services/linkService');

/**
 * Handle venue selection request
 */
const handleVenueSelection = async (event) => {
  try {
    const messageText = event.message.text;

    // Check if user wants to see all venues
    if (messageText.toLowerCase().includes('รายชื่อสนาม') || 
        messageText.toLowerCase().includes('list venues')) {
      const sourceId = event.source.groupId || event.source.roomId || event.source.userId;
      await sendAvailableVenues(sourceId);
      return;
    }

    // Parse venue selection
    const parseResult = parseVenueSelection(messageText);

    if (!parseResult.isValid) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `❌ ${parseResult.error}\n\nพิมพ์ "รายชื่อสนาม" เพื่อดูสนามทั้งหมด`,
      });
      return;
    }

    // Send venue link
    await replyWithVenueLink(event.replyToken, parseResult.venue);
  } catch (error) {
    console.error('Error handling venue selection:', error);
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่',
    });
  }
};

module.exports = {
  handleVenueSelection,
};
