/**
 * Script ตรวจสอบโครงสร้างชีท Bets
 * ดึงข้อมูลจากชีท Bets และตรวจสอบว่าถูกต้องตามโครงสร้าง
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// ตัวแปรสำหรับเก็บข้อมูล
let sheets;
let spreadsheetId;
const BETS_SHEET_NAME = 'Bets';

// โครงสร้างคอลัมน์ที่ต้องการ
const EXPECTED_COLUMNS = {
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
  20: 'U - MATCHED Auto (สถานะการจับคู่)',
};

/**
 * โหลด Credentials จากไฟล์
 */
async function loadCredentials() {
  try {
    const credentialsPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(credentialsPath, 'utf-8');
    
    // ดึง GOOGLE_SHEET_ID จาก .env
    const spreadsheetMatch = envContent.match(/GOOGLE_SHEET_ID=(.+)/);
    if (!spreadsheetMatch) {
      throw new Error('GOOGLE_SHEET_ID not found in .env');
    }
    spreadsheetId = spreadsheetMatch[1].trim();
    
    // ดึง GOOGLE_CREDENTIALS จากไฟล์ credentials.json
    let credentialsJson;
    const credentialsFile = path.join(__dirname, 'credentials.json');
    
    if (fs.existsSync(credentialsFile)) {
      credentialsJson = JSON.parse(fs.readFileSync(credentialsFile, 'utf-8'));
    } else {
      // ลองดึงจาก .env
      const credentialsMatch = envContent.match(/GOOGLE_CREDENTIALS=(.+)/);
      if (!credentialsMatch) {
        throw new Error('GOOGLE_CREDENTIALS not found in .env or credentials.json');
      }
      credentialsJson = JSON.parse(credentialsMatch[1]);
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials: credentialsJson,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Credentials loaded successfully');
    console.log(`   Spreadsheet ID: ${spreadsheetId}`);
  } catch (error) {
    console.error('❌ Error loading credentials:', error.message);
    process.exit(1);
  }
}

/**
 * ดึงข้อมูลจากชีท Bets
 */
async function fetchBetsData() {
  try {
    console.log('\n📊 Fetching data from Bets sheet...');
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${BETS_SHEET_NAME}!A1:U`,
    });
    
    const values = response.data.values || [];
    console.log(`✅ Fetched ${values.length} rows`);
    
    return values;
  } catch (error) {
    console.error('❌ Error fetching data:', error.message);
    process.exit(1);
  }
}

/**
 * ตรวจสอบ Header Row
 */
function verifyHeaderRow(headerRow) {
  console.log('\n📋 Verifying Header Row (Row 1)...');
  console.log('=====================================');
  
  if (!headerRow || headerRow.length === 0) {
    console.error('❌ Header row is empty');
    return false;
  }
  
  console.log(`✅ Header row has ${headerRow.length} columns`);
  
  // แสดง Header
  headerRow.forEach((header, index) => {
    const colLetter = String.fromCharCode(65 + index);
    console.log(`   [${colLetter}] ${header}`);
  });
  
  return true;
}

/**
 * ตรวจสอบ Data Rows
 */
function verifyDataRows(allRows) {
  console.log('\n📊 Verifying Data Rows...');
  console.log('=====================================');
  
  const headerRow = allRows[0];
  const dataRows = allRows.slice(1);
  
  console.log(`📌 Total data rows: ${dataRows.length}`);
  
  if (dataRows.length === 0) {
    console.log('⚠️  No data rows found');
    return [];
  }
  
  // ตรวจสอบแต่ละแถว
  const issues = [];
  
  dataRows.forEach((row, rowIndex) => {
    const actualRowNumber = rowIndex + 2; // Row 1 = Header, Row 2 = First data
    
    // ตรวจสอบจำนวนคอลัมน์
    if (row.length < 21) {
      issues.push({
        row: actualRowNumber,
        issue: `Incomplete row: has ${row.length} columns, expected 21`,
        severity: 'warning',
      });
    }
    
    // ตรวจสอบคอลัมน์ที่สำคัญ
    const timestamp = row[0];
    const userAId = row[1];
    const userAName = row[2];
    const slipName = row[4];
    const sideA = row[5];
    const amount = row[6];
    
    if (!timestamp) {
      issues.push({
        row: actualRowNumber,
        issue: 'Missing Timestamp (Column A)',
        severity: 'error',
      });
    }
    
    if (!userAId) {
      issues.push({
        row: actualRowNumber,
        issue: 'Missing User A ID (Column B)',
        severity: 'error',
      });
    }
    
    if (!userAName) {
      issues.push({
        row: actualRowNumber,
        issue: 'Missing User A Name (Column C)',
        severity: 'error',
      });
    }
    
    if (!slipName) {
      issues.push({
        row: actualRowNumber,
        issue: 'Missing Slip Name (Column E)',
        severity: 'error',
      });
    }
    
    if (!sideA) {
      issues.push({
        row: actualRowNumber,
        issue: 'Missing Side A (Column F)',
        severity: 'error',
      });
    }
    
    if (!amount) {
      issues.push({
        row: actualRowNumber,
        issue: 'Missing Amount (Column G)',
        severity: 'warning',
      });
    }
  });
  
  return { dataRows, issues };
}

/**
 * ตรวจสอบการจับคู่ (Matched Pairs)
 */
function verifyMatchedPairs(dataRows) {
  console.log('\n🔗 Verifying Matched Pairs...');
  console.log('=====================================');
  
  const matchedPairs = [];
  const unmatchedRows = [];
  
  dataRows.forEach((row, index) => {
    const actualRowNumber = index + 2;
    const userBId = row[10]; // Column K
    const userBName = row[11]; // Column L
    
    if (userBId && userBName) {
      // มีคู่
      matchedPairs.push({
        rowNumber: actualRowNumber,
        userA: row[2],
        userB: userBName,
        slipName: row[4],
        sideA: row[5],
        sideB: row[12],
        amountA: row[6],
        amountB: row[7],
      });
    } else {
      // ยังไม่มีคู่
      unmatchedRows.push({
        rowNumber: actualRowNumber,
        userA: row[2],
        slipName: row[4],
        sideA: row[5],
        amountA: row[6],
      });
    }
  });
  
  console.log(`✅ Matched pairs: ${matchedPairs.length}`);
  console.log(`⏳ Unmatched rows: ${unmatchedRows.length}`);
  
  return { matchedPairs, unmatchedRows };
}

/**
 * แสดงรายละเอียดแถว
 */
function displayRowDetails(row, rowNumber) {
  console.log(`\n📌 Row ${rowNumber} Details:`);
  console.log('=====================================');
  
  const columns = [
    { index: 0, name: 'A - Timestamp', value: row[0] },
    { index: 1, name: 'B - User A ID', value: row[1] },
    { index: 2, name: 'C - User A Name', value: row[2] },
    { index: 3, name: 'D - Message A', value: row[3] },
    { index: 4, name: 'E - Slip Name', value: row[4] },
    { index: 5, name: 'F - Side A', value: row[5] },
    { index: 6, name: 'G - Amount A', value: row[6] },
    { index: 7, name: 'H - Amount B', value: row[7] },
    { index: 8, name: 'I - Result', value: row[8] },
    { index: 9, name: 'J - Result Win/Lose', value: row[9] },
    { index: 10, name: 'K - User B ID', value: row[10] },
    { index: 11, name: 'L - User B Name', value: row[11] },
    { index: 12, name: 'M - Side B', value: row[12] },
    { index: 13, name: 'N - Group Chat Name', value: row[13] },
    { index: 14, name: 'O - Group Name', value: row[14] },
    { index: 15, name: 'P - Token A', value: row[15] },
    { index: 16, name: 'Q - Group ID', value: row[16] },
    { index: 17, name: 'R - Token B', value: row[17] },
    { index: 18, name: 'S - Result A', value: row[18] },
    { index: 19, name: 'T - Result B', value: row[19] },
    { index: 20, name: 'U - MATCHED Auto', value: row[20] },
  ];
  
  columns.forEach(col => {
    const status = col.value ? '✅' : '⚠️ ';
    console.log(`${status} [${col.name}]: ${col.value || '(empty)'}`);
  });
}

/**
 * สร้างรายงาน
 */
async function generateReport(allRows) {
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         📊 BETS SHEET STRUCTURE VERIFICATION REPORT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // ตรวจสอบ Header
  const headerRow = allRows[0];
  const headerValid = verifyHeaderRow(headerRow);
  
  // ตรวจสอบ Data Rows
  const { dataRows, issues } = verifyDataRows(allRows);
  
  // ตรวจสอบการจับคู่
  const { matchedPairs, unmatchedRows } = verifyMatchedPairs(dataRows);
  
  // แสดงปัญหา
  if (issues.length > 0) {
    console.log('\n⚠️  Issues Found:');
    console.log('=====================================');
    issues.forEach(issue => {
      const icon = issue.severity === 'error' ? '❌' : '⚠️ ';
      console.log(`${icon} Row ${issue.row}: ${issue.issue}`);
    });
  } else {
    console.log('\n✅ No issues found!');
  }
  
  // แสดงตัวอย่างแถว
  if (dataRows.length > 0) {
    console.log('\n📋 Sample Rows:');
    console.log('=====================================');
    
    // แสดง 3 แถวแรก
    const sampleRows = dataRows.slice(0, 3);
    sampleRows.forEach((row, index) => {
      displayRowDetails(row, index + 2);
    });
    
    // ถ้ามีแถวที่มีคู่ ให้แสดงตัวอย่าง
    if (matchedPairs.length > 0) {
      console.log('\n🔗 Matched Pair Example:');
      console.log('=====================================');
      const pair = matchedPairs[0];
      displayRowDetails(dataRows[pair.rowNumber - 2], pair.rowNumber);
    }
  }
  
  // สรุป
  console.log('\n\n📊 SUMMARY:');
  console.log('=====================================');
  console.log(`Total rows: ${allRows.length}`);
  console.log(`Data rows: ${dataRows.length}`);
  console.log(`Matched pairs: ${matchedPairs.length}`);
  console.log(`Unmatched rows: ${unmatchedRows.length}`);
  console.log(`Issues found: ${issues.length}`);
  
  if (issues.length === 0 && headerValid) {
    console.log('\n✅ Sheet structure is CORRECT!');
  } else {
    console.log('\n❌ Sheet structure has ISSUES!');
  }
}

/**
 * Main Function
 */
async function main() {
  try {
    console.log('🚀 Starting Bets Sheet Structure Verification...\n');
    
    // โหลด Credentials
    await loadCredentials();
    
    // ดึงข้อมูล
    const allRows = await fetchBetsData();
    
    // สร้างรายงาน
    await generateReport(allRows);
    
    console.log('\n✅ Verification completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// รัน Script
main();
