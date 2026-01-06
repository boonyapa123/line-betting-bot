const { client } = require('../config/line');
const { getVenue, getAllVenues } = require('./venueService');

/**
 * Send room link for a venue
 */
const sendRoomLink = async (venue, groupId) => {
  try {
    const venueResult = await getVenue(venue);

    if (!venueResult.success) {
      return {
        success: false,
        error: venueResult.error,
      };
    }

    const venueData = venueResult.venue;
    const message = `🎆 ห้องแทง ${venueData.name}\n\n` +
      `ลิงค์ห้องแทง: ${venueData.roomLink}`;

    await client.pushMessage(groupId, {
      type: 'text',
      text: message,
    });

    return {
      success: true,
      message: `Room link for ${venue} sent successfully`,
    };
  } catch (error) {
    console.error('Error sending room link:', error);
    return {
      success: false,
      error: 'Failed to send room link',
    };
  }
};

/**
 * Send payment link
 */
const sendPaymentLink = async (groupId, paymentLink, paymentMethod = 'ทั่วไป') => {
  try {
    if (!paymentLink) {
      return {
        success: false,
        error: 'Payment link is required',
      };
    }

    const message = `💳 ลิงค์ชำระเงิน (${paymentMethod})\n\n` +
      `${paymentLink}\n\n` +
      `กรุณาชำระเงินเพื่อยืนยันการแทง`;

    await client.pushMessage(groupId, {
      type: 'text',
      text: message,
    });

    return {
      success: true,
      message: 'Payment link sent successfully',
    };
  } catch (error) {
    console.error('Error sending payment link:', error);
    return {
      success: false,
      error: 'Failed to send payment link',
    };
  }
};

/**
 * Send all available venues
 */
const sendAvailableVenues = async (groupId) => {
  try {
    const venuesResult = await getAllVenues();

    if (!venuesResult.success || venuesResult.count === 0) {
      await client.pushMessage(groupId, {
        type: 'text',
        text: '❌ ไม่มีสนามแทงที่พร้อมใช้งาน',
      });
      return {
        success: false,
        error: 'No venues available',
      };
    }

    let venueList = '🎆 สนามแทงที่มีให้เลือก:\n\n';
    venuesResult.venues.forEach((venue, index) => {
      venueList += `${index + 1}. ${venue.name}\n`;
      venueList += `   ลิงค์: ${venue.roomLink}\n`;
    });

    await client.pushMessage(groupId, {
      type: 'text',
      text: venueList,
    });

    return {
      success: true,
      message: 'Venues list sent successfully',
    };
  } catch (error) {
    console.error('Error sending venues list:', error);
    return {
      success: false,
      error: 'Failed to send venues list',
    };
  }
};

/**
 * Send venue link by reply
 */
const replyWithVenueLink = async (replyToken, venue) => {
  try {
    const venueResult = await getVenue(venue);

    if (!venueResult.success) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: `❌ ${venueResult.error}\n\nพิมพ์ "รายชื่อสนาม" เพื่อดูสนามทั้งหมด`,
      });
      return {
        success: false,
        error: venueResult.error,
      };
    }

    const venueData = venueResult.venue;
    const message = `✅ ห้องแทง ${venueData.name}\n\n` +
      `ลิงค์ห้องแทง: ${venueData.roomLink}`;

    await client.replyMessage(replyToken, {
      type: 'text',
      text: message,
    });

    return {
      success: true,
      message: `Room link for ${venue} sent successfully`,
    };
  } catch (error) {
    console.error('Error replying with venue link:', error);
    return {
      success: false,
      error: 'Failed to send venue link',
    };
  }
};

module.exports = {
  sendRoomLink,
  sendPaymentLink,
  sendAvailableVenues,
  replyWithVenueLink,
};
