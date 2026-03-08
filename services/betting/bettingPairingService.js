/**
 * BettingPairingService
 * จับคู่การเล่นและคำนวณยอดเงิน
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const balanceUpdateService = require('./balanceUpdateService');

class BettingPairingService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.transactionsSheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';
    this.balanceSheetName = 'UsersBalance';
  }

  /**
   * Initialize Google Sheets API
   */
  async initialize() {
    try {
      let credentials;

      // Try to load from environment variable first (for production)
      if (process.env.GOOGLE_CREDENTIALS_JSON) {
        credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        console.log('✅ Google Sheets credentials loaded from environment');
      } else {
        // Fall back to file (for local development)
        const credentialsPath = path.join(
          __dirname,
          '../../',
          process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'credentials.json'
        );
        credentials = JSON.parse(fs.readFileSync(credentialsPath));
        console.log('✅ Google Sheets credentials loaded from file');
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
    } catch (error) {
      console.error('Error initializing BettingPairingService:', error);
      throw error;
    }
  }

  /**
   * บันทึกการเล่นลง Google Sheets
   * @param {object} betData - ข้อมูลการเล่น
   * @param {string} userId - User ID จาก LINE
   * @param {string} displayName - ชื่อ User
   * @param {string} lineName - ชื่อ LINE
   * @param {string} groupName - ชื่อกลุ่มแชท (optional)
   * @param {string} userToken - User Access Token (optional)
   * @param {string} groupId - Group ID (optional)
   * @returns {object}
   */
  async recordBet(betData, userId, displayName, lineName = '', groupName = '', userToken = '', groupId = '') {
    try {
      // Ensure initialization is complete
      await this.ensureInitialized();

      const BetsSheetColumns = require('./betsSheetColumns');

      // สร้างข้อมูลสำหรับบันทึก
      // รูปแบบข้อความ: "320-340 ล 100 คำไผ่" หรือ "ชล 500 ฟ้าหลังฝน"
      const messageText = betData.price 
        ? `${betData.price} ${betData.sideCode}${betData.amount ? ' ' + betData.amount : ''} ${betData.slipName}`
        : `${betData.sideCode}${betData.amount ? ' ' + betData.amount : ''} ${betData.slipName}`;
      
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
        userAId: userId,
        userAName: displayName,
        messageA: messageText,
        slipName: betData.slipName,
        sideA: betData.sideCode,
        amount: betData.amount || '',
        groupName: groupName || '',
        tokenA: userToken || '',
        groupId: groupId || '',
      });

      // เพิ่มแถวใหม่ลงชีท Bets
      console.log(`📝 Recording bet to Bets sheet: ${this.transactionsSheetName}`);
      console.log(`   Timestamp: ${timestamp}`);
      console.log(`   User A: ${displayName}`);
      console.log(`   Message: ${messageText}`);
      console.log(`   Slip: ${betData.slipName}`);
      console.log(`   Side: ${betData.sideCode}`);
      console.log(`   Amount: ${betData.amount || 'N/A'}`);
      console.log(`   Price: ${betData.price || 'N/A'}`);
      
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.transactionsSheetName}!A:U`,
        valueInputOption: 'RAW',
        resource: {
          values: [row],
        },
      });

      console.log(`✅ Bet recorded successfully to ${this.transactionsSheetName}`);
      return { success: true, message: 'บันทึกการเล่นสำเร็จ' };
    } catch (error) {
      console.error('Error recording bet:', error);
      return { success: false, message: 'เกิดข้อผิดพลาดในการบันทึก' };
    }
  }

  /**
   * ดึงข้อมูลการเล่นทั้งหมดในรอบปัจจุบัน
   * @returns {array}
   */
  async getAllBets() {
    try {
      // Ensure initialization is complete
      await this.ensureInitialized();

      const BetsSheetColumns = require('./betsSheetColumns');

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.transactionsSheetName}!A2:U`,
      });

      const values = response.data.values || [];
      // เก็บ Row Index ที่แท้จริง (เริ่มจาก 2 เพราะ Header อยู่ที่ Row 1)
      return values.map((row, index) => {
        const parsed = BetsSheetColumns.parseRow(row);
        parsed.rowIndex = index + 2; // Row Index ที่แท้จริง (1-indexed)
        return parsed;
      });
    } catch (error) {
      console.error('Error getting all bets:', error);
      return [];
    }
  }

  /**
   * ดึงข้อมูลการเล่นจากกลุ่มเฉพาะ
   * @param {string} groupId - ID ของกลุ่ม
   * @returns {array} ข้อมูลการเล่นในกลุ่มนั้น
   */
  async getBetsByGroupId(groupId) {
    try {
      const allBets = await this.getAllBets();
      // กรองเฉพาะข้อมูลที่มี groupId ตรงกัน
      return allBets.filter(bet => bet.groupId === groupId);
    } catch (error) {
      console.error('Error getting bets by group ID:', error);
      return [];
    }
  }

  /**
   * จับคู่การเล่นและหักเงินทันที
   * @param {array} bets - ข้อมูลการเล่นทั้งหมด
   * @returns {array} คู่ที่จับได้พร้อมการหักเงิน
   */
  static async findPairsAndDeductBalance(bets) {
    const pairs = [];
    const processed = new Set();

    for (let i = 0; i < bets.length; i++) {
      if (processed.has(i)) continue;

      const bet1 = bets[i];
      if (bet1.status === 'MATCHED') continue;

      for (let j = i + 1; j < bets.length; j++) {
        if (processed.has(j)) continue;

        const bet2 = bets[j];
        if (bet2.status === 'MATCHED') continue;

        // ตรวจสอบว่าเป็นคู่หรือไม่
        let isValid = false;

        // วิธีที่ 1: Direct + Reply Method
        if (bet1.method !== 'REPLY' && bet2.method === 'REPLY') {
          isValid = this.isValidDirectReplyPair(bet1, bet2);
        }
        // วิธีที่ 1 (สลับ): Reply + Direct Method
        else if (bet1.method === 'REPLY' && bet2.method !== 'REPLY') {
          isValid = this.isValidDirectReplyPair(bet2, bet1);
        }
        // วิธีที่ 2: Direct + Direct Method
        else if (bet1.method !== 'REPLY' && bet2.method !== 'REPLY') {
          isValid = this.isValidDirectPair(bet1, bet2);
        }

        if (isValid) {
          // คำนวณจำนวนเงินที่ใช้ (ใช้ยอดน้อยกว่า)
          const betAmount = Math.min(bet1.amount || 0, bet2.amount || 0);

          pairs.push({
            bet1: { ...bet1, index: i },
            bet2: { ...bet2, index: j },
            betAmount,
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
   * หักเงินเดิมพันจากยอดคงเหลือ
   * @param {string} displayName - ชื่อ LINE
   * @param {number} betAmount - จำนวนเงินที่เดิมพัน
   * @returns {object} ผลการหักเงิน
   */
  async deductBetAmount(displayName, betAmount) {
    try {
      // ดึงยอดเงินปัจจุบัน
      const currentBalance = await this.getUserBalance(displayName);
      const newBalance = currentBalance - betAmount;

      // อัปเดตยอดเงิน
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.balanceSheetName}!A:C`,
      });

      const values = response.data.values || [];
      let userRowIndex = -1;

      for (let i = 1; i < values.length; i++) {
        if (values[i][1] === displayName) {
          userRowIndex = i;
          break;
        }
      }

      if (userRowIndex >= 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${this.balanceSheetName}!C${userRowIndex + 1}`,
          valueInputOption: 'RAW',
          resource: {
            values: [[newBalance]],
          },
        });

        console.log(`💰 Deducted ${betAmount} บาท from ${displayName} (${currentBalance} → ${newBalance})`);

        return {
          success: true,
          displayName,
          previousBalance: currentBalance,
          deductedAmount: betAmount,
          newBalance,
        };
      }

      return {
        success: false,
        error: `ไม่พบผู้เล่น ${displayName}`,
      };
    } catch (error) {
      console.error('Error deducting bet amount:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * ดึงยอดเงินคงเหลือของผู้เล่น (ใช้ DisplayName)
   * @param {string} displayName - ชื่อ LINE
   * @returns {number}
   */
  async getUserBalance(displayName) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.balanceSheetName}!A:C`,
      });

      const values = response.data.values || [];
      for (let i = 1; i < values.length; i++) {
        if (values[i][1] === displayName) {
          return parseInt(values[i][2]) || 0;
        }
      }

      return 0;
    } catch (error) {
      console.error('Error getting user balance:', error);
      return 0;
    }
  }

  /**
   * ตรวจสอบว่าเป็นคู่ Reply ที่ถูกต้องหรือไม่
   * @private
   */
  /**
   * ตรวจสอบคู่ Direct + Reply Method
   * Direct bet ต้องจับคู่กับ Reply bet ที่ฝั่งตรงข้าม
   * @private
   */
  static isValidDirectReplyPair(directBet, replyBet) {
    // 1. ชื่อบั้งไฟต้องเดียวกัน
    if (directBet.slipName !== replyBet.slipName) return false;

    // 2. จำนวนเงินต้องเดียวกัน
    if (directBet.amount !== replyBet.amount) return false;

    // 3. ฝั่ง Reply ต้องเป็นฝั่งตรงข้าม
    // directBet มีฝั่งที่ชัดเจน (ชล/ชถ/ล/ย)
    // replyBet (ต) ต้องแปลงเป็นฝั่งตรงข้าม
    const oppositeMap = {
      'ชล': 'ชถ',
      'ชถ': 'ชล',
      'ล': 'ย',
      'ย': 'ล',
    };

    // ใช้ sideCode ของ directBet
    const directBetSideCode = directBet.sideCode || directBet.side;
    const expectedReplyBetSideCode = oppositeMap[directBetSideCode];
    
    // replyBet.side จะเป็น 'ต' (ตอบ) ต้องแปลงเป็นฝั่งตรงข้าม
    if (replyBet.side !== 'ต') return false;

    // ตั้งค่า replyBet.side และ sideCode เป็นฝั่งตรงข้าม
    replyBet.side = expectedReplyBetSideCode;
    replyBet.sideCode = expectedReplyBetSideCode;

    return true;
  }

  static isValidReplyPair(bet1, bet2) {
    // ต้องเป็นบั้งไฟเดียวกัน
    if (bet1.slipName !== bet2.slipName) return false;

    // ทั้งคู่ต้อง reply
    if (bet1.method !== 'REPLY' || bet2.method !== 'REPLY') return false;

    return true;
  }

  /**
   * ตรวจสอบว่าเป็นคู่ Direct ที่ถูกต้องหรือไม่
   * @private
   */
  static isValidDirectPair(bet1, bet2) {
    // 1. ต้องเป็นบั้งไฟเดียวกัน
    if (bet1.slipName !== bet2.slipName) return false;

    // 2. ต้องเป็นฝั่งตรงข้าม
    // ใช้ sideCode (ล/ย/ชล/ชถ) ไม่ใช่ side (ไล่/ยั้ง/ถอย)
    const oppositeMap = {
      'ชล': 'ชถ',
      'ชถ': 'ชล',
      'ล': 'ย',
      'ย': 'ล',
    };

    const bet1SideCode = bet1.sideCode || bet1.side;
    const bet2SideCode = bet2.sideCode || bet2.side;

    if (oppositeMap[bet1SideCode] !== bet2SideCode) return false;

    // 3. วิธีที่ 2 ต้องมีราคาเดียวกัน
    if (bet1.method === 2 && bet2.method === 2) {
      if (bet1.price !== bet2.price) return false;
    }

    // 4. จำนวนเงินสามารถต่างกันได้ (ใช้ยอดน้อยกว่า)
    // ไม่ต้องตรวจสอบว่าเท่ากัน เพราะจะคำนวณจากยอดน้อยกว่า

    return true;
  }

  /**
   * ตรวจสอบว่าเป็นคู่ Price Range ที่ถูกต้องหรือไม่ (ราคาเดียวกัน ยอดเงินต่างกันได้)
   * @private
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

    // 3. ต้องมีราคาเดียวกัน (Price Range)
    if (bet1.price !== bet2.price) return false;

    // 4. ทั้งคู่ต้องเป็น Direct Method (method 2 หรือ method ที่มีราคา)
    if (!bet1.price || !bet2.price) return false;

    // 5. จำนวนเงินสามารถต่างกันได้ (ใช้ยอดน้อยกว่า)
    return true;
  }

  /**
   * คำนวณผลลัพธ์การเล่น
   * @param {object} pair - คู่การเล่น
   * @param {string} slipName - ชื่อบั้งไฟ
   * @param {number} score - คะแนนที่ออก (สำหรับ Direct Method เท่านั้น)
   * @returns {object} ผลลัพธ์
   */
  static calculateResult(pair, slipName, score) {
    const { bet1, bet2 } = pair;

    // REPLY Method: ไม่มีราคา ให้ผู้เล่นฝั่ง "ไล่" (ชล) ชนะ
    if (bet1.method === 'REPLY' && bet2.method === 'REPLY') {
      // สำหรับ REPLY method ให้ bet1 ชนะ (หรือสามารถกำหนดตามกฎเกมอื่น)
      // ในที่นี้ให้ bet1 ชนะ
      return {
        winner: {
          userId: bet1.userId,
          displayName: bet1.displayName,
          amount: 0, // REPLY method ไม่มีจำนวนเงิน
          result: 'WIN',
        },
        loser: {
          // ✅ ใช้ userBId จาก bet1 (ดึงจาก Column R) เป็น userId
          userId: bet1.userBId || bet2.userId,
          // ✅ ใช้ userBName จาก bet1 (ดึงจาก Column L) เป็น displayName
          displayName: bet1.userBName || bet2.displayName,
          amount: 0, // REPLY method ไม่มีจำนวนเงิน
          result: 'LOSE',
        },
      };
    }

    // Direct Method
    let winner = null;
    let loser = null;
    let betAmount = 0; // ใช้ยอดน้อยกว่า

    if (bet1.method === 1) {
      // วิธีที่ 1: ไม่มีราคา ให้ผู้เล่นฝั่ง "ไล่" (ชล) ชนะ
      winner = bet1.side === 'ชล' ? bet1 : bet2;
      loser = bet1.side === 'ชล' ? bet2 : bet1;
      // ใช้ยอดน้อยกว่า
      betAmount = Math.min(bet1.amount || 0, bet2.amount || 0);
    } else if (bet1.method === 2) {
      // วิธีที่ 2: ตรวจสอบว่าคะแนนอยู่ในเกณฑ์ราคาหรือไม่
      // ตรวจสอบเฉพาะ bet1.price ที่มี '-' (ช่วงราคา)
      const hasPriceRange1 = bet1.price && bet1.price.includes('-');
      
      if (hasPriceRange1) {
        // ตรวจสอบว่า bet1.price เป็นรูปแบบข้อความการเล่นแบบร้องราคา (เช่น "370-410 ย 20 แอด")
        const isPriceRangeFormat = /\d+-\d+\s+[ยลชถ]/.test(bet1.price);
        
        if (isPriceRangeFormat) {
          // เป็นรูปแบบข้อความการเล่นแบบร้องราคา → เสมอ
          winner = bet1;
          loser = bet2;
        } else {
          // bet1 มีช่วงราคา → ตรวจสอบตามช่วง
          const priceRange1 = this.parsePriceRange(bet1.price);
          const isInRange1 = score >= priceRange1.min && score <= priceRange1.max;

          if (isInRange1) {
            // คะแนนอยู่ในช่วง → เสมอ
            winner = bet1;
            loser = bet2;
          } else {
            // คะแนนไม่อยู่ในช่วง → ฝั่ง "ยั้ง" ชนะ
            winner = bet1.side === 'ย' ? bet2 : bet1;
            loser = bet1.side === 'ย' ? bet1 : bet2;
          }
        }
      } else {
        // ถ้าไม่มีช่วงราคา ให้ใช้ Direct Method 1 (ตรวจสอบ side)
        winner = bet1.side === 'ชล' ? bet1 : bet2;
        loser = bet1.side === 'ชล' ? bet2 : bet1;
      }
      // ใช้ยอดน้อยกว่า
      betAmount = Math.min(bet1.amount || 0, bet2.amount || 0);
    }

    // ✅ ถ้า loser คือ bet2 ให้ใช้ userBId และ userBName จาก bet1
    let loserUserId, loserDisplayName;
    if (loser === bet2) {
      loserUserId = bet1.userBId || bet2.userId;
      loserDisplayName = bet1.userBName || bet2.displayName;
    } else {
      loserUserId = loser.userId;
      loserDisplayName = loser.displayName;
    }

    return {
      winner: {
        userId: winner.userId,
        displayName: winner.displayName,
        amount: betAmount,
        result: 'WIN',
      },
      loser: {
        userId: loserUserId,
        displayName: loserDisplayName,
        amount: betAmount,
        result: 'LOSE',
      },
    };
  }

  /**
   * Parse ราคาจากรูปแบบ "0/3(300-330)"
   * @private
   */
  static parsePriceRange(priceStr) {
    // รูปแบบ 1: (350-370) - มีวงเล็บ
    let match = priceStr.match(/\((\d+)-(\d+)\)/);
    if (match) {
      return {
        min: parseInt(match[1]),
        max: parseInt(match[2]),
      };
    }

    // รูปแบบ 2: 350-370 - ไม่มีวงเล็บ (จากข้อความ A)
    match = priceStr.match(/^(\d+)-(\d+)/);
    if (match) {
      return {
        min: parseInt(match[1]),
        max: parseInt(match[2]),
      };
    }

    return { min: 0, max: 999 };
  }

  /**
   * อัปเดตยอดเงินของ User
   * @param {string} userId
   * @param {number} amount - จำนวนเงินที่เพิ่ม/ลด (บวก/ลบ)
   * @returns {object}
   */
  async updateUserBalance(lineName, amount) {
    try {
      // ดึงข้อมูล User ปัจจุบัน
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.balanceSheetName}!A:C`,
      });

      const values = response.data.values || [];
      let userRowIndex = -1;
      let currentBalance = 0;

      for (let i = 1; i < values.length; i++) {
        if (values[i][1] === lineName) {
          userRowIndex = i;
          currentBalance = parseInt(values[i][2]) || 0;
          break;
        }
      }

      const newBalance = currentBalance + amount;

      if (userRowIndex >= 0) {
        // อัปเดตแถวที่มีอยู่
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${this.balanceSheetName}!C${userRowIndex + 1}`,
          valueInputOption: 'RAW',
          resource: {
            values: [[newBalance]],
          },
        });
      }

      return { success: true, newBalance };
    } catch (error) {
      console.error('Error updating user balance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ดึงยอดเงินคงเหลือของ User
   * @param {string} userId
   * @returns {number}
   */
  async getUserBalanceByUserId(userId) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.balanceSheetName}!A:C`,
      });

      const values = response.data.values || [];
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] === userId) {
          return parseInt(values[i][2]) || 0;
        }
      }

      return 0;
    } catch (error) {
      console.error('Error getting user balance:', error);
      return 0;
    }
  }

  /**
   * ดึงข้อมูลยอดเงินทั้งหมด
   * @returns {array}
   */
  async getAllBalances() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.balanceSheetName}!A2:C`,
      });

      const values = response.data.values || [];
      return values.map((row) => ({
        userId: row[0],
        displayName: row[1],
        balance: parseInt(row[2]) || 0,
      }));
    } catch (error) {
      console.error('Error getting all balances:', error);
      return [];
    }
  }

  /**
   * ล้างข้อมูลการเล่นในรอบปัจจุบัน
   * @returns {object}
   */
  async clearRoundTransactions() {
    try {
      // ลบข้อมูลทั้งหมดใน Transactions Sheet
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${this.transactionsSheetName}!A2:I`,
      });

      return { success: true, message: 'ล้างข้อมูลการเล่นสำเร็จ' };
    } catch (error) {
      console.error('Error clearing transactions:', error);
      return { success: false, message: 'เกิดข้อผิดพลาดในการล้างข้อมูล' };
    }
  }

  /**
   * อัปเดตแถวของ User A ด้วยข้อมูลของ User B (เมื่อจับคู่สำเร็จ)
   * @param {number} rowIndex - ตำแหน่งแถวของ User A (0-based)
   * @param {object} userBData - ข้อมูลของ User B
   * @returns {object} ผลการอัปเดต
   */
  async updateRowWithUserB(rowIndex, userBData) {
    try {
      // Ensure initialization is complete
      await this.ensureInitialized();

      const BetsSheetColumns = require('./betsSheetColumns');

      // ถ้า rowIndex เป็น 0-indexed ให้แปลงเป็น 1-indexed
      // ถ้าเป็น 1-indexed แล้ว ให้ใช้ตรงๆ
      const actualRowIndex = rowIndex < 2 ? rowIndex + 2 : rowIndex;

      console.log(`\n📝 === Updating Row with User B Data ===`);
      console.log(`   Row Index: ${actualRowIndex}`);
      console.log(`   User B ID: ${userBData.userId}`);
      console.log(`   User B Name: ${userBData.displayName}`);

      // ดึงข้อมูลแถวปัจจุบัน
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.transactionsSheetName}!A${actualRowIndex}:U${actualRowIndex}`,
      });

      const currentRow = response.data.values?.[0] || [];
      console.log(`   Current Row Length: ${currentRow.length}`);

      // สร้างแถวใหม่ด้วยข้อมูล User B
      const updatedRow = BetsSheetColumns.updateRowWithUserB(currentRow, userBData);
      console.log(`   Updated Row Length: ${updatedRow.length}`);
      console.log(`   Column R (USER_B_ID): ${updatedRow[17]}`);

      // อัปเดตแถวในชีท
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.transactionsSheetName}!A${actualRowIndex}:U${actualRowIndex}`,
        valueInputOption: 'RAW',
        resource: {
          values: [updatedRow],
        },
      });

      console.log(`✅ Row ${actualRowIndex} updated with User B data`);
      return { success: true, message: 'อัปเดตแถวสำเร็จ' };
    } catch (error) {
      console.error('❌ Error updating row with User B:', error);
      return { success: false, message: 'เกิดข้อผิดพลาดในการอัปเดต' };
    }
  }
}

const instance = new BettingPairingService();

// Initialize immediately and ensure it's ready before export
let initPromise = instance.initialize().catch(error => {
  console.error('Failed to auto-initialize BettingPairingService:', error);
});

// Add a method to ensure initialization is complete
instance.ensureInitialized = async function() {
  await initPromise;
  if (!this.sheets) {
    throw new Error('BettingPairingService failed to initialize');
  }
};

module.exports = instance;
