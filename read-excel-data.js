const XLSX = require('xlsx');
const fs = require('fs');

try {
  // อ่านไฟล์ Excel
  const workbook = XLSX.readFile('LINE Betting Bot (1).xlsx');
  
  console.log('📊 Sheet names:', workbook.SheetNames);
  
  // อ่านแต่ละชีท
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n\n📄 === Sheet: ${sheetName} ===`);
    
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // แสดง header
    if (data.length > 0) {
      console.log('\n📋 Header (Row 1):');
      data[0].forEach((col, idx) => {
        const colLetter = String.fromCharCode(65 + idx);
        console.log(`  [${colLetter}] ${col}`);
      });
      
      // แสดง 5 แถวแรก
      console.log('\n📊 Data (First 5 rows):');
      for (let i = 1; i < Math.min(6, data.length); i++) {
        console.log(`\nRow ${i + 1}:`);
        data[i].forEach((cell, idx) => {
          const colLetter = String.fromCharCode(65 + idx);
          if (cell !== undefined && cell !== null && cell !== '') {
            console.log(`  [${colLetter}] ${cell}`);
          }
        });
      }
      
      console.log(`\n📈 Total rows: ${data.length}`);
    }
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
