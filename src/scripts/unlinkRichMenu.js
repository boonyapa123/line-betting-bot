#!/usr/bin/env node

/**
 * Unlink Rich Menu Script
 * ยกเลิกการเชื่อมต่อ Rich Menu จากกลุ่ม
 */

require('dotenv').config();
const { Client } = require('@line/bot-sdk');

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

async function unlinkRichMenu() {
  try {
    console.log('🔧 Unlinking Rich Menu...');

    const groupId = process.env.GROUP_ID;
    if (!groupId) {
      console.log('⚠️ GROUP_ID not set in .env');
      return;
    }

    try {
      await client.unlinkRichMenuFromGroup(groupId);
      console.log('✅ Rich Menu unlinked from group:', groupId);
    } catch (error) {
      console.log('ℹ️ No Rich Menu linked to group');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

unlinkRichMenu();
