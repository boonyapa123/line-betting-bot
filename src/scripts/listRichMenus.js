#!/usr/bin/env node

/**
 * List Rich Menus Script
 * แสดงรายการ Rich Menu ทั้งหมด
 */

require('dotenv').config();
const { Client } = require('@line/bot-sdk');

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

async function listRichMenus() {
  try {
    console.log('🔍 Checking Rich Menus...');

    // LINE API doesn't provide a list endpoint
    // But we can try to get the default rich menu
    try {
      const defaultRichMenuId = await client.getDefaultRichMenuId();
      console.log('✅ Default Rich Menu ID:', defaultRichMenuId);
    } catch (error) {
      console.log('ℹ️ No default Rich Menu set');
    }

    console.log('\n📝 To manage Rich Menus:');
    console.log('1. Go to LINE Official Account Manager');
    console.log('2. Go to Messaging API settings');
    console.log('3. View and manage Rich Menus there');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listRichMenus();
