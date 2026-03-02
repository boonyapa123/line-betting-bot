/**
 * Update UsersBalance Sheet Schema
 * เปลี่ยนจาก UserID เป็น LineName เป็นคีย์หลัก
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function updateUsersBalanceSchema() {
  try {
    console.log('🔧 กำลังอัปเดตชีท UsersBalance...\n');

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
    // อัปเดตชีท UsersBalance
    // ============================================
    console.log('📝 อัปเดตชีท UsersBalance...');
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId,
      });

      const usersBalanceSheet = spreadsheet.data.sheets.find(
        (s) => s.properties.title === 'UsersBalance'
      );

      if (usersBalanceSheet) {
        // ลบชีท UsersBalance เก่า
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                deleteSheet: {
                  sheetId: usersBalanceSheet.properties.sheetId,
                },
              },
            ],
          },
        });
        console.log('   ✅ ลบชีท "UsersBalance" เก่าสำเร็จ');
      }

      // สร้างชีท UsersBalance ใหม่
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
      console.log('   ✅ สร้างชีท "UsersBalance" ใหม่สำเร็จ');

      // เพิ่ม Header ใหม่ (LineName เป็นคีย์หลัก)
      const newHeaders = [
        [
          'LineName', // A - คีย์หลัก
          'DisplayName', // B
          'Balance', // C
        ],
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'UsersBalance!A1:C1',
        valueInputOption: 'RAW',
        resource: {
          values: newHeaders,
        },
      });
      console.log('   ✅ เพิ่ม Header ใหม่สำเร็จ\n');
    } catch (error) {
      console.error('   ❌ เกิดข้อผิดพลาด:', error.message);
    }

    console.log('='.repeat(60));
    console.log('✅ อัปเดตชีท UsersBalance เสร็จสิ้น');
    console.log('='.repeat(60));
    console.log('\n📋 Schema ใหม่:');
    console.log('   Column A: LineName (คีย์หลัก)');
    console.log('   Column B: DisplayName');
    console.log('   Column C: Balance');
    console.log('\n🎯 พร้อมใช้งานแล้ว!\n');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    process.exit(1);
  }
}

updateUsersBalanceSchema();
