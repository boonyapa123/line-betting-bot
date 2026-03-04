#!/usr/bin/env node

/**
 * ปิดรอบการเล่น
 */

require('dotenv').config();
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

async function closeBettingRound() {
  try {
    console.log('\n📊 ปิดรอบการเล่น');
    console.log('═══════════════════════════════════════════════════════════');

    // Initialize Google Auth
    const auth = new GoogleAuth({
      keyFile: path.join(__dirname, 'credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ปิดรอบการเล่น
    console.log('📝 ปิดรอบการเล่น...');
    
    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'RoundState!A1',
      valueInputOption: 'RAW',
      resource: {
        values: [['CLOSED']],
      },
    });

    console.log('✅ ปิดรอบการเล่นสำเร็จ');
    console.log(`   สถานะ: CLOSED`);

    console.log('\n✅ รอบนี้ปิดการทายแล้ว!');
    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run
closeBettingRound();
