/**
 * Setup Rich Menu - Final Version
 * ตั้งค่า Rich Menu ด้วย 6 ปุ่ม (2 แถว x 3 ปุ่ม)
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

if (!LINE_CHANNEL_ACCESS_TOKEN) {
  console.error('❌ LINE_CHANNEL_ACCESS_TOKEN not found in .env');
  process.exit(1);
}

// Rich Menu Configuration
const richMenuConfig = {
  size: {
    width: 2400,
    height: 1620,
  },
  selected: true,
  name: 'Betting Bot Menu',
  areas: [
    // Row 1: เปิดรับแทง
    {
      bounds: {
        x: 0,
        y: 0,
        width: 800,
        height: 810,
      },
      action: {
        type: 'postback',
        label: '📋 เปิดรับแทง',
        data: 'action=open_betting',
        displayText: 'เปิดรับแทง',
      },
    },
    // Row 1: ส่งห้องแข่ง
    {
      bounds: {
        x: 800,
        y: 0,
        width: 800,
        height: 810,
      },
      action: {
        type: 'postback',
        label: '🎯 ส่งห้องแข่ง',
        data: 'action=send_room',
        displayText: 'ส่งห้องแข่ง',
      },
    },
    // Row 1: สรุปยอดแทง
    {
      bounds: {
        x: 1600,
        y: 0,
        width: 800,
        height: 810,
      },
      action: {
        type: 'postback',
        label: '📊 สรุปยอดแทง',
        data: 'action=summary',
        displayText: 'สรุปยอดแทง',
      },
    },
    // Row 2: ส่งลิงค์การโอนเงิน
    {
      bounds: {
        x: 0,
        y: 810,
        width: 800,
        height: 810,
      },
      action: {
        type: 'postback',
        label: '💳 ส่งลิงค์การโอนเงิน',
        data: 'action=send_payment_link',
        displayText: 'ส่งลิงค์การโอนเงิน',
      },
    },
    // Row 2: สรุปผลแข่ง
    {
      bounds: {
        x: 800,
        y: 810,
        width: 800,
        height: 810,
      },
      action: {
        type: 'postback',
        label: '🏆 สรุปผลแข่ง',
        data: 'action=announce_results',
        displayText: 'สรุปผลแข่ง',
      },
    },
    // Row 2: รายงานการแข่งขัน
    {
      bounds: {
        x: 1600,
        y: 810,
        width: 800,
        height: 810,
      },
      action: {
        type: 'postback',
        label: '📈 รายงานการแข่งขัน',
        data: 'action=report',
        displayText: 'รายงานการแข่งขัน',
      },
    },
  ],
};

/**
 * Create Rich Menu
 */
async function createRichMenu() {
  try {
    console.log('🔄 Creating Rich Menu...');

    const response = await axios.post(
      'https://api.line.me/v2/bot/richmenu',
      richMenuConfig,
      {
        headers: {
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const richMenuId = response.data.richMenuId;
    console.log('✅ Rich Menu created successfully');
    console.log(`📍 Rich Menu ID: ${richMenuId}`);

    // Save Rich Menu ID to file
    const configFile = path.join(__dirname, '../../.richmenu-id');
    fs.writeFileSync(configFile, richMenuId);
    console.log(`💾 Rich Menu ID saved to ${configFile}`);

    return richMenuId;
  } catch (error) {
    console.error('❌ Error creating Rich Menu:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Set Rich Menu as default
 */
async function setDefaultRichMenu(richMenuId) {
  try {
    console.log(`🔄 Setting Rich Menu ${richMenuId} as default...`);

    await axios.post(
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Rich Menu set as default successfully');
  } catch (error) {
    console.error('❌ Error setting default Rich Menu:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get current Rich Menu
 */
async function getCurrentRichMenu() {
  try {
    console.log('🔄 Getting current Rich Menu...');

    const response = await axios.get(
      'https://api.line.me/v2/bot/user/all/richmenu',
      {
        headers: {
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );

    const richMenuId = response.data.richMenuId;
    console.log(`📍 Current Rich Menu ID: ${richMenuId}`);

    return richMenuId;
  } catch (error) {
    console.error('❌ Error getting current Rich Menu:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Delete Rich Menu
 */
async function deleteRichMenu(richMenuId) {
  try {
    console.log(`🔄 Deleting Rich Menu ${richMenuId}...`);

    await axios.delete(
      `https://api.line.me/v2/bot/richmenu/${richMenuId}`,
      {
        headers: {
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );

    console.log('✅ Rich Menu deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting Rich Menu:', error.response?.data || error.message);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 LINE Betting Bot - Rich Menu Setup');
    console.log('=====================================\n');

    // Get current Rich Menu
    const currentRichMenuId = await getCurrentRichMenu();

    // Delete current Rich Menu if exists
    if (currentRichMenuId) {
      console.log('\n🗑️ Deleting old Rich Menu...');
      await deleteRichMenu(currentRichMenuId);
    }

    // Create new Rich Menu
    console.log('\n📝 Creating new Rich Menu...');
    const newRichMenuId = await createRichMenu();

    // Set as default
    console.log('\n⚙️ Setting as default...');
    await setDefaultRichMenu(newRichMenuId);

    console.log('\n✅ Rich Menu setup completed successfully!');
    console.log(`\n📍 Rich Menu ID: ${newRichMenuId}`);
    console.log('\n🎯 Menu Items:');
    console.log('1. 📋 เปิดรับแทง - Display open betting rounds');
    console.log('2. 🎯 ส่งห้องแข่ง - Send room information');
    console.log('3. 📊 สรุปยอดแทง - Show betting summary');
    console.log('4. 💳 ส่งลิงค์การโอนเงิน - Send payment link');
    console.log('5. 🏆 สรุปผลแข่ง - Announce results');
    console.log('6. 📈 รายงานการแข่งขัน - Show report');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run
main();
