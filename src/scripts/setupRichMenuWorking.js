#!/usr/bin/env node

/**
 * Setup Rich Menu - Working Version
 * ใช้ LINE SDK ที่ถูกต้อง
 */

require('dotenv').config();
const { Client } = require('@line/bot-sdk');
const fs = require('fs');
const path = require('path');

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

// Rich Menu Configuration
const RICH_MENU_CONFIG = {
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
        width: 1200,
        height: 810,
      },
      action: {
        type: 'message',
        label: 'Open',
        text: 'open',
      },
    },
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

const setupRichMenu = async () => {
  try {
    console.log('\n🔧 Setting up Rich Menu...\n');

    // Create Rich Menu
    console.log('📝 Creating Rich Menu...');
    const response = await client.createRichMenu(RICH_MENU_CONFIG);
    const richMenuId = response.richMenuId;
    console.log('✅ Rich Menu created:', richMenuId);

    // Upload image
    const imagePath = path.join(__dirname, '../assets/rich-menu.jpg');
    if (fs.existsSync(imagePath)) {
      console.log('🖼️ Uploading image...');
      const imageBuffer = fs.readFileSync(imagePath);
      await client.setRichMenuImage(richMenuId, imageBuffer, 'image/jpeg');
      console.log('✅ Image uploaded');
    }

    // Set as default
    console.log('🔗 Setting as default...');
    await client.setDefaultRichMenu(richMenuId);
    console.log('✅ Set as default Rich Menu');

    // Display summary
    console.log('\n✅ Rich Menu setup complete!\n');
    console.log('📋 Rich Menu ID:', richMenuId);
    console.log('\n🎯 Buttons:');
    console.log('1. Open - Postback: action=open');
    console.log('2. Summary - Postback: action=summary');
    console.log('\n💡 Rich Menu is now active for all users!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
};

setupRichMenu();
