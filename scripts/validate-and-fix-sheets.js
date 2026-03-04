#!/usr/bin/env node

/**
 * Script: ตรวจสอบและแก้ไขคอลัมน์ใน Google Sheets
 * 
 * วิธีใช้:
 *   node scripts/validate-and-fix-sheets.js
 */

const sheetsColumnValidator = require('../services/betting/sheetsColumnValidator');

async function main() {
  try {
    // Initialize
    await sheetsColumnValidator.initialize();

    // Validate and fix all sheets
    const result = await sheetsColumnValidator.validateAndFixAll();

    if (result.success) {
      console.log('✅ ทั้งหมดเสร็จสิ้น');
      process.exit(0);
    } else {
      console.error('❌ เกิดข้อผิดพลาด:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    process.exit(1);
  }
}

main();
