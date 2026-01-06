#!/usr/bin/env node

/**
 * Add Venues Direct Script
 * เพิ่มสนามแข่งโดยตรง
 */

require('dotenv').config();
const { google } = require('googleapis');

async function addVenues() {
  try {
    console.log('🔧 Adding venues to Google Sheets...');

    const keyFile = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    if (!spreadsheetId) {
      console.error('❌ GOOGLE_SHEETS_ID not set in .env');
      process.exit(1);
    }

    const authClient = new google.auth.GoogleAuth({
      keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // Default venues
    const venues = [
      ['สนามต', 'https://example.com/room/t', 'https://example.com/payment/t'],
      ['สนามชล', 'https://example.com/room/chon', 'https://example.com/payment/chon'],
      ['สนามเจ้าห้อม', 'https://example.com/room/jaokhom', 'https://example.com/payment/jaokhom'],
    ];

    const request = {
      spreadsheetId,
      range: 'Sheet1!A1:C10',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [
          ['Name', 'Room Link', 'Payment Link'],
          ...venues,
        ],
      },
    };

    const response = await sheets.spreadsheets.values.update(request);
    console.log('✅ Venues added successfully!\n');

    console.log('📋 Venues added:');
    venues.forEach((venue, index) => {
      console.log(`${index + 1}. ${venue[0]}`);
      console.log(`   Room: ${venue[1]}`);
      console.log(`   Payment: ${venue[2]}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addVenues();
