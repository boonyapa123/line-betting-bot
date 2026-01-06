#!/usr/bin/env node

/**
 * Delete Old Rich Menu Script
 * ลบ Rich Menu เก่า
 */

require('dotenv').config();
const { Client } = require('@line/bot-sdk');

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

async function deleteOldRichMenus() {
  try {
    console.log('🔧 Deleting old Rich Menus...');

    // Get all rich menus (LINE API doesn't provide list, so we'll try common IDs)
    // In practice, you'd need to track the Rich Menu ID

    console.log('⚠️ To delete a Rich Menu, you need the Rich Menu ID');
    console.log('   You can find it in LINE Official Account Manager');
    console.log('   Or check the console logs from previous setup');

    // If you have a specific Rich Menu ID, uncomment and use:
    // const richMenuId = 'YOUR_RICH_MENU_ID_HERE';
    // await client.deleteRichMenu(richMenuId);
    // console.log('✅ Rich Menu deleted:', richMenuId);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteOldRichMenus();
