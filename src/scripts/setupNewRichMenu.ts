#!/usr/bin/env node

/**
 * Setup New Rich Menu Script
 * ตั้งค่า Rich Menu ใหม่ด้วย 5 ปุ่มหลัก
 */

import 'dotenv/config';
import { lineClient } from '../config/line';
import { RICH_MENU_CONFIG_SINGLE_ROW } from '../config/richMenuConfig';

async function setupNewRichMenu(): Promise<void> {
  try {
    console.log('🔧 Setting up new Rich Menu with 5 buttons...');

    // Create Rich Menu
    const richMenuId = await lineClient.createRichMenu(RICH_MENU_CONFIG_SINGLE_ROW);
    console.log('✅ Rich Menu created:', richMenuId);

    // Link to group (if GROUP_ID is provided)
    const groupId = process.env.GROUP_ID;
    if (groupId) {
      await lineClient.linkRichMenuToGroup(groupId, richMenuId);
      console.log('✅ Rich Menu linked to group:', groupId);
    } else {
      console.log('⚠️ GROUP_ID not set. You can link manually later.');
      console.log('   Rich Menu ID:', richMenuId);
    }

    console.log('\n✅ Rich Menu setup complete!');
    console.log('\nRich Menu Buttons:');
    console.log('1. 📋 เปิดแทง - Display open betting rounds');
    console.log('2. 🎯 ส่งห้องแข่ง - Send room information');
    console.log('3. 💳 ส่งลิงค์โอนเงิน - Send payment link');
    console.log('4. 📊 สรุปยอด - Show betting summary');
    console.log('5. 🏆 แจ้งผลแทง - Announce results');

  } catch (error) {
    console.error('❌ Error setting up rich menu:', error);
    process.exit(1);
  }
}

setupNewRichMenu();
