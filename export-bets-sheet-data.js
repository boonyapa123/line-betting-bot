#!/usr/bin/env node

/**
 * ดึงข้อมูลทั้งหมดจากชีท Bets
 * และบันทึกลงไฟล์ JSON
 */

require('dotenv').config();
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

// ข้อมูลคอลัมน์ที่ถูกต้อง
const COLUMNS = {
  TIMESTAMP: 0,           // A: Timestamp
  USER_A_ID: 1,           // B: User A ID
  USER_A_NAME: 2,         // C: ชื่อ User A
  MESSAGE_A: 3,           // D: ข้อความ A
  SLIP_NAME: 4,           // E: ชื่อบั้งไฟ
  SIDE_A: 5,              // F: รายการเล่น (ฝั่ง A)
  AMOUNT: 6,              // G: ยอดเงิน
  AMOUNT_B: 7,            // H: ยอดเงิน B
  RESULT: 8,              // I: ผลที่ออก
  RESULT_WIN_LOSE: 9,     // J: ผลแพ้ชนะ
  USER_B_ID: 10,          // K: User B ID
  USER_B_NAME: 11,        // L: ชื่อ User B
  SIDE_B: 12,             // M: รายการแทง (ฝั่ง B)
  GROUP_CHAT_NAME: 13,    // N: ชื่อกลุ่มแชท
  GROUP_NAME: 14,         // O: ชื่อกลุ่ม
  TOKEN_A: 15,            // P: Token A
  GROUP_ID: 16,           // Q: ID กลุ่ม
  TOKEN_B: 17,            // R: Token B
  RESULT_A: 18,           // S: ผลลัพธ์ A
  RESULT_B: 19,           // T: ผลลัพธ์ B
};

const COLUMN_NAMES = {
  0: 'A - Timestamp',
  1: 'B - User A ID',
  2: 'C - ชื่อ User A',
  3: 'D - ข้อความ A',
  4: 'E - ชื่อบั้งไฟ',
  5: 'F - รายการเล่น (ฝั่ง A)',
  6: 'G - ยอดเงิน',
  7: 'H - ยอดเงิน B',
  8: 'I - ผลที่ออก',
  9: 'J - ผลแพ้ชนะ',
  10: 'K - User B ID',
  11: 'L - ชื่อ User B',
  12: 'M - รายการแทง (ฝั่ง B)',
  13: 'N - ชื่อกลุ่มแชท',
  14: 'O - ชื่อกลุ่ม',
  15: 'P - Token A',
  16: 'Q - ID กลุ่ม',
  17: 'R - Token B',
  18: 'S - ผลลัพธ์ A',
  19: 'T - ผลลัพธ์ B',
};

async function exportBetsSheetData() {
  try {
    console.log('\n📊 ดึงข้อมูลทั้งหมดจากชีท Bets');
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

    // แปลงข้อมูลเป็น JSON
    const data = {
      metadata: {
        sheetId: GOOGLE_SHEET_ID,
        worksheet: GOOGLE_WORKSHEET_NAME,
        totalRows: rows.length,
        dataRows: rows.length - 1,
        exportedAt: new Date().toISOString(),
      },
      headers: rows[0] || [],
      data: [],
    };

    // แปลงแต่ละแถวเป็น object
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowData = {
        rowNumber: i + 1,
        timestamp: row[COLUMNS.TIMESTAMP] || '',
        userAId: row[COLUMNS.USER_A_ID] || '',
        userAName: row[COLUMNS.USER_A_NAME] || '',
        messageA: row[COLUMNS.MESSAGE_A] || '',
        slipName: row[COLUMNS.SLIP_NAME] || '',
        sideA: row[COLUMNS.SIDE_A] || '',
        amount: row[COLUMNS.AMOUNT] || '',
        amountB: row[COLUMNS.AMOUNT_B] || '',
        result: row[COLUMNS.RESULT] || '',
        resultWinLose: row[COLUMNS.RESULT_WIN_LOSE] || '',
        userBId: row[COLUMNS.USER_B_ID] || '',
        userBName: row[COLUMNS.USER_B_NAME] || '',
        sideB: row[COLUMNS.SIDE_B] || '',
        groupChatName: row[COLUMNS.GROUP_CHAT_NAME] || '',
        groupName: row[COLUMNS.GROUP_NAME] || '',
        tokenA: row[COLUMNS.TOKEN_A] || '',
        groupId: row[COLUMNS.GROUP_ID] || '',
        tokenB: row[COLUMNS.TOKEN_B] || '',
        resultA: row[COLUMNS.RESULT_A] || '',
        resultB: row[COLUMNS.RESULT_B] || '',
      };
      data.data.push(rowData);
    }

    // บันทึกลงไฟล์ JSON
    const jsonFile = 'bets-sheet-data.json';
    fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ บันทึกลงไฟล์: ${jsonFile}\n`);

    // แสดงข้อมูลในรูปแบบตาราง
    console.log('📊 ข้อมูลทั้งหมด');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (data.data.length === 0) {
      console.log('⚠️  ไม่มีข้อมูล\n');
    } else {
      // แสดงแต่ละแถว
      for (const row of data.data) {
        console.log(`📍 แถวที่ ${row.rowNumber}:`);
        console.log('─────────────────────────────────────────────────────────');
        console.log(`  Timestamp: ${row.timestamp}`);
        console.log(`  User A: ${row.userAName} (${row.userAId})`);
        console.log(`  ข้อความ A: ${row.messageA}`);
        console.log(`  ชื่อบั้งไฟ: ${row.slipName}`);
        console.log(`  รายการเล่น A: ${row.sideA}`);
        console.log(`  ยอดเงิน: ${row.amount}`);
        console.log(`  ยอดเงิน B: ${row.amountB}`);
        console.log(`  ผลที่ออก: ${row.result || '(ว่างเปล่า)'}`);
        console.log(`  ผลแพ้ชนะ: ${row.resultWinLose || '(ว่างเปล่า)'}`);
        console.log(`  User B: ${row.userBName} (${row.userBId || '(ว่างเปล่า)'})`);
        console.log(`  รายการแทง B: ${row.sideB}`);
        console.log(`  ชื่อกลุ่ม: ${row.groupName}`);
        console.log(`  ID กลุ่ม: ${row.groupId}`);
        console.log('');
      }
    }

    // สรุปข้อมูล
    console.log('📊 สรุปข้อมูล');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📝 จำนวนแถวทั้งหมด: ${data.metadata.totalRows}`);
    console.log(`📝 จำนวนแถวข้อมูล: ${data.metadata.dataRows}`);
    console.log(`📝 จำนวนคอลัมน์: 20`);

    // ตรวจสอบข้อมูลที่สำคัญ
    console.log('\n🔍 ตรวจสอบข้อมูลที่สำคัญ');
    console.log('═══════════════════════════════════════════════════════════');

    let completedBets = 0;
    let pendingBets = 0;
    let groupIds = new Set();
    let slipNames = new Set();
    let userAIds = new Set();
    let userBIds = new Set();

    for (const row of data.data) {
      if (row.result) completedBets++;
      else pendingBets++;

      if (row.groupId) groupIds.add(row.groupId);
      if (row.slipName) slipNames.add(row.slipName);
      if (row.userAId) userAIds.add(row.userAId);
      if (row.userBId) userBIds.add(row.userBId);
    }

    console.log(`✅ การเดิมพันที่เสร็จสิ้น: ${completedBets}`);
    console.log(`⏳ การเดิมพันที่รอผล: ${pendingBets}`);
    console.log(`👥 จำนวนกลุ่มที่ไม่ซ้ำ: ${groupIds.size}`);
    console.log(`🎆 จำนวนบั้งไฟที่ไม่ซ้ำ: ${slipNames.size}`);
    console.log(`👤 จำนวน User A ที่ไม่ซ้ำ: ${userAIds.size}`);
    console.log(`👤 จำนวน User B ที่ไม่ซ้ำ: ${userBIds.size}`);

    // แสดงรายการกลุ่ม
    console.log('\n📋 รายการกลุ่ม:');
    for (const groupId of groupIds) {
      const groupData = data.data.find(r => r.groupId === groupId);
      console.log(`  - ${groupData.groupName} (${groupId})`);
    }

    // แสดงรายการบั้งไฟ
    console.log('\n🎆 รายการบั้งไฟ:');
    for (const slipName of slipNames) {
      const slipData = data.data.filter(r => r.slipName === slipName);
      console.log(`  - ${slipName} (${slipData.length} การเดิมพัน)`);
    }

    // แสดงรายการผู้เล่น
    console.log('\n👥 รายการผู้เล่น (User A):');
    for (const userId of userAIds) {
      const userData = data.data.find(r => r.userAId === userId);
      console.log(`  - ${userData.userAName} (${userId})`);
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run
exportBetsSheetData();
