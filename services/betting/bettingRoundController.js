/**
 * BettingRoundController
 * จัดการ LINE webhook และประสานงานระหว่าง Services
 */

const BettingMessageParserService = require('./bettingMessageParserService');
const bettingRoundStateService = require('./bettingRoundStateService');
const bettingPairingService = require('./bettingPairingService');
const balanceCheckService = require('./balanceCheckService');
const selfBettingService = require('./selfBettingService');

class BettingRoundController {
  /**
   * Initialize Services
   */
  async initialize() {
    try {
      await bettingRoundStateService.initialize();
      await bettingPairingService.initialize();
      await balanceCheckService.initialize();
      console.log('BettingRoundController initialized successfully');
    } catch (error) {
      console.error('Error initializing BettingRoundController:', error);
      throw error;
    }
  }

  /**
   * จัดการข้อความจาก LINE
   * @param {object} event - LINE webhook event
   * @returns {object} ผลลัพธ์
   */
  async handleMessage(event) {
    const { message, source } = event;
    const userId = source.userId;
    const displayName = source.displayName || 'Unknown';
    const lineName = source.displayName || 'Unknown'; // ชื่อ LINE

    // ตรวจสอบคำสั่งแอดมิน
    const adminCommand = BettingMessageParserService.parseAdminCommand(message.text);
    if (adminCommand.isCommand) {
      return await this.handleAdminCommand(adminCommand, userId);
    }

    // ตรวจสอบสถานะ
    if (!bettingRoundStateService.canAcceptBets()) {
      return {
        type: 'text',
        text: 'รอบนี้ปิดการทายแล้วคะ/ครับ',
      };
    }

    // ตรวจสอบ Reply Method ก่อน
    const replyParsed = BettingMessageParserService.parseReplyMessage(message.text);
    if (replyParsed.success) {
      // ดึงชื่อบั้งไฟจากสถานะปัจจุบัน
      const currentRound = await bettingRoundStateService.getCurrentRound();
      if (!currentRound || !currentRound.slipName) {
        return {
          type: 'text',
          text: 'ไม่พบชื่อบั้งไฟ กรุณารอให้แอดมินส่งชื่อบั้งไฟก่อน',
        };
      }

      // สร้าง bet object สำหรับ Reply Method
      const parsedBet = {
        success: true,
        method: 'REPLY',
        slipName: currentRound.slipName,
        side: 'ต',
        sideCode: 'ต',
        amount: null,
        price: null,
        timestamp: new Date().toISOString(),
      };

      // ตรวจสอบความถูกต้อง
      const validation = BettingMessageParserService.validateBet(parsedBet);
      if (!validation.valid) {
        return {
          type: 'text',
          text: validation.error,
        };
      }

      // บันทึกการเล่น
      const recordResult = await bettingPairingService.recordBet(
        parsedBet,
        userId,
        displayName,
        lineName
      );

      if (!recordResult.success) {
        return {
          type: 'text',
          text: recordResult.message,
        };
      }

      // ส่งข้อความยืนยัน
      const confirmMessage = this.buildConfirmationMessage(parsedBet, displayName);
      return {
        type: 'text',
        text: confirmMessage,
      };
    }

    // Parse ข้อความเล่น (Direct Method)
    const parsedBet = BettingMessageParserService.parseMessage(message.text);

    if (!parsedBet.success) {
      return {
        type: 'text',
        text: `${parsedBet.error}\n\n${parsedBet.hint}`,
      };
    }

    // ตรวจสอบความถูกต้อง
    const validation = BettingMessageParserService.validateBet(parsedBet);
    if (!validation.valid) {
      return {
        type: 'text',
        text: validation.error,
      };
    }

    // ตรวจสอบยอดเงินคงเหลือ
    const balanceCheck = await balanceCheckService.checkAndNotify(
      lineName,
      parsedBet.amount,
      userId
    );

    if (!balanceCheck.sufficient) {
      return {
        type: 'text',
        text: `❌ ยอดเงินไม่พอ\n\nยอดเงินปัจจุบัน: ${balanceCheck.currentBalance} บาท\nจำนวนเงินที่ต้องการเดิมพัน: ${parsedBet.amount} บาท\nขาด: ${balanceCheck.shortfall} บาท\n\n💡 โปรดโอนเงินเพิ่มเติมและส่งสลิปให้ระบบตรวจสอบ`,
      };
    }

    // บันทึกการเล่น
    const recordResult = await bettingPairingService.recordBet(
      parsedBet,
      userId,
      displayName,
      lineName
    );

    if (!recordResult.success) {
      return {
        type: 'text',
        text: recordResult.message,
      };
    }

    // ส่งข้อความยืนยัน
    const confirmMessage = this.buildConfirmationMessage(parsedBet, displayName);
    return {
      type: 'text',
      text: confirmMessage,
    };
  }

  /**
   * จัดการคำสั่งแอดมิน
   * @private
   */
  async handleAdminCommand(command, userId) {
    switch (command.command) {
      case 'START':
        return await this.handleStartCommand(command.slipName);

      case 'STOP':
        return await this.handleStopCommand();

      case 'CALCULATE':
        return await this.handleCalculateCommand(command.slipName, command.score);

      default:
        return {
          type: 'text',
          text: 'คำสั่งไม่ถูกต้อง',
        };
    }
  }

  /**
   * จัดการคำสั่ง :เริ่ม
   * @private
   */
  async handleStartCommand(slipName) {
    const result = await bettingRoundStateService.openRound(slipName);

    if (result.success) {
      return {
        type: 'text',
        text: `✅ ${result.message}\nรอบ ID: ${result.roundId}`,
      };
    }

    return {
      type: 'text',
      text: result.message,
    };
  }

  /**
   * จัดการคำสั่ง :หยุด
   * @private
   */
  async handleStopCommand() {
    const result = await bettingRoundStateService.closeRound();

    if (result.success) {
      return {
        type: 'text',
        text: result.message,
      };
    }

    return {
      type: 'text',
      text: result.message,
    };
  }

  /**
   * จัดการคำสั่ง :สรุป
   * @private
   */
  async handleCalculateCommand(slipName, score) {
    try {
      const bettingResultService = require('./bettingResultService');

      // เปลี่ยนสถานะเป็น CALCULATING
      await bettingRoundStateService.startCalculating();

      // ดึงข้อมูลการเล่นทั้งหมด
      const allBets = await bettingPairingService.getAllBets();

      // กรองเฉพาะการเล่นของบั้งไฟนี้
      const slipBets = allBets.filter((bet) => bet.slipName === slipName);

      if (slipBets.length === 0) {
        return {
          type: 'text',
          text: `ไม่พบการเล่นสำหรับบั้งไฟ: ${slipName}`,
        };
      }

      // จับคู่การเล่น (รวมทั้งการเล่นกับตัวเอง)
      const pairs = bettingPairingService.constructor.findPairs(slipBets);
      
      // ตรวจสอบการเล่นกับตัวเอง
      const selfBets = selfBettingService.findSelfBets(slipBets, slipName);

      // คำนวณผลลัพธ์และค่าธรรมเนียม
      const results = [];
      
      // ประมวลผลการเล่นปกติ (คู่ที่จับได้)
      for (const pair of pairs) {
        const result = bettingResultService.calculateResultWithFees(
          pair,
          slipName,
          score
        );

        // บันทึกผลลัพธ์
        await bettingResultService.recordResult(result, slipName, score);

        // อัปเดตยอดเงิน
        await bettingPairingService.updateUserBalance(
          result.winner.lineName,
          result.winner.netAmount
        );
        await bettingPairingService.updateUserBalance(
          result.loser.lineName,
          result.loser.netAmount
        );

        // แจ้งเตือน LINE ส่วนตัว
        await bettingResultService.notifyLineResult(
          result,
          slipName,
          score,
          null // groupId - ต้องส่งมาจากที่อื่น
        );

        results.push(result);
      }

      // ประมวลผลการเล่นกับตัวเอง
      for (const selfBet of selfBets) {
        const selfResults = selfBettingService.calculateSelfBettingResults(
          selfBet,
          slipName,
          score
        );

        for (const selfResult of selfResults) {
          const result = bettingResultService.calculateResultWithFees(
            selfResult.pair,
            slipName,
            score
          );

          // บันทึกผลลัพธ์
          await bettingResultService.recordResult(result, slipName, score);

          // อัปเดตยอดเงิน (เล่นกับตัวเอง ยอดเงินไม่เปลี่ยน แต่หักค่าธรรมเนียม)
          const netChange = result.winner.netAmount + result.loser.netAmount;
          await bettingPairingService.updateUserBalance(
            result.winner.lineName,
            netChange
          );

          // ส่งข้อความแจ้งเตือน
          const selfBettingMessage = selfBettingService.buildSelfBettingMessage(
            selfResult,
            slipName,
            score
          );
          
          // ส่งข้อความส่วนตัว
          const lineNotificationService = require('../line/lineNotificationService');
          await lineNotificationService.sendPrivateMessage(
            selfBet.lineName,
            selfBettingMessage
          );

          results.push(result);
        }
      }

      // สร้างรายงานผลลัพธ์
      const reportMessage = await this.buildResultReport(slipName, score, results);

      // ล้างข้อมูลการเล่น
      await bettingPairingService.clearRoundTransactions();

      // ปิดรอบ
      await bettingRoundStateService.closeRound();

      return {
        type: 'text',
        text: reportMessage,
      };
    } catch (error) {
      console.error('Error in calculate command:', error);
      return {
        type: 'text',
        text: 'เกิดข้อผิดพลาดในการประมวลผล',
      };
    }
  }

  /**
   * สร้างข้อความยืนยันการเล่น
   * @private
   */
  buildConfirmationMessage(parsedBet, displayName) {
    let message = `✅ บันทึกการเล่นสำเร็จ\n\n`;
    message += `ชื่อ: ${displayName}\n`;
    message += `บั้งไฟ: ${parsedBet.slipName}\n`;

    if (parsedBet.method === 'REPLY') {
      // Reply Method
      message += `ฝั่ง: ตอบ\n`;
    } else if (parsedBet.method === 1) {
      // Direct Method - วิธีที่ 1
      message += `ฝั่ง: ${parsedBet.side}\n`;
      message += `จำนวนเงิน: ${parsedBet.amount} บาท`;
    } else if (parsedBet.method === 2) {
      // Direct Method - วิธีที่ 2
      message += `ราคา: ${parsedBet.price}\n`;
      message += `ฝั่ง: ${parsedBet.side}\n`;
      message += `จำนวนเงิน: ${parsedBet.amount} บาท`;
    }

    return message;
  }

  /**
   * สร้างรายงานผลลัพธ์
   * @private
   */
  async buildResultReport(slipName, score, results) {
    let report = `📊 สรุปผลการเล่น\n`;
    report += `บั้งไฟ: ${slipName}\n`;
    report += `คะแนนที่ออก: ${score}\n`;
    report += `${'='.repeat(40)}\n\n`;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      report += `คู่ที่ ${i + 1}:\n`;
      report += `🏆 ชนะ: ${result.winner.displayName} +${result.winner.amount} บาท\n`;
      report += `❌ แพ้: ${result.loser.displayName} -${result.loser.amount} บาท\n\n`;
    }

    // ดึงยอดเงินคงเหลือ
    const balances = await bettingPairingService.getAllBalances();
    report += `${'='.repeat(40)}\n`;
    report += `💰 ยอดเงินคงเหลือ:\n\n`;

    for (const balance of balances) {
      report += `${balance.displayName}: ${balance.balance} บาท\n`;
    }

    return report;
  }
}

module.exports = new BettingRoundController();
