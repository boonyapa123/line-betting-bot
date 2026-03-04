#!/usr/bin/env node

/**
 * ตรวจสอบข้อมูลในชีท Bets
 * ดูว่าข้อมูลบันทึกตรงคอลัมน์หรือไม่
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

async function verifyBetsSheetData() {
  try {
    console.log('\n📊 ตรวจสอบข้อมูลในชีท Bets');
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

    // ตรวจสอบ Header
    console.log('📋 ตรวจสอบ Header (แถวที่ 1)');
    console.log('═══════════════════════════════════════════════════════════');
    const headerRow = rows[0] || [];
    
    let headerCorrect = true;
    for (let i = 0; i < 20; i++) {
      const expectedName = COLUMN_NAMES[i];
      const actualValue = headerRow[i] || '(ว่างเปล่า)';
      const isCorrect = actualValue.includes(expectedName.split(' - ')[1]) || actualValue === expectedName;
      
      const status = isCorrect ? '✅' : '❌';
      console.log(`${status} [${String.fromCharCode(65 + i)}] ${expectedName}`);
      console.log(`   ค่าจริง: "${actualValue}"`);
      
      if (!isCorrect) {
        headerCorrect = false;
      }
    }
    console.log('');

    if (!headerCorrect) {
      console.log('⚠️  Header ไม่ตรงกัน! ต้องแก้ไข\n');
    } else {
      console.log('✅ Header ถูกต้อง\n');
    }

    // ตรวจสอบข้อมูล (แถวที่ 2 ขึ้นไป)
    console.log('📊 ตรวจสอบข้อมูล (แถวที่ 2 ขึ้นไป)');
    console.log('═══════════════════════════════════════════════════════════');

    if (rows.length <= 1) {
      console.log('⚠️  ไม่มีข้อมูล (เฉพาะ header)\n');
    } else {
      // ตรวจสอบ 5 แถวแรก
      const rowsToCheck = Math.min(5, rows.length - 1);
      
      for (let rowIdx = 1; rowIdx <= rowsToCheck; rowIdx++) {
        const row = rows[rowIdx];
        console.log(`\n📍 แถวที่ ${rowIdx + 1}:`);
        console.log('─────────────────────────────────────────────────────────');
        
        // ตรวจสอบคอลัมน์สำคัญ
        const importantColumns = [
          { key: 'TIMESTAMP', label: 'Timestamp' },
          { key: 'USER_A_ID', label: 'User A ID' },
          { key: 'USER_A_NAME', label: 'ชื่อ User A' },
          { key: 'MESSAGE_A', label: 'ข้อความ A' },
          { key: 'SLIP_NAME', label: 'ชื่อบั้งไฟ' },
          { key: 'SIDE_A', label: 'รายการเล่น A' },
          { key: 'AMOUNT', label: 'ยอดเงิน' },
          { key: 'AMOUNT_B', label: 'ยอดเงิน B' },
          { key: 'RESULT', label: 'ผลที่ออก (Column I)' },
          { key: 'RESULT_WIN_LOSE', label: 'ผลแพ้ชนะ (Column J)' },
          { key: 'USER_B_ID', label: 'User B ID' },
          { key: 'USER_B_NAME', label: 'ชื่อ User B' },
          { key: 'SIDE_B', label: 'รายการแทง B' },
          { key: 'GROUP_ID', label: 'ID กลุ่ม' },
        ];

        for (const col of importantColumns) {
          const colIndex = COLUMNS[col.key];
          const value = row[colIndex] || '(ว่างเปล่า)';
          const hasValue = value && value !== '(ว่างเปล่า)';
          const status = hasValue ? '✅' : '⚠️ ';
          
          console.log(`${status} [${String.fromCharCode(65 + colIndex)}] ${col.label}: "${value}"`);
        }
      }

      console.log('\n');
      console.log('📊 สรุปข้อมูล');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`📝 จำนวนแถวทั้งหมด: ${rows.length}`);
      console.log(`📝 จำนวนแถวข้อมูล: ${rows.length - 1}`);
      console.log(`📝 จำนวนคอลัมน์: ${Math.max(...rows.map(r => r.length))}`);
    }

    // ตรวจสอบคอลัมน์ที่มีข้อมูล
    console.log('\n📊 ตรวจสอบคอลัมน์ที่มีข้อมูล');
    console.log('═══════════════════════════════════════════════════════════');
    
    const columnStats = {};
    for (let colIdx = 0; colIdx < 20; colIdx++) {
      let filledCount = 0;
      for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
        const value = rows[rowIdx][colIdx];
        if (value && value.toString().trim() !== '') {
          filledCount++;
        }
      }
      
      const colLetter = String.fromCharCode(65 + colIdx);
      const colName = COLUMN_NAMES[colIdx];
      const percentage = rows.length > 1 ? Math.round((filledCount / (rows.length - 1)) * 100) : 0;
      
      if (filledCount > 0) {
        console.log(`✅ [${colLetter}] ${colName}: ${filledCount}/${rows.length - 1} (${percentage}%)`);
      } else {
        console.log(`⚠️  [${colLetter}] ${colName}: ว่างเปล่า`);
      }
    }

    // ตรวจสอบปัญหา
    console.log('\n🔍 ตรวจสอบปัญหา');
    console.log('═══════════════════════════════════════════════════════════');
    
    let hasIssues = false;

    // ตรวจสอบ Column I vs Column J
    console.log('\n📌 ตรวจสอบ Column I (ผลที่ออก) vs Column J (ผลแพ้ชนะ)');
    let columnIData = 0;
    let columnJData = 0;
    
    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
      const colI = rows[rowIdx][8];
      const colJ = rows[rowIdx][9];
      
      if (colI && colI.toString().trim() !== '') columnIData++;
      if (colJ && colJ.toString().trim() !== '') columnJData++;
    }
    
    console.log(`   Column I (ผลที่ออก): ${columnIData} แถว`);
    console.log(`   Column J (ผลแพ้ชนะ): ${columnJData} แถว`);
    
    if (columnIData === 0 && columnJData > 0) {
      console.log(`   ⚠️  ปัญหา: ข้อมูลอยู่ใน Column J แทน Column I!`);
      hasIssues = true;
    } else if (columnIData > 0 && columnJData === 0) {
      console.log(`   ✅ ถูกต้อง: ข้อมูลอยู่ใน Column I`);
    } else if (columnIData > 0 && columnJData > 0) {
      console.log(`   ⚠️  ปัญหา: ข้อมูลอยู่ทั้ง Column I และ Column J`);
      hasIssues = true;
    }

    // ตรวจสอบ groupId
    console.log('\n📌 ตรวจสอบ Column Q (ID กลุ่ม)');
    let groupIdData = 0;
    
    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
      const groupId = rows[rowIdx][16];
      if (groupId && groupId.toString().trim() !== '') groupIdData++;
    }
    
    console.log(`   Column Q (ID กลุ่ม): ${groupIdData} แถว`);
    
    if (groupIdData === 0) {
      console.log(`   ⚠️  ปัญหา: ไม่มี groupId ในข้อมูล!`);
      hasIssues = true;
    } else {
      console.log(`   ✅ ถูกต้อง: มี groupId ในข้อมูล`);
    }

    // ตรวจสอบราคา
    console.log('\n📌 ตรวจสอบราคา (Price Range)');
    let priceData = 0;
    
    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
      const message = rows[rowIdx][3]; // Column D
      if (message && message.toString().includes('-')) {
        priceData++;
      }
    }
    
    console.log(`   ข้อมูลที่มีราคา: ${priceData} แถว`);
    
    if (priceData === 0) {
      console.log(`   ⚠️  ปัญหา: ไม่มีข้อมูลราคา!`);
      hasIssues = true;
    } else {
      console.log(`   ✅ ถูกต้อง: มีข้อมูลราคา`);
    }

    // สรุป
    console.log('\n📊 สรุปผลการตรวจสอบ');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (!hasIssues && headerCorrect) {
      console.log('✅ ทั้งหมดถูกต้อง!');
    } else {
      console.log('❌ พบปัญหา:');
      if (!headerCorrect) console.log('   - Header ไม่ตรงกัน');
      if (columnIData === 0 && columnJData > 0) console.log('   - ข้อมูลอยู่ใน Column J แทน Column I');
      if (groupIdData === 0) console.log('   - ไม่มี groupId');
      if (priceData === 0) console.log('   - ไม่มีข้อมูลราคา');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run
verifyBetsSheetData();
