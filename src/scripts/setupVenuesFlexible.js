#!/usr/bin/env node

/**
 * Setup Venues Flexible Script
 * เพิ่มสนามแข่งที่ยืดหยุ่น
 */

require('dotenv').config();
const { google } = require('googleapis');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) => new Promise((resolve) => {
  rl.question(prompt, resolve);
});

async function setupVenues() {
  try {
    console.log('🔧 Setting up venues in Google Sheets...\n');

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

    const venues = [];
    let addMore = true;

    while (addMore) {
      console.log(`\n📝 Venue #${venues.length + 1}`);
      const name = await question('ชื่อสนาม: ');
      const roomLink = await question('ลิงค์ห้องแข่ง: ');
      const paymentLink = await question('ลิงค์ชำระเงิน: ');

      venues.push([name, roomLink, paymentLink]);
      console.log(`✅ เพิ่มสนาม: ${name}`);

      const more = await question('\nเพิ่มสนามอื่นไหม? (y/n): ');
      addMore = more.toLowerCase() === 'y';
    }

    console.log('\n📤 บันทึกไปยัง Google Sheets...');

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
    console.log('✅ บันทึกสำเร็จ!\n');

    console.log('📋 สนามแข่งที่เพิ่ม:');
    venues.forEach((venue, index) => {
      console.log(`${index + 1}. ${venue[0]}`);
    });

    rl.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

setupVenues();
