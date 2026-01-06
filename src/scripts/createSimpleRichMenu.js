#!/usr/bin/env node

/**
 * Create Simple Rich Menu
 * สร้าง Rich Menu ที่ง่ายและใช้งานได้จริง
 */

require('dotenv').config();
const axios = require('axios');
const logger = require('../utils/logger');

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const API_URL = 'https://api.line.me/v2/bot/richmenu';

// Simple Rich Menu with 2 buttons
const richMenuConfig = {
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

const createRichMenu = async () => {
  try {
    console.log('\n🔧 Creating Rich Menu...\n');

    const response = await axios.post(API_URL, richMenuConfig, {
      headers: {
        Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const richMenuId = response.data.richMenuId;
    console.log('✅ Rich Menu created successfully!');
    console.log('📋 Rich Menu ID:', richMenuId);
    console.log('\n🎯 Buttons:');
    console.log('1. Open - Send "open" message');
    console.log('2. Summary - Send "summary" message');
    console.log('\n💡 Next step: Set this as default or link to group');
    console.log(`   npm run setup-rich-menu -- --group-id <GROUP_ID>\n`);

    return richMenuId;
  } catch (error) {
    if (error.response) {
      console.error('❌ Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
};

createRichMenu();
