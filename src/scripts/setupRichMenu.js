#!/usr/bin/env node

/**
 * Setup Rich Menu Script
 * ตั้งค่า Rich Menu สำหรับบอท
 * 
 * Usage:
 *   npm run setup-rich-menu
 *   npm run setup-rich-menu -- --group-id <GROUP_ID>
 *   npm run setup-rich-menu -- --user-id <USER_ID>
 */

require('dotenv').config();
const { client } = require('../config/line');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// Rich Menu Configuration
const RICH_MENU_CONFIG = {
  size: {
    width: 2400,
    height: 810,
  },
  selected: true,
  name: 'Betting Bot Menu',
  areas: [
    // Button 1: Open Betting
    {
      bounds: {
        x: 0,
        y: 0,
        width: 1200,
        height: 810,
      },
      action: {
        type: 'message',
        label: 'Open Betting',
        text: 'open',
      },
    },
    // Button 2: Summary
    {
      bounds: {
        x: 1200,
        y: 0,
        width: 1200,
        height: 810,
      },
      action: {
        type: 'message',
        label: 'Summary',
        text: 'summary',
      },
    },
  ],
};

/**
 * Create Rich Menu
 */
const createRichMenu = async () => {
  try {
    console.log('📝 Creating Rich Menu...');
    const response = await client.createRichMenu(RICH_MENU_CONFIG);
    console.log('✅ Rich Menu created:', response.richMenuId);
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
    if (!fs.existsSync(imagePath)) {
      console.log('⚠️ Image file not found:', imagePath);
      console.log('   Skipping image upload. You can upload manually later.');
      return;
    }

    console.log('🖼️ Uploading Rich Menu image...');
    const imageBuffer = fs.readFileSync(imagePath);
    await client.setRichMenuImage(richMenuId, imageBuffer, 'image/jpeg');
    console.log('✅ Rich Menu image uploaded');
  } catch (error) {
    logger.error('Error setting rich menu image', error);
    console.log('⚠️ Image upload failed. You can upload manually later.');
  }
};

/**
 * Link Rich Menu to Group
 */
const linkRichMenuToGroup = async (groupId, richMenuId) => {
  try {
    console.log('🔗 Linking Rich Menu to group:', groupId);
    await client.linkRichMenuToGroup(groupId, richMenuId);
    console.log('✅ Rich Menu linked to group');
  } catch (error) {
    logger.error('Error linking rich menu to group', error);
    throw error;
  }
};

/**
 * Link Rich Menu to User
 */
const linkRichMenuToUser = async (userId, richMenuId) => {
  try {
    console.log('🔗 Linking Rich Menu to user:', userId);
    await client.linkRichMenuToUser(userId, richMenuId);
    console.log('✅ Rich Menu linked to user');
  } catch (error) {
    logger.error('Error linking rich menu to user', error);
    throw error;
  }
};

/**
 * Get Rich Menu ID
 */
const getRichMenuId = async () => {
  try {
    const richMenuId = await client.getDefaultRichMenuId();
    return richMenuId;
  } catch (error) {
    return null;
  }
};

/**
 * Delete Rich Menu
 */
const deleteRichMenu = async (richMenuId) => {
  try {
    console.log('🗑️ Deleting Rich Menu:', richMenuId);
    await client.deleteRichMenu(richMenuId);
    console.log('✅ Rich Menu deleted');
  } catch (error) {
    logger.error('Error deleting rich menu', error);
    throw error;
  }
};

/**
 * Main setup function
 */
const setupRichMenu = async () => {
  try {
    console.log('\n🔧 Setting up Rich Menu...\n');

    // Parse command line arguments
    const args = process.argv.slice(2);
    let groupId = process.env.GROUP_ID;
    let userId = process.env.USER_ID;
    let deleteExisting = false;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--group-id' && args[i + 1]) {
        groupId = args[i + 1];
      }
      if (args[i] === '--user-id' && args[i + 1]) {
        userId = args[i + 1];
      }
      if (args[i] === '--delete') {
        deleteExisting = true;
      }
    }

    // Delete existing Rich Menu if requested
    if (deleteExisting) {
      const existingId = await getRichMenuId();
      if (existingId) {
        await deleteRichMenu(existingId);
      }
    }

    // Create Rich Menu
    const richMenuId = await createRichMenu();

    // Upload image
    const imagePath = path.join(__dirname, '../assets/rich-menu.jpg');
    await setRichMenuImage(richMenuId, imagePath);

    // Link to group or user
    if (groupId) {
      await linkRichMenuToGroup(groupId, richMenuId);
    } else if (userId) {
      await linkRichMenuToUser(userId, richMenuId);
    } else {
      console.log('\n⚠️ No GROUP_ID or USER_ID provided.');
      console.log('   You can link manually using:');
      console.log(`   npm run setup-rich-menu -- --group-id <GROUP_ID>`);
      console.log(`   npm run setup-rich-menu -- --user-id <USER_ID>`);
    }

    // Display summary
    console.log('\n✅ Rich Menu setup complete!\n');
    console.log('📋 Rich Menu ID:', richMenuId);
    console.log('\n🎯 Rich Menu Buttons:');
    console.log('1. เปิดแทง - Display open betting rounds');
    console.log('2. ส่งห้องแข่ง - Send room information');
    console.log('3. ส่งลิงค์โอนเงิน - Send payment link');
    console.log('4. สรุปยอด - Show betting summary');
    console.log('5. แจ้งผลแทง - Announce results');
    console.log('\n');

  } catch (error) {
    logger.error('Error setting up rich menu', error);
    process.exit(1);
  }
};

setupRichMenu();
