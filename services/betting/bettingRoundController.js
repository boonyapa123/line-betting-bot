/**
 * BettingRoundController
 * จัดการ LINE webhook และประสานงานระหว่าง Services
 */

const BettingMessageParserService = require('./bettingMessageParserService');
const bettingRoundStateService = require('./bettingRoundStateService');
const bettingPairingService = require('./bettingPairingService');
const balanceCheckService = require('./balanceCheckService');
const pendingBalanceService = require('./pendingBalanceService');

class BettingRoundController {
  /**
   * Initialize Services
   */
  async initialize() {
    try {
      await bettingRoundStateService.initialize();
      await bettingPairingService.initialize();
      await balanceCheckService.initialize();
      await pendingBalanceService.initialize();
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
      const BetsSheetColumns = require('./betsSheetColumns');

      // ตรวจสอบคำสั่งแอดมิน
      const adminCommand = BettingMessageParserService.parseAdminCommand(message.text);
      if (adminCommand.isCommand) {
        return await this.handleAdminCommand(adminCommand, userId, source);
      }

      // ตรวจสอบสถานะ
      if (!bettingRoundStateService.canAcceptBets()) {
        return {
          type: 'text',
          text: 'รอบนี้ปิดการทายแล้วคะ/ครับ',
        };
      }

      // ตรวจสอบว่า User B reply ข้อความของ User A หรือไม่
      const isReply = message.quotedMessageId !== undefined && message.quotedMessageId !== null;

      if (isReply) {
        console.log(`🔍 User B replied to message ID: ${message.quotedMessageId}`);

        // ค้นหาข้อมูลของ User A ที่ยังรอการจับคู่ในกลุ่มเดียวกัน
        const groupBets = await bettingPairingService.getBetsByGroupId(source.groupId || '');
        console.log(`   Found ${groupBets.length} bets in group`);

        // ค้นหาเบตที่ตรงกับ quotedMessageId (ข้อความที่ reply นั้น)
        let pendingBet = groupBets.find(bet => bet.messageId === message.quotedMessageId);

        if (!pendingBet) {
          // fallback: ถ้ามี pending bet เพียง 1 ตัว ให้ใช้ตัวนั้น
          const pendingBets = groupBets.filter(bet => 
            !bet.userBId || bet.userBId === '' || bet.status === 'PENDING'
          );
          if (pendingBets.length === 1) {
            console.log(`   ⚠️  Message ID not found, but only 1 pending bet - using it`);
            pendingBet = pendingBets[0];
          } else {
            console.log(`   ❌ Message ID not found, ${pendingBets.length} pending bets - cannot determine which one`);
          }
        }

        if (!pendingBet) {
          return {
            type: 'text',
            text: '❌ ไม่พบการเดิมพันที่รอการจับคู่\n\n💡 โปรดรอให้ผู้เล่นคนแรกส่งข้อมูลการเดิมพันก่อน',
          };
        }

        console.log(`   ✅ Found pending bet from ${pendingBet.displayName}`);
        console.log(`      Slip: ${pendingBet.slipName}, Side: ${pendingBet.sideCode}, Amount: ${pendingBet.amount}, Price: ${pendingBet.price}`);

        // ✅ ตรวจสอบว่า User A ส่งข้อความรูปแบบถูกต้องหรือไม่
        console.log(`   🔍 Validating User A message format...`);
        const userAMessageParsed = BettingMessageParserService.parseMessage(pendingBet.message);
        if (!userAMessageParsed.success) {
          console.log(`   ❌ User A message format is invalid: ${pendingBet.message}`);
          return {
            type: 'text',
            text: `❌ ข้อมูลการเดิมพันของผู้เล่นคนแรกไม่ถูกต้อง\n\n${userAMessageParsed.error}\n\n${userAMessageParsed.hint}`,
          };
        }
        console.log(`   ✅ User A message format is valid`);

        // ตรวจสอบว่าข้อความ reply มีรูปแบบ Direct Method หรือไม่
        const directMethodParsed = BettingMessageParserService.parseMessage(message.text);

        let parsedBet;

        if (directMethodParsed.success) {
          // ถ้า reply มีรูปแบบ Direct Method ให้ใช้ข้อมูลจากข้อความ
          console.log(`   📊 Reply message has Direct Method format - using parsed data`);
          parsedBet = directMethodParsed;
        } else {
          // ถ้า reply เป็นแค่ "ต" หรือไม่มีรูปแบบ ให้ใช้ข้อมูลของ User A
          console.log(`   📊 Reply message is simple - using User A data`);

          // คำนวณฝั่งตรงข้าม
          const getOppositeSide = (sideCode) => {
            const opposites = {
              'ชล': 'ชถ',
              'ชถ': 'ชล',
              'ชย': 'ชล', // ยั้ง → ไล่
              'ล': 'ย',
              'ย': 'ล',
              'ต': 'ล',
              'ส': 'ย',
            };
            return opposites[sideCode] || sideCode;
          };

          const oppositeSideCode = getOppositeSide(pendingBet.sideCode);

          parsedBet = {
            success: true,
            method: 'REPLY',
            slipName: pendingBet.slipName,
            side: oppositeSideCode,
            sideCode: oppositeSideCode,
            amount: pendingBet.amount,
            price: pendingBet.price,
            timestamp: new Date().toISOString(),
          };
        }

        console.log(`   📊 Final bet data:`, parsedBet);

        // ตรวจสอบความถูกต้อง
        const validation = BettingMessageParserService.validateBet(parsedBet);
        if (!validation.valid) {
          return {
            type: 'text',
            text: validation.error,
          };
        }

        // ตรวจสอบยอดเงินคงเหลือของ User B
        const groupId = source.groupId || null;
        const groupAccountNumber = await this.getGroupAccountNumber(groupId);
        const accountNumber = groupAccountNumber || 1;

        const balanceCheck = await balanceCheckService.checkAndNotify(
          lineName,
          parsedBet.amount,
          userId,
          accountNumber,
          groupId
        );

        if (!balanceCheck.registered) {
          return {
            type: 'text',
            text: `❌ ผู้เล่นไม่พบในระบบ\n\n💡 โปรดติดต่อแอดมินเพื่อลงทะเบียน`,
          };
        }

        if (!balanceCheck.sufficient) {
          return {
            type: 'text',
            text: `❌ ยอดเงินไม่พอ\n\nยอดเงินปัจจุบัน: ${balanceCheck.currentBalance} บาท\nจำนวนเงินที่ต้องการเดิมพัน: ${parsedBet.amount} บาท\nขาด: ${balanceCheck.shortfall} บาท\n\n💡 โปรดโอนเงินเพิ่มเติมและส่งสลิปให้ระบบตรวจสอบ`,
          };
        }

        // อัปเดตแถวของ User A ด้วยข้อมูล User B
        console.log(`📝 Updating row with User B data...`);

        // สร้าง Price B จาก Price A
        const priceB = BetsSheetColumns.createPriceB(pendingBet.message, pendingBet.sideCode);

        const userBData = {
          userId: userId,
          displayName: displayName,
          sideCode: parsedBet.sideCode,
          amount: parsedBet.amount,
          price: parsedBet.price,
          priceB: priceB,  // ✅ เพิ่ม Price B ที่มีช่วงราคา
          slipName: pendingBet.slipName,  // ✅ ใช้ slip name เดียวกับของ User A
          groupName: '', // ยังไม่มีข้อมูล
          tokenB: '', // ยังไม่มีข้อมูล
        };

        const updateResult = await bettingPairingService.updateRowWithUserB(
          pendingBet.rowIndex,
          userBData
        );

        if (!updateResult.success) {
          console.error(`❌ Failed to update row: ${updateResult.message}`);
          return {
            type: 'text',
            text: `❌ เกิดข้อผิดพลาดในการจับคู่: ${updateResult.message}`,
          };
        }

        console.log(`✅ Row updated successfully`);

        // ส่งข้อความยืนยัน
        return {
          type: 'text',
          text: `✅ จับคู่เล่นสำเร็จ\n\n` +
            `🎆 บั้งไฟ: ${pendingBet.slipName}\n` +
            `💹 ราคา: ${parsedBet.price}\n\n` +
            `👤 ${pendingBet.displayName}\n` +
            `   ฝั่ง: ${pendingBet.sideCode}\n` +
            `   ยอดเงิน: ${pendingBet.amount} บาท\n\n` +
            `👤 ${displayName}\n` +
            `   ฝั่ง: ${parsedBet.sideCode}\n` +
            `   ยอดเงิน: ${parsedBet.amount} บาท\n\n` +
            `⏳ รอการประกาศผล...`,
        };
      }

      // ตรวจสอบ REPLY Method (เฉพาะ "ต" หรือ "ต." เท่านั้น)
      const replyParsed = BettingMessageParserService.parseReplyMessage(message.text);
      if (replyParsed.success) {
        // ค้นหาข้อมูลของ User A ที่ยังรอการจับคู่ในกลุ่มเดียวกัน
        console.log(`🔍 REPLY Method detected (simple "ต") - searching for pending bet in group: ${source.groupId || 'NO_GROUP'}`);

        const groupBets = await bettingPairingService.getBetsByGroupId(source.groupId || '');
        console.log(`   Found ${groupBets.length} bets in group`);

        // ค้นหาเบตที่ตรงกับ quotedMessageId (ข้อความที่ reply นั้น)
        let pendingBet = groupBets.find(bet => bet.messageId === message.quotedMessageId);

        if (!pendingBet) {
          // fallback: ถ้ามี pending bet เพียง 1 ตัว ให้ใช้ตัวนั้น
          const pendingBets = groupBets.filter(bet => 
            !bet.userBId || bet.userBId === '' || bet.status === 'PENDING'
          );
          if (pendingBets.length === 1) {
            console.log(`   ⚠️  Message ID not found, but only 1 pending bet - using it`);
            pendingBet = pendingBets[0];
          } else {
            console.log(`   ❌ Message ID not found, ${pendingBets.length} pending bets - cannot determine which one`);
          }
        }

        if (!pendingBet) {
          return {
            type: 'text',
            text: '❌ ไม่พบการเดิมพันที่รอการจับคู่\n\n💡 โปรดรอให้ผู้เล่นคนแรกส่งข้อมูลการเดิมพันก่อน',
          };
        }

        console.log(`   ✅ Found pending bet from ${pendingBet.displayName}`);
        console.log(`      Slip: ${pendingBet.slipName}, Side: ${pendingBet.sideCode}, Amount: ${pendingBet.amount}, Price: ${pendingBet.price}`);

        // ✅ ตรวจสอบว่า User A ส่งข้อความรูปแบบถูกต้องหรือไม่
        console.log(`   🔍 Validating User A message format...`);
        const userAMessageParsed = BettingMessageParserService.parseMessage(pendingBet.message);
        if (!userAMessageParsed.success) {
          console.log(`   ❌ User A message format is invalid: ${pendingBet.message}`);
          return {
            type: 'text',
            text: `❌ ข้อมูลการเดิมพันของผู้เล่นคนแรกไม่ถูกต้อง\n\n${userAMessageParsed.error}\n\n${userAMessageParsed.hint}`,
          };
        }
        console.log(`   ✅ User A message format is valid`);

        // ใช้ข้อมูลเดียวกับของ User A
        // คำนวณฝั่งตรงข้าม
        const getOppositeSide = (sideCode) => {
          const opposites = {
            'ชล': 'ชถ',
            'ชถ': 'ชล',
            'ชย': 'ชล', // ยั้ง → ไล่
            'ล': 'ย',
            'ย': 'ล',
            'ต': 'ล',
            'ส': 'ย',
          };
          return opposites[sideCode] || sideCode;
        };

        const oppositeSideCode = getOppositeSide(pendingBet.sideCode);

        const parsedBet = {
          success: true,
          method: 'REPLY',
          slipName: pendingBet.slipName,
          side: oppositeSideCode,
          sideCode: oppositeSideCode,
          amount: pendingBet.amount,
          price: pendingBet.price,
          timestamp: new Date().toISOString(),
        };

        console.log(`   📊 Reply bet data:`, parsedBet);

        // ตรวจสอบความถูกต้อง
        const validation = BettingMessageParserService.validateBet(parsedBet);
        if (!validation.valid) {
          return {
            type: 'text',
            text: validation.error,
          };
        }

        // ตรวจสอบยอดเงินคงเหลือของ User B
        const groupId = source.groupId || null;
        const groupAccountNumber = await this.getGroupAccountNumber(groupId);
        const accountNumber = groupAccountNumber || 1;

        const balanceCheck = await balanceCheckService.checkAndNotify(
          lineName,
          parsedBet.amount,
          userId,
          accountNumber,
          groupId
        );

        if (!balanceCheck.registered) {
          return {
            type: 'text',
            text: `❌ ผู้เล่นไม่พบในระบบ\n\n💡 โปรดติดต่อแอดมินเพื่อลงทะเบียน`,
          };
        }

        if (!balanceCheck.sufficient) {
          return {
            type: 'text',
            text: `❌ ยอดเงินไม่พอ\n\nยอดเงินปัจจุบัน: ${balanceCheck.currentBalance} บาท\nจำนวนเงินที่ต้องการเดิมพัน: ${parsedBet.amount} บาท\nขาด: ${balanceCheck.shortfall} บาท\n\n💡 โปรดโอนเงินเพิ่มเติมและส่งสลิปให้ระบบตรวจสอบ`,
          };
        }

        // อัปเดตแถวของ User A ด้วยข้อมูล User B
        console.log(`📝 Updating row with User B data...`);

        // สร้าง Price B จาก Price A
        const priceB = BetsSheetColumns.createPriceB(pendingBet.message, pendingBet.sideCode);

        const userBData = {
          userId: userId,
          displayName: displayName,
          sideCode: parsedBet.sideCode,
          amount: parsedBet.amount,
          price: parsedBet.price,
          priceB: priceB,  // ✅ เพิ่ม Price B ที่มีช่วงราคา
          slipName: pendingBet.slipName,  // ✅ ใช้ slip name เดียวกับของ User A
          groupName: '', // ยังไม่มีข้อมูล
          tokenB: '', // ยังไม่มีข้อมูล
        };

        const updateResult = await bettingPairingService.updateRowWithUserB(
          pendingBet.rowIndex,
          userBData
        );

        if (!updateResult.success) {
          console.error(`❌ Failed to update row: ${updateResult.message}`);
          return {
            type: 'text',
            text: `❌ เกิดข้อผิดพลาดในการจับคู่: ${updateResult.message}`,
          };
        }

        console.log(`✅ Row updated successfully`);

        // ส่งข้อความยืนยัน
        return {
          type: 'text',
          text: `✅ จับคู่เล่นสำเร็จ\n\n` +
            `🎆 บั้งไฟ: ${parsedBet.slipName}\n` +
            `💹 ราคา: ${parsedBet.price}\n\n` +
            `👤 ${pendingBet.displayName}\n` +
            `   ฝั่ง: ${pendingBet.sideCode}\n` +
            `   ยอดเงิน: ${pendingBet.amount} บาท\n\n` +
            `👤 ${displayName}\n` +
            `   ฝั่ง: ${parsedBet.sideCode}\n` +
            `   ยอดเงิน: ${parsedBet.amount} บาท\n\n` +
            `⏳ รอการประกาศผล...`,
        };
      }

      // Parse ข้อความเล่น (Direct Method)
      const parsedBet = BettingMessageParserService.parseMessage(message.text);

      if (!parsedBet.success) {
        // ไม่ส่งข้อความแจ้งเตือนในกลุ่ม
        return {
          type: 'text',
          text: `${parsedBet.error}\n\n${parsedBet.hint}`,
        };
      }

      console.log(`📊 Parsed bet:`, JSON.stringify(parsedBet, null, 2));

      // ตรวจสอบความถูกต้อง
      const validation = BettingMessageParserService.validateBet(parsedBet);
      if (!validation.valid) {
        return {
          type: 'text',
          text: validation.error,
        };
      }

      // ตรวจสอบยอดเงินคงเหลือและชื่อผู้เล่น (อันดับแรก)
      const groupId = source.groupId || null; // ดึง groupId จาก source

      // ดึง Account Number จากกลุ่ม (ใช้ Account 1 เป็น default)
      const groupAccountNumber = await this.getGroupAccountNumber(groupId);
      const accountNumber = groupAccountNumber || 1;

      const balanceCheck = await balanceCheckService.checkAndNotify(
        lineName,
        parsedBet.amount,
        userId,
        accountNumber, // ใช้ Account ของกลุ่ม
        groupId // ส่ง groupId เพื่อแจ้งเตือนในกลุ่มด้วย
      );

      // ถ้าผู้เล่นไม่พบในระบบ ให้หยุดทันที
      if (!balanceCheck.registered) {
        return {
          type: 'text',
          text: `❌ ผู้เล่นไม่พบในระบบ\n\n💡 โปรดติดต่อแอดมินเพื่อลงทะเบียน`,
        };
      }

      // ถ้ายอดเงินไม่พอ ให้หยุดทันที
      if (!balanceCheck.sufficient) {
        // ไม่ต้องส่งข้อความแจ้งเตือนเพิ่มเติม เพราะ checkAndNotify ได้ส่งไปแล้ว
        return {
          type: 'text',
          text: `❌ ยอดเงินไม่พอ\n\nยอดเงินปัจจุบัน: ${balanceCheck.currentBalance} บาท\nจำนวนเงินที่ต้องการเดิมพัน: ${parsedBet.amount} บาท\nขาด: ${balanceCheck.shortfall} บาท\n\n💡 โปรดโอนเงินเพิ่มเติมและส่งสลิปให้ระบบตรวจสอบ`,
        };
      }

      // ✅ ตรวจสอบการจับคู่อัตโนมัติแบบราคาต่างกัน (เฉพาะในกลุ่มเดียวกัน) ก่อนบันทึก
      // หมายเหตุ: REPLY Method ได้จัดการการจับคู่แล้ว ส่วนนี้สำหรับ Direct Method เท่านั้น
      const PriceRangeMatchingService = require('./priceRangeMatchingService');

      console.log(`🔍 Fetching bets for group: ${source.groupId || 'NO_GROUP'}`);
      const groupBets = await bettingPairingService.getBetsByGroupId(source.groupId || '');
      console.log(`   Found ${groupBets.length} bets in group`);

      if (groupBets.length > 0) {
        console.log(`   Bets in group:`, groupBets.map(b => ({
          displayName: b.displayName,
          slipName: b.slipName,
          sideCode: b.sideCode,
          price: b.price,
          amount: b.amount,
          status: b.status
        })));
      }

      // ค้นหาคู่ที่มีฝั่งตรงข้าม (ราคาต่างกันได้) เฉพาะในกลุ่มเดียวกัน
      const matchedPair = PriceRangeMatchingService.findMatchForNewBet(parsedBet, groupBets);

      console.log(`   Matching result:`, matchedPair ? 'FOUND' : 'NOT FOUND');

      if (matchedPair) {
        // 🎯 พบคู่ - อัปเดตแถว User A โดยตรง (ไม่บันทึก User B ลงแถวใหม่)
        console.log(`🎯 Auto-matched price range pair found!`);
        console.log(`   ${displayName} (${parsedBet.sideCode}) vs ${matchedPair.existingBet.displayName} (${matchedPair.existingBet.sideCode})`);
        console.log(`   Slip: ${parsedBet.slipName}, Price: ${parsedBet.price}, Amount: ${matchedPair.betAmount} บาท`);

        // สร้าง Price B จาก Price A
        const priceB = BetsSheetColumns.createPriceB(matchedPair.existingBet.message, matchedPair.existingBet.sideCode);

        // 📝 อัปเดตแถวของ User A ด้วยข้อมูล User B
        const userBData = {
          userId: userId,
          displayName: displayName,
          sideCode: parsedBet.sideCode,
          amount: matchedPair.betAmount,
          price: parsedBet.price,
          priceB: priceB,  // ✅ เพิ่ม Price B ที่มีช่วงราคา
          slipName: pendingBet.slipName,  // ✅ ใช้ slip name เดียวกับของ User A
          groupName: '', // ยังไม่มีข้อมูล
          tokenB: '', // ยังไม่มีข้อมูล
        };

        const updateResult = await bettingPairingService.updateRowWithUserB(
          matchedPair.existingBet.rowIndex,
          userBData
        );

        if (!updateResult.success) {
          console.error(`❌ Failed to update row: ${updateResult.message}`);
          // ถ้าอัปเดตไม่สำเร็จ ให้บันทึก User B ลงแถวใหม่แทน
          const recordResult = await bettingPairingService.recordBet(
            {
              price: parsedBet.price,
              sideCode: parsedBet.sideCode,
              amount: parsedBet.amount,
              slipName: parsedBet.slipName
            },
            userId,
            displayName,
            displayName,
            '',
            '',
            source.groupId || ''
          );

          if (!recordResult.success) {
            return {
              type: 'text',
              text: `❌ เกิดข้อผิดพลาดในการบันทึก: ${recordResult.message}`,
            };
          }

          return {
            type: 'text',
            text: `⚠️  ไม่สามารถจับคู่กับการเดิมพันเดิมได้ บันทึกเป็นการเดิมพันใหม่แทน\n\n` +
              `🎆 บั้งไฟ: ${parsedBet.slipName}\n` +
              `💹 ราคา: ${parsedBet.price}\n` +
              `💰 ยอดเงิน: ${parsedBet.amount} บาท\n\n` +
              `⏳ รอการจับคู่...`,
          };
        }

        console.log(`✅ Row updated successfully`);

        // ส่งข้อความยืนยัน
        return {
          type: 'text',
          text: `✅ จับคู่เล่นสำเร็จ\n\n` +
            `🎆 บั้งไฟ: ${parsedBet.slipName}\n` +
            `💹 ราคา: ${parsedBet.price}\n\n` +
            `👤 ${matchedPair.existingBet.displayName}\n` +
            `   ฝั่ง: ${matchedPair.existingBet.sideCode}\n` +
            `   ยอดเงิน: ${matchedPair.betAmount} บาท\n\n` +
            `👤 ${displayName}\n` +
            `   ฝั่ง: ${parsedBet.sideCode}\n` +
            `   ยอดเงิน: ${matchedPair.betAmount} บาท\n\n` +
            `⏳ รอการประกาศผล...`,
        };
      }

      // ❌ ไม่พบคู่ - บันทึกเป็นการเดิมพันใหม่
      console.log(`❌ No matching pair found - recording as new bet`);

      const recordResult = await bettingPairingService.recordBet(
        {
          price: parsedBet.price,
          sideCode: parsedBet.sideCode,
          amount: parsedBet.amount,
          slipName: parsedBet.slipName
        },
        userId,
        displayName,
        displayName,
        '',
        '',
        source.groupId || '',
        message.text,  // ส่งข้อความเดิมจาก User A
        message.id     // ส่ง LINE message ID สำหรับจับคู่ reply
      );

      if (!recordResult.success) {
        return {
          type: 'text',
          text: `❌ เกิดข้อผิดพลาดในการบันทึก: ${recordResult.message}`,
        };
      }

      // ส่งข้อความยืนยัน
      return {
        type: 'text',
        text: `✅ บันทึกการเดิมพันสำเร็จ\n\n` +
          `🎆 บั้งไฟ: ${parsedBet.slipName}\n` +
          `💹 ราคา: ${parsedBet.price}\n` +
          `💰 ยอดเงิน: ${parsedBet.amount} บาท\n\n` +
          `⏳ รอการจับคู่...`,
      };
    }

  /**
   * จัดการคำสั่งแอดมิน
   * @private
   */
  async handleAdminCommand(command, userId, source) {
    switch (command.command) {
      case 'START':
        return await this.handleStartCommand(command.slipName);

      case 'STOP':
        return await this.handleStopCommand();

      case 'CALCULATE':
        return await this.handleCalculateCommand(command.slipName, command.score, source);

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
  async handleCalculateCommand(slipName, score, source) {
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

      // จับคู่การเล่น - ใช้ slipBets ที่มี userBId (จับคู่สำเร็จแล้ว)
      const pairs = [];
      for (const bet of slipBets) {
        if (bet.userBId && bet.userBId !== '') {
          // ค้นหา User B ในรายการ
          const userBBet = slipBets.find(b => b.userId === bet.userBId);
          if (userBBet) {
            pairs.push({
              bet1: bet,
              bet2: userBBet,
            });
          }
        }
      }

      // คำนวณผลลัพธ์และค่าธรรมเนียม
      const results = [];
      
      // ดึง Account Number จากกลุ่ม (ใช้ Account 1 เป็น default)
      const groupAccountNumber = await this.getGroupAccountNumber(source?.groupId);
      const accountNumber = groupAccountNumber || 1;
      
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
        // ✅ ใช้ displayName แทน lineName
        await bettingPairingService.updateUserBalance(
          result.winner.displayName,
          result.winner.netAmount
        );
        await bettingPairingService.updateUserBalance(
          result.loser.displayName,
          result.loser.netAmount
        );

        // แจ้งเตือน LINE ส่วนตัว
        try {
          await bettingResultService.notifyLineResult(
            result,
            slipName,
            score,
            source?.groupId || null, // groupId
            accountNumber // ใช้ Account ของกลุ่ม
          );
        } catch (notifyError) {
          console.error('❌ Error sending notifications:', notifyError);
        }

        results.push(result);
      }



      // สร้างรายงานผลลัพธ์
      const reportMessage = await this.buildResultReport(slipName, score, results);

      // ✅ ส่งข้อความเข้ากลุ่ม (ประกาศผลบั้งไฟที่ประกาศเท่านั้น)
      let groupMessage = `📊 ประกาศผลแทง\n`;
      groupMessage += `🎆 บั้งไฟ: ${slipName}\n`;
      groupMessage += `ผลที่ออก: ${score}\n`;
      groupMessage += `═══════════════════\n\n`;

      // เพิ่มผลลัพธ์ของแต่ละคู่
      for (const result of results) {
        const { bet1, bet2 } = result.pair;
        const { winner, loser, isDraw } = result;

        if (isDraw) {
          groupMessage += `⛔️ ${bet1.displayName} vs ${bet2.displayName} เสมอ\n`;
          groupMessage += `   เดิมพัน: ${Math.min(bet1.amount, bet2.amount)} บาท\n`;
          groupMessage += `   ค่าธรรมเนียม: ${result.drawFee} บาท\n\n`;
        } else if (winner.userId === bet1.userId) {
          groupMessage += `✅ ${bet1.displayName} ชนะ\n`;
          groupMessage += `❌ ${bet2.displayName} แพ้\n`;
          groupMessage += `   เดิมพัน: ${Math.min(bet1.amount, bet2.amount)} บาท\n`;
          groupMessage += `   ได้รับ: ${winner.netAmount} บาท\n\n`;
        } else {
          groupMessage += `❌ ${bet1.displayName} แพ้\n`;
          groupMessage += `✅ ${bet2.displayName} ชนะ\n`;
          groupMessage += `   เดิมพัน: ${Math.min(bet1.amount, bet2.amount)} บาท\n`;
          groupMessage += `   ได้รับ: ${winner.netAmount} บาท\n\n`;
        }
      }

      groupMessage += `═══════════════════\n`;
      groupMessage += `📝 รวมทั้งสิ้น: ${results.length} รายการ`;

      // ✅ ส่งข้อความเข้ากลุ่ม
      if (source?.groupId) {
        try {
          const LineNotificationService = require('../line/lineNotificationService');
          const notificationService = new LineNotificationService(accountNumber || 1);
          await notificationService.sendGroupMessage(source.groupId, groupMessage);
          console.log(`   📢 Group message sent successfully`);
        } catch (groupError) {
          console.error(`   ❌ Error sending group message:`, groupError);
        }
      }

      // ✅ ส่งข้อความเข้าผู้เล่นแต่ละคน
      for (const result of results) {
        const { bet1, bet2 } = result.pair;
        const { winner, loser, isDraw } = result;

        try {
          const LineNotificationService = require('../line/lineNotificationService');
          const notificationService = new LineNotificationService(accountNumber || 1);

          // ส่งให้ผู้ชนะ
          if (winner.userId) {
            let winnerMsg = `🎉 ยินดีด้วย! คุณชนะ\n\n`;
            winnerMsg += `🎆 บั้งไฟ: ${slipName}\n`;
            winnerMsg += `📊 คะแนนที่ออก: ${score}\n`;
            winnerMsg += `✅ ชนะ\n`;
            winnerMsg += `💰 เดิมพัน: ${Math.min(bet1.amount, bet2.amount)} บาท\n`;
            winnerMsg += `💸 ค่าธรรมเนียม: ${result.fee || result.drawFee} บาท\n`;
            winnerMsg += `🏆 ได้รับ: ${winner.netAmount} บาท`;

            await notificationService.sendPrivateMessage(winner.userId, winnerMsg);
            console.log(`   📤 Winner message sent to ${winner.displayName}`);
          }

          // ส่งให้ผู้แพ้
          if (loser.userId) {
            let loserMsg = `😔 เสียใจด้วย คุณแพ้\n\n`;
            loserMsg += `🎆 บั้งไฟ: ${slipName}\n`;
            loserMsg += `📊 คะแนนที่ออก: ${score}\n`;
            loserMsg += `❌ แพ้\n`;
            loserMsg += `💰 เดิมพัน: ${Math.min(bet1.amount, bet2.amount)} บาท\n`;
            loserMsg += `💸 เสีย: ${Math.abs(loser.netAmount)} บาท`;

            await notificationService.sendPrivateMessage(loser.userId, loserMsg);
            console.log(`   📤 Loser message sent to ${loser.displayName}`);
          }
        } catch (playerError) {
          console.error(`   ❌ Error sending player message:`, playerError);
        }
      }

      // ล้างข้อมูลการเล่น
      await bettingPairingService.clearRoundTransactions();

      // ปิดรอบ
      await bettingRoundStateService.closeRound();

      return {
        type: 'text',
        text: groupMessage,
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
    message += `🎆 บั้งไฟ: ${parsedBet.slipName}\n`;
    message += `👤 ชื่อ: ${displayName}\n`;

    if (parsedBet.method === 'REPLY') {
      // Reply Method
      message += `ฝั่ง: ตอบ\n`;
    } else if (parsedBet.method === 1) {
      // Direct Method - วิธีที่ 1 (ไม่ร้องราคา)
      message += `ฝั่ง: ${parsedBet.side}\n`;
      message += `💰 ยอดเงิน: ${parsedBet.amount} บาท`;
    } else if (parsedBet.method === 2) {
      // Direct Method - วิธีที่ 2 (ร้องราคา)
      message += `💹 ราคา: ${parsedBet.price}\n`;
      message += `ฝั่ง: ${parsedBet.side}\n`;
      message += `💰 ยอดเงิน: ${parsedBet.amount} บาท`;
    }

    message += `\n\n⏳ รอคู่แข่ง...`;
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

  /**
   * ดึง Account Number จาก groupId
   * @private
   */
  async getGroupAccountNumber(groupId) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // อ่านไฟล์ groups.json
      const groupsFilePath = path.join(__dirname, '../../data/groups.json');
      
      if (!fs.existsSync(groupsFilePath)) {
        console.warn(`Groups data file not found at ${groupsFilePath}`);
        return null;
      }
      
      const groupsData = JSON.parse(fs.readFileSync(groupsFilePath, 'utf8'));
      
      if (groupsData[groupId]) {
        return groupsData[groupId].account;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting group account number: ${error.message}`);
      return null;
    }
  }
}

module.exports = new BettingRoundController();
