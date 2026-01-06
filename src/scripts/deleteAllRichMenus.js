#!/usr/bin/env node

/**
 * Delete All Rich Menus Script
 * ลบ Rich Menu ทั้งหมด
 */

require('dotenv').config();
const { Client } = require('@line/bot-sdk');

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

async function deleteAllRichMenus() {
  try {
    console.log('🔧 Deleting all Rich Menus...');

    // Try to delete default rich menu
    try {
      const defaultRichMenuId = await client.getDefaultRichMenuId();
      if (defaultRichMenuId) {
        await client.deleteRichMenu(defaultRichMenuId);
        console.log('✅ Deleted default Rich Menu:', defaultRichMenuId);
      }
    } catch (error) {
      console.log('ℹ️ No default Rich Menu to delete');
    }

    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteAllRichMenus();
