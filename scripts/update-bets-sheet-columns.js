/**
 * Update Bets Sheet Columns
 * เพิ่ม column ชื่อ LINE และสร้างชีท Results
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function updateBetsSheetColumns() {
  try {
    console.log('🔧 กำลังอัปเดตชีท Bets...\n');

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
    // 1. อัปเดตชีท "Bets" - เพิ่ม column ชื่อ LINE
    // ============================================
    console.log('📝 อัปเดตชีท "Bets"...');
    try {
      // ดึง header ปัจจุบัน
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Bets!A1:I1',
      });

      const currentHeaders = response.data.values?.[0] || [];
      console.log(`   Header ปัจจุบัน: ${currentHeaders.join(', ')}`);

      // ตรวจสอบว่ามี column ชื่อ LINE หรือไม่
      if (!currentHeaders.includes('LineName')) {
        // ลบชีท Bets เก่า
        const spreadsheet = await sheets.spreadsheets.get({
          spreadsheetId,
        });

        const betsSheet = spreadsheet.data.sheets.find(
          (s) => s.properties.title === 'Bets'
        );

        if (betsSheet) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
              requests: [
                {
                  deleteSheet: {
                    sheetId: betsSheet.properties.sheetId,
                  },
                },
              ],
            },
          });
          console.log('   ✅ ลบชีท "Bets" เก่าสำเร็จ');
        }

        // สร้างชีท Bets ใหม่
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
        console.log('   ✅ สร้างชีท "Bets" ใหม่สำเร็จ');

        // เพิ่ม Header ใหม่
        const newHeaders = [
          [
            'Timestamp',
            'UserID',
            'DisplayName',
            'LineName',
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
          range: 'Bets!A1:J1',
          valueInputOption: 'RAW',
          resource: {
            values: newHeaders,
          },
        });
        console.log('   ✅ เพิ่ม Header ใหม่สำเร็จ\n');
      } else {
        console.log('   ℹ️  ชีท "Bets" มี column ชื่อ LINE แล้ว\n');
      }
    } catch (error) {
      console.error('   ❌ เกิดข้อผิดพลาด:', error.message);
    }

    // ============================================
    // 2. สร้างชีท "Results"
    // ============================================
    console.log('📝 สร้างชีท "Results"...');
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId,
      });

      const sheetNames = spreadsheet.data.sheets.map((s) => s.properties.title);

      if (!sheetNames.includes('Results')) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: 'Results',
                  },
                },
              },
            ],
          },
        });
        console.log('   ✅ สร้างชีท "Results" สำเร็จ');
      } else {
        console.log('   ℹ️  ชีท "Results" มีอยู่แล้ว');
      }

      // เพิ่ม Header สำหรับชีท Results
      const resultsHeaders = [
        [
          'Timestamp',
          'SlipName',
          'Score',
          'Player1_ID',
          'Player1_Name',
          'Player1_LineName',
          'Player1_Side',
          'Player1_Amount',
          'Player2_ID',
          'Player2_Name',
          'Player2_LineName',
          'Player2_Side',
          'Player2_Amount',
          'Winner_ID',
          'Winner_Name',
          'Winner_LineName',
          'Winner_GrossAmount',
          'Winner_Fee',
          'Winner_NetAmount',
          'Loser_ID',
          'Loser_Name',
          'Loser_LineName',
          'Loser_GrossAmount',
          'Loser_Fee',
          'Loser_NetAmount',
          'ResultType',
        ],
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Results!A1:Z1',
        valueInputOption: 'RAW',
        resource: {
          values: resultsHeaders,
        },
      });
      console.log('   ✅ เพิ่ม Header สำเร็จ\n');
    } catch (error) {
      console.error('   ❌ เกิดข้อผิดพลาด:', error.message);
    }

    console.log('='.repeat(60));
    console.log('✅ อัปเดตชีท Google Sheets เสร็จสิ้น');
    console.log('='.repeat(60));
    console.log('\n📋 ชีทที่อัปเดต:');
    console.log('   1. Bets - เพิ่ม column LineName');
    console.log('   2. Results - บันทึกผลลัพธ์การเล่น');
    console.log('\n🎯 พร้อมใช้งานแล้ว!\n');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    process.exit(1);
  }
}

updateBetsSheetColumns();
