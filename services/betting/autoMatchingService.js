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
      console.log(`🔍 ค้นหาผู้เล่นที่รอการจับคู่: ${fireworkName}`);

      const response = await this.sheets.spreadsheets.values.get({
        auth: this.googleAuth,
        spreadsheetId: this.googleSheetId,
        range: `${this.worksheetName}!A:N`,
      });

      const rows = response.data.values || [];
      const waitingPlayers = [];

      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 10) continue;

        // Column E (index 4) = ชื่อบั้งไฟ
        // Column J (index 9) = ผลแพ้ชนะ User A (ว่างเปล่า = รอการจับคู่)
        const rowFireworkName = row[4] || '';
        const resultA = row[9] || '';

        // ค้นหาบั้งไฟที่ตรงกันและยังไม่มีผลลัพธ์
        if (rowFireworkName.toLowerCase().includes(fireworkName.toLowerCase()) && !resultA) {
          waitingPlayers.push({
            rowIndex: i + 1,
            userA: row[1],
            userAName: row[2],
            messageA: row[3],
            betTypeA: row[5],
            amountA: parseFloat(row[6]) || 0,
            userB: row[11],
            userBName: row[12],
            betTypeB: row[13],
            amountB: parseFloat(row[7]) || 0,
          });
        }
      }

      console.log(`   ✅ พบ ${waitingPlayers.length} ผู้เล่นที่รอการจับคู่`);
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
      console.log(`🎯 จับคู่เล่นอัตโนมัติ: ${fireworkName}`);

      const waitingPlayers = await this.findWaitingPlayers(fireworkName);
      const matchedPairs = [];

      // จับคู่ผู้เล่นตามลำดับ
      for (let i = 0; i < waitingPlayers.length - 1; i++) {
        const playerA = waitingPlayers[i];
        const playerB = waitingPlayers[i + 1];

        // ตรวจสอบว่าชื่อตรงกันหรือไม่
        if (playerA.userAName === playerB.userAName) {
          console.log(`   ⚠️  ผู้เล่นคนเดียวกัน: ${playerA.userAName}`);
          continue;
        }

        // ดึงยอดเงินของผู้เล่น
        const balanceA = playerBalances[playerA.userA] || 0;
        const balanceB = playerBalances[playerB.userA] || 0;

        // ยึดจากคนยอดน้อยกว่า
        const minBalance = Math.min(balanceA, balanceB);
        const maxBetAmount = Math.min(playerA.amountA, playerB.amountA, minBalance);

        // ตรวจสอบว่ายอดเงินเพียงพอหรือไม่
        if (balanceA < maxBetAmount) {
          console.log(`   ❌ ${playerA.userAName} ยอดเงินไม่เพียงพอ (${balanceA} < ${maxBetAmount})`);
          continue;
        }

        if (balanceB < maxBetAmount) {
          console.log(`   ❌ ${playerB.userAName} ยอดเงินไม่เพียงพอ (${balanceB} < ${maxBetAmount})`);
          continue;
        }

        // จับคู่สำเร็จ
        matchedPairs.push({
          playerA: playerA,
          playerB: playerB,
          betAmount: maxBetAmount,
          balanceA: balanceA,
          balanceB: balanceB,
        });

        console.log(`   ✅ จับคู่สำเร็จ: ${playerA.userAName} vs ${playerB.userAName} (${maxBetAmount} บาท)`);
      }

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
  calculateWinLoss(pair, resultSymbol) {
    const betAmount = pair.betAmount;
    let resultA, resultB, winningsA, winningsB;

    if (resultSymbol === '✅') {
      // User A ชนะ
      resultA = '✅';
      resultB = '❌';
      const commission = betAmount * 0.1; // 10% commission
      winningsA = betAmount - commission;
      winningsB = -betAmount;
    } else if (resultSymbol === '❌') {
      // User A แพ้
      resultA = '❌';
      resultB = '✅';
      winningsA = -betAmount;
      const commission = betAmount * 0.1; // 10% commission
      winningsB = betAmount - commission;
    } else {
      // เสมอ
      resultA = '⛔️';
      resultB = '⛔️';
      const commission = betAmount * 0.05; // 5% commission
      winningsA = -commission;
      winningsB = -commission;
    }

    return {
      resultA,
      resultB,
      winningsA,
      winningsB,
    };
  }

  /**
   * อัปเดตผลลัพธ์และยอดเงิน
   * @param {Object} pair - ข้อมูลคู่เล่น
   * @param {Object} winLoss - ผลการคำนวนแพ้ชนะ
   * @returns {Promise<Object>} ผลการอัปเดต
   */
  async updateResultAndBalance(pair, winLoss) {
    try {
      console.log(`📊 อัปเดตผลลัพธ์และยอดเงิน`);

      // อัปเดตผลลัพธ์ในชีท
      await this.sheets.spreadsheets.values.update({
        auth: this.googleAuth,
        spreadsheetId: this.googleSheetId,
        range: `${this.worksheetName}!J${pair.playerA.rowIndex}:K${pair.playerA.rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[winLoss.resultA, winLoss.resultB]],
        },
      });

      console.log(`   ✅ อัปเดตผลลัพธ์สำเร็จ`);

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
  createResultMessage(pair, winLoss) {
    const betAmount = pair.betAmount;
    const fireworkName = pair.playerA.messageA.split(' ')[0] || 'บั้งไฟ';

    let messageA, messageB;

    if (winLoss.resultA === '✅') {
      // User A ชนะ
      messageA = `✅ ชนะแล้ว\n\n` +
        `🎆 บั้งไฟ: ${fireworkName}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `🏆 ได้รับ: ${winLoss.winningsA.toFixed(0)} บาท\n` +
        `👤 ผู้แพ้: ${pair.playerB.userAName}\n\n` +
        `ยินดีด้วย! 🎉`;

      messageB = `❌ แพ้แล้ว\n\n` +
        `🎆 บั้งไฟ: ${fireworkName}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `💸 เสีย: ${Math.abs(winLoss.winningsB).toFixed(0)} บาท\n` +
        `👤 ผู้ชนะ: ${pair.playerA.userAName}\n\n` +
        `ลองใหม่นะ 💪`;
    } else if (winLoss.resultA === '❌') {
      // User A แพ้
      messageA = `❌ แพ้แล้ว\n\n` +
        `🎆 บั้งไฟ: ${fireworkName}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `💸 เสีย: ${Math.abs(winLoss.winningsA).toFixed(0)} บาท\n` +
        `👤 ผู้ชนะ: ${pair.playerB.userAName}\n\n` +
        `ลองใหม่นะ 💪`;

      messageB = `✅ ชนะแล้ว\n\n` +
        `🎆 บั้งไฟ: ${fireworkName}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `🏆 ได้รับ: ${winLoss.winningsB.toFixed(0)} บาท\n` +
        `👤 ผู้แพ้: ${pair.playerA.userAName}\n\n` +
        `ยินดีด้วย! 🎉`;
    } else {
      // เสมอ
      messageA = `⛔️ เสมอ\n\n` +
        `🎆 บั้งไฟ: ${fireworkName}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `💸 ค่าธรรมเนียม: ${Math.abs(winLoss.winningsA).toFixed(0)} บาท\n` +
        `👤 คู่แข่ง: ${pair.playerB.userAName}\n\n` +
        `ผลเสมอ 🤝`;

      messageB = `⛔️ เสมอ\n\n` +
        `🎆 บั้งไฟ: ${fireworkName}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `💸 ค่าธรรมเนียม: ${Math.abs(winLoss.winningsB).toFixed(0)} บาท\n` +
        `👤 คู่แข่ง: ${pair.playerA.userAName}\n\n` +
        `ผลเสมอ 🤝`;
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
