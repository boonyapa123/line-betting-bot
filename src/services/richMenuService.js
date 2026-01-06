/**
 * Rich Menu Service
 * จัดการ Rich Menu สำหรับบอท
 */

const { client } = require('../config/line');
const logger = require('../utils/logger');

/**
 * Create Rich Menu
 */
const createRichMenu = async () => {
  try {
    const richMenu = {
      size: {
        width: 2400,
        height: 810,
      },
      selected: true,
      name: 'Betting Bot Menu',
      areas: [
        {
          bounds: {
            x: 0,
            y: 0,
            width: 800,
            height: 810,
          },
          action: {
            type: 'message',
            label: 'สรุป',
            text: '/สรุป',
          },
        },
        {
          bounds: {
            x: 800,
            y: 0,
            width: 800,
            height: 810,
          },
          action: {
            type: 'message',
            label: 'ยกเลิก',
            text: '/ยกเลิก',
          },
        },
        {
          bounds: {
            x: 1600,
            y: 0,
            width: 800,
            height: 810,
          },
          action: {
            type: 'message',
            label: 'ช่วยเหลือ',
            text: '/ช่วยเหลือ',
          },
        },
      ],
    };

    const response = await client.createRichMenu(richMenu);
    logger.info('Rich Menu created:', response.richMenuId);
    return response.richMenuId;
  } catch (error) {
    logger.error('Error creating rich menu', error);
    throw error;
  }
};

/**
 * Set Rich Menu Image
 */
const setRichMenuImage = async (richMenuId, imagePath) => {
  try {
    const fs = require('fs');
    const imageBuffer = fs.readFileSync(imagePath);

    await client.setRichMenuImage(richMenuId, imageBuffer, 'image/jpeg');
    logger.info('Rich Menu image set');
  } catch (error) {
    logger.error('Error setting rich menu image', error);
    throw error;
  }
};

/**
 * Link Rich Menu to User
 */
const linkRichMenuToUser = async (userId, richMenuId) => {
  try {
    await client.linkRichMenuToUser(userId, richMenuId);
    logger.info('Rich Menu linked to user:', userId);
  } catch (error) {
    logger.error('Error linking rich menu to user', error);
    throw error;
  }
};

/**
 * Link Rich Menu to Group
 */
const linkRichMenuToGroup = async (groupId, richMenuId) => {
  try {
    await client.linkRichMenuToGroup(groupId, richMenuId);
    logger.info('Rich Menu linked to group:', groupId);
  } catch (error) {
    logger.error('Error linking rich menu to group', error);
    throw error;
  }
};

/**
 * Get Rich Menu ID
 */
const getRichMenuId = async () => {
  try {
    const richMenuId = await client.getRichMenuIdOfUser('U' + Date.now());
    return richMenuId;
  } catch (error) {
    logger.warn('No rich menu set yet');
    return null;
  }
};

/**
 * Delete Rich Menu
 */
const deleteRichMenu = async (richMenuId) => {
  try {
    await client.deleteRichMenu(richMenuId);
    logger.info('Rich Menu deleted:', richMenuId);
  } catch (error) {
    logger.error('Error deleting rich menu', error);
    throw error;
  }
};

module.exports = {
  createRichMenu,
  setRichMenuImage,
  linkRichMenuToUser,
  linkRichMenuToGroup,
  getRichMenuId,
  deleteRichMenu,
};
