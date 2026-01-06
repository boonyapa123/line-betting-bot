const { client } = require('../config/line');
const { sendPaymentLink } = require('../services/linkService');
const logger = require('../utils/logger');

/**
 * Handle payment link request
 */
const handlePaymentRequest = async (event) => {
  try {
    const messageText = event.message.text.toLowerCase();
    const sourceId = event.source.groupId || event.source.roomId || event.source.userId;

    // Check if user is requesting payment link
    if (messageText.includes('ชำระเงิน') || messageText.includes('payment')) {
      // Get payment link from environment or database
      const paymentLink = process.env.PAYMENT_LINK || 'https://example.com/payment';

      const result = await sendPaymentLink(sourceId, paymentLink, 'ทั่วไป');

      if (!result.success) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `❌ ${result.error}`,
        });
        return;
      }

      logger.info('Payment link sent', { sourceId });
    }
  } catch (error) {
    logger.error('Error handling payment request', error);
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่',
    });
  }
};

/**
 * Send payment link to group
 */
const sendPaymentToGroup = async (groupId, paymentLink, paymentMethod = 'ทั่วไป') => {
  try {
    const result = await sendPaymentLink(groupId, paymentLink, paymentMethod);

    if (!result.success) {
      logger.error('Failed to send payment link', result.error);
      return {
        success: false,
        error: result.error,
      };
    }

    logger.info('Payment link sent to group', { groupId, paymentMethod });
    return {
      success: true,
      message: 'Payment link sent successfully',
    };
  } catch (error) {
    logger.error('Error sending payment to group', error);
    return {
      success: false,
      error: 'Failed to send payment link',
    };
  }
};

module.exports = {
  handlePaymentRequest,
  sendPaymentToGroup,
};
