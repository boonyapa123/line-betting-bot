const { google } = require('googleapis');

/**
 * ระบบจับคู่เล่นอัตโนมัติและคำนวนแพ้ชนะ
 */
class AutoMatchingService {
  constructor(googleAuth, googleSheetId, worksheetName = 'Bets') {
    this.googleAuth = googleAuth;
    this.googleSheetId = googleSheetId;
    this.worksheetName = worksheetName;
    this.sheets = google.sheets({ version: 'v4', auth: googleAuth });
  }

  /**
   * ค้นหาผู้เล่นที่รอการจับคู่ตามชื่อบั้งไฟ
   * @param {string} fireworkName - ชื่อบั้งไฟ
   * @returns {Promise<Array>} รายชื่อผู้เล่นที่รอการจับคู่
   */
  async findWaitingPlayers(fireworkName) {
    try {
      console.log(`🔍 ค้นหาผู้เล่นที่รอประกาศผล: ${fireworkName}`);

      const response = await this.sheets.spreadsheets.values.get({
        auth: this.googleAuth,
        spreadsheetId: this.googleSheetId,
        range: `${this.worksheetName}!A:U`,
      });

      const rows = response.data.values || [];
      const waitingPlayers = [];

      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 10) continue;

        // Column E (index 4) = ชื่อบั้งไฟ
        // Column H (index 7) = ยอดเงิน B (มีค่า = จับคู่สำเร็จแล้ว)
        // Column I (index 8) = ผลที่ออก (ว่าง = ยังไม่มีผลลัพธ์)
        // Column J (index 9) = ผลแพ้ชนะ User A (ว่าง = ยังไม่ประกาศผล)
        // Column L (index 11) = ชื่อ User B
        // Column R (index 17) = User B ID
        const rowFireworkName = (row[4] || '').trim();
        const amountB = row[7] || '';
        const resultNumber = row[8] || '';
        const resultA = row[9] || '';
        const userBName = row[11] || '';
        const userBId = row[17] || '';

        // ✅ เงื่อนไขที่ถูกต้อง:
        // 1. ชื่อบั้งไฟต้องตรงกัน (exact match)
        // 2. ต้องจับคู่สำเร็จแล้ว (Column H มีค่า + Column L มีชื่อ User B)
        // 3. ยังไม่มีผลลัพธ์ (Column I ว่าง + Column J ว่าง)
        if (
          rowFireworkName === fireworkName.trim() &&
          amountB && amountB !== '' &&
          userBName && userBName !== '' &&
          !resultNumber &&
          !resultA
        ) {
          waitingPlayers.push({
            rowIndex: i + 1,
            userA: row[1],
            userAName: row[2],
            messageA: row[3],
            fireworkName: rowFireworkName,  // ชื่อบั้งไฟจาก Column E
            betTypeA: row[5],
            amountA: parseFloat(row[6]) || 0,
            userB: userBId || row[1],  // User B ID จาก Column R
            userBName: userBName,
            betTypeB: row[12] || '',   // Column M = รายการแทง B
            amountB: parseFloat(amountB) || 0,
          });
        }
      }

      console.log(`   ✅ พบ ${waitingPlayers.length} รายการที่รอประกาศผล (บั้งไฟ: ${fireworkName})`);
      return waitingPlayers;
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      return [];
    }
  }

  /**
   * จับคู่เล่นอัตโนมัติตามชื่อบั้งไฟ
   * @param {string} fireworkName - ชื่อบั้งไฟ
   * @param {Array} playerBalances - ข้อมูลยอดเงินของผู้เล่น
   * @returns {Promise<Array>} รายชื่อคู่ที่จับคู่สำเร็จ
   */
  async autoMatchPlayers(fireworkName, playerBalances) {
    try {
      console.log(`🎯 ค้นหาคู่เล่นที่รอประกาศผล: ${fireworkName}`);

      const waitingPlayers = await this.findWaitingPlayers(fireworkName);
      const matchedPairs = [];

      // แต่ละแถวคือคู่ที่จับคู่สำเร็จแล้ว (User A + User B อยู่ในแถวเดียวกัน)
      for (const player of waitingPlayers) {
        // ตรวจสอบว่ามี User B จริง
        if (!player.userB || !player.userBName) {
          console.log(`   ⚠️  Row ${player.rowIndex}: ไม่มี User B ข้าม`);
          continue;
        }

        // ดึงยอดเงินของผู้เล่น
        const balanceA = playerBalances[player.userA] || 0;
        const balanceB = playerBalances[player.userB] || 0;

        // ใช้ยอดเดิมพันที่น้อยกว่า
        const betAmount = Math.min(player.amountA, player.amountB) || player.amountA || player.amountB;

        matchedPairs.push({
          playerA: player,
          playerB: {
            rowIndex: player.rowIndex,
            userA: player.userB,
            userAName: player.userBName,
            betTypeA: player.betTypeB,
            amountA: player.amountB,
          },
          betAmount: betAmount,
          balanceA: balanceA,
          balanceB: balanceB,
        });

        console.log(`   ✅ คู่เล่น Row ${player.rowIndex}: ${player.userAName} vs ${player.userBName} (${betAmount} บาท)`);
      }

      console.log(`   📋 รวม ${matchedPairs.length} คู่ที่รอประกาศผล (บั้งไฟ: ${fireworkName})`);
      return matchedPairs;
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      return [];
    }
  }

  /**
   * คำนวนแพ้ชนะ
   * @param {Object} pair - ข้อมูลคู่เล่น
   * @param {string} resultSymbol - ผลลัพธ์ (✅ = ชนะ, ❌ = แพ้, ⛔️ = เสมอ)
   * @returns {Object} ผลการคำนวน
   */
  calculateWinLoss(pair, resultSymbol, resultNumber = null) {
    const betAmount = pair.betAmount;
    let resultA, resultB, winningsA, winningsB;

    // ถ้ามี resultNumber และ messageA มีช่วงราคา → ใช้ checkPriceRangeResult
    const messageA = pair.playerA.messageA || '';
    const priceMatch = messageA.match(/(\d+)-(\d+)/);
    
    if (resultNumber && priceMatch) {
      const bettingResultService = require('./bettingResultService');
      
      // สร้าง bet objects สำหรับ checkPriceRangeResult
      const bet1 = {
        userId: pair.playerA.userA,
        price: `${priceMatch[1]}-${priceMatch[2]}`,
        sideCode: pair.playerA.betTypeA || '',
        side: pair.playerA.betTypeA || '',
      };
      const bet2 = {
        userId: pair.playerB.userA,
        sideCode: pair.playerB.betTypeA || '',
        side: pair.playerB.betTypeA || '',
      };
      
      const priceResult = bettingResultService.checkPriceRangeResult(bet1, bet2, resultNumber);
      
      if (priceResult) {
        if (priceResult.isDraw) {
          const commission = betAmount * 0.05;
          return { resultA: '⛔️', resultB: '⛔️', winningsA: -commission, winningsB: -commission };
        }
        
        const commission = betAmount * 0.1;
        if (priceResult.winnerUserId === pair.playerA.userA) {
          return { resultA: '✅', resultB: '❌', winningsA: betAmount - commission, winningsB: -betAmount };
        } else {
          return { resultA: '❌', resultB: '✅', winningsA: -betAmount, winningsB: betAmount - commission };
        }
      }
    }

    // Fallback: ใช้ resultSymbol ตรงๆ (กรณีไม่มีช่วงราคา)
    if (resultSymbol === '✅') {
      resultA = '✅';
      resultB = '❌';
      const commission = betAmount * 0.1;
      winningsA = betAmount - commission;
      winningsB = -betAmount;
    } else if (resultSymbol === '❌') {
      resultA = '❌';
      resultB = '✅';
      winningsA = -betAmount;
      const commission = betAmount * 0.1;
      winningsB = betAmount - commission;
    } else {
      resultA = '⛔️';
      resultB = '⛔️';
      const commission = betAmount * 0.05;
      winningsA = -commission;
      winningsB = -commission;
    }

    return { resultA, resultB, winningsA, winningsB };
  }

  /**
   * อัปเดตผลลัพธ์และยอดเงิน
   * @param {Object} pair - ข้อมูลคู่เล่น
   * @param {Object} winLoss - ผลการคำนวนแพ้ชนะ
   * @returns {Promise<Object>} ผลการอัปเดต
   */
  async updateResultAndBalance(pair, winLoss, resultNumber = null) {
    try {
      console.log(`📊 อัปเดตผลลัพธ์และยอดเงิน Row ${pair.playerA.rowIndex}`);

      const rowIndex = pair.playerA.rowIndex;

      // อัปเดต Column I (ผลที่ออก) ถ้ามี resultNumber
      if (resultNumber) {
        await this.sheets.spreadsheets.values.update({
          auth: this.googleAuth,
          spreadsheetId: this.googleSheetId,
          range: `${this.worksheetName}!I${rowIndex}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[resultNumber]],
          },
        });
      }

      // อัปเดต Column J, K (ผลแพ้ชนะ A, B)
      await this.sheets.spreadsheets.values.update({
        auth: this.googleAuth,
        spreadsheetId: this.googleSheetId,
        range: `${this.worksheetName}!J${rowIndex}:K${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[winLoss.resultA, winLoss.resultB]],
        },
      });

      // อัปเดต Column S, T (ยอดเงินได้/เสีย A, B)
      await this.sheets.spreadsheets.values.update({
        auth: this.googleAuth,
        spreadsheetId: this.googleSheetId,
        range: `${this.worksheetName}!S${rowIndex}:T${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[winLoss.winningsA, winLoss.winningsB]],
        },
      });

      console.log(`   ✅ อัปเดตผลลัพธ์สำเร็จ (J: ${winLoss.resultA}, K: ${winLoss.resultB}, S: ${winLoss.winningsA}, T: ${winLoss.winningsB})`);

      return {
        success: true,
        resultA: winLoss.resultA,
        resultB: winLoss.resultB,
        winningsA: winLoss.winningsA,
        winningsB: winLoss.winningsB,
      };
    } catch (error) {
      console.error(`❌ ข้อผิดพลาด: ${error.message}`);
      throw error;
    }
  }

  /**
   * สร้างข้อความแจ้งผลแพ้ชนะ
   * @param {Object} pair - ข้อมูลคู่เล่น
   * @param {Object} winLoss - ผลการคำนวนแพ้ชนะ
   * @returns {Object} ข้อความสำหรับผู้เล่นทั้งสอง
   */
  /**
     * สร้างข้อความแจ้งผลแพ้ชนะ
     * @param {Object} pair - ข้อมูลคู่เล่น
     * @param {Object} winLoss - ผลการคำนวนแพ้ชนะ
     * @param {Object} balances - ยอดเงินหลังการเล่น {userA: balance, userB: balance}
     * @returns {Object} ข้อความสำหรับผู้เล่นทั้งสอง
     */
    createResultMessage(pair, winLoss, balances = {}) {
      const betAmount = pair.betAmount;
      const fireworkName = pair.playerA.fireworkName || pair.playerA.messageA.split(' ')[0] || 'บั้งไฟ';

      // ใช้ยอดเงินที่ส่งมา หรือคำนวนจากยอดเดิม
      const balanceA = balances.userA !== undefined ? balances.userA : (pair.balanceA + winLoss.winningsA);
      const balanceB = balances.userB !== undefined ? balances.userB : (pair.balanceB + winLoss.winningsB);

      let messageA, messageB;

      if (winLoss.resultA === '✅') {
        // User A ชนะ
        messageA = `✅ ชนะแล้ว\n\n` +
          `🎆 บั้งไฟ: ${fireworkName}\n` +
          `💰 เดิมพัน: ${betAmount} บาท\n` +
          `🏆 ได้รับ: ${winLoss.winningsA.toFixed(0)} บาท\n` +
          `👤 ผู้แพ้: ${pair.playerB.userAName}\n` +
          `💳 ยอดเงินคงเหลือ: ${balanceA.toFixed(0)} บาท\n\n` +
          `ยินดีด้วย! 🎉`;

        messageB = `❌ แพ้แล้ว\n\n` +
          `🎆 บั้งไฟ: ${fireworkName}\n` +
          `💰 เดิมพัน: ${betAmount} บาท\n` +
          `💸 เสีย: ${Math.abs(winLoss.winningsB).toFixed(0)} บาท\n` +
          `👤 ผู้ชนะ: ${pair.playerA.userAName}\n` +
          `💳 ยอดเงินคงเหลือ: ${balanceB.toFixed(0)} บาท\n\n` +
          `ลองใหม่นะ 💪`;
      } else if (winLoss.resultA === '❌') {
        // User A แพ้
        messageA = `❌ แพ้แล้ว\n\n` +
          `🎆 บั้งไฟ: ${fireworkName}\n` +
          `💰 เดิมพัน: ${betAmount} บาท\n` +
          `💸 เสีย: ${Math.abs(winLoss.winningsA).toFixed(0)} บาท\n` +
          `👤 ผู้ชนะ: ${pair.playerB.userAName}\n` +
          `💳 ยอดเงินคงเหลือ: ${balanceA.toFixed(0)} บาท\n\n` +
          `ลองใหม่นะ 💪`;

        messageB = `✅ ชนะแล้ว\n\n` +
          `🎆 บั้งไฟ: ${fireworkName}\n` +
          `💰 เดิมพัน: ${betAmount} บาท\n` +
          `🏆 ได้รับ: ${winLoss.winningsB.toFixed(0)} บาท\n` +
          `👤 ผู้แพ้: ${pair.playerA.userAName}\n` +
          `💳 ยอดเงินคงเหลือ: ${balanceB.toFixed(0)} บาท\n\n` +
          `ยินดีด้วย! 🎉`;
      } else {
        // เสมอ
        messageA = `⛔️ เสมอ\n\n` +
          `🎆 บั้งไฟ: ${fireworkName}\n` +
          `💰 เดิมพัน: ${betAmount} บาท\n` +
          `💸 ค่าธรรมเนียม: ${Math.abs(winLoss.winningsA).toFixed(0)} บาท\n` +
          `👤 คู่แข่ง: ${pair.playerB.userAName}\n` +
          `💳 ยอดเงินคงเหลือ: ${balanceA.toFixed(0)} บาท\n\n` +
          `ผลเสมอ ⛔️`;

        messageB = `⛔️ เสมอ\n\n` +
          `🎆 บั้งไฟ: ${fireworkName}\n` +
          `💰 เดิมพัน: ${betAmount} บาท\n` +
          `💸 ค่าธรรมเนียม: ${Math.abs(winLoss.winningsB).toFixed(0)} บาท\n` +
          `👤 คู่แข่ง: ${pair.playerA.userAName}\n` +
          `💳 ยอดเงินคงเหลือ: ${balanceB.toFixed(0)} บาท\n\n` +
          `ผลเสมอ ⛔️`;
      }

      return {
        messageA,
        messageB,
      };
    }

  /**
   * สร้างข้อความแจ้งยอดเงินไม่เพียงพอ
   * @param {Object} player - ข้อมูลผู้เล่น
   * @param {number} balance - ยอดเงินปัจจุบัน
   * @param {number} requiredAmount - จำนวนเงินที่ต้องการ
   * @returns {string} ข้อความแจ้ง
   */
  createInsufficientBalanceMessage(player, balance, requiredAmount) {
    const shortfall = requiredAmount - balance;
    return `❌ ยอดเงินไม่เพียงพอ\n\n` +
      `ชื่อ: ${player.userAName}\n` +
      `ยอดเงินปัจจุบัน: ${balance.toFixed(0)} บาท\n` +
      `ต้องการ: ${requiredAmount.toFixed(0)} บาท\n` +
      `ขาดอีก: ${shortfall.toFixed(0)} บาท\n\n` +
      `กรุณาเติมเงินเพิ่มเติม 💰`;
  }
}

module.exports = AutoMatchingService;
