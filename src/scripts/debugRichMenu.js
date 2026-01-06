#!/usr/bin/env node

/**
 * Debug Rich Menu Script
 */

require('dotenv').config();
const axios = require('axios');

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const secret = process.env.LINE_CHANNEL_SECRET;

console.log('🔍 Debugging Rich Menu...');
console.log('Token length:', token?.length || 0);
console.log('Secret length:', secret?.length || 0);

if (!token || !secret) {
  console.error('❌ Missing LINE_CHANNEL_ACCESS_TOKEN or LINE_CHANNEL_SECRET');
  process.exit(1);
}

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
        width: 480,
        height: 810,
      },
      action: {
        type: 'message',
        label: 'เปิดแทง',
        text: '/เปิดแทง',
      },
    },
    {
      bounds: {
        x: 480,
        y: 0,
        width: 480,
        height: 810,
      },
      action: {
        type: 'message',
        label: 'ส่งห้องแข่ง',
        text: '/ส่งห้องแข่ง',
      },
    },
    {
      bounds: {
        x: 960,
        y: 0,
        width: 480,
        height: 810,
      },
      action: {
        type: 'message',
        label: 'ส่งลิงค์โอนเงิน',
        text: '/ส่งลิงค์โอนเงิน',
      },
    },
    {
      bounds: {
        x: 1440,
        y: 0,
        width: 480,
        height: 810,
      },
      action: {
        type: 'message',
        label: 'สรุปยอด',
        text: '/สรุปยอด',
      },
    },
    {
      bounds: {
        x: 1920,
        y: 0,
        width: 480,
        height: 810,
      },
      action: {
        type: 'message',
        label: 'แจ้งผลแทง',
        text: '/แจ้งผลแทง',
      },
    },
  ],
};

console.log('\n📝 Rich Menu Config:');
console.log(JSON.stringify(richMenuConfig, null, 2));

async function testRichMenu() {
  try {
    console.log('\n🔧 Testing Rich Menu creation...');

    const response = await axios.post(
      'https://api.line.me/v2/bot/richmenu',
      richMenuConfig,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Rich Menu created:', response.data);

  } catch (error) {
    console.error('❌ Error:');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.statusText);
    console.error('   Data:', JSON.stringify(error.response?.data, null, 2));
  }
}

testRichMenu();
