/**
 * Setup Google Sheets
 * สร้างชีท Bets, RoundState, และ UsersBalance พร้อม Header
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupGoogleSheets() {
  try {
    console.log('🔧 กำลังตั้งค่า Google Sheets...\n');

    // โหลด credentials
    const credentialsPath = path.join(
      __dirname,
      '../',
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'credentials.json'
    );

    if (!fs.existsSync(credentialsPath)) {
      console.error(`❌ ไม่พบไฟล์ credentials: ${credentialsPath}`);
      process.exit(1);
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath));
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      console.error('❌ ไม่พบ GOOGLE_SHEET_ID ใน .env');
      process.exit(1);
    }

    // สร้าง auth
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    console.log(`📊 Spreadsheet ID: ${spreadsheetId}\n`);

    // ============================================
    // 1. สร้างชีท "Bets"
    // ============================================
    console.log('📝 สร้างชีท "Bets"...');
    try {
      // ตรวจสอบว่าชีทมีอยู่แล้วหรือไม่
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId,
      });

      const sheetNames = spreadsheet.data.sheets.map((s) => s.properties.title);
      console.log(`   ชีทที่มีอยู่: ${sheetNames.join(', ')}\n`);

      // สร้างชีท Bets ถ้ายังไม่มี
      if (!sheetNames.includes('Bets')) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: 'Bets',
                  },
                },
              },
            ],
          },
        });
        console.log('   ✅ สร้างชีท "Bets" สำเร็จ');
      } else {
        console.log('   ℹ️  ชีท "Bets" มีอยู่แล้ว');
      }

      // เพิ่ม Header สำหรับชีท Bets
      const betsHeaders = [
        [
          'Timestamp',
          'UserID',
          'DisplayName',
          'Method',
          'Price',
          'Side',
          'Amount',
          'SlipName',
          'Status',
        ],
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Bets!A1:I1',
        valueInputOption: 'RAW',
        resource: {
          values: betsHeaders,
        },
      });
      console.log('   ✅ เพิ่ม Header สำเร็จ\n');
    } catch (error) {
      console.error('   ❌ เกิดข้อผิดพลาด:', error.message);
    }

    // ============================================
    // 2. สร้างชีท "RoundState"
    // ============================================
    console.log('📝 สร้างชีท "RoundState"...');
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId,
      });

      const sheetNames = spreadsheet.data.sheets.map((s) => s.properties.title);

      if (!sheetNames.includes('RoundState')) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: 'RoundState',
                  },
                },
              },
            ],
          },
        });
        console.log('   ✅ สร้างชีท "RoundState" สำเร็จ');
      } else {
        console.log('   ℹ️  ชีท "RoundState" มีอยู่แล้ว');
      }

      // เพิ่ม Header สำหรับชีท RoundState
      const roundStateHeaders = [['State', 'RoundID', 'StartTime', 'SlipName']];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'RoundState!A1:D1',
        valueInputOption: 'RAW',
        resource: {
          values: roundStateHeaders,
        },
      });

      // เพิ่มค่าเริ่มต้น
      const initialState = [['CLOSED', '', '', '']];
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'RoundState!A2:D2',
        valueInputOption: 'RAW',
        resource: {
          values: initialState,
        },
      });

      console.log('   ✅ เพิ่ม Header และค่าเริ่มต้นสำเร็จ\n');
    } catch (error) {
      console.error('   ❌ เกิดข้อผิดพลาด:', error.message);
    }

    // ============================================
    // 3. สร้างชีท "UsersBalance"
    // ============================================
    console.log('📝 สร้างชีท "UsersBalance"...');
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId,
      });

      const sheetNames = spreadsheet.data.sheets.map((s) => s.properties.title);

      if (!sheetNames.includes('UsersBalance')) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: 'UsersBalance',
                  },
                },
              },
            ],
          },
        });
        console.log('   ✅ สร้างชีท "UsersBalance" สำเร็จ');
      } else {
        console.log('   ℹ️  ชีท "UsersBalance" มีอยู่แล้ว');
      }

      // เพิ่ม Header สำหรับชีท UsersBalance
      const balanceHeaders = [['UserID', 'DisplayName', 'Balance']];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'UsersBalance!A1:C1',
        valueInputOption: 'RAW',
        resource: {
          values: balanceHeaders,
        },
      });

      console.log('   ✅ เพิ่ม Header สำเร็จ\n');
    } catch (error) {
      console.error('   ❌ เกิดข้อผิดพลาด:', error.message);
    }

    console.log('='.repeat(60));
    console.log('✅ ตั้งค่า Google Sheets เสร็จสิ้น');
    console.log('='.repeat(60));
    console.log('\n📋 ชีทที่สร้าง:');
    console.log('   1. Bets - บันทึกการเล่น');
    console.log('   2. RoundState - สถานะรอบการเล่น');
    console.log('   3. UsersBalance - ยอดเงินผู้เล่น');
    console.log('\n🎯 พร้อมใช้งานแล้ว!\n');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    process.exit(1);
  }
}

setupGoogleSheets();
