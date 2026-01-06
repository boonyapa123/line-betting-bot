#!/usr/bin/env node

/**
 * Create Correct Rich Menu with Image
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function createRichMenu() {
  try {
    console.log('🔧 Creating Rich Menu...');

    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const groupId = process.env.GROUP_ID;

    if (!token || !groupId) {
      console.error('❌ Missing LINE_CHANNEL_ACCESS_TOKEN or GROUP_ID');
      process.exit(1);
    }

    const richMenuConfig = {
      size: {
        width: 2400,
        height: 810,
      },
      selected: true,
      name: 'Betting Bot Menu',
      chatBarText: 'เมนู',
      areas: [
        {
          bounds: { x: 0, y: 0, width: 480, height: 810 },
          action: { type: 'message', label: 'เปิดแทง', text: '/เปิดแทง' },
        },
        {
          bounds: { x: 480, y: 0, width: 480, height: 810 },
          action: { type: 'message', label: 'ส่งห้องแข่ง', text: '/ส่งห้องแข่ง' },
        },
        {
          bounds: { x: 960, y: 0, width: 480, height: 810 },
          action: { type: 'message', label: 'ส่งลิงค์โอนเงิน', text: '/ส่งลิงค์โอนเงิน' },
        },
        {
          bounds: { x: 1440, y: 0, width: 480, height: 810 },
          action: { type: 'message', label: 'สรุปยอด', text: '/สรุปยอด' },
        },
        {
          bounds: { x: 1920, y: 0, width: 480, height: 810 },
          action: { type: 'message', label: 'แจ้งผลแทง', text: '/แจ้งผลแทง' },
        },
      ],
    };

    // Create Rich Menu
    const createResponse = await axios.post(
      'https://api.line.me/v2/bot/richmenu',
      richMenuConfig,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const richMenuId = createResponse.data.richMenuId;
    console.log('✅ Rich Menu created:', richMenuId);

    // Create a simple 1x1 pixel image
    const imageBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
      0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
      0x00, 0x00, 0x03, 0x00, 0x01, 0x4b, 0x6f, 0x0e, 0x22, 0x00, 0x00, 0x00,
      0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    // Upload image
    await axios.post(
      `https://api.line.me/v2/bot/richmenu/${richMenuId}/image`,
      imageBuffer,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'image/png',
        },
      }
    );

    console.log('✅ Image uploaded');

    // Link to group
    await axios.post(
      `https://api.line.me/v2/bot/group/${groupId}/richmenu/${richMenuId}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    console.log('✅ Rich Menu linked to group');

    console.log('\n📋 Rich Menu Buttons:');
    console.log('1. 📋 เปิดแทง');
    console.log('2. 🎯 ส่งห้องแข่ง');
    console.log('3. 💳 ส่งลิงค์โอนเงิน');
    console.log('4. 📊 สรุปยอด');
    console.log('5. 🏆 แจ้งผลแทง');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

createRichMenu();
