#!/usr/bin/env node

/**
 * Quick Add Venue Script
 * เพิ่มสนามแทงอย่างรวดเร็ว
 */

require('dotenv').config();
const { GoogleSheetsDatabaseService } = require('../services/googleSheetsDatabaseService');

async function addVenuesQuick() {
  try {
    console.log('🔧 Adding venues...');

    const venues = [
      {
        name: 'ต',
        roomLink: 'https://example.com/room/t',
        paymentLink: 'https://example.com/payment/t',
      },
      {
        name: 'ชล',
        roomLink: 'https://example.com/room/chon',
        paymentLink: 'https://example.com/payment/chon',
      },
      {
        name: 'เจ้าห้อม',
        roomLink: 'https://example.com/room/jaokhom',
        paymentLink: 'https://example.com/payment/jaokhom',
      },
    ];

    for (const venue of venues) {
      try {
        await GoogleSheetsDatabaseService.addVenue(venue);
        console.log(`✅ Added venue: ${venue.name}`);
      } catch (error) {
        console.error(`❌ Error adding venue ${venue.name}:`, error.message);
      }
    }

    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addVenuesQuick();
