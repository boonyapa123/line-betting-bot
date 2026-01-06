#!/usr/bin/env node

/**
 * Set Default Rich Menu
 */

require('dotenv').config();
const axios = require('axios');

async function setDefaultRichMenu() {
  try {
    console.log('🔧 Setting default Rich Menu...');

    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const richMenuId = 'richmenu-88d8c6ade722574c0851d3e5b2d3b9e9';

    if (!token) {
      console.error('❌ LINE_CHANNEL_ACCESS_TOKEN not set');
      process.exit(1);
    }

    // Set as default for all users
    await axios.post(
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    console.log('✅ Rich Menu set as default for all users');
    console.log('   Rich Menu ID:', richMenuId);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

setDefaultRichMenu();
