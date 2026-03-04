#!/usr/bin/env node

/**
 * เปิดรอบการเล่น
 * ต้องรันคำสั่งนี้ก่อนเปิดการเล่น
 */

require('dotenv').config();
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

async function openBettingRound() {
  try {
    console.log('\n📊 เปิดรอบการเล่น');
    console.log('═══════════════════════════════════════════════════════════');

    // Initialize Google Auth
    const auth = new GoogleAuth({
      keyFile: path.join(__dirname, 'credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ตรวจสอบว่ามีชีท RoundState หรือไม่
    console.log('🔍 ตรวจสอบชีท RoundState...');
    
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: 'RoundState!A1:D1',
      });

      console.log('✅ ชีท RoundState มีอยู่แล้ว');
      console.log(`   ข้อมูลปัจจุบัน:`, response.data.values);
    } catch (error) {
      console.log('⚠️  ชีท RoundState ไม่มี ต้องสร้างใหม่');
      
      // สร้างชีท RoundState
      console.log('📝 สร้างชีท RoundState...');
      
      const sheetsAPI = google.sheets({ version: 'v4', auth });
      
      // เพิ่มชีท
      const addSheetResponse = await sheetsAPI.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_SHEET_ID,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'RoundState',
                  index: 0,
                },
              },
            },
          ],
        },
      });

      console.log('✅ สร้างชีท RoundState สำเร็จ');
    }

    // เปิดรอบการเล่น
    console.log('\n📝 เปิดรอบการเล่น...');
    
    const roundId = `ROUND_${Date.now()}`;
    const startTime = new Date().toISOString();
    const slipName = process.argv[2] || 'ทดสอบ'; // ชื่อบั้งไฟจากอาร์กิวเมนต์

    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'RoundState!A1:D1',
      valueInputOption: 'RAW',
      resource: {
        values: [['OPEN', roundId, startTime, slipName]],
      },
    });

    console.log('✅ เปิดรอบการเล่นสำเร็จ');
    console.log(`   สถานะ: OPEN`);
    console.log(`   Round ID: ${roundId}`);
    console.log(`   เวลา: ${startTime}`);
    console.log(`   ชื่อบั้งไฟ: ${slipName}`);

    console.log('\n✅ ระบบพร้อมรับการเล่นแล้ว!');
    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run
openBettingRound();
