#!/usr/bin/env node

/**
 * Delete and Create Rich Menu Script
 * ลบ Rich Menu เดิมและสร้างใหม่
 * 
 * Usage:
 *   npm run delete-rich-menu
 */

require('dotenv').config();
const { client } = require('../config/line');
const logger = require('../utils/logger');

/**
 * Get all Rich Menus
 */
const getAllRichMenus = async () => {
  try {
    // Note: LINE API doesn't provide a direct way to list all rich menus
    // We'll use the default rich menu ID approach
    const defaultId = await client.getDefaultRichMenuId();
    return defaultId ? [defaultId] : [];
  } catch (error) {
    return [];
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
    return true;
  } catch (error) {
    if (error.message.includes('not found')) {
      console.log('⚠️ Rich Menu not found');
      return true;
    }
    logger.error('Error deleting rich menu', error);
    return false;
  }
};

/**
 * Main function
 */
const main = async () => {
  try {
    console.log('\n🔧 Deleting Rich Menu...\n');

    // Get default rich menu ID
    const richMenuId = await client.getDefaultRichMenuId();

    if (!richMenuId) {
      console.log('⚠️ No Rich Menu found');
      return;
    }

    // Delete it
    const success = await deleteRichMenu(richMenuId);

    if (success) {
      console.log('\n✅ Rich Menu deleted successfully!');
      console.log('\nNext step: Run "npm run setup-rich-menu" to create a new one\n');
    } else {
      console.log('\n❌ Failed to delete Rich Menu\n');
      process.exit(1);
    }

  } catch (error) {
    logger.error('Error in delete rich menu script', error);
    process.exit(1);
  }
};

main();
