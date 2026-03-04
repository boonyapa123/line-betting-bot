#!/usr/bin/env node

/**
 * ตรวจสอบ Column J (ผลแพ้ชนะ)
 * ดูว่ามีข้อมูลผลลัพธ์หรือไม่
 * ✅ = ชนะ
 * ❌ = แพ้
 * ⛔ = จาว/เสมอ
 */

require('dotenv').config();
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

async function checkColumnJResults() {
  try {
    console.log('\n📊 ตรวจสอบ Column J (ผลแพ้ชนะ)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📋 Sheet ID: ${GOOGLE_SHEET_ID}`);
    console.log(`📄 Worksheet: ${GOOGLE_WORKSHEET_NAME}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Initialize Google Auth
    const auth = new GoogleAuth({
      keyFile: path.join(__dirname, 'credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ดึงข้อมูลจากชีท
    console.log('🔄 ดึงข้อมูลจากชีท...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:T`,
    });

    const rows = response.data.values || [];
    console.log(`✅ ดึงข้อมูลสำเร็จ (${rows.length} แถว)\n`);

    // ตรวจสอบ Column J
    console.log('📊 ตรวจสอบ Column J (ผลแพ้ชนะ)');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (rows.length <= 1) {
      console.log('⚠️  ไม่มีข้อมูล\n');
      return;
    }

    // แสดง Header
    console.log('📋 Header:');
    console.log(`[I] Column I (Index 8): "${rows[0][8] || '(ว่างเปล่า)'}" - ผลที่ออก`);
    console.log(`[J] Column J (Index 9): "${rows[0][9] || '(ว่างเปล่า)'}" - ผลแพ้ชนะ`);
    console.log('');

    // ตรวจสอบข้อมูล
    console.log('📊 ข้อมูลในแต่ละแถว:');
    console.log('─────────────────────────────────────────────────────────\n');

    let resultStats = {
      win: 0,      // ✅ ชนะ
      lose: 0,     // ❌ แพ้
      draw: 0,     // ⛔ จาว/เสมอ
      empty: 0,    // ว่างเปล่า
    };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      const colI = row[8] || ''; // ผลที่ออก
      const colJ = row[9] || ''; // ผลแพ้ชนะ
      const userA = row[2] || 'Unknown'; // ชื่อ User A
      const messageA = row[3] || ''; // ข้อความ A

      console.log(`📍 แถวที่ ${rowNum}:`);
      console.log(`   User A: ${userA}`);
      console.log(`   ข้อความ: ${messageA}`);
      console.log(`   [I] ผลที่ออก: "${colI || '(ว่างเปล่า)'}"`);
      console.log(`   [J] ผลแพ้ชนะ: "${colJ || '(ว่างเปล่า)'}"`);

      // ตรวจสอบผลลัพธ์
      if (!colJ || colJ.trim() === '') {
        console.log(`   ⚠️  ยังไม่มีผลลัพธ์`);
        resultStats.empty++;
      } else if (colJ.includes('✅')) {
        console.log(`   ✅ ชนะ`);
        resultStats.win++;
      } else if (colJ.includes('❌')) {
        console.log(`   ❌ แพ้`);
        resultStats.lose++;
      } else if (colJ.includes('⛔') || colJ.includes('เสมอ') || colJ.includes('จาว')) {
        console.log(`   ⛔ จาว/เสมอ`);
        resultStats.draw++;
      } else {
        console.log(`   ❓ ไม่รู้จักผลลัพธ์: "${colJ}"`);
      }
      console.log('');
    }

    // สรุปผลลัพธ์
    console.log('📊 สรุปผลลัพธ์');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ ชนะ: ${resultStats.win} รายการ`);
    console.log(`❌ แพ้: ${resultStats.lose} รายการ`);
    console.log(`⛔ จาว/เสมอ: ${resultStats.draw} รายการ`);
    console.log(`⚠️  ยังไม่มีผลลัพธ์: ${resultStats.empty} รายการ`);
    console.log(`📝 รวมทั้งสิ้น: ${rows.length - 1} รายการ`);

    // ตรวจสอบ Column I vs Column J
    console.log('\n📊 ตรวจสอบ Column I vs Column J');
    console.log('═══════════════════════════════════════════════════════════');

    let colIData = 0;
    let colJData = 0;

    for (let i = 1; i < rows.length; i++) {
      const colI = rows[i][8];
      const colJ = rows[i][9];

      if (colI && colI.toString().trim() !== '') colIData++;
      if (colJ && colJ.toString().trim() !== '') colJData++;
    }

    console.log(`📌 Column I (ผลที่ออก): ${colIData} แถว`);
    console.log(`📌 Column J (ผลแพ้ชนะ): ${colJData} แถว`);

    if (colIData === 0 && colJData > 0) {
      console.log(`\n⚠️  ปัญหา: ข้อมูลอยู่ใน Column J แทน Column I!`);
    } else if (colIData > 0 && colJData === 0) {
      console.log(`\n✅ ถูกต้อง: ข้อมูลอยู่ใน Column I`);
    } else if (colIData > 0 && colJData > 0) {
      console.log(`\n⚠️  ปัญหา: ข้อมูลอยู่ทั้ง Column I และ Column J`);
    } else {
      console.log(`\n⚠️  ไม่มีข้อมูลผลลัพธ์`);
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run
checkColumnJResults();
