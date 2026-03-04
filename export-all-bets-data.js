#!/usr/bin/env node

/**
 * ดึงข้อมูลทั้งหมดจากชีท Bets (ทุกคอลัมน์)
 * โดยไม่มีการแปลง เพื่อให้เห็นข้อมูลจริง
 */

require('dotenv').config();
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

async function exportAllBetsData() {
  try {
    console.log('\n📊 ดึงข้อมูลทั้งหมดจากชีท Bets (ทุกคอลัมน์)');
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

    // ดึงข้อมูลจากชีท (ทั้งหมด)
    console.log('🔄 ดึงข้อมูลจากชีท...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:Z`, // ดึงทั้งหมด
    });

    const rows = response.data.values || [];
    console.log(`✅ ดึงข้อมูลสำเร็จ (${rows.length} แถว)\n`);

    // บันทึกข้อมูลดิบ
    const rawData = {
      metadata: {
        sheetId: GOOGLE_SHEET_ID,
        worksheet: GOOGLE_WORKSHEET_NAME,
        totalRows: rows.length,
        exportedAt: new Date().toISOString(),
      },
      rows: rows,
    };

    const jsonFile = 'bets-sheet-raw-data.json';
    fs.writeFileSync(jsonFile, JSON.stringify(rawData, null, 2), 'utf8');
    console.log(`✅ บันทึกลงไฟล์: ${jsonFile}\n`);

    // แสดงข้อมูลในรูปแบบตาราง
    console.log('📊 ข้อมูลทั้งหมด (ดิบ)');
    console.log('═══════════════════════════════════════════════════════════\n');

    // แสดง Header
    if (rows.length > 0) {
      console.log('📋 Header (แถวที่ 1):');
      console.log('─────────────────────────────────────────────────────────');
      const headerRow = rows[0];
      for (let i = 0; i < headerRow.length; i++) {
        const colLetter = String.fromCharCode(65 + i);
        console.log(`[${colLetter}] ${i}: "${headerRow[i]}"`);
      }
      console.log('');
    }

    // แสดงข้อมูล
    if (rows.length > 1) {
      console.log('📊 ข้อมูล:');
      console.log('─────────────────────────────────────────────────────────\n');

      for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        console.log(`📍 แถวที่ ${rowIdx + 1}:`);
        console.log('─────────────────────────────────────────────────────────');

        for (let colIdx = 0; colIdx < row.length; colIdx++) {
          const colLetter = String.fromCharCode(65 + colIdx);
          const value = row[colIdx] || '(ว่างเปล่า)';
          console.log(`[${colLetter}] ${colIdx}: "${value}"`);
        }
        console.log('');
      }
    }

    // สรุปข้อมูล
    console.log('📊 สรุปข้อมูล');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📝 จำนวนแถวทั้งหมด: ${rows.length}`);
    console.log(`📝 จำนวนแถวข้อมูล: ${rows.length - 1}`);
    
    if (rows.length > 0) {
      const maxCols = Math.max(...rows.map(r => r.length));
      console.log(`📝 จำนวนคอลัมน์สูงสุด: ${maxCols}`);
      
      // แสดงคอลัมน์ที่มีข้อมูล
      console.log('\n📊 ตรวจสอบคอลัมน์ที่มีข้อมูล:');
      console.log('─────────────────────────────────────────────────────────');
      
      for (let colIdx = 0; colIdx < maxCols; colIdx++) {
        let filledCount = 0;
        let sampleValues = [];
        
        for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
          const value = rows[rowIdx][colIdx];
          if (value && value.toString().trim() !== '') {
            filledCount++;
            if (sampleValues.length < 2) {
              sampleValues.push(value);
            }
          }
        }
        
        const colLetter = String.fromCharCode(65 + colIdx);
        const headerValue = rows[0] ? rows[0][colIdx] : '(ไม่มี header)';
        
        if (filledCount > 0) {
          console.log(`✅ [${colLetter}] ${colIdx}: "${headerValue}"`);
          console.log(`   ข้อมูล: ${filledCount}/${rows.length - 1} แถว`);
          console.log(`   ตัวอย่าง: ${sampleValues.map(v => `"${v}"`).join(', ')}`);
        } else {
          console.log(`⚠️  [${colLetter}] ${colIdx}: "${headerValue}" (ว่างเปล่า)`);
        }
      }
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run
exportAllBetsData();
