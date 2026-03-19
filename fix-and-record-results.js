const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

let googleAuth;

async function initializeGoogleAuth() {
  try {
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json';
    
    if (!fs.existsSync(keyFile)) {
      console.error('❌ Service account key file not found:', keyFile);
      return false;
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    googleAuth = await auth.getClient();
    console.log('✅ Google Auth initialized\n');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Google Auth:', error.message);
    return false;
  }
}

async function checkAndFixResults() {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth: googleAuth });

    // ดึงข้อมูลทั้งหมด
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A2:U`,
    });

    const values = response.data.values || [];
    
    console.log('📊 === ตรวจสอบข้อมูล Bets Sheet ===\n');
    console.log(`📍 ทั้งหมด ${values.length} แถว\n`);

    const issues = [];
    const rowsToFix = [];

    // ตรวจสอบแต่ละแถว
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const rowNum = i + 2; // +2 เพราะ header + 0-indexed
      
      const userAName = row[2]; // Column C
      const messageA = row[3]; // Column D
      const slipName = row[4]; // Column E
      const sideA = row[5]; // Column F
      const amountA = row[6]; // Column G
      const amountB = row[7]; // Column H
      const resultNumber = row[8]; // Column I
      const resultStatusA = row[9]; // Column J
      const resultStatusB = row[10]; // Column K
      const userBName = row[11]; // Column L
      const sideB = row[12]; // Column M
      const resultA = row[18]; // Column S
      const resultB = row[19]; // Column T

      // ตรวจสอบว่าเป็นแถวที่จับคู่แล้ว (มี User B)
      if (amountB && amountB !== '' && userBName && userBName !== '') {
        // ตรวจสอบว่ามีผลลัพธ์หรือไม่
        if (resultNumber && resultNumber !== '') {
          // มีผลลัพธ์ แต่ยังไม่บันทึกลงคอลัมน์ S, T
          if (!resultA || resultA === '') {
            console.log(`⚠️  Row ${rowNum}: มีผลลัพธ์ แต่ยังไม่บันทึกลงคอลัมน์ S`);
            console.log(`   User A: ${userAName} (${sideA}) ${amountA} บาท`);
            console.log(`   User B: ${userBName} (${sideB}) ${amountB} บาท`);
            console.log(`   ผลลัพธ์: ${resultNumber} (${resultStatusA}/${resultStatusB})`);
            console.log(`   Message A: ${messageA}`);
            console.log(`   Side B: "${sideB}"`);
            console.log('');
            
            rowsToFix.push({
              rowNum,
              userAName,
              userBName,
              sideA,
              sideB,
              amountA: parseInt(amountA) || 0,
              amountB: parseInt(amountB) || 0,
              resultNumber,
              resultStatusA,
              resultStatusB,
              messageA,
              slipName,
            });
          }
        }
      }
    }

    console.log(`\n📋 === สรุป ===`);
    console.log(`✅ พบแถวที่ต้องบันทึกผลลัพธ์: ${rowsToFix.length} แถว\n`);

    // บันทึกผลลัพธ์
    if (rowsToFix.length > 0) {
      console.log('📝 === บันทึกผลลัพธ์ ===\n');
      
      const updates = [];
      
      for (const row of rowsToFix) {
        console.log(`📍 Row ${row.rowNum}:`);
        console.log(`   ${row.userAName} (${row.sideA}) vs ${row.userBName} (${row.sideB})`);
        
        // คำนวณยอดแพ้ชนะ
        let amountA, amountB;
        const minAmount = Math.min(row.amountA, row.amountB);
        const fee = Math.round(minAmount * 0.1); // 10% fee
        const netWinAmount = minAmount - fee;
        
        if (row.resultStatusA === '✅') {
          // A ชนะ
          amountA = netWinAmount;
          amountB = -minAmount;
          console.log(`   ✅ ${row.userAName} ชนะ: +${netWinAmount} บาท`);
          console.log(`   ❌ ${row.userBName} แพ้: -${minAmount} บาท`);
        } else if (row.resultStatusA === '❌') {
          // A แพ้
          amountA = -minAmount;
          amountB = netWinAmount;
          console.log(`   ❌ ${row.userAName} แพ้: -${minAmount} บาท`);
          console.log(`   ✅ ${row.userBName} ชนะ: +${netWinAmount} บาท`);
        } else if (row.resultStatusA === '⛔️') {
          // เสมอ
          const drawFee = Math.round(minAmount * 0.05); // 5% fee
          amountA = -drawFee;
          amountB = -drawFee;
          console.log(`   ⛔️ เสมอ: ทั้งสองฝั่งเสีย ${drawFee} บาท`);
        }
        
        // เพิ่ม update
        updates.push({
          range: `${GOOGLE_WORKSHEET_NAME}!S${row.rowNum}`,
          values: [[amountA]],
        });
        
        updates.push({
          range: `${GOOGLE_WORKSHEET_NAME}!T${row.rowNum}`,
          values: [[amountB]],
        });
        
        console.log('');
      }
      
      // บันทึกทั้งหมด
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: GOOGLE_SHEET_ID,
        requestBody: {
          data: updates,
          valueInputOption: 'USER_ENTERED',
        },
      });
      
      console.log(`✅ บันทึกผลลัพธ์สำเร็จ ${rowsToFix.length} แถว`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Details:', error);
  }
}

async function main() {
  const initialized = await initializeGoogleAuth();
  if (initialized) {
    await checkAndFixResults();
  }
}

main().catch(console.error);
