/**
 * PriceRangeMatchingService
 * จัดการการจับคู่เล่นอัตโนมัติแบบร้องราคา (Price Range Matching)
 * - ราคาต้องเดียวกัน
 * - ยอดเงินสามารถต่างกันได้ (ใช้ยอดน้อยกว่า)
 */

class PriceRangeMatchingService {
  /**
   * ตรวจสอบว่าเป็นคู่ที่สามารถจับคู่ได้หรือไม่ (ราคาต่างกันได้)
   * @param {object} bet1 - การเล่นที่ 1
   * @param {object} bet2 - การเล่นที่ 2
   * @returns {boolean} true ถ้าสามารถจับคู่ได้
   */
  static isValidPriceRangePair(bet1, bet2) {
    // 1. ต้องเป็นบั้งไฟเดียวกัน
    if (bet1.slipName !== bet2.slipName) return false;

    // 2. ต้องเป็นฝั่งตรงข้าม (ล ↔ ย)
    // ใช้ sideCode (ล/ย) ไม่ใช่ side (ไล่/ยั้ง)
    const oppositeMap = {
      'ล': 'ย',
      'ย': 'ล',
    };

    const bet1SideCode = bet1.sideCode || bet1.side;
    const bet2SideCode = bet2.sideCode || bet2.side;

    if (oppositeMap[bet1SideCode] !== bet2SideCode) return false;

    // 3. ทั้งคู่ต้องมีราคา (Direct Method ที่มีราคา)
    if (!bet1.price || !bet2.price) return false;

    // 4. ราคาสามารถต่างกันได้ (ไม่ต้องตรวจสอบว่าเท่ากัน)
    // ระบบจะใช้ยอดเงินน้อยกว่าเป็นหลัก

    return true;
  }

  /**
   * ค้นหาคู่เดิมพันแบบราคาเดียวกัน
   * @param {array} bets - ข้อมูลการเล่นทั้งหมด
   * @returns {array} รายชื่อคู่ที่จับได้
   */
  static findPriceRangePairs(bets) {
    const pairs = [];
    const processed = new Set();

    for (let i = 0; i < bets.length; i++) {
      if (processed.has(i)) continue;

      const bet1 = bets[i];
      if (bet1.status === 'MATCHED' || !bet1.price) continue;

      for (let j = i + 1; j < bets.length; j++) {
        if (processed.has(j)) continue;

        const bet2 = bets[j];
        if (bet2.status === 'MATCHED' || !bet2.price) continue;

        if (this.isValidPriceRangePair(bet1, bet2)) {
          // คำนวณจำนวนเงินที่ใช้ (ใช้ยอดน้อยกว่า)
          const betAmount = Math.min(bet1.amount || 0, bet2.amount || 0);

          pairs.push({
            bet1: { ...bet1, index: i },
            bet2: { ...bet2, index: j },
            betAmount,
            matchType: 'price-range',
            slipName: bet1.slipName,
            price: bet1.price,
          });

          processed.add(i);
          processed.add(j);
          break;
        }
      }
    }

    return pairs;
  }

  /**
   * ค้นหาคู่เดิมพันแบบราคาต่างกันสำหรับผู้เล่นใหม่
   * @param {object} newBet - การเล่นใหม่
   * @param {array} existingBets - การเล่นที่มีอยู่แล้ว
   * @returns {object|null} คู่ที่จับได้ หรือ null ถ้าไม่พบ
   */
  static findMatchForNewBet(newBet, existingBets) {
    if (!newBet.price) return null;

    for (let i = 0; i < existingBets.length; i++) {
      const existingBet = existingBets[i];
      if (existingBet.status === 'MATCHED' || !existingBet.price) continue;

      if (this.isValidPriceRangePair(newBet, existingBet)) {
        // คำนวณจำนวนเงินที่ใช้ (ใช้ยอดน้อยกว่า)
        const betAmount = Math.min(newBet.amount || 0, existingBet.amount || 0);

        return {
          existingBet: { ...existingBet, index: i },
          newBet: { ...newBet },
          betAmount,
          matchType: 'price-range',
          slipName: newBet.slipName,
          price: newBet.price,
        };
      }
    }

    return null;
  }

  /**
   * สร้างข้อความแจ้งการจับคู่อัตโนมัติ
   * @param {object} pair - ข้อมูลคู่เล่น
   * @param {string} userAName - ชื่อผู้เล่น A
   * @param {string} userBName - ชื่อผู้เล่น B
   * @returns {object} ข้อความสำหรับทั้งสองฝั่ง
   */
  static createAutoMatchMessage(pair, userAName, userBName) {
    const { slipName, betAmount } = pair;
    const priceA = pair.newBet?.price || pair.price;
    const priceB = pair.existingBet?.price || pair.price;

    const messageA = `✅ จับคู่เล่นสำเร็จ (ร้องราคา)\n\n` +
      `👤 คุณ: ${userAName}\n` +
      `👤 คู่แข่ง: ${userBName}\n` +
      `🎆 บั้งไฟ: ${slipName}\n` +
      `💹 ราคาของคุณ: ${priceA}\n` +
      `💹 ราคาคู่แข่ง: ${priceB}\n` +
      `💰 ยอดเงิน: ${betAmount} บาท\n\n` +
      `⏳ รอการประกาศผล...`;

    const messageB = `✅ จับคู่เล่นสำเร็จ (ร้องราคา)\n\n` +
      `👤 คุณ: ${userBName}\n` +
      `👤 คู่แข่ง: ${userAName}\n` +
      `🎆 บั้งไฟ: ${slipName}\n` +
      `💹 ราคาของคุณ: ${priceB}\n` +
      `💹 ราคาคู่แข่ง: ${priceA}\n` +
      `💰 ยอดเงิน: ${betAmount} บาท\n\n` +
      `⏳ รอการประกาศผล...`;

    const groupMessage = `✅ จับคู่เล่นสำเร็จ (ร้องราคา)\n\n` +
      `👤 ${userAName} vs ${userBName}\n` +
      `🎆 บั้งไฟ: ${slipName}\n` +
      `💹 ราคา A: ${priceA}\n` +
      `💹 ราคา B: ${priceB}\n` +
      `💰 ยอดเงิน: ${betAmount} บาท\n\n` +
      `⏳ รอการประกาศผล...`;

    return {
      messageA,
      messageB,
      groupMessage,
    };
  }

  /**
   * สร้างข้อความแจ้งผลแพ้ชนะสำหรับการจับคู่ราคาต่างกัน
   * @param {object} pair - ข้อมูลคู่เล่น
   * @param {string} userAName - ชื่อผู้เล่น A
   * @param {string} userBName - ชื่อผู้เล่น B
   * @param {number} score - คะแนนที่ออก
   * @param {number} balanceA - ยอดเงินของผู้เล่น A หลังการเล่น
   * @param {number} balanceB - ยอดเงินของผู้เล่น B หลังการเล่น
   * @returns {object} ข้อความผลลัพธ์
   */
  static createResultMessage(pair, userAName, userBName, score, balanceA, balanceB) {
    const { slipName, price, betAmount } = pair;
    
    // ถ้าราคาต่างกัน ให้ใช้ยอดเงินน้อยกว่าเป็นหลัก
    const actualBetAmount = betAmount;
    
    // ตรวจสอบว่าผู้เล่น A เป็นฝั่ง ล (ต่ำ) หรือ ย (สูง)
    const userASide = pair.bet1.side; // ล หรือ ย
    const userBSide = pair.bet2.side; // ย หรือ ล

    // ตรวจสอบว่าคะแนนอยู่ในเกณฑ์ราคา A หรือไม่
    const priceRangeA = this.parsePriceRange(pair.bet1.price);
    const isInRangeA = score >= priceRangeA.min && score <= priceRangeA.max;

    // ตรวจสอบว่าคะแนนอยู่ในเกณฑ์ราคา B หรือไม่
    const priceRangeB = this.parsePriceRange(pair.bet2.price);
    const isInRangeB = score >= priceRangeB.min && score <= priceRangeB.max;

    let resultA, resultB, winningsA, winningsB;

    // ถ้าราคาเดียวกัน
    if (pair.bet1.price === pair.bet2.price) {
      if (userASide === 'ล') {
        // ผู้เล่น A เป็นฝั่ง ล (ต่ำ)
        if (isInRangeA) {
          // คะแนนอยู่ในเกณฑ์ = ฝั่ง ล ชนะ
          resultA = '✅';
          resultB = '❌';
          const commission = actualBetAmount * 0.1;
          winningsA = actualBetAmount - commission;
          winningsB = -actualBetAmount;
        } else {
          // คะแนนไม่อยู่ในเกณฑ์ = ฝั่ง ย ชนะ
          resultA = '❌';
          resultB = '✅';
          winningsA = -actualBetAmount;
          const commission = actualBetAmount * 0.1;
          winningsB = actualBetAmount - commission;
        }
      } else {
        // ผู้เล่น A เป็นฝั่ง ย (สูง)
        if (isInRangeA) {
          // คะแนนอยู่ในเกณฑ์ = ฝั่ง ล ชนะ (ผู้เล่น B)
          resultA = '❌';
          resultB = '✅';
          winningsA = -actualBetAmount;
          const commission = actualBetAmount * 0.1;
          winningsB = actualBetAmount - commission;
        } else {
          // คะแนนไม่อยู่ในเกณฑ์ = ฝั่ง ย ชนะ (ผู้เล่น A)
          resultA = '✅';
          resultB = '❌';
          const commission = actualBetAmount * 0.1;
          winningsA = actualBetAmount - commission;
          winningsB = -actualBetAmount;
        }
      }
    } else {
      // ถ้าราคาต่างกัน ให้ตรวจสอบแต่ละฝั่ง
      // ผู้เล่น A ชนะถ้าคะแนนอยู่ในเกณฑ์ของเขา
      if (isInRangeA) {
        resultA = '✅';
        resultB = '❌';
        const commission = actualBetAmount * 0.1;
        winningsA = actualBetAmount - commission;
        winningsB = -actualBetAmount;
      } else if (isInRangeB) {
        // ผู้เล่น B ชนะถ้าคะแนนอยู่ในเกณฑ์ของเขา
        resultA = '❌';
        resultB = '✅';
        winningsA = -actualBetAmount;
        const commission = actualBetAmount * 0.1;
        winningsB = actualBetAmount - commission;
      } else {
        // ถ้าคะแนนไม่อยู่ในเกณฑ์ของทั้งสองฝั่ง ให้ถือว่าเสมอ
        resultA = '⛔️';
        resultB = '⛔️';
        const commission = actualBetAmount * 0.05;
        winningsA = -commission;
        winningsB = -commission;
      }
    }

    const messageA = this.buildResultMessageForPlayer(
      resultA,
      userAName,
      userBName,
      slipName,
      pair.bet1.price,
      pair.bet2.price,
      actualBetAmount,
      winningsA,
      balanceA
    );

    const messageB = this.buildResultMessageForPlayer(
      resultB,
      userBName,
      userAName,
      slipName,
      pair.bet2.price,
      pair.bet1.price,
      actualBetAmount,
      winningsB,
      balanceB
    );

    return {
      messageA,
      messageB,
      resultA,
      resultB,
      winningsA,
      winningsB,
    };
  }

  /**
   * สร้างข้อความผลลัพธ์สำหรับผู้เล่นคนเดียว
   * @private
   */
  static buildResultMessageForPlayer(result, playerName, opponentName, slipName, playerPrice, opponentPrice, betAmount, winnings, balance) {
    const priceDisplay = playerPrice === opponentPrice 
      ? `💹 ราคา: ${playerPrice}` 
      : `💹 ราคาของคุณ: ${playerPrice}\n💹 ราคาคู่แข่ง: ${opponentPrice}`;

    if (result === '✅') {
      return `✅ ชนะแล้ว\n\n` +
        `🎆 บั้งไฟ: ${slipName}\n` +
        `${priceDisplay}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `🏆 ได้รับ: ${winnings.toFixed(0)} บาท\n` +
        `👤 ผู้แพ้: ${opponentName}\n` +
        `💳 ยอดเงินคงเหลือ: ${balance.toFixed(0)} บาท\n\n` +
        `ยินดีด้วย! 🎉`;
    } else if (result === '❌') {
      return `❌ แพ้แล้ว\n\n` +
        `🎆 บั้งไฟ: ${slipName}\n` +
        `${priceDisplay}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `💸 เสีย: ${Math.abs(winnings).toFixed(0)} บาท\n` +
        `👤 ผู้ชนะ: ${opponentName}\n` +
        `💳 ยอดเงินคงเหลือ: ${balance.toFixed(0)} บาท\n\n` +
        `ลองใหม่นะ 💪`;
    } else {
      // เสมอ
      return `⛔️ เสมอ\n\n` +
        `🎆 บั้งไฟ: ${slipName}\n` +
        `${priceDisplay}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `💸 ค่าธรรมเนียม: ${Math.abs(winnings).toFixed(0)} บาท\n` +
        `👤 คู่แข่ง: ${opponentName}\n` +
        `💳 ยอดเงินคงเหลือ: ${balance.toFixed(0)} บาท\n\n` +
        `ผลเสมอ 🤝`;
    }
  }

  /**
   * บันทึกข้อมูลการจับคู่ลงชีท Bets
   * @param {object} sheets - Google Sheets API instance
   * @param {string} spreadsheetId - Google Sheet ID
   * @param {string} worksheetName - ชื่อชีท (default: 'Bets')
   * @param {object} pair - ข้อมูลคู่เล่น
   * @param {string} userAName - ชื่อผู้เล่น A
   * @param {string} userBName - ชื่อผู้เล่น B
   * @param {string} groupName - ชื่อกลุ่ม
   * @returns {Promise<object>} ผลการบันทึก
   */
  static async recordToGoogleSheets(sheets, spreadsheetId, worksheetName, pair, userAName, userBName, groupName) {
    try {
      const BetsSheetColumns = require('./betsSheetColumns');

      console.log(`📝 Recording matched pair to ${worksheetName} sheet...`);

      // ใช้ pair.price (ราคาที่ตรงกัน)
      const price = pair.price || pair.existingBet.price || pair.newBet.price || '';

      const timestamp = new Date().toLocaleString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      // ใช้ helper สร้างแถว
      const row = BetsSheetColumns.createRow({
        timestamp,
        userAId: pair.existingBet.userId || '',
        userAName: userAName,
        messageA: `${price} ${pair.existingBet.sideCode} ${pair.existingBet.amount} ${pair.slipName}`,
        slipName: pair.slipName,
        sideA: pair.existingBet.sideCode,
        amount: pair.betAmount,
        amountB: pair.betAmount,
        userBId: pair.newBet.userId || '',
        userBName: userBName,
        sideB: pair.newBet.sideCode,
        groupName: groupName || '',
        groupId: pair.newBet.groupId || '',
      });

      console.log(`   📊 Row data (20 columns):`);
      BetsSheetColumns.logRow(row);

      // ดึงจำนวนแถวปัจจุบัน
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${worksheetName}!A:A`,
      });

      const rows = response.data.values || [];
      const nextRowIndex = rows.length + 1;

      console.log(`   📊 Current rows: ${rows.length}, appending to row ${nextRowIndex}`);
      console.log(`   📍 Writing to range: ${worksheetName}!A${nextRowIndex}:T${nextRowIndex}`);

      // บันทึกแถว
      const updateResponse = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${worksheetName}!A${nextRowIndex}:T${nextRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row],
        },
      });

      console.log(`   ✅ Row appended successfully to row ${nextRowIndex}`);
      return {
        success: true,
        rowIndex: nextRowIndex,
        message: `บันทึกข้อมูลสำเร็จ (แถว ${nextRowIndex})`
      };
    } catch (error) {
      console.error(`❌ Failed to record to Google Sheets:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = PriceRangeMatchingService;
