#!/usr/bin/env node

/**
 * Setup Venues Simple Script
 * เพิ่มสนามแทงไปยัง Google Sheets
 */

require('dotenv').config();
const { google } = require('googleapis');

async function setupVenues() {
  try {
    console.log('🔧 Setting up venues in Google Sheets...');

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

    // Create Venues sheet if not exists
    console.log('📝 Creating Venues sheet...');
    
    const venues = [
      ['ต', 'https://example.com/room/t', 'https://example.com/payment/t'],
      ['ชล', 'https://example.com/room/chon', 'https://example.com/payment/chon'],
      ['เจ้าห้อม', 'https://example.com/room/jaokhom', 'https://example.com/payment/jaokhom'],
    ];

    const request = {
      spreadsheetId,
      range: 'Venues!A:C',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [
          ['Name', 'Room Link', 'Payment Link'],
          ...venues,
        ],
      },
    };

    const response = await sheets.spreadsheets.values.update(request);
    console.log('✅ Venues added to Google Sheets');

    console.log('\n📋 Venues:');
    venues.forEach((venue, index) => {
      console.log(`${index + 1}. ${venue[0]}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupVenues();
