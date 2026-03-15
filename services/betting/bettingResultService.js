/**
 * BettingResultService
 * จัดการผลลัพธ์การเล่น คำนวณค่าธรรมเนียม และแจ้งเตือน LINE
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { LineNotificationService } = require('../line/lineNotificationService');
const bettingPairingService = require('./bettingPairingService');

class BettingResultService {
  constructor() {
    // สร้าง notification service สำหรับแต่ละ Account (Account 1 & 2)
    this.lineNotificationServices = {
      1: new LineNotificationService(1),
      2: new LineNotificationService(2),
    };
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.betsSheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';
    this.FEE_PERCENTAGE = 0.10; // 10% ค่าธรรมเนียมจากยอดเล่น
    this.DRAW_FEE_PERCENTAGE = 0.05; // 5% ค่าธรรมเนียมออกกลาง
  }

  /**
   * Initialize Google Sheets API
   */
  async initialize() {
    try {
      let credentials;

      if (process.env.GOOGLE_CREDENTIALS_JSON) {
        credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      } else {
        const credentialsPath = path.join(
          __dirname,
          '../../',
          process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'credentials.json'
        );
        credentials = JSON.parse(fs.readFileSync(credentialsPath));
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
    } catch (error) {
      console.error('Error initializing BettingResultService:', error);
      throw error;
    }
  }

  /**
   * Ensure initialization is complete
   */
  async ensureInitialized() {
    if (!this.sheets) {
      await this.initialize();
    }
  }

  /**
   * คำนวณค่าธรรมเนียมและผลลัพธ์
   * @param {object} pair - คู่การเล่น {bet1, bet2}
   * @param {string} slipName - ชื่อบั้งไฟ
   * @param {number} score - คะแนนที่ออก
   * @returns {object} ผลลัพธ์พร้อมค่าธรรมเนียม
   */
  calculateResultWithFees(pair, slipName, score) {
    const { bet1, bet2 } = pair;
    
    // ตรวจสอบช่วงราคาก่อน
    const priceRangeResult = this.checkPriceRangeResult(bet1, bet2, score);
    
    // ถ้าเป็นการเล่นแบบร้องราคา ให้ใช้ผลจาก checkPriceRangeResult
    if (priceRangeResult) {
      const { isDraw, winnerUserId, loserUserId } = priceRangeResult;
      
      // ใช้ยอดเดิมพันที่น้อยกว่า (ยอดที่จับคู่ได้จริง)
      const winAmount = Math.min(bet1.amount || 0, bet2.amount || 0) || bet1.amount || bet2.amount || 0;

      if (isDraw) {
        // ออกกลาง: หัก 5% ทั้งสองฝั่ง
        const drawFee = Math.round(winAmount * this.DRAW_FEE_PERCENTAGE);
        return {
          isDraw: true,
          winner: bet1,
          loser: bet2,
          pair,
          winAmount,
          drawFee,
          winner: {
            ...bet1,
            netAmount: -drawFee,
            grossAmount: 0,
            fee: drawFee,
            feeType: 'DRAW',
          },
          loser: {
            ...bet2,
            netAmount: -drawFee,
            grossAmount: 0,
            fee: drawFee,
            feeType: 'DRAW',
          },
        };
      } else {
        // ชนะ-แพ้ปกติ: หัก 10% จากยอดเล่น
        const fee = Math.round(winAmount * this.FEE_PERCENTAGE);
        const netWinAmount = winAmount - fee;

        // กำหนด winner และ loser ตามที่ checkPriceRangeResult ส่งกลับ
        const winner = winnerUserId === bet1.userId ? bet1 : bet2;
        const loser = loserUserId === bet1.userId ? bet1 : bet2;

        return {
          isDraw: false,
          winner,
          loser,
          pair,
          winAmount,
          fee,
          winner: {
            ...winner,
            grossAmount: winAmount,
            netAmount: netWinAmount,
            fee,
            feeType: 'WIN',
          },
          loser: {
            ...loser,
            grossAmount: -winAmount,
            netAmount: -winAmount,
            fee: 0,
            feeType: 'LOSE',
          },
        };
      }
    }
    
    // ถ้าไม่ใช่การเล่นแบบร้องราคา ให้ใช้ bettingPairingService
    const baseResult = bettingPairingService.constructor.calculateResult(
      pair,
      slipName,
      score
    );

    // ใช้ยอดเดิมพันที่น้อยกว่า (ยอดที่จับคู่ได้จริง)
    const winAmount = Math.min(bet1.amount || 0, bet2.amount || 0) || bet1.amount || bet2.amount || 0;

    // ตรวจสอบว่า baseResult มี isDraw หรือไม่
    if (baseResult.isDraw) {
      // ออกกลาง: หัก 5% ทั้งสองฝั่ง
      const drawFee = Math.round(winAmount * this.DRAW_FEE_PERCENTAGE);
      return {
        ...baseResult,
        pair,
        isDraw: true,
        winAmount,
        drawFee,
        winner: {
          ...baseResult.winner,
          netAmount: -drawFee,
          grossAmount: 0,
          fee: drawFee,
          feeType: 'DRAW',
        },
        loser: {
          ...baseResult.loser,
          netAmount: -drawFee,
          grossAmount: 0,
          fee: drawFee,
          feeType: 'DRAW',
        },
      };
    }

    // ชนะ-แพ้ปกติ: หัก 10% จากยอดเล่น
    const fee = Math.round(winAmount * this.FEE_PERCENTAGE);
    const netWinAmount = winAmount - fee;

    return {
      ...baseResult,
      pair,
      isDraw: false,
      winAmount,
      fee,
      winner: {
        ...baseResult.winner,
        grossAmount: winAmount,
        netAmount: netWinAmount,
        fee,
        feeType: 'WIN',
      },
      loser: {
        ...baseResult.loser,
        grossAmount: -winAmount,
        netAmount: -winAmount,
        fee: 0,
        feeType: 'LOSE',
      },
    };
  }

  /**
   * ตรวจสอบผลลัพธ์ของการเล่นแบบร้องราคา
   * @private
   * @returns {object} { isDraw, winner, loser } หรือ null ถ้าไม่ใช่ร้องราคา
   */
  checkPriceRangeResult(bet1, bet2, score) {
    // เอาช่วงราคาจาก bet1.price (ควรเป็นเฉพาะช่วงราคา เช่น "360-400")
    const hasPriceRange = bet1.price && bet1.price.includes('-');

    console.log(`   🔍 checkPriceRangeResult: bet1.price=${bet1.price}, hasPriceRange=${hasPriceRange}, score=${score}`);

    if (!hasPriceRange) {
      console.log(`   ⚠️  No price range found, returning null`);
      return null;
    }

    const priceRange = bettingPairingService.constructor.parsePriceRange(bet1.price);
    const inRange = score >= priceRange.min && score <= priceRange.max;

    console.log(`   💹 Price Range: ${priceRange.min}-${priceRange.max}, inRange=${inRange}`);

    // ถ้าผลออกในช่วง → เสมอ (คืนเงิน)
    if (inRange) {
      console.log(`   ✅ Result in range → DRAW`);
      return { isDraw: true, winnerUserId: null, loserUserId: null };
    }

    // ผลออกนอกช่วง → ตรวจสอบตามกฎ ย/ล
    // ย = ต่ำ (ยิ่งต่ำยิ่งดี) → ชนะเมื่อผลต่ำกว่าช่วง
    // ล = สูง (ลูกศรขึ้น = สูง) → ชนะเมื่อผลสูงกว่าช่วง
    
    // ✅ ตรวจสอบ sideCode แทน price
    const bet1SideCode = bet1.sideCode || bet1.side;
    const bet2SideCode = bet2.sideCode || bet2.side;
    
    console.log(`   🔍 Checking sides: bet1=${bet1SideCode}, bet2=${bet2SideCode}`);

    // ตรวจสอบ bet1 ก่อน
    if (bet1SideCode === 'ย' || bet1SideCode === 'ต' || bet1SideCode === 'ชถ' || bet1SideCode === 'ชย' || bet1SideCode === 'ยั้ง') {
      // ฝ่าย ย/ต (ต่ำ): ชนะเมื่อผลต่ำกว่าช่วง
      console.log(`   📊 bet1 is YANG (ต่ำ)`);
      if (score < priceRange.min) {
        console.log(`   ✅ Score ${score} < min ${priceRange.min} → bet1 wins`);
        return { isDraw: false, winnerUserId: bet1.userId, loserUserId: bet2.userId };
      } else {
        console.log(`   ❌ Score ${score} >= min ${priceRange.min} → bet2 wins`);
        return { isDraw: false, winnerUserId: bet2.userId, loserUserId: bet1.userId };
      }
    }

    if (bet1SideCode === 'ล' || bet1SideCode === 'ไล่' || bet1SideCode === 'ชล' || bet1SideCode === 'ไล่ว') {
      // ฝ่าย ล/ไล่ (สูง): ชนะเมื่อผลสูงกว่าช่วง
      console.log(`   📊 bet1 is LOW (สูง)`);
      if (score > priceRange.max) {
        console.log(`   ✅ Score ${score} > max ${priceRange.max} → bet1 wins`);
        return { isDraw: false, winnerUserId: bet1.userId, loserUserId: bet2.userId };
      } else {
        console.log(`   ❌ Score ${score} <= max ${priceRange.max} → bet2 wins`);
        return { isDraw: false, winnerUserId: bet2.userId, loserUserId: bet1.userId };
      }
    }

    // ถ้าไม่มี ย หรือ ล → bet2 ชนะ
    console.log(`   ⚠️  Unknown side code: ${bet1SideCode} → bet2 wins`);
    return { isDraw: false, winnerUserId: bet2.userId, loserUserId: bet1.userId };
  }

  /**
   * ตรวจสอบว่าเป็นการออกกลาง (draw) หรือไม่
   * @private
   */
  isDrawResult(bet1, bet2, score) {
    // ถ้าทั้งสองฝั่งเป็น REPLY method ให้ถือว่าออกกลาง
    if (bet1.method === 'REPLY' && bet2.method === 'REPLY') {
      return true;
    }

    // ถ้าเป็น Direct Method ตรวจสอบตามกฎเกม
    if (bet1.method === 2 && bet2.method === 2) {
      const priceRangeResult = this.checkPriceRangeResult(bet1, bet2, score);
      if (priceRangeResult) {
        return priceRangeResult.isDraw;
      }
    }

    return false;
  }

  /**
   * บันทึกผลลัพธ์ลงชีท Bets (อัปเดตแถวที่จับคู่ไปแล้ว)
   * @param {object} result - ผลลัพธ์
   * @param {string} slipName - ชื่อบั้งไฟ
   * @param {number} score - คะแนนที่ออก
   */
  async recordResult(result, slipName, score) {
    try {
      await this.ensureInitialized();

      const { bet1, bet2 } = result.pair;
      const { winner, loser, isDraw } = result;

      // ค้นหาแถวที่จับคู่ไปแล้ว
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.betsSheetName}!A2:U`,
      });

      const values = response.data.values || [];
      let matchedRowIndex = -1;

      // ค้นหาแถวที่มี User A + User B ของบั้งไฟนี้
      for (let i = 0; i < values.length; i++) {
        const row = values[i];
        const userAName = row[2]; // Column C
        const userBName = row[11]; // Column L
        const rowSlipName = row[4]; // Column E
        const userBAmount = row[7]; // Column H (ถ้ามีค่า = MATCHED)

        // ✅ ใช้ bet1.userBName แทน bet2.displayName
        const expectedUserBName = bet1.userBName || bet2.displayName;

        if (
          rowSlipName === slipName &&
          userBAmount !== undefined &&
          userBAmount !== '' &&
          userAName === bet1.displayName &&
          userBName === expectedUserBName
        ) {
          matchedRowIndex = i + 2; // +2 เพราะ header + 0-indexed
          break;
        }
      }

      if (matchedRowIndex === -1) {
        console.warn(`No matched row found for slip: ${slipName}`);
        console.warn(`   Looking for: ${bet1.displayName} vs ${bet1.userBName || bet2.displayName}`);
        return { success: false, error: 'No matched row found' };
      }

      // อัปเดตผลลัพธ์
      const updates = [];

      // Column I: ผลที่ออก
      updates.push({
        range: `${this.betsSheetName}!I${matchedRowIndex}`,
        values: [[score]],
      });

      // Column J: ผลแพ้ชนะ A (Symbol: ✅/❌/⛔️)
      const resultStatusA = isDraw ? '⛔️' : (result.winner.userId === bet1.userId ? '✅' : '❌');
      updates.push({
        range: `${this.betsSheetName}!J${matchedRowIndex}`,
        values: [[resultStatusA]],
      });

      // Column K: ผลแพ้ชนะ B (Symbol: ✅/❌/⛔️) - ตรงข้ามกับ A
      const resultStatusB = isDraw ? '⛔️' : (result.winner.userId === bet1.userId ? '❌' : '✅');
      updates.push({
        range: `${this.betsSheetName}!K${matchedRowIndex}`,
        values: [[resultStatusB]],
      });

      // Column S: ยอดเงิน A (ได้/เสีย)
      let amountA;
      if (isDraw) {
        amountA = -result.drawFee;
      } else if (result.winner.userId === bet1.userId) {
        amountA = result.winner.netAmount;
      } else {
        amountA = result.loser.netAmount;
      }
      updates.push({
        range: `${this.betsSheetName}!S${matchedRowIndex}`,
        values: [[amountA]],
      });

      // Column T: ยอดเงิน B (ได้/เสีย)
      let amountB;
      if (isDraw) {
        amountB = -result.drawFee;
      } else if (result.winner.userId === bet2.userId) {
        amountB = result.winner.netAmount;
      } else {
        amountB = result.loser.netAmount;
      }
      updates.push({
        range: `${this.betsSheetName}!T${matchedRowIndex}`,
        values: [[amountB]],
      });

      // บันทึกทั้งหมด
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          data: updates,
          valueInputOption: 'USER_ENTERED',
        },
      });

      console.log(`✅ Result recorded for row ${matchedRowIndex}`);
      return { success: true };
    } catch (error) {
      console.error('Error recording result:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * แจ้งเตือน LINE ส่วนตัวและกลุ่ม
   * @param {object} result - ผลลัพธ์
   * @param {string} slipName - ชื่อบั้งไฟ
   * @param {number} score - คะแนนที่ออก
   * @param {string} groupId - ID ของกลุ่ม LINE
   * @param {number} accountNumber - LINE OA Account Number (1 หรือ 2)
   */
  async notifyLineResult(result, slipName, score, groupId, accountNumber = 1) {
    try {
      const { winner, loser, isDraw } = result;

      // เลือก notification service ตามหมายเลข Account
      const notificationService = this.lineNotificationServices[accountNumber] || this.lineNotificationServices[1];

      console.log(`\n📊 === Notifying Result (Account ${accountNumber}) ===`);
      console.log(`   Winner: ${winner.displayName} (${winner.userId})`);
      console.log(`   Loser: ${loser.displayName} (${loser.userId})`);
      console.log(`   Group ID: ${groupId}`);

      // ดึงยอดเงินใหม่ของผู้ชนะและผู้แพ้
      const balanceUpdateService = require('./balanceUpdateService');
      const winnerNewBalance = await balanceUpdateService.getUserBalance(winner.displayName);
      const loserNewBalance = await balanceUpdateService.getUserBalance(loser.displayName);

      // สร้างข้อความแจ้งเตือน
      const resultMessage = this.buildResultMessage(
        result,
        slipName,
        score,
        isDraw
      );

      // แจ้งเตือนส่วนตัวผู้เล่น
      if (winner.userId) {
        console.log(`\n   📤 Sending winner message to ${winner.displayName}...`);
        const winnerResult = await notificationService.sendPrivateMessage(
          winner.userId,
          this.buildWinnerMessage(winner, slipName, score, isDraw, winnerNewBalance)
        );
        if (!winnerResult.success) {
          console.error(`   ❌ Failed to send winner message: ${winnerResult.error}`);
        }
      }

      if (loser.userId) {
        console.log(`\n   📤 Sending loser message to ${loser.displayName}...`);
        const loserResult = await notificationService.sendPrivateMessage(
          loser.userId,
          this.buildLoserMessage(loser, slipName, score, isDraw, loserNewBalance)
        );
        if (!loserResult.success) {
          console.error(`   ❌ Failed to send loser message: ${loserResult.error}`);
        }
      }

      // แจ้งเตือนในกลุ่ม
      if (groupId) {
        console.log(`\n   📢 Sending group message...`);
        const groupResult = await notificationService.sendGroupMessage(
          groupId,
          resultMessage
        );
        if (!groupResult.success) {
          console.error(`   ❌ Failed to send group message: ${groupResult.error}`);
        }
      }

      console.log(`\n   ✅ Notification process completed`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error notifying LINE result:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * สร้างข้อความผลลัพธ์สำหรับกลุ่ม (รูปแบบใหม่ด้วย emoji)
   * ตัวอย่าง: แอด 460✅️เทวดา 300❌️เทพพนม 350⛔️ฟ้าหลังฝน
   * @private
   */
  buildResultMessage(result, slipName, score, isDraw) {
    const { winner, loser } = result;

    if (isDraw) {
      // ออกกลาง (เสมอ)
      return `${slipName} ${score}${winner.displayName}⛔️${loser.displayName}⛔️`;
    } else {
      // ชนะ-แพ้
      const winnerName = winner.displayName;
      const loserName = loser.displayName;

      return `${slipName} ${score}${winnerName}✅${loserName}❌`;
    }
  }

  /**
   * สร้างข้อความสำหรับผู้ชนะ (ส่วนตัว)
   * @private
   */
  buildWinnerMessage(winner, slipName, score, isDraw, newBalance = 0) {
    let message = `🎉 ยินดีด้วย! คุณชนะ\n\n`;
    message += `🎆 บั้งไฟ: ${slipName}\n`;
    message += `📊 คะแนนที่ออก: ${score}\n`;

    if (isDraw) {
      message += `\n⛔️ ออกกลาง (เสมอ)\n`;
      message += `💰 เดิมพัน: ${winner.grossAmount || 0} บาท\n`;
      message += `💸 ค่าธรรมเนียม: ${winner.fee} บาท (5%)\n`;
    } else {
      message += `\n✅️ ชนะ\n`;
      message += `💰 เดิมพัน: ${winner.grossAmount} บาท\n`;
      message += `💸 ค่าธรรมเนียม: ${winner.fee} บาท (10%)\n`;
      message += `🏆 ได้รับ: ${winner.netAmount} บาท\n`;
    }

    if (newBalance > 0) {
      message += `\n💵 ยอดเงินคงเหลือ: ${newBalance} บาท\n`;
    }

    return message;
  }

  /**
   * สร้างข้อความสำหรับผู้แพ้ (ส่วนตัว)
   * @private
   */
  buildLoserMessage(loser, slipName, score, isDraw, newBalance = 0) {
    let message = `😔 เสียใจด้วย คุณแพ้\n\n`;
    message += `🎆 บั้งไฟ: ${slipName}\n`;
    message += `📊 คะแนนที่ออก: ${score}\n`;

    if (isDraw) {
      message += `\n⛔️ ออกกลาง (เสมอ)\n`;
      message += `💰 เดิมพัน: ${Math.abs(loser.grossAmount) || 0} บาท\n`;
      message += `💸 ค่าธรรมเนียม: ${loser.fee} บาท (5%)\n`;
    } else {
      message += `\n❌️ แพ้\n`;
      message += `💰 เดิมพัน: ${Math.abs(loser.grossAmount)} บาท\n`;
      message += `💸 เสีย: ${Math.abs(loser.netAmount)} บาท\n`;
    }

    if (newBalance > 0) {
      message += `\n💵 ยอดเงินคงเหลือ: ${newBalance} บาท\n`;
    }

    return message;
  }
}

const instance = new BettingResultService();

// Initialize immediately
let initPromise = instance.initialize().catch(error => {
  console.error('Failed to auto-initialize BettingResultService:', error);
});

// Add a method to ensure initialization is complete
instance.ensureInitialized = async function() {
  await initPromise;
  if (!this.sheets) {
    throw new Error('BettingResultService failed to initialize');
  }
};

module.exports = instance;
