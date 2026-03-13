const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Copy functions from index.js
function calculateWinnings(amount, result) {
  const betAmount = parseInt(amount) || 0;
  
  if (result === '✅') {
    const commission = betAmount * 0.1;
    const winnings = betAmount + (betAmount - commission);
    return {
      commission: commission,
      winnings: winnings,
      net: winnings - betAmount
    };
  } else if (result === '❌') {
    return {
      commission: 0,
      winnings: 0,
      net: -betAmount
    };
  } else if (result === '⛔️') {
    const commission = betAmount * 0.05;
    const returned = betAmount - commission;
    return {
      commission: commission,
      winnings: returned,
      net: -commission
    };
  }
  
  return {
    commission: 0,
    winnings: 0,
    net: 0
  };
}

async function testSummary() {
  try {
    const credentialsPath = path.join(__dirname, 'credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const worksheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${worksheetName}!A:U`,
    });

    const rows = response.data.values || [];
    const bets = [];

    console.log(`📊 Total rows: ${rows.length}\n`);

    // Parse all bets (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 1) continue;

      const groupId = row[16] || '';
      let rowGroupName = row[14] || row[13] || '';
      
      if (!rowGroupName && groupId) {
        rowGroupName = groupId;
      }

      const resultNumber = row[8] || '';
      const resultSymbol = row[9] || '';

      if (!resultSymbol) {
        console.log(`Row ${i + 1}: ❌ ไม่มีผลลัพธ์ (Column J ว่าง)`);
        continue;
      }

      let resultA = resultSymbol;
      let resultB = resultSymbol === '✅' ? '❌' : resultSymbol === '❌' ? '✅' : '⛔️';

      console.log(`Row ${i + 1}: ✅ มีผลลัพธ์ = ${resultSymbol}`);

      bets.push({
        timestamp: row[0],
        userAId: row[1],
        userAName: row[2],
        messageA: row[3],
        fireworkName: row[4],
        betTypeA: row[5],
        amountA: row[6],
        amountB: row[7],
        resultNumber: resultNumber,
        resultA: resultA,
        resultB: resultB,
        userBId: row[17],
        userBName: row[11],
        betTypeB: row[12],
        groupName: rowGroupName,
        groupId: groupId
      });
    }

    console.log(`\n✅ Found ${bets.length} bets with results\n`);

    if (bets.length === 0) {
      console.log('📊 ยังไม่มีการแทงที่มีผลลัพธ์');
      return;
    }

    // Group by pairs
    const pairs = {};
    for (const bet of bets) {
      const pairKey = `${bet.userAName} vs ${bet.userBName}`;
      if (!pairs[pairKey]) {
        pairs[pairKey] = {
          userAName: bet.userAName,
          userBName: bet.userBName,
          bets: []
        };
      }
      pairs[pairKey].bets.push(bet);
    }

    // Generate summary
    let summary = '📊 สรุปยอดแทง 1on1\n';
    summary += '═══════════════════\n\n';

    const uniqueGroups = [...new Set(bets.map(b => b.groupName).filter(g => g))];
    if (uniqueGroups.length > 0) {
      summary += `🏘️  กลุ่มแชท: ${uniqueGroups.join(', ')}\n`;
      summary += '═══════════════════\n\n';
    }

    for (const [pairKey, pairData] of Object.entries(pairs)) {
      let userAWins = 0;
      let userBWins = 0;
      let draws = 0;
      let userATotal = 0;
      let userBTotal = 0;
      let userACommission = 0;
      let userBCommission = 0;

      summary += `🎯 ${pairData.userAName} vs ${pairData.userBName}\n`;

      for (const bet of pairData.bets) {
        const betAmount = Math.min(parseFloat(bet.amountA) || 0, parseFloat(bet.amountB) || 0);

        summary += `\n   📝 ${bet.messageA}\n`;
        summary += `   ผลที่ออก: ${bet.resultNumber}\n`;
        summary += `   ยอดเดิมพัน: ${betAmount} บาท\n`;

        if (bet.resultA === '✅') {
          userAWins++;
          const calcA = calculateWinnings(betAmount, '✅');
          const calcB = calculateWinnings(betAmount, '❌');

          userATotal += calcA.net;
          userBTotal += calcB.net;
          userACommission += calcA.commission;
          userBCommission += calcB.commission;

          summary += `   ✅ ${pairData.userAName} ชนะ\n`;
          summary += `      ได้รับ: ${calcA.winnings.toFixed(0)} บาท (หัก 10%: ${calcA.commission.toFixed(0)} บาท)\n`;
          summary += `      ${pairData.userBName} เสีย: ${betAmount} บาท\n`;
        } else if (bet.resultA === '❌') {
          userBWins++;
          const calcA = calculateWinnings(betAmount, '❌');
          const calcB = calculateWinnings(betAmount, '✅');

          userATotal += calcA.net;
          userBTotal += calcB.net;
          userACommission += calcA.commission;
          userBCommission += calcB.commission;

          summary += `   ❌ ${pairData.userBName} ชนะ\n`;
          summary += `      ${pairData.userAName} เสีย: ${betAmount} บาท\n`;
          summary += `      ได้รับ: ${calcB.winnings.toFixed(0)} บาท (หัก 10%: ${calcB.commission.toFixed(0)} บาท)\n`;
        } else if (bet.resultA === '⛔️') {
          draws++;
          const calcA = calculateWinnings(betAmount, '⛔️');
          const calcB = calculateWinnings(betAmount, '⛔️');

          userATotal += calcA.net;
          userBTotal += calcB.net;
          userACommission += calcA.commission;
          userBCommission += calcB.commission;

          summary += `   🤝 เสมอ\n`;
          summary += `      ${pairData.userAName} ได้รับ: ${calcA.winnings.toFixed(0)} บาท (หัก 5%: ${calcA.commission.toFixed(0)} บาท)\n`;
          summary += `      ${pairData.userBName} ได้รับ: ${calcB.winnings.toFixed(0)} บาท (หัก 5%: ${calcB.commission.toFixed(0)} บาท)\n`;
        }
      }

      summary += `\n   ═══════════════════\n`;
      summary += `   📊 สรุปผลลัพธ์:\n`;
      summary += `   ${pairData.userAName}: ${userAWins} ชนะ | ${userBWins} แพ้ | ${draws} เสมอ\n`;
      summary += `   ${pairData.userBName}: ${userBWins} ชนะ | ${userAWins} แพ้ | ${draws} เสมอ\n`;
      summary += `\n   💰 ยอดรวม:\n`;
      summary += `   ${pairData.userAName}: ${userATotal >= 0 ? '+' : ''}${userATotal.toFixed(0)} บาท (หัก commission: ${userACommission.toFixed(0)} บาท)\n`;
      summary += `   ${pairData.userBName}: ${userBTotal >= 0 ? '+' : ''}${userBTotal.toFixed(0)} บาท (หัก commission: ${userBCommission.toFixed(0)} บาท)\n`;
      summary += `   📝 รายการ: ${pairData.bets.length} ครั้ง\n\n`;
    }

    console.log(summary);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSummary();
