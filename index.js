require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    req.rawBody = buf;
  }
}));

// Multer สำหรับรับไฟล์
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // ตรวจสอบประเภทไฟล์
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('ไฟล์ต้องเป็น JPEG หรือ PNG เท่านั้น'));
    }
  },
});

// Add logging middleware for Slip2Go webhook
app.use((req, res, next) => {
  if (req.path === '/slip2go/slip-verified') {
    console.log('\n🔔 Slip2Go webhook received');
    console.log(`   Path: ${req.path}`);
    console.log(`   Method: ${req.method}`);
    console.log(`   Headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`   Body:`, JSON.stringify(req.body, null, 2));
  }
  next();
});

// ===== CONFIGURATION =====
// Account 1 (Primary - Verify betting data)
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;

// Account 2 (Same as Account 1)
const LINE_CHANNEL_SECRET_2 = process.env.LINE_CHANNEL_SECRET_2;
const LINE_CHANNEL_ACCESS_TOKEN_2 = process.env.LINE_CHANNEL_ACCESS_TOKEN_2;
const LINE_CHANNEL_ID_2 = process.env.LINE_CHANNEL_ID_2;

// Account 3 (Slip Verification & Balance Management)
const LINE_CHANNEL_SECRET_3 = process.env.LINE_CHANNEL_SECRET_3;
const LINE_CHANNEL_ACCESS_TOKEN_3 = process.env.LINE_CHANNEL_ACCESS_TOKEN_3;
const LINE_CHANNEL_ID_3 = process.env.LINE_CHANNEL_ID_3;

// Slip Verification Bank Accounts (ตั้งค่าบัญชีที่ต้องการตรวจสอบ)
const SLIP_RECEIVER_ACCOUNT_1 = process.env.SLIP_RECEIVER_ACCOUNT_1 || '';  // Account 1
const SLIP_RECEIVER_ACCOUNT_2 = process.env.SLIP_RECEIVER_ACCOUNT_2 || '';  // Account 2
const SLIP_RECEIVER_ACCOUNT_3 = process.env.SLIP_RECEIVER_ACCOUNT_3 || '';  // Account 3
const SLIP_RECEIVER_PROMPTPAY = process.env.SLIP_RECEIVER_PROMPTPAY || '';  // PromptPay เบอร์โทร
// ชื่อผู้รับที่อนุญาต (สำหรับเทียบเมื่อบัญชีไม่ตรงจาก checkReceiver)
const SLIP_RECEIVER_NAMES = (process.env.SLIP_RECEIVER_NAMES || 'บุญญาภา,ชญาภา').split(',').map(n => n.trim());

// Google Sheets
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

// Helper to get correct credentials based on channel ID
function getLineCredentials(channelId) {
  if (channelId === LINE_CHANNEL_ID) {
    return {
      secret: LINE_CHANNEL_SECRET,
      token: LINE_CHANNEL_ACCESS_TOKEN
    };
  } else if (channelId === LINE_CHANNEL_ID_2) {
    return {
      secret: LINE_CHANNEL_SECRET_2,
      token: LINE_CHANNEL_ACCESS_TOKEN_2
    };
  } else if (channelId === LINE_CHANNEL_ID_3) {
    return {
      secret: LINE_CHANNEL_SECRET_3,
      token: LINE_CHANNEL_ACCESS_TOKEN_3
    };
  }
  return null;
}

// Load groups data
let groupsData = {};
try {
  groupsData = JSON.parse(fs.readFileSync('data/groups.json', 'utf8'));
  console.log('✅ Groups data loaded');
} catch (error) {
  console.log('⚠️  Groups data file not found, starting with empty groups');
  groupsData = {};
}

// Save groups data to file
function saveGroupsData() {
  try {
    fs.writeFileSync('data/groups.json', JSON.stringify(groupsData, null, 2));
    console.log('✅ Groups data saved');
  } catch (error) {
    console.error('❌ Failed to save groups data:', error.message);
  }
}

// Register group with account
function registerGroup(groupId, groupName, accountNumber) {
  if (!groupsData[groupId]) {
    groupsData[groupId] = {
      id: groupId,
      name: groupName,
      account: accountNumber,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    saveGroupsData();
    console.log(`✅ Registered new group: ${groupName} (Account ${accountNumber})`);
  } else {
    // Update last active
    groupsData[groupId].lastActive = new Date().toISOString();
    saveGroupsData();
  }
}

// Get account number from channel ID
function getAccountNumber(channelId) {
  if (channelId === LINE_CHANNEL_ID) return 1;
  if (channelId === LINE_CHANNEL_ID_2) return 2;
  if (channelId === LINE_CHANNEL_ID_3) return 3;
  return null;
}

// Get receiver account number based on channel ID
function getReceiverAccount(channelId) {
  if (channelId === LINE_CHANNEL_ID) {
    return SLIP_RECEIVER_ACCOUNT_1;
  } else if (channelId === LINE_CHANNEL_ID_2) {
    return SLIP_RECEIVER_ACCOUNT_2;
  } else if (channelId === LINE_CHANNEL_ID_3) {
    return SLIP_RECEIVER_ACCOUNT_3;
  }
  return '';
}

// Get groups for specific account
function getGroupsForAccount(accountNumber) {
  return Object.values(groupsData).filter(group => group.account === accountNumber);
}

// Load Google credentials
let googleAuth;
try {
  let credentials;
  
  // Try to load from environment variable first (for production)
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    console.log('✅ Google Sheets credentials loaded from environment');
  } else {
    // Fall back to file (for local development)
    const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'credentials.json';
    credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log('✅ Google Sheets credentials loaded from file');
  }
  
  googleAuth = new GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
} catch (error) {
  console.error('❌ Failed to load Google credentials:', error.message);
}

const sheets = google.sheets('v4');

// ===== HELPER FUNCTIONS =====

function validateLineSignature(signature, body, channelSecret) {
  if (!signature) return false;
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

// LINE API: Get user profile
async function getLineUserProfile(userId, accessToken) {
  return new Promise((resolve, reject) => {
    // ถ้า accessToken ไม่มี ให้ใช้ token จากบัญชีหลัก
    const token = accessToken || LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!token) {
      console.log(`      ❌ No access token available`);
      resolve('Unknown');
      return;
    }
    
    if (!userId) {
      console.log(`      ❌ No userId provided`);
      resolve('Unknown');
      return;
    }
    
    console.log(`      🔍 Fetching profile for userId: ${userId}`);
    
    const options = {
      hostname: 'api.line.me',
      path: `/v2/bot/profile/${userId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          console.log(`      📊 HTTP Status: ${res.statusCode}`);
          
          // ถ้า status 403 หรือ 404 แสดงว่าไม่เป็นเพื่อน
          if (res.statusCode === 403 || res.statusCode === 404) {
            console.log(`      ⚠️  User is not a friend of this OA (Status: ${res.statusCode})`);
            resolve(null); // return null เพื่อให้ caller ลอง group profile
            return;
          }
          
          const profile = JSON.parse(data);
          console.log(`      👤 Profile response:`, profile);
          if (profile.displayName) {
            console.log(`      ✅ Got displayName: ${profile.displayName}`);
            resolve(profile.displayName);
          } else {
            console.log(`      ⚠️  No displayName in profile`);
            resolve('Unknown');
          }
        } catch (e) {
          console.log(`      ❌ Parse error:`, e.message);
          console.log(`      📝 Response data:`, data);
          resolve('Unknown');
        }
      });
    });

    req.on('error', (err) => {
      console.log(`      ❌ API error:`, err.message);
      resolve('Unknown');
    });

    req.end();
  });
}

// LINE API: Get group member profile (ดึงชื่อจากกลุ่ม แม้ไม่ได้เป็นเพื่อน OA)
async function getLineGroupMemberProfile(groupId, userId, accessToken) {
  if (!groupId || !userId) return null;
  const token = accessToken || LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;

  return new Promise((resolve) => {
    console.log(`      🔍 Fetching group member profile for userId: ${userId} in group: ${groupId}`);
    const options = {
      hostname: 'api.line.me',
      path: `/v2/bot/group/${groupId}/member/${userId}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const profile = JSON.parse(data);
            if (profile.displayName) {
              console.log(`      ✅ Got group member displayName: ${profile.displayName}`);
              resolve(profile.displayName);
              return;
            }
          }
          console.log(`      ⚠️  Could not get group member profile (Status: ${res.statusCode})`);
          resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

// LINE API: Get group name
async function getLineGroupName(groupId, accessToken) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.line.me',
      path: `/v2/bot/group/${groupId}/summary`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    };

    https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const summary = JSON.parse(data);
          console.log(`      🏘️  Group response:`, summary);
          resolve(summary.groupName || 'Unknown Group');
        } catch (e) {
          console.log(`      ❌ Parse error:`, e.message);
          resolve('Unknown Group');
        }
      });
    }).on('error', (err) => {
      console.log(`      ❌ API error:`, err.message);
      resolve('Unknown Group');
    }).end();
  });
}

// Get opposite bet type
function getOppositeBetType(betType) {
  // ยั้ง (ต่ำ): ชถ, ย
  // ไล่ (สูง): ชล, ล
  
  const opposites = {
    // ยั้ง → ไล่
    'ชถ': 'ชล',
    'ย': 'ล',
    
    // ไล่ → ยั้ง
    'ชล': 'ชถ',
    'ล': 'ย',
  };
  return opposites[betType] || '';
}

// Get opposite result symbol
function getOppositeResult(betType) {
  // This will be filled when result is announced
  // For now, return empty string
  return '';
}

// ===== RESULT PARSER =====
function parseResultMessage(message) {
  // Format: "ช่วงราคา ชื่อบั้งไฟ เลขที่ออก ✅/❌/⛔️"
  // Example: "360-410 อาจารย์อั๋น 310✅" หรือ "อาจารย์อั๋น 310✅"
  
  // ลองแยกช่วงราคา (เช่น 360-410, 370-410)
  const priceRangeMatch = message.match(/(\d+[\-\.\/\*]\d+)/);
  let priceRange = null;
  let messageWithoutPrice = message;
  
  if (priceRangeMatch) {
    priceRange = priceRangeMatch[1];
    messageWithoutPrice = message.replace(priceRange, '').trim();
  }
  
  // แยกชื่อบั้งไฟ เลขที่ออก และผลลัพธ์
  // รองรับ emoji ทั้งแบบมีและไม่มี variation selector (FE0F)
  const resultMatch = messageWithoutPrice.match(/(.+?)\s+(\d+)\s*(✅️?|❌️?|⛔️?)/);
  if (!resultMatch) return null;
  
  // Normalize emoji ให้เป็นรูปแบบเดียวกันเสมอ (ไม่มี variation selector)
  let resultEmoji = resultMatch[3].replace(/\uFE0F/g, '');
  // แปลงกลับเป็น emoji มาตรฐานที่ใช้ในระบบ
  const emojiMap = { '\u2705': '✅', '\u274C': '❌', '\u26D4': '⛔️' };
  resultEmoji = emojiMap[resultEmoji] || resultEmoji;
  
  return {
    priceRange: priceRange,
    fireworkName: resultMatch[1].trim(),
    resultNumber: resultMatch[2],
    result: resultEmoji
  };
}

// Find matching bets in Google Sheets
async function findMatchingBets(priceRange, fireworkName, resultScore) {
  if (!googleAuth) return [];
  
  try {
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });
    
    const rows = response.data.values || [];
    const matchingRows = [];
    
    console.log(`   🔍 findMatchingBets: priceRange="${priceRange}", fireworkName="${fireworkName}"`);
    
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 5) continue;
      
      // Column D (index 3) = ข้อความ A (มีช่วงราคา เช่น "300-320 ล 20 ฟ้า")
      const messageA = row[3] || '';
      
      // Column E (index 4) = ชื่อบั้งไฟ
      const rowFireworkName = row[4] || '';
      
      // Column H (index 7) = ยอดเงิน B (ต้องมีค่า = จับคู่สำเร็จแล้ว)
      const userBAmount = row[7] || '';
      
      // Column I (index 8) = ผลที่ออก (ต้องว่าง = ยังไม่มีผลลัพธ์)
      const resultNumber = row[8] || '';
      
      // ✅ แยกช่วงราคาจากข้อความ (รองรับทั้ง slash format และ standard format)
      let rowPriceRange = null;
      // ตรวจสอบรูปแบบ slash: "ไล่/350-360/50/เป็ด" → "350-360"
      let match = messageA.match(/\/(\d+[\-\.\/\*]\d+)\//);
      if (match) {
        rowPriceRange = match[1];
      } else {
        // ตรวจสอบรูปแบบปกติ: "350-360 ล 50 เป็ด" → "350-360"
        match = messageA.match(/^(\d+[\-\.\/\*]\d+)/);
        if (match) {
          rowPriceRange = match[1];
        }
      }
      
      console.log(`      Row ${i + 1}: messageA="${messageA}", fireworkName="${rowFireworkName}", priceRange="${rowPriceRange}", userBAmount="${userBAmount}", resultNumber="${resultNumber}"`);
      
      // ตรวจสอบชื่อบั้งไฟ
      const nameMatch = fireworkName && rowFireworkName === fireworkName;
      
      // ✅ ตรวจสอบช่วงราคา
      let priceMatch = true;
      if (priceRange && priceRange !== 'null') {
        // ถ้าระบุช่วงราคา ต้องตรวจสอบว่าตรงกัน
        priceMatch = rowPriceRange === priceRange;
      }
      // ถ้า priceRange เป็น null ให้ match ทั้งหมด (priceMatch = true)
      
      console.log(`      nameMatch=${nameMatch}, priceMatch=${priceMatch}, hasUserB=${!!userBAmount}, noResult=${!resultNumber}`);
      
      // ✅ ต้องมี User B และ ยังไม่มี Result
      if (priceMatch && nameMatch &&
          userBAmount && // มี User B = จับคู่สำเร็จแล้ว
          !resultNumber) { // ยังไม่มีผลลัพธ์
        console.log(`      ✅ MATCH FOUND!`);
        matchingRows.push({
          rowIndex: i + 1,
          data: row,
          priceRange: rowPriceRange,
          fireworkName: fireworkName
        });
      }
    }
    
    console.log(`   Found ${matchingRows.length} matching bet(s)`);
    return matchingRows;
  } catch (error) {
    console.error('❌ Error finding matching bets:', error.message);
    return [];
  }
}

// Update result in Google Sheets (Sheet only - ไม่ส่ง LINE แจ้งเตือน)
async function updateBetResultSheetOnly(rowIndex, resultNumber, resultSymbol, accessToken) {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A${rowIndex}:U${rowIndex}`,
    });

    const row = response.data.values?.[0] || [];
    const userAId = row[1] || '';
    const userAName = row[2] || '';
    const userBId = row[17] || '';
    const userBName = row[11] || '';
    const betAmountA = parseFloat(row[6]) || 0;
    const betAmountB = parseFloat(row[7]) || 0;
    const betAmount = betAmountB > 0 ? Math.min(betAmountA, betAmountB) : betAmountA;
    const fireworkName = row[4] || '';

    if (!userAId || !userBId) {
      console.log(`   ⚠️  Skipping row ${rowIndex}: ไม่มีคู่เล่นที่สมบูรณ์`);
      return;
    }

    // ใช้ bettingResultService เพื่อคำนวณผลลัพธ์
    const bettingResultService = require('./services/betting/bettingResultService');
    const priceA = row[3] || '';
    const sideA = (() => {
      const sidePatterns = ['ไล่', 'ยั้ง', 'ชล', 'ชถ', 'ชย', 'ล', 'ย', 'ต', 'บ', 'ถ'];
      for (const pattern of sidePatterns) {
        if (priceA.includes(pattern)) return pattern;
      }
      return null;
    })();
    const hasPriceRangeA = priceA && priceA.includes('-');
    const extractedPriceA = (() => {
      let match = priceA.match(/\/(\d+[\-\.\/\*]\d+)\//);
      if (match) return match[1];
      match = priceA.match(/^(\d+[\-\.\/\*]\d+)/);
      if (match) return match[1];
      return null;
    })();
    const getOppositeSide = (side) => {
      const oppositeMap = { 'ล': 'ย', 'ย': 'ล', 'ไล่': 'ต', 'ต': 'ไล่', 'ชล': 'ชถ', 'ชถ': 'ชล', 'ชย': 'ชล' };
      return oppositeMap[side] || side;
    };

    const pair = {
      bet1: { userId: userAId, displayName: userAName, userBName, userBId, amount: betAmount, price: extractedPriceA, side: sideA, sideCode: sideA, method: hasPriceRangeA ? 2 : 1 },
      bet2: { userId: userBId, displayName: userBName, userBName: userAName, amount: betAmount, price: null, side: getOppositeSide(sideA), sideCode: getOppositeSide(sideA), method: hasPriceRangeA ? 2 : 'REPLY' },
    };

    const result = bettingResultService.calculateResultWithFees(pair, fireworkName, resultNumber);

    let userAResultText = result.isDraw ? '⛔️' : (result.winner.userId === userAId ? '✅' : '❌');
    let userBResultText = result.isDraw ? '⛔️' : (result.winner.userId === userAId ? '❌' : '✅');

    let userAWinnings = 0, userBWinnings = 0;
    if (result.isDraw) {
      userAWinnings = -result.winner.fee;
      userBWinnings = -result.loser.fee;
    } else if (result.pair.bet1.userId === userAId) {
      userAWinnings = result.winner.netAmount;
      userBWinnings = result.loser.netAmount;
    } else {
      userAWinnings = result.loser.netAmount;
      userBWinnings = result.winner.netAmount;
    }

    // อัปเดต Column I-K
    await sheets.spreadsheets.values.update({
      auth: googleAuth, spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!I${rowIndex}:K${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[resultNumber, userAResultText, userBResultText]] },
    });

    // อัปเดต Column R
    await sheets.spreadsheets.values.update({
      auth: googleAuth, spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!R${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[userBId]] },
    });

    // อัปเดต Column S, T
    await sheets.spreadsheets.values.update({
      auth: googleAuth, spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!S${rowIndex}:T${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[userAWinnings, userBWinnings]] },
    });

    console.log(`   ✅ Sheet updated row ${rowIndex}: I=${resultNumber}, J=${userAResultText}, K=${userBResultText}, S=${userAWinnings}, T=${userBWinnings}`);

    // อัปเดตยอดเงิน
    if (userAId && userAName) await updatePlayerBalance(userAId, userAName, userAWinnings);
    if (userBId && userBName) await updatePlayerBalance(userBId, userBName, userBWinnings);

  } catch (error) {
    console.error(`❌ Error updating bet result (sheet only): ${error.message}`);
  }
}

// Update result in Google Sheets
async function updateBetResult(rowIndex, resultNumber, resultSymbol, accessToken) {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }

  try {
    // ดึงข้อมูลการเดิมพันจากชีท
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A${rowIndex}:U${rowIndex}`,
    });

    const row = response.data.values?.[0] || [];
    const userAId = row[1] || '';
    const userAName = row[2] || '';
    const userBId = row[17] || '';  // ✅ Column R (index 17) = User B ID
    const userBName = row[11] || '';
    const betAmountA = parseFloat(row[6]) || 0;
    const betAmountB = parseFloat(row[7]) || 0;
    const betAmount = betAmountB > 0 ? Math.min(betAmountA, betAmountB) : betAmountA;
    const fireworkName = row[4] || '';
    const userAToken = process.env.LINE_CHANNEL_ACCESS_TOKEN_2 || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    const userBToken = process.env.LINE_CHANNEL_ACCESS_TOKEN_2 || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    const groupId = row[16] || '';

    // 🔍 เช็คว่ามีคู่เล่นหรือไม่
    if (!userAId || !userBId) {
      console.log(`   ⚠️  Skipping row ${rowIndex}: ไม่มีคู่เล่นที่สมบูรณ์`);
      console.log(`      User A ID: ${userAId || '(ว่าง)'}`);
      console.log(`      User B ID: ${userBId || '(ว่าง)'}`);
      return;
    }

    // ใช้ bettingResultService เพื่อคำนวณผลลัพธ์
    const bettingResultService = require('./services/betting/bettingResultService');

    const priceA = row[3] || ''; // Column D: ข้อความ A (มีราคา)
    const priceB = row[12] || ''; // Column M: รายการแทง B (มีราคา)

    console.log(`   📋 Price A (Column D): ${priceA}`);
    console.log(`   📋 Price B (Column M): ${priceB}`);

    // ฟังก์ชันแยก side จาก price string
    const extractSide = (priceStr) => {
      if (!priceStr) return null;
      // ค้นหา ไล่, ต, ล, ย, ยั้ง, ชล, ชถ, ชย (ตรวจสอบคำทั้งหมดก่อน)
      const sidePatterns = ['ไล่', 'ยั้ง', 'ชล', 'ชถ', 'ชย', 'ล', 'ย', 'ต', 'บ', 'ถ'];
      for (const pattern of sidePatterns) {
        if (priceStr.includes(pattern)) {
          return pattern;
        }
      }
      return null;
    };

    // ใช้ Column D เป็นหลัก เพราะ B อยู่ตรงข้าม A เสมอ
    const sideA = extractSide(priceA);
    const hasPriceRangeA = priceA && priceA.includes('-');
    const hasPriceRangeB = priceB && priceB.includes('-');

    // ✅ แยกช่วงราคาจากข้อความ (เช่น "ไล่/370-410/20เป็ด" → "370-410")
    const extractPriceRange = (message) => {
      if (!message) return null;
      // ตรวจสอบรูปแบบ slash: [ฝั่ง]/[ราคา]/[ยอดเงิน][ชื่อบั้งไฟ] หรือ [ฝั่ง]/[ราคา]/[ยอดเงิน]/[ชื่อบั้งไฟ]
      let match = message.match(/\/(\d+[\-\.\/\*]\d+)\//);
      if (match) return match[1];
      
      // ตรวจสอบรูปแบบปกติ: [ราคา] [ล/ย] [ยอดเงิน] [ชื่อบั้งไฟ]
      match = message.match(/^(\d+[\-\.\/\*]\d+)/);
      if (match) return match[1];
      
      return null;
    };

    const extractedPriceA = extractPriceRange(priceA);

    // ฟังก์ชันหาฝั่งตรงข้าม
    const getOppositeSide = (side) => {
      const oppositeMap = {
        'ล': 'ย', 'ย': 'ล',
        'ไล่': 'ต', 'ต': 'ไล่',
        'ชล': 'ชถ', 'ชถ': 'ชล', 'ชย': 'ชล',
        'ล.': 'ย.', 'ย.': 'ล.',
      };
      return oppositeMap[side] || side;
    };

    // สร้าง pair object สำหรับ bettingResultService
    const pair = {
      bet1: {
        userId: userAId,
        displayName: userAName,
        userBName: userBName,
        userBId: userBId,
        amount: betAmount,
        price: extractedPriceA,  // ✅ ใช้ช่วงราคาที่แยกออกมา (เช่น "370-410")
        side: sideA,
        sideCode: sideA,
        method: hasPriceRangeA ? 2 : 1,
      },
      bet2: {
        userId: userBId,
        displayName: userBName,
        userBName: userAName,
        amount: betAmount,
        price: null,  // ไม่ใช้ Column M - เอาจาก Column D เท่านั้น
        side: getOppositeSide(sideA), // ✅ B อยู่ตรงข้าม A เสมอ
        sideCode: getOppositeSide(sideA),
        method: hasPriceRangeA ? 2 : 'REPLY',  // ตามว่า A มีช่วงราคาหรือไม่
      },
    };

    // คำนวณผลลัพธ์ด้วย bettingResultService
    const result = bettingResultService.calculateResultWithFees(pair, fireworkName, resultNumber);

    console.log(`   📊 Result calculated:`, {
      isDraw: result.isDraw,
      winner: result.winner.displayName,
      loser: result.loser.displayName,
    });

    // กำหนด finalResultSymbol ตามผลลัพธ์
    let finalResultSymbol = result.isDraw ? '⛔️' : '✅';
    let userAResultText = '';

    if (result.isDraw) {
      userAResultText = '⛔️';
    } else {
      // ตรวจสอบว่า User A ชนะหรือแพ้
      if (result.winner.userId === userAId) {
        userAResultText = '✅';
        finalResultSymbol = '✅';
      } else {
        userAResultText = '❌';
        finalResultSymbol = '❌';
      }
    }

    console.log(`   📊 Final Result Symbol: ${finalResultSymbol}`);

    // 💰 คำนวนแพ้ชนะ
    console.log(`   💰 Calculating winnings and updating balances...`);

    let userAWinnings = 0;
    let userBWinnings = 0;

    if (result.isDraw) {
      // เสมอ: หัก 5% ทั้งสองฝั่ง
      userAWinnings = -result.winner.fee;
      userBWinnings = -result.loser.fee;
    } else {
      // ชนะ-แพ้: ตรวจสอบจาก pair object
      if (result.pair.bet1.userId === userAId) {
        // bet1 (A) ชนะ
        userAWinnings = result.winner.netAmount;
        userBWinnings = result.loser.netAmount;
      } else {
        // bet2 (B) ชนะ
        userAWinnings = result.loser.netAmount;
        userBWinnings = result.winner.netAmount;
      }
    }

    // อัปเดตผลลัพธ์ในชีท
    // I=ผลที่ออก, J=ผลแพ้ชนะ A, K=ผลแพ้ชนะ B, R=User ID B

    // กำหนด userBResultText
    let userBResultText = '';
    if (result.isDraw) {
      userBResultText = '⛔️';
    } else {
      if (result.winner.userId === userAId) {
        userBResultText = '❌';
      } else {
        userBResultText = '✅';
      }
    }

    // อัปเดต Column I-K (ผลที่ออก, ผลแพ้ชนะ A, ผลแพ้ชนะ B)
    await sheets.spreadsheets.values.update({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!I${rowIndex}:K${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[resultNumber, userAResultText, userBResultText]],
      },
    });

    // อัปเดต Column R (User ID B)
    await sheets.spreadsheets.values.update({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!R${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[userBId]],
      },
    });

    // อัปเดต Column S, T (ยอดเงินได้/เสีย A, B)
    await sheets.spreadsheets.values.update({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!S${rowIndex}:T${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[userAWinnings, userBWinnings]],
      },
    });

    console.log(`   ✅ Updated row ${rowIndex}:`);
    console.log(`      Column I: ${resultNumber}`);
    console.log(`      Column J: ${userAResultText}`);
    console.log(`      Column K: ${userBResultText}`);
    console.log(`      Column R: ${userBId}`);
    console.log(`      Column S: ${userAWinnings}`);
    console.log(`      Column T: ${userBWinnings}`);

    // 📤 ส่งข้อความแจ้งผลให้ผู้เล่นทั้งสองฝั่ง
    console.log(`   📤 Sending result messages to players...`);

    // 💰 อัปเดตยอดเงินของผู้เล่น
    if (userAId && userAName) {
      await updatePlayerBalance(userAId, userAName, userAWinnings);
    }

    if (userBId && userBName) {
      await updatePlayerBalance(userBId, userBName, userBWinnings);
    }

    // ดึงยอดเงินคงเหลือใหม่
    await new Promise(resolve => setTimeout(resolve, 500));

    let userANewBalance = 0;
    let userBNewBalance = 0;

    if (userAId && userAName) {
      const userABalanceData = await getPlayerBalance(userAId, userAName);
      userANewBalance = userABalanceData.balance || 0;
    }

    if (userBId && userBName) {
      const userBBalanceData = await getPlayerBalance(userBId, userBName);
      userBNewBalance = userBBalanceData.balance || 0;
    }

    if (finalResultSymbol === '✅') {
      const messageA = `✅ ชนะแล้ว\n\n🎆 บั้งไฟ: ${fireworkName}\n💰 เดิมพัน: ${betAmount} บาท\n🏆 ได้รับ: ${userAWinnings.toFixed(0)} บาท\n💵 ยอดคงเหลือ: ${userANewBalance.toFixed(0)} บาท\n${userBName ? `👤 ผู้แพ้: ${userBName}\n\n` : ''}\nยินดีด้วย! 🎉`;

      if (userAId && userAName) {
        await sendLineMessageToUser(userAId, messageA, userAToken);
      }

      if (userBId && userBName) {
        const messageB = `❌ แพ้แล้ว\n\n🎆 บั้งไฟ: ${fireworkName}\n💰 เดิมพัน: ${betAmount} บาท\n💸 เสีย: ${Math.abs(userBWinnings).toFixed(0)} บาท\n💵 ยอดคงเหลือ: ${userBNewBalance.toFixed(0)} บาท\n👤 ผู้ชนะ: ${userAName}\n\nลองใหม่นะ 💪`;
        await sendLineMessageToUser(userBId, messageB, userBToken);
      }
    } else if (finalResultSymbol === '❌') {
      const messageA = `❌ แพ้แล้ว\n\n🎆 บั้งไฟ: ${fireworkName}\n💰 เดิมพัน: ${betAmount} บาท\n💸 เสีย: ${Math.abs(userAWinnings).toFixed(0)} บาท\n💵 ยอดคงเหลือ: ${userANewBalance.toFixed(0)} บาท\n${userBName ? `👤 ผู้ชนะ: ${userBName}\n\n` : ''}\nลองใหม่นะ 💪`;

      if (userAId && userAName) {
        await sendLineMessageToUser(userAId, messageA, userAToken);
      }

      if (userBId && userBName) {
        const messageB = `✅ ชนะแล้ว\n\n🎆 บั้งไฟ: ${fireworkName}\n💰 เดิมพัน: ${betAmount} บาท\n🏆 ได้รับ: ${userBWinnings.toFixed(0)} บาท\n💵 ยอดคงเหลือ: ${userBNewBalance.toFixed(0)} บาท\n👤 ผู้แพ้: ${userAName}\n\nยินดีด้วย! 🎉`;
        await sendLineMessageToUser(userBId, messageB, userBToken);
      }
    } else {
      const messageA = `⛔️ เสมอ\n\n🎆 บั้งไฟ: ${fireworkName}\n💰 เดิมพัน: ${betAmount} บาท\n💸 ค่าธรรมเนียม: ${Math.abs(userAWinnings).toFixed(0)} บาท\n💵 ยอดคงเหลือ: ${userANewBalance.toFixed(0)} บาท\n\nเสมอกันครับ`;

      if (userAId && userAName) {
        await sendLineMessageToUser(userAId, messageA, userAToken);
      }

      if (userBId && userBName) {
        const messageB = `⛔️ เสมอ\n\n🎆 บั้งไฟ: ${fireworkName}\n💰 เดิมพัน: ${betAmount} บาท\n💸 ค่าธรรมเนียม: ${Math.abs(userBWinnings).toFixed(0)} บาท\n💵 ยอดคงเหลือ: ${userBNewBalance.toFixed(0)} บาท\n\nเสมอกันครับ`;
        await sendLineMessageToUser(userBId, messageB, userBToken);
      }
    }

    if (groupId) {
      console.log(`   📢 Sending group notification...`);

      // Build detailed group message
      let groupMessage = `📊 ประกาศผลแทง\n`;
      groupMessage += `🎆 บั้งไฟ: ${fireworkName}\n`;
      groupMessage += `ผลที่ออก: ${resultNumber}\n`;
      groupMessage += `═══════════════════\n\n`;

      if (finalResultSymbol === '✅') {
        groupMessage += `✅ ${userAName} ชนะ\n`;
        groupMessage += `   เดิมพัน: ${betAmount} บาท\n`;
        groupMessage += `   ได้รับ: ${userAWinnings.toFixed(0)} บาท\n\n`;
        groupMessage += `❌ ${userBName} แพ้\n`;
        groupMessage += `   เดิมพัน: ${betAmount} บาท\n`;
        groupMessage += `   เสีย: ${Math.abs(userBWinnings).toFixed(0)} บาท\n`;
      } else if (finalResultSymbol === '❌') {
        groupMessage += `❌ ${userAName} แพ้\n`;
        groupMessage += `   เดิมพัน: ${betAmount} บาท\n`;
        groupMessage += `   เสีย: ${Math.abs(userAWinnings).toFixed(0)} บาท\n\n`;
        groupMessage += `✅ ${userBName} ชนะ\n`;
        groupMessage += `   เดิมพัน: ${betAmount} บาท\n`;
        groupMessage += `   ได้รับ: ${userBWinnings.toFixed(0)} บาท\n`;
      } else {
        groupMessage += `⛔️ เสมอ\n`;
        groupMessage += `${userAName}: เดิมพัน ${betAmount} บาท | ค่าธรรมเนียม ${Math.abs(userAWinnings).toFixed(0)} บาท\n`;
        groupMessage += `${userBName}: เดิมพัน ${betAmount} บาท | ค่าธรรมเนียม ${Math.abs(userBWinnings).toFixed(0)} บาท\n`;
      }

      groupMessage += `═══════════════════`;

      await sendLineMessageToGroup(groupId, groupMessage, userAToken);
    }
  } catch (error) {
    console.error('❌ Error updating bet result:', error.message);
    console.error('   Error details:', error);
    console.error('   Stack:', error.stack);
  }
}

async function updatePlayerBalance(userId, userName, winnings) {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }
  
  try {
    console.log(`   💰 Updating balance for ${userName}: ${winnings > 0 ? '+' : ''}${winnings.toFixed(0)} บาท`);
    
    // ดึงข้อมูลผู้เล่นจากชีท Players (ต้องดึงถึง Column E เพื่อได้ Balance)
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `Players!A:E`,
    });
    
    const rows = response.data.values || [];
    let playerRowIndex = -1;
    let currentBalance = 0;
    
    // 🎯 ค้นหาตามชื่อ LINE เป็นหลัก
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      
      const playerName = row[1] || '';  // ✅ Column B (index 1) = ชื่อ
      const balance = parseFloat(row[4]) || 0;  // ✅ Column E (index 4) = Balance
      
      // ตรวจสอบชื่อ LINE ก่อน
      if (playerName === userName) {
        playerRowIndex = i + 1;
        currentBalance = balance;
        console.log(`      🔍 Found player by LINE name: ${playerName}`);
        break;
      }
    }
    
    // ถ้าไม่พบตามชื่อ ค่อยค้นหาจาก User ID
    if (playerRowIndex === -1) {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        
        const playerUserId = row[0] || '';  // ✅ Column A (index 0) = User ID
        const balance = parseFloat(row[4]) || 0;  // ✅ Column E (index 4) = Balance
        
        if (playerUserId === userId) {
          playerRowIndex = i + 1;
          currentBalance = balance;
          console.log(`      🔍 Found player by User ID: ${playerUserId}`);
          break;
        }
      }
    }
    
    if (playerRowIndex > 0) {
      const newBalance = Math.max(0, currentBalance + winnings); // ไม่ให้ยอดเงินติดลบ
      
      // ✅ อัปเดตยอดเงินในชีท Players (Column E)
      await sheets.spreadsheets.values.update({
        auth: googleAuth,
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `Players!E${playerRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[newBalance]],
        },
      });
      
      console.log(`      ✅ Players sheet updated: ${currentBalance} → ${newBalance} บาท`);
      
      // ✅ อัปเดตยอดเงินในชีท UsersBalance ด้วย
      try {
        const usersBalanceResponse = await sheets.spreadsheets.values.get({
          auth: googleAuth,
          spreadsheetId: GOOGLE_SHEET_ID,
          range: `UsersBalance!A:C`,
        });
        
        const usersBalanceRows = usersBalanceResponse.data.values || [];
        let usersBalanceRowIndex = -1;
        
        // ค้นหาผู้เล่นในชีท UsersBalance
        for (let i = 1; i < usersBalanceRows.length; i++) {
          const row = usersBalanceRows[i];
          if (!row) continue;
          
          const displayName = row[1] || '';
          if (displayName === userName) {
            usersBalanceRowIndex = i + 1;
            break;
          }
        }
        
        if (usersBalanceRowIndex > 0) {
          // อัปเดตยอดเงินในชีท UsersBalance
          await sheets.spreadsheets.values.update({
            auth: googleAuth,
            spreadsheetId: GOOGLE_SHEET_ID,
            range: `UsersBalance!C${usersBalanceRowIndex}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[newBalance]],
            },
          });
          
          console.log(`      ✅ UsersBalance sheet updated: ${currentBalance} → ${newBalance} บาท`);
        } else {
          // สร้างแถวใหม่ในชีท UsersBalance
          const nextRowIndex = usersBalanceRows.length + 1;
          
          await sheets.spreadsheets.values.update({
            auth: googleAuth,
            spreadsheetId: GOOGLE_SHEET_ID,
            range: `UsersBalance!A${nextRowIndex}:C${nextRowIndex}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[userId, userName, newBalance]],
            },
          });
          
          console.log(`      ✅ UsersBalance sheet created: ${newBalance} บาท`);
        }
      } catch (usersBalanceError) {
        console.error(`      ⚠️  Failed to update UsersBalance: ${usersBalanceError.message}`);
      }
    } else {
      console.log(`      ⚠️  Player not found in Players sheet (name: ${userName}, userId: ${userId})`);
    }
  } catch (error) {
    console.error(`      ❌ Error updating balance: ${error.message}`);
  }
}

// Get opposite result symbol
function getOppositeResultSymbol(resultSymbol) {
  const opposites = {
    '✅': '❌',
    '❌': '✅',
    '⛔️': '⛔️'
  };
  return opposites[resultSymbol] || '';
}

// ===== CALCULATION FUNCTIONS =====

function calculateWinnings(amount, result) {
  const betAmount = parseInt(amount) || 0;
  
  if (result === '✅') {
    // Win: deduct 10% commission
    const commission = betAmount * 0.1;
    const winnings = betAmount + (betAmount - commission);
    return {
      commission: commission,
      winnings: winnings,
      net: winnings - betAmount
    };
  } else if (result === '❌') {
    // Loss: lose the bet amount
    return {
      commission: 0,
      winnings: 0,
      net: -betAmount
    };
  } else if (result === '⛔️') {
    // Draw: deduct 5% from both
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

async function generateBettingSummary(groupId, sourceType, accountNumber) {
  if (!googleAuth) {
    return 'ไม่สามารถเข้าถึง Google Sheets';
  }
  
  try {
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:U`,
    });
    
    const rows = response.data.values || [];
    const bets = [];
    let currentGroupName = 'Unknown Group';
    
    console.log(`📊 Total rows: ${rows.length}`);
    
    // Get groups for this account
    const accountGroups = getGroupsForAccount(accountNumber);
    const accountGroupIds = accountGroups.map(g => g.id);
    const accountGroupNames = accountGroups.map(g => g.name);
    console.log(`   📍 Groups for Account ${accountNumber}: ${accountGroupNames.join(', ') || 'ไม่มีกลุ่มที่ลงทะเบียน'}`);
    
    // If no groups registered, show all bets (fallback)
    const useAllBets = accountGroupIds.length === 0;
    if (useAllBets) {
      console.log(`   ⚠️  ไม่มีกลุ่มที่ลงทะเบียน จะแสดงเบตทั้งหมด`);
    }
    
    // Parse all bets (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 1) continue;
      
      // Column Q (index 16) = ID กลุ่ม (ใช้เป็น key สำหรับจับคู่)
      const groupId = row[16] || '';
      
      // Column O (index 14) = ชื่อกลุ่ม (ตามโครงสร้างปัจจุบัน)
      let rowGroupName = row[14] || row[13] || ''; // Try column O first, then N as fallback
      
      // ถ้าไม่มีชื่อกลุ่ม ให้ใช้ ID กลุ่มแทน
      if (!rowGroupName && groupId) {
        rowGroupName = groupId;
      }
      
      // Only include bets from groups in this account (or all if no groups registered)
      if (!useAllBets && !accountGroupIds.includes(groupId) && !accountGroupNames.includes(rowGroupName)) {
        continue;
      }
      
      // Store group name from any row that has it
      if (rowGroupName && currentGroupName === 'Unknown Group') {
        currentGroupName = rowGroupName;
        console.log(`   ✅ Found group name: ${currentGroupName}`);
      }
      
      // Column I (index 8) = ผลที่ออก (RESULT)
      // Column J (index 9) = ผลแพ้ชนะ A (RESULT_WIN_LOSE)
      const resultNumber = row[8] || ''; // ผลที่ออก (Column I)
      const resultSymbol = row[9] || ''; // ผลแพ้ชนะ (Column J)
      
      // Only include bets with results
      if (!resultSymbol) continue;
      
      // Determine result for User A and User B based on symbol
      let resultA = resultSymbol;
      let resultB = resultSymbol === '✅' ? '❌' : resultSymbol === '❌' ? '✅' : '⛔️';
      
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
        userBId: row[17], // Column R (index 17)
        userBName: row[11],
        betTypeB: row[12],
        groupName: rowGroupName,
        groupId: groupId
      });
    }
    
    if (bets.length === 0) {
      console.log('📊 ยังไม่มีการแทงที่มีผลลัพธ์');
      return '📊 ยังไม่มีการแทงที่มีผลลัพธ์';
    }
    
    console.log(`✅ Found ${bets.length} bets with results`);
    
    // Group by slip name
    const slipGroups = {};
    for (const bet of bets) {
      const slipName = bet.fireworkName || 'Unknown';
      if (!slipGroups[slipName]) {
        slipGroups[slipName] = [];
      }
      slipGroups[slipName].push(bet);
    }

    // Generate new format summary
    let summary = '📊 สรุปยอดแทง\n';
    summary += '═══════════════════════════════════\n\n';

    let grandTotalBet = 0;
    let grandTotalFee = 0;
    let slipIndex = 0;
    const grandPlayerTotals = {}; // { playerName: totalAmount } รวมทุกบั้งไฟ

    // Process each slip (firework)
    for (const [slipName, slipBets] of Object.entries(slipGroups)) {
      slipIndex++;
      
      // Collect players and their yang/lai totals for this slip
      const players = {}; // { playerName: { yang: 0, lai: 0 } }
      let slipTotalBet = 0;
      let slipTotalFee = 0;

      for (const bet of slipBets) {
        const betAmount = Math.min(parseFloat(bet.amountA) || 0, parseFloat(bet.amountB) || 0);
        slipTotalBet += betAmount;

        let userAWin = 0;
        let userBWin = 0;
        let fee = 0;

        if (bet.resultA === '✅') {
          fee = Math.round(betAmount * 0.1);
          userAWin = betAmount - fee;  // User A ชนะ (หักคอมแล้ว)
          // User B แพ้ → ไม่ได้เงิน
        } else if (bet.resultA === '❌') {
          fee = Math.round(betAmount * 0.1);
          // User A แพ้ → ไม่ได้เงิน
          userBWin = betAmount - fee;  // User B ชนะ (หักคอมแล้ว)
        } else if (bet.resultA === '⛔️') {
          fee = Math.round(betAmount * 0.05);
          // เสมอ → ไม่มีใครชนะ
        }

        slipTotalFee += fee;

        // Track User A (เฉพาะที่ชนะ)
        const sideA = bet.betTypeA || 'unknown';
        if (!players[bet.userAName]) players[bet.userAName] = { yang: 0, lai: 0 };
        if (userAWin > 0) {
          if (sideA.includes('ย') || sideA.includes('ต')) {
            players[bet.userAName].yang += userAWin;
          } else {
            players[bet.userAName].lai += userAWin;
          }
        }

        // Track User B (เฉพาะที่ชนะ)
        const sideB = bet.betTypeB || 'unknown';
        if (!players[bet.userBName]) players[bet.userBName] = { yang: 0, lai: 0 };
        if (userBWin > 0) {
          if (sideB.includes('ย') || sideB.includes('ต')) {
            players[bet.userBName].yang += userBWin;
          } else {
            players[bet.userBName].lai += userBWin;
          }
        }
      }

      grandTotalBet += slipTotalBet;
      grandTotalFee += slipTotalFee;

      // Format slip header
      summary += `🎆 สรุปการแทง บั้งไฟ ${slipName} (${slipIndex})\n`;
      summary += `───────────────────────────────────\n`;
      summary += `ผู้เล่น              ยั้ง      ไล่      รวม\n`;

      // Format each player row
      for (const [name, amounts] of Object.entries(players)) {
        const displayName = name.length > 16 ? name.substring(0, 14) + '..' : name;
        const total = amounts.yang + amounts.lai;
        const yangStr = amounts.yang > 0 ? amounts.yang.toLocaleString() : '';
        const laiStr = amounts.lai > 0 ? amounts.lai.toLocaleString() : '';
        const totalStr = total > 0 ? total.toLocaleString() : '0';
        summary += `${displayName.padEnd(16)} ${yangStr.padStart(8)}  ${laiStr.padStart(8)}  ${totalStr.padStart(8)}\n`;

        // สะสมยอดรวมรายบุคคล
        if (!grandPlayerTotals[name]) grandPlayerTotals[name] = 0;
        grandPlayerTotals[name] += total;
      }

      summary += `───────────────────────────────────\n\n`;
    }

    // Grand total
    summary += `💰 สรุปรวมทั้งหมด\n`;
    summary += `═══════════════════════════════════\n`;
    summary += `📊 ยอดเดิมพันรวม: ${grandTotalBet.toLocaleString()} บาท\n`;
    summary += `💵 Commission รวม: ${grandTotalFee.toLocaleString()} บาท\n\n`;

    // สรุปรายบุคคล (รวมทุกบั้งไฟ — เฉพาะยอดชนะหักคอมแล้ว)
    summary += `👤 สรุปรายบุคคล\n`;
    summary += `═══════════════════════════════════\n`;
    for (const [name, total] of Object.entries(grandPlayerTotals)) {
      const displayName = name.length > 16 ? name.substring(0, 14) + '..' : name;
      const totalStr = total > 0 ? total.toLocaleString() : '0';
      summary += `${displayName.padEnd(16)} : ${totalStr} บาท\n`;
    }

    return summary;
  } catch (error) {
    console.error('❌ Error generating summary:', error.message);
    console.error('   Stack:', error.stack);
    return 'เกิดข้อผิดพลาดในการสรุปยอด';
  }
}

// Send LINE message
async function sendLineMessage(groupId, message, accessToken) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      to: groupId,
      messages: [
        {
          type: 'text',
          text: message
        }
      ]
    });
    
    const options = {
      hostname: 'api.line.me',
      path: '/v2/bot/message/push',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    
    https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   ✅ Message sent`);
        resolve(true);
      });
    }).on('error', (err) => {
      console.log(`   ❌ Error sending message:`, err.message);
      resolve(false);
    }).write(body);
  });
}

// Send LINE image message
async function sendLineImageMessage(groupId, originalContentUrl, previewImageUrl, accessToken) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      to: groupId,
      messages: [
        {
          type: 'image',
          originalContentUrl: originalContentUrl,
          previewImageUrl: previewImageUrl
        }
      ]
    });
    
    const options = {
      hostname: 'api.line.me',
      path: '/v2/bot/message/push',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    
    https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   ✅ Image sent`);
        resolve(true);
      });
    }).on('error', (err) => {
      console.log(`   ❌ Error sending image:`, err.message);
      resolve(false);
    }).write(body);
  });
}

function extractBetAmount(message) {
  if (!message) return null;
  
  // รูปแบบใหม่: ไล่/350-390/10000แอดไล่
  const slashFormatMatch = message.match(/\/(\d+)(?:[ก-๙]|$)/);
  if (slashFormatMatch) {
    const amount = parseInt(slashFormatMatch[1]);
    if (amount >= 10) {
      console.log(`      ✅ Bet amount (slash format): ${amount}`);
      return amount;
    }
  }
  
  // รูปแบบใหม่: ต1000, ย1000, ส1000, ล1000
  const newFormatMatch = message.match(/[ตยสล](\d+)/);
  if (newFormatMatch) {
    const amount = parseInt(newFormatMatch[1]);
    if (amount >= 10) {
      console.log(`      ✅ Bet amount (new format): ${amount}`);
      return amount;
    }
  }
  
  // รูปแบบเดิม: Get all numbers
  const numbers = message.match(/\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length === 0) return null;
  
  // Find last whole number >= 10
  for (let i = numbers.length - 1; i >= 0; i--) {
    const num = parseFloat(numbers[i]);
    if (Number.isInteger(num) && num >= 10) {
      console.log(`      ✅ Bet amount: ${num}`);
      return num;
    }
  }
  
  return null;
}

function extractBetType(message) {
  // รูปแบบใหม่: ไล่/350-390/10000แอดไล่ หรือ ยั้ง/350-390/10000แอด
  const slashFormatMatch = message.match(/^([ตยสลไล่ยั้ง]+)\//);
  if (slashFormatMatch) {
    const typeChar = slashFormatMatch[1];
    const typeMap = {
      'ต': 'ย',
      'ย': 'ย',
      'ยั้ง': 'ย',
      'ส': 'ล',
      'ล': 'ล',
      'ไล่': 'ล'
    };
    const betType = typeMap[typeChar] || typeChar;
    console.log(`      ✅ Bet type (slash format): ${betType}`);
    return betType;
  }
  
  // รูปแบบใหม่: ต1000, ย1000, ส1000, ล1000
  const newFormatMatch = message.match(/([ตยสล])(\d+)/);
  if (newFormatMatch) {
    const typeChar = newFormatMatch[1];
    const typeMap = {
      'ต': 'ย',
      'ย': 'ย',
      'ส': 'ล',
      'ล': 'ล'
    };
    const betType = typeMap[typeChar] || typeChar;
    console.log(`      ✅ Bet type (new format): ${betType}`);
    return betType;
  }
  
  // รูปแบบเดิม - แปลงเป็น sideCode สั้นๆ
  const betTypes = {
    'ถอย': 'ชถ',
    'ยั้ง': 'ย',
    'ล่าง': 'ย',
    'บน': 'ล',
    'ชล': 'ชล',
    'ชถ': 'ชถ',
    'สกัด': 'ย',
    'ติด': 'ย',
    'สูง': 'ล',
    'ต่ำ': 'ย',
    'ไล่': 'ล',
    'ถ': 'ชถ',
    'ย': 'ย',
    'ล': 'ล',
    'บ': 'ล',
    'ส': 'ล',
  };
  
  for (const [key, value] of Object.entries(betTypes)) {
    if (message.includes(key)) {
      console.log(`      ✅ Bet type: ${value}`);
      return value;
    }
  }
  
  console.log(`      ❌ No bet type found`);
  return null;
}

function extractPriceRange(message) {
  // รูปแบบใหม่: ไล่/350-390/10000แอดไล่
  const slashFormatMatch = message.match(/\/(\d+[\-\.\/\*]\d+)\//);
  if (slashFormatMatch) {
    const priceRange = slashFormatMatch[1];
    console.log(`      ✅ Price range (slash format): ${priceRange}`);
    return priceRange;
  }
  
  // แยกช่วงราคา เช่น 360-410, 370-410
  const priceRangeMatch = message.match(/(\d+[\-\.\/\*]\d+)/);
  if (priceRangeMatch) {
    const priceRange = priceRangeMatch[1];
    console.log(`      ✅ Price range: ${priceRange}`);
    return priceRange;
  }
  
  console.log(`      ❌ No price range found`);
  return null;
}

function extractFireworkName(message) {
  // รูปแบบใหม่: ไล่/350-390/10000แอดไล่ หรือ ไล่/265-275/12/ขาว
  const slashFormatMatch = message.match(/\/\d+\/?([ก-๙]+)$/);
  if (slashFormatMatch) {
    const fireworkName = slashFormatMatch[1];
    console.log(`      ✅ Firework name (slash format): ${fireworkName}`);
    return fireworkName;
  }
  
  // แยกข้อความเป็นคำ
  const words = message.split(/\s+/);
  
  const betTypes = ['ถอย', 'ยั้ง', 'ล่าง', 'บน', 'ชล', 'ชถ', 'สกัด', 'ต่ำ', 'สูง', 'ไล่', '✅', '❌', 'ต', 'ย', 'ส', 'ล'];
  
  // ค้นหาคำที่ไม่ใช่ตัวเลข ไม่ใช่ประเภทเดิมพัน และไม่ใช่ตัวเลขผสม
  for (const word of words) {
    // ข้ามคำที่เป็นตัวเลขเพียงอย่างเดียว
    if (/^\d+$/.test(word)) continue;
    
    // ข้ามคำที่เป็นตัวเลขผสมตัวคั่น (เช่น 370-410, 310.5)
    if (/^\d+[.\/*\-]\d+(?:[.\/*\-]\d+)*$/.test(word)) continue;
    
    // ข้ามคำที่มีตัวเลขผสมกับข้อความ (เช่น "ชถ500ฟ้า", "ชล100แอด")
    if (/\d/.test(word)) continue;
    
    // ข้ามคำที่เป็นประเภทเดิมพัน
    if (betTypes.includes(word)) continue;
    
    // ถ้าเหลือคำ ให้ใช้เป็นชื่อบั้งไฟ
    if (word.length > 0) {
      console.log(`      ✅ Firework name (text): ${word}`);
      return word;
    }
  }
  
  console.log(`      ❌ No firework name found`);
  return null;
}

// ===== PAIR DETECTION =====
const messageMap = new Map(); // messageId -> message data
const recordedPairs = new Set();
const unsendLog = new Map(); // messageId -> unsend details

/**
 * Re-process stored messages for a user after balance is updated
 * Called when slip verification is successful
 */
async function reprocessStoredMessages(userId, userName, accessToken) {
  console.log(`\n🔄 Re-processing stored messages for ${userName}...`);
  
  let reprocessedCount = 0;
  
  // Iterate through all stored messages
  for (const [messageId, messageData] of messageMap.entries()) {
    // Only process messages from this user
    if (messageData.userId !== userId) {
      continue;
    }
    
    console.log(`   📨 Processing message: ${messageId}`);
    console.log(`      Content: "${messageData.content}"`);
    
    try {
      // Extract bet details
      const betAmount = extractBetAmount(messageData.content);
      
      if (!betAmount || betAmount <= 0) {
        console.log(`      ⏭️  Not a betting message (no amount)`);
        continue;
      }
      
      console.log(`      💰 Bet amount: ${betAmount} บาท`);
      
      // Check balance again
      const playerBalanceData = await getPlayerBalance(userId, userName);
      const playerBalance = playerBalanceData.balance;
      const playerFound = playerBalanceData.found;
      
      console.log(`      ✅ Balance check: ${playerBalance} บาท (Found: ${playerFound})`);
      
      if (!playerFound) {
        console.log(`      ⏭️  Player still not registered`);
        continue;
      }
      
      if (playerBalance < betAmount) {
        console.log(`      ⏭️  Balance still insufficient`);
        continue;
      }
      
      // Balance is now sufficient! Send success message
      console.log(`      ✅ Balance is now sufficient! Sending confirmation...`);
      
      const successMessage = `✅ ยอดเงินเพียงพอแล้ว\n\n` +
        `ข้อความแทง: "${messageData.content}"\n` +
        `ยอดเงินปัจจุบัน: ${playerBalance} บาท\n` +
        `ต้องการ: ${betAmount} บาท\n\n` +
        `🎉 พร้อมเล่นแล้ว!`;
      
      await sendLineMessageToUser(userId, successMessage, accessToken);
      console.log(`      📤 Confirmation message sent`);
      
      reprocessedCount++;
    } catch (error) {
      console.error(`      ❌ Error processing message: ${error.message}`);
    }
  }
  
  console.log(`   ✅ Re-processing complete (${reprocessedCount} messages processed)\n`);
  return reprocessedCount;
}

function detectPair(currentMessage) {
  const { userId, messageId, content, timestamp, groupId, quotedMessageId } = currentMessage;
  
  // Check if this is a reply to a previous message
  if (quotedMessageId && messageMap.has(quotedMessageId)) {
    const previousMessage = messageMap.get(quotedMessageId);
    
    // Don't create pair if User A and User B are the same person
    if (previousMessage.userId === userId) {
      console.log(`   ⚠️  Same user replying to own message (ignored)`);
      return null;
    }
    
    const pairId = `${quotedMessageId}:${messageId}`;
    
    if (!recordedPairs.has(pairId)) {
      recordedPairs.add(pairId);
      
      console.log(`✅ Pair detected`);
      console.log(`   User A: ${previousMessage.userId}`);
      console.log(`   User B: ${userId}`);
      
      return {
        userA: previousMessage.userId,
        messageA: previousMessage.content,
        timestampA: previousMessage.timestamp,
        userB: userId,
        messageB: content,
        timestampB: timestamp,
        groupId: groupId
      };
    }
  } else {
    // Store this message for future reply detection
    messageMap.set(messageId, {
      userId,
      content,
      timestamp,
      groupId,
      userName: null // Will be filled when needed
    });
    console.log(`   📦 Stored message with ID: ${messageId}`);
  }
  
  return null;
}

// ===== GOOGLE SHEETS =====
async function appendToGoogleSheets(pair, userAName, userBName, groupName, matchType = 'reply', accessToken = '') {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    console.log('   googleAuth:', googleAuth);
    console.log('   GOOGLE_SHEET_ID:', GOOGLE_SHEET_ID);
    console.log('   GOOGLE_WORKSHEET_NAME:', GOOGLE_WORKSHEET_NAME);
    return;
  }
  
  try {
    console.log('📤 Recording to Google Sheets...');
    console.log(`   Match Type: ${matchType}`);
    console.log(`   Pair data:`, pair);
    console.log(`   User A Name: ${userAName}`);
    console.log(`   User B Name: ${userBName}`);
    console.log(`   Group Name: ${groupName}`);
    console.log(`   GOOGLE_SHEET_ID: ${GOOGLE_SHEET_ID}`);
    console.log(`   GOOGLE_WORKSHEET_NAME: ${GOOGLE_WORKSHEET_NAME}`);
    
    // ดึง Token ของ User A และ User B จาก Players Sheet
    const playersResponse = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `Players!A:K`,
    });
    
    const playerRows = playersResponse.data.values || [];
    let userAToken = '';
    let userBToken = '';
    
    for (let i = 1; i < playerRows.length; i++) {
      const row = playerRows[i];
      if (row && row.length >= 11) {
        if (row[0] === pair.userA) {
          userAToken = row[10] || ''; // Column K = Token
        }
        if (row[0] === pair.userB) {
          userBToken = row[10] || ''; // Column K = Token
        }
      }
    }
    
    console.log(`   🔑 User A Token: ${userAToken ? '✅' : '❌'}`);
    console.log(`   🔑 User B Token: ${userBToken ? '✅' : '❌'}`);
    
    // Extract bet details
    const betDetailsA = {
      fireworkName: extractFireworkName(pair.messageA),
      priceRange: extractPriceRange(pair.messageA),
      betType: extractBetType(pair.messageA),
      betAmount: extractBetAmount(pair.messageA)
    };
    
    const betDetailsB = {
      fireworkName: extractFireworkName(pair.messageB),
      priceRange: extractPriceRange(pair.messageB),
      betType: extractBetType(pair.messageB),
      betAmount: extractBetAmount(pair.messageB)
    };
    
    console.log(`   📊 Bet Details A:`, betDetailsA);
    console.log(`   📊 Bet Details B:`, betDetailsB);
    
    // 🎯 ตัดสินใจยอดเงินตามประเภทการจับคู่
    let betAmount;
    if (matchType === 'reply') {
      // Reply matching: ใช้ยอดเงินของ User A เป็นหลัก
      betAmount = betDetailsA.betAmount || 0;
      console.log(`   💰 Using User A amount (reply matching): ${betAmount} บาท`);
    } else if (matchType === 'auto') {
      // Auto matching: ใช้ยอดเงินน้อยกว่า
      betAmount = Math.min(betDetailsA.betAmount || 0, betDetailsB.betAmount || 0);
      console.log(`   💰 Using minimum amount (auto matching): ${betAmount} บาท`);
    } else {
      // Default: ใช้ยอดสูงสุด (legacy)
      betAmount = Math.max(betDetailsA.betAmount || 0, betDetailsB.betAmount || 0);
      console.log(`   💰 Using maximum amount (legacy): ${betAmount} บาท`);
    }
    
    // Get opposite bet type for User B
    const oppositeBetType = getOppositeBetType(betDetailsA.betType);
    
    // Create row
    // timestamp from LINE is in milliseconds
    const date = new Date(pair.timestampB);
    const timestamp = date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Get opposite result for User B
    const userBResult = getOppositeResult(betDetailsA.betType);
    
    const row = [
      timestamp,           // [0] = A: Timestamp
      pair.userA,          // [1] = B: User A ID
      userAName,           // [2] = C: ชื่อ User A
      pair.messageA,       // [3] = D: ข้อความ A
      betDetailsA.fireworkName || '',  // [4] = E: ชื่อบั้งไฟ
      betDetailsA.betType || '',       // [5] = F: รายการเล่น
      betAmount,           // [6] = G: ยอดเงิน
      betAmount,           // [7] = H: ยอดเงิน B
      '',                  // [8] = I: ผลที่ออก (ว่าง - อัปเดตเมื่อประกาศผล)
      '',                  // [9] = J: ผลแพ้ชนะ A (ว่าง - อัปเดตเมื่อประกาศผล)
      '',                  // [10] = K: ผลแพ้ชนะ B (ว่าง - อัปเดตเมื่อประกาศผล)
      userBName,           // [11] = L: ชื่อ User B
      oppositeBetType,     // [12] = M: รายการแทง B
      '',                  // [13] = N: ชื่อกลุ่มแชท (ว่าง)
      groupName,           // [14] = O: ชื่อกลุ่ม
      userAToken || '',    // [15] = P: Token A
      pair.groupId || '',  // [16] = Q: Group ID
      pair.userB           // [17] = R: User B ID
    ];
    
    console.log(`   📊 Row data (18 columns):`);
    console.log(`   Array length: ${row.length}`);
    row.forEach((val, idx) => {
      const colLetter = String.fromCharCode(65 + idx); // A=65
      console.log(`      [${colLetter}] (index ${idx}): "${val}"`);
    });
    
    // 🔄 สำหรับ Reply matching: ค้นหาแถวที่มี messageA ของ User A ที่รอจับคู่
    if (matchType === 'reply') {
      console.log(`   🔍 Searching for existing row with User A message...`);
      
      const betsResponse = await sheets.spreadsheets.values.get({
        auth: googleAuth,
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${GOOGLE_WORKSHEET_NAME}!A:R`,
      });
      
      const betsRows = betsResponse.data.values || [];
      let existingRowIndex = -1;
      
      // ค้นหาแถวที่มี messageA ของ User A และยังไม่มี User B (column L ว่าง)
      for (let i = 1; i < betsRows.length; i++) {
        const betsRow = betsRows[i];
        if (!betsRow || betsRow.length < 12) continue;
        
        const rowUserA = betsRow[1] || '';
        const rowMessageA = betsRow[3] || '';
        const rowUserBName = betsRow[11] || '';
        
        // ตรวจสอบว่าเป็นแถวของ User A ที่รอจับคู่ (ยังไม่มี User B)
        if (rowUserA === pair.userA && rowMessageA === pair.messageA && !rowUserBName) {
          existingRowIndex = i + 1; // Google Sheets ใช้ 1-indexed
          console.log(`   ✅ Found existing row at ${existingRowIndex}`);
          break;
        }
      }
      
      if (existingRowIndex > 0) {
        // Update existing row with User B data
        console.log(`   📍 Updating row ${existingRowIndex} with User B data...`);
        
        const updateRow = [
          timestamp,           // [0] = A: Timestamp (update)
          pair.userA,          // [1] = B: User A ID
          userAName,           // [2] = C: ชื่อ User A
          pair.messageA,       // [3] = D: ข้อความ A
          betDetailsA.fireworkName || '',  // [4] = E: ชื่อบั้งไฟ
          betDetailsA.betType || '',       // [5] = F: รายการเล่น
          betAmount,           // [6] = G: ยอดเงิน
          betAmount,           // [7] = H: ยอดเงิน B
          '',                  // [8] = I: ผลที่ออก
          '',                  // [9] = J: ผลแพ้ชนะ A
          '',                  // [10] = K: ผลแพ้ชนะ B
          userBName,           // [11] = L: ชื่อ User B (UPDATE)
          oppositeBetType,     // [12] = M: รายการแทง B (UPDATE)
          '',                  // [13] = N: ชื่อกลุ่มแชท
          groupName,           // [14] = O: ชื่อกลุ่ม
          userAToken || '',    // [15] = P: Token A
          pair.groupId || '',  // [16] = Q: Group ID
          pair.userB           // [17] = R: User B ID (UPDATE)
        ];
        
        const updateResponse = await sheets.spreadsheets.values.update({
          auth: googleAuth,
          spreadsheetId: GOOGLE_SHEET_ID,
          range: `${GOOGLE_WORKSHEET_NAME}!A${existingRowIndex}:R${existingRowIndex}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [updateRow],
          },
        });
        
        console.log(`   ✅ Row updated successfully at row ${existingRowIndex}`);
        console.log(`   📊 Update response:`, updateResponse.data);
      } else {
        // ไม่พบแถวเดิม ให้ append แถวใหม่
        console.log(`   ⚠️  No existing row found, appending new row...`);
        
        const response = await sheets.spreadsheets.values.get({
          auth: googleAuth,
          spreadsheetId: GOOGLE_SHEET_ID,
          range: `${GOOGLE_WORKSHEET_NAME}!A:A`,
        });
        
        const rows = response.data.values || [];
        const nextRowIndex = rows.length + 1;
        
        console.log(`   📊 Current rows: ${rows.length}, appending to row ${nextRowIndex}`);
        console.log(`   📍 Writing to range: ${GOOGLE_WORKSHEET_NAME}!A${nextRowIndex}:R${nextRowIndex}`);
        
        const updateResponse = await sheets.spreadsheets.values.update({
          auth: googleAuth,
          spreadsheetId: GOOGLE_SHEET_ID,
          range: `${GOOGLE_WORKSHEET_NAME}!A${nextRowIndex}:R${nextRowIndex}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [row],
          },
        });
        
        console.log(`   ✅ Row appended successfully to row ${nextRowIndex}`);
        console.log(`   📊 Update response:`, updateResponse.data);
      }
    } else {
      // สำหรับ Auto/Direct matching: append แถวใหม่
      const response = await sheets.spreadsheets.values.get({
        auth: googleAuth,
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${GOOGLE_WORKSHEET_NAME}!A:A`,
      });
      
      const rows = response.data.values || [];
      const nextRowIndex = rows.length + 1;
      
      console.log(`   📊 Current rows: ${rows.length}, appending to row ${nextRowIndex}`);
      console.log(`   📍 Writing to range: ${GOOGLE_WORKSHEET_NAME}!A${nextRowIndex}:R${nextRowIndex}`);
      console.log(`   📦 Payload: [${row.map(v => `"${v}"`).join(', ')}]`);
      
      const updateResponse = await sheets.spreadsheets.values.update({
        auth: googleAuth,
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${GOOGLE_WORKSHEET_NAME}!A${nextRowIndex}:R${nextRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row],
        },
      });
      
      console.log(`   ✅ Row appended successfully to row ${nextRowIndex}`);
      console.log(`   📊 Update response:`, updateResponse.data);
    }
    
    // บันทึกข้อมูลผู้เล่น User A ถ้ายังไม่มี
    console.log(`📝 Recording Player A to Players sheet...`);
    try {
      await _recordPlayerToSheetFromSlip(
        googleAuth,
        GOOGLE_SHEET_ID,
        pair.userA,
        userAName,
        accessToken,
        0 // ไม่เพิ่มยอดเงิน เพราะเป็นการเดิมพัน
      );
      console.log(`   ✅ Player A recorded`);
    } catch (playerAError) {
      console.error(`   ⚠️  Failed to record Player A: ${playerAError.message}`);
    }
    
    // บันทึกข้อมูลผู้เล่น User B ถ้ายังไม่มี
    console.log(`📝 Recording Player B to Players sheet...`);
    try {
      await _recordPlayerToSheetFromSlip(
        googleAuth,
        GOOGLE_SHEET_ID,
        pair.userB,
        userBName,
        accessToken,
        0 // ไม่เพิ่มยอดเงิน เพราะเป็นการเดิมพัน
      );
      console.log(`   ✅ Player B recorded`);
    } catch (playerBError) {
      console.error(`   ⚠️  Failed to record Player B: ${playerBError.message}`);
    }
  } catch (error) {
    console.error('❌ Failed to append to Google Sheets:', error.message);
    console.error('   Error details:', error);
    console.error('   Stack:', error.stack);
  }
}

// ===== ROUTES =====

app.get('/health', (req, res) => {
  console.log('✅ Health check');
  res.status(200).json({ status: 'ok' });
});

// Test endpoint for Slip2Go webhook
app.post('/slip2go/test', async (req, res) => {
  try {
    console.log('\n🧪 Slip2Go webhook test');
    console.log(`   Body:`, JSON.stringify(req.body, null, 2));
    
    const { userId, amount, status } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({ error: 'Missing userId or amount' });
    }
    
    console.log(`✅ Test data received: userId=${userId}, amount=${amount}, status=${status}`);
    res.status(200).json({ success: true, message: 'Test webhook received' });
  } catch (error) {
    console.error(`❌ Test error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ===== HELPER FUNCTIONS =====

/**
 * ดาวน์โหลดรูปภาพจาก LINE
 */
async function downloadLineImage(messageId, accessToken) {
  try {
    const axios = require('axios');
    
    console.log(`   🔑 Access Token (first 30 chars): ${accessToken.substring(0, 30)}...`);
    console.log(`   🔑 Access Token length: ${accessToken.length}`);
    
    // Try LINE Messaging API endpoint (use api-data for content download)
    const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    
    try {
      console.log(`   📡 Trying: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        responseType: 'arraybuffer',
        timeout: 5000
      });
      
      console.log(`   ✅ Downloaded (${response.data.length} bytes)`);
      return Buffer.from(response.data);
    } catch (error) {
      console.log(`   ⚠️  Failed: ${error.response?.status || error.message}`);
      if (error.response?.status === 404) {
        console.log(`   ℹ️  404 - Message not found or access denied`);
      } else if (error.response?.status === 401) {
        console.log(`   ℹ️  401 - Unauthorized (invalid token)`);
      } else if (error.response?.status === 400) {
        console.log(`   ℹ️  400 - Bad request`);
      }
      
      if (error.response?.data) {
        try {
          const errorData = JSON.parse(error.response.data.toString());
          console.log(`   Response: ${JSON.stringify(errorData)}`);
        } catch (e) {
          console.log(`   Response: ${error.response.data.toString().substring(0, 200)}`);
        }
      }
      
      throw error;
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    throw error;
  }
}

/**
 * ส่งข้อความไปยังผู้ใช้ LINE
 */
async function sendLineMessageToUser(userId, message, accessToken) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      to: userId,
      messages: [
        {
          type: 'text',
          text: message,
        },
      ],
    });

    const options = {
      hostname: 'api.line.me',
      path: '/v2/bot/message/push',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`   ✅ Message sent successfully`);
        } else {
          console.log(`   ⚠️  Message send status: ${res.statusCode}`);
        }
        resolve(true);
      });
    })
      .on('error', (err) => {
        console.log(`   ❌ Error sending message: ${err.message}`);
        resolve(false);
      })
      .write(body);
  });
}

/**
 * ส่งข้อความไปยังกลุ่ม LINE
 */
async function sendLineMessageToGroup(groupId, message, accessToken) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      to: groupId,
      messages: [
        {
          type: 'text',
          text: message,
        },
      ],
    });

    const options = {
      hostname: 'api.line.me',
      path: '/v2/bot/message/push',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    console.log(`   📍 Sending to group: ${groupId}`);
    console.log(`   📝 Message length: ${message.length} chars`);

    https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        console.log(`   📊 Response status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          console.log(`   ✅ Group message sent successfully`);
        } else {
          console.log(`   ⚠️  Group message send status: ${res.statusCode}`);
          console.log(`   📋 Response body: ${data}`);
        }
        resolve(true);
      });
    })
      .on('error', (err) => {
        console.log(`   ❌ Error sending group message: ${err.message}`);
        console.log(`   📋 Error details:`, err);
        resolve(false);
      })
      .write(body);
  });
}

// ===== WEBHOOK HANDLER =====
app.post('/webhook', async (req, res) => {
  try {
    // Initialize balanceCheckService if not already initialized
    const balanceCheckService = require('./services/betting/balanceCheckService');
    if (!balanceCheckService.sheets) {
      await balanceCheckService.initialize();
      console.log('✅ BalanceCheckService initialized');
    }
    
    const signature = req.headers['x-line-signature'];
    const body = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    
    console.log('\n🔔 Webhook received');
    console.log(`   Signature: ${signature}`);
    console.log(`   Body length: ${body.length}`);
    console.log(`   Body:`, JSON.stringify(req.body, null, 2));
    
    // Determine which account this webhook is for
    let credentials = null;
    let channelId = null;
    
    // Try account 1 first
    if (validateLineSignature(signature, body, LINE_CHANNEL_SECRET)) {
      credentials = { secret: LINE_CHANNEL_SECRET, token: LINE_CHANNEL_ACCESS_TOKEN };
      channelId = LINE_CHANNEL_ID;
      console.log(`   ✅ Validated with Account 1`);
    } 
    // Try account 2
    else if (LINE_CHANNEL_SECRET_2 && validateLineSignature(signature, body, LINE_CHANNEL_SECRET_2)) {
      credentials = { secret: LINE_CHANNEL_SECRET_2, token: LINE_CHANNEL_ACCESS_TOKEN_2 };
      channelId = LINE_CHANNEL_ID_2;
      console.log(`   ✅ Validated with Account 2`);
    }
    // Try account 3
    else if (LINE_CHANNEL_SECRET_3 && validateLineSignature(signature, body, LINE_CHANNEL_SECRET_3)) {
      credentials = { secret: LINE_CHANNEL_SECRET_3, token: LINE_CHANNEL_ACCESS_TOKEN_3 };
      channelId = LINE_CHANNEL_ID_3;
      console.log(`   ✅ Validated with Account 3`);
    }
    // Invalid signature
    else {
      console.log('❌ Invalid signature');
      console.log(`   Expected (Account 1): ${crypto.createHmac('sha256', LINE_CHANNEL_SECRET).update(body).digest('base64')}`);
      console.log(`   Expected (Account 2): ${crypto.createHmac('sha256', LINE_CHANNEL_SECRET_2).update(body).digest('base64')}`);
      console.log(`   Expected (Account 3): ${crypto.createHmac('sha256', LINE_CHANNEL_SECRET_3).update(body).digest('base64')}`);
      console.log(`   Received: ${signature}`);
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }
    
    let accessToken = credentials.token;
    const accountNumber = getAccountNumber(channelId);
    
    console.log(`   🔑 Using access token from credentials (Account ${accountNumber})`);
    
    const events = req.body.events || [];
    
    console.log(`📨 Webhook handler started`);
    console.log(`   Events count: ${events.length}`);
    console.log(`   Account: ${accountNumber}`);
    
    for (const event of events) {
      // Handle image messages (slip verification)
      if (event.type === 'message' && event.message.type === 'image') {
        console.log(`📸 Image message received`);
        console.log(`   Message ID: ${event.message.id}`);
        console.log(`   User ID: ${event.source.userId}`);
        
        try {
          // Download image from LINE
          console.log(`🌐 Downloading image from LINE...`);
          const imageBuffer = await downloadLineImage(event.message.id, accessToken);
          console.log(`   ✅ Downloaded (${imageBuffer.length} bytes)`);

          // Verify slip with Slip2Go API
          console.log(`🔍 Verifying slip with Slip2Go API...`);
          const Slip2GoImageVerificationService = require('./services/betting/slip2GoImageVerificationService');
          const Slip2GoAccountService = require('./services/betting/slip2GoAccountService');
          const verificationService = new Slip2GoImageVerificationService(process.env.SLIP2GO_SECRET_KEY, process.env.SLIP2GO_API_URL);
          const accountService = new Slip2GoAccountService(process.env.SLIP2GO_SECRET_KEY, process.env.SLIP2GO_API_URL);
          
          // ดึงข้อมูลบัญชีจาก Slip2Go API
          // ดึงข้อมูลบัญชีจาก environment variable
          // รวมบัญชีผู้รับทั้งหมด (ทุก Account) เพื่อเช็คพร้อมกัน
          const allReceiverAccounts = [];
          const uniqueAccounts = new Set();
          [SLIP_RECEIVER_ACCOUNT_1, SLIP_RECEIVER_ACCOUNT_2, SLIP_RECEIVER_ACCOUNT_3].forEach(acc => {
            if (acc && !uniqueAccounts.has(acc)) {
              uniqueAccounts.add(acc);
              allReceiverAccounts.push({
                accountType: '01004',
                accountNumber: acc
              });
            }
          });
          
          if (allReceiverAccounts.length === 0) {
            console.log(`   ⚠️  No receiver account configured`);
          } else {
            console.log(`   ✅ Using receiver accounts: ${[...uniqueAccounts].join(', ')}`);
          }
          
          const checkCondition = {
            checkDuplicate: true,
            checkReceiver: allReceiverAccounts
          };

          const verificationResult = await verificationService.verifySlipFromImage(imageBuffer, checkCondition);
          console.log(`   ✅ Verification result:`, verificationResult);

          // Get LINE user profile
          console.log(`👤 Getting LINE user profile...`);
          let lineUserName = 'Unknown';
          try {
            lineUserName = await getLineUserProfile(event.source.userId, accessToken) || 'Unknown';
            console.log(`   ✅ User name: ${lineUserName}`);
            // ✅ ถ้าดึงชื่อได้แล้ว อัปเดตชื่อ Unknown ในชีทถ้ามี
            if (lineUserName !== 'Unknown') {
              await updateUnknownPlayerName(event.source.userId, lineUserName, accessToken);
            }
          } catch (profileError) {
            console.error(`   ⚠️  Failed to get user profile: ${profileError.message}`);
          }

          // ตรวจสอบผลการตรวจสอบจาก Slip2Go API
          const code = verificationResult?.code;
          console.log(`\n🔐 Slip2Go API Response Code: ${code}`);
          console.log(`   Message: ${verificationService.getValidationMessage(verificationResult)}`);

          // ตรวจสอบสลิปซ้ำ FIRST (ก่อนตรวจสอบอื่น)
          if (verificationService.isDuplicate(verificationResult)) {
            console.log(`\n❌ Duplicate slip detected (Code: 200501)`);
            const errorMessage = `❌ ตรวจสอบสลิปไม่สำเร็จ\n\n` +
              `🚫 เหตุผล: สลิปซ้ำ (เคยบันทึกไปแล้ว)\n` +
              `📋 รหัส: 200501\n\n` +
              `📸 กรุณาส่งสลิปใหม่`;
            try {
              await sendLineMessageToUser(event.source.userId, errorMessage, accessToken);
            } catch (sendError) {
              console.error(`❌ Failed to send error message: ${sendError.message}`);
            }
            continue;
          }

          // ตรวจสอบสลิปจริงหรือไม่ SECOND (สลิปปลอม)
          if (!verificationService.isVerified(verificationResult)) {
            console.log(`\n❌ Slip is not valid - Fake slip (Code: 200500)`);
            const errorMessage = `❌ ตรวจสอบสลิปไม่สำเร็จ\n\n` +
              `🚫 เหตุผล: สลิปปลอม\n` +
              `📋 รหัส: 200500\n\n` +
              `📸 กรุณาส่งสลิปจริง`;
            try {
              await sendLineMessageToUser(event.source.userId, errorMessage, accessToken);
            } catch (sendError) {
              console.error(`❌ Failed to send error message: ${sendError.message}`);
            }
            continue;
          }

          // ตรวจสอบบัญชีตรงกันหรือไม่ THIRD
          if (!verificationService.isReceiverMatched(verificationResult)) {
            // Fallback: เทียบชื่อผู้รับจาก response data (สำหรับ PromptPay ที่ checkReceiver เช็คไม่ได้)
            const receiverName = verificationResult?.data?.receiver?.account?.name || '';
            const receiverNameLower = receiverName.toLowerCase();
            const isNameMatched = SLIP_RECEIVER_NAMES.some(name => receiverNameLower.includes(name.toLowerCase()));
            
            if (isNameMatched) {
              console.log(`   ✅ Receiver name matched: "${receiverName}" (fallback check)`);
              // ผ่าน — ชื่อผู้รับตรงกัน ถือว่าบัญชีถูกต้อง
            } else {
              console.log(`\n❌ Receiver account not matched (Code: 200401)`);
              console.log(`   Receiver name: "${receiverName}" - not in allowed list: ${SLIP_RECEIVER_NAMES.join(', ')}`);
              const errorMessage = `❌ ตรวจสอบสลิปไม่สำเร็จ\n\n` +
                `🚫 เหตุผล: บัญชีผู้รับไม่ตรงกัน\n` +
                `📋 รหัส: 200401\n\n` +
                `📸 กรุณาส่งสลิปใหม่`;
              try {
                await sendLineMessageToUser(event.source.userId, errorMessage, accessToken);
              } catch (sendError) {
                console.error(`❌ Failed to send error message: ${sendError.message}`);
              }
              continue;
            }
          }

          // ✅ ทั้งหมดตรวจสอบสำเร็จ บันทึกข้อมูล
          console.log(`\n✅ All validations passed (Real slip, Not duplicate, Receiver matched)`);
          
          const slipData = verificationService.extractSlipData(verificationResult);
          console.log(`💾 Recording slip data:`, slipData);
          
          try {
            // ดึงยอดเงินก่อนหน้าก่อน (ก่อนบันทึก)
            console.log(`📝 Getting current balance before recording...`);
            const balanceData = await getPlayerBalance(event.source.userId, lineUserName);
            const currentBalance = balanceData.balance || 0;
            console.log(`   Current balance: ${currentBalance} บาท`);

            // Record to Transactions sheet FIRST (ก่อนอัปเดต Players)
            console.log(`📝 Recording to Transactions sheet...`);
            await _recordTransactionToSheetFromSlip(
              googleAuth,
              GOOGLE_SHEET_ID,
              event.source.userId,
              lineUserName,
              accessToken,
              slipData,
              currentBalance
            );

            // Record to Players sheet AFTER (หลังบันทึก Transactions)
            console.log(`📝 Recording to Players sheet...`);
            await _recordPlayerToSheetFromSlip(
              googleAuth,
              GOOGLE_SHEET_ID,
              event.source.userId,
              lineUserName,
              accessToken,
              verificationResult.data.amount
            );

            console.log(`   ✅ Recorded to Google Sheets`);

            // Create and send success reply message
            // ถ้า code เป็น 200401 แต่ผ่าน fallback ชื่อผู้รับ → สร้างข้อความสำเร็จเอง
            let replyMessage;
            if (verificationResult.code === '200401') {
              const data = verificationResult.data;
              replyMessage = `✅ ได้รับยอดเงินแล้ว\n\n` +
                `📊 รายละเอียดสลิป:\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💰 จำนวนเงิน: ${data.amount} บาท\n` +
                `👤 ผู้ส่ง: ${data.sender?.account?.name}\n` +
                `👥 ผู้รับ: ${data.receiver?.account?.name}\n` +
                `📅 วันที่: ${new Date(data.dateTime).toLocaleString('th-TH')}\n` +
                `🔖 เลขอ้างอิง: ${data.transRef}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `ขอบคุณที่ใช้บริการ 🙏`;
            } else {
              replyMessage = verificationService.createLineMessage(verificationResult);
            }
            const successGroupMessage = `✅ เติมเงินสำเร็จ\n\n` +
              `👤 ${lineUserName}\n` +
              `💰 จำนวน: ${verificationResult.data.amount} บาท\n\n` +
              `📱 เพิ่มเพื่อน LINE OA ก่อนเริ่มเล่น\n` +
              `👉 https://lin.ee/9EDgGIV`;
            console.log(`   📝 Reply message created`);

            // Send reply to user AFTER recording
            console.log(`   📤 Sending reply to user...`);
            try {
              await sendLineMessageToUser(event.source.userId, replyMessage, accessToken);
              console.log(`   ✅ Reply sent to user`);
            } catch (replyError) {
              console.error(`   ⚠️  Failed to send reply to user: ${replyError.message}`);
            }

            // Send success message to group
            if (event.source.groupId) {
              console.log(`   📤 Sending success message to group...`);
              try {
                await sendLineMessage(event.source.groupId, successGroupMessage, accessToken);
                console.log(`   ✅ Group message sent`);
              } catch (groupError) {
                console.error(`   ⚠️  Failed to send group message: ${groupError.message}`);
              }
            }
          } catch (recordError) {
            console.error(`   ⚠️  Failed to record to Google Sheets: ${recordError.message}`);
            
            // Send error message to user
            const errorMessage = `❌ เกิดข้อผิดพลาดในการบันทึกเติมเงิน\n\n` +
              `เหตุผล: ${recordError.message}\n\n` +
              `📸 กรุณาติดต่อแอดมิน`;
            
            try {
              await sendLineMessageToUser(event.source.userId, errorMessage, accessToken);
            } catch (sendError) {
              console.error(`❌ Failed to send error message: ${sendError.message}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error processing image: ${error.message}`);
          console.error(error.stack);
          
          // Send error message to user
          const errorMessage = `❌ เกิดข้อผิดพลาดในการตรวจสอบสลิป\n\n` +
            `เหตุผล: ${error.message}\n\n` +
            `📸 กรุณาส่งสลิปใหม่`;
          
          try {
            await sendLineMessageToUser(event.source.userId, errorMessage, accessToken);
          } catch (sendError) {
            console.error(`❌ Failed to send error message: ${sendError.message}`);
          }
        }
        continue;
      }
      
      if (event.type === 'message' && event.message.type === 'text') {
        // Handle text messages
        if (event.source.type !== 'group' && event.source.type !== 'user') {
          continue;
        }
        
        const message = {
          replyToken: event.replyToken,
          userId: event.source.userId,
          messageId: event.message.id,
          quotedMessageId: event.message.quotedMessageId || null,
          content: event.message.text,
          timestamp: event.timestamp,
          groupId: event.source.groupId || event.source.userId,
          sourceType: event.source.type
        };
        
        console.log(`📨 Processing message`);
        console.log(`   From: ${message.userId}`);
        console.log(`   Text: "${message.content}"`);
        console.log(`   MessageID: ${message.messageId}`);
        if (message.quotedMessageId) {
          console.log(`   Replying to: ${message.quotedMessageId}`);
        }
        
        // Register group if it's a group message
        if (message.sourceType === 'group') {
          const groupName = await getLineGroupName(message.groupId, accessToken);
          registerGroup(message.groupId, groupName, accountNumber);
        }
        
        // Check if this is a command
        if (message.content.toLowerCase().includes('สรุปยอดแทง')) {
          console.log(`📋 Personal summary command detected for user: ${message.userId}`);
          
          try {
            // ดึงข้อมูลผู้เล่นจาก Players sheet
            const playersRes = await sheets.spreadsheets.values.get({
              auth: googleAuth,
              spreadsheetId: GOOGLE_SHEET_ID,
              range: `Players!A:K`,
            });
            const playerRows = playersRes.data.values || [];
            let displayName = '';
            let balance = 0;
            let totalDeposits = 0;
            
            for (let i = 1; i < playerRows.length; i++) {
              const row = playerRows[i];
              if (row && row[0] === message.userId) {
                displayName = row[1] || '';
                balance = parseFloat(row[4]) || 0;
                totalDeposits = parseFloat(row[5]) || 0;
                break;
              }
            }
            
            if (!displayName) {
              const profile = await getLineUserProfile(message.userId, accessToken);
              displayName = profile?.displayName || 'Unknown';
            }
            
            // ดึงข้อมูลจาก Bets sheet
            const betsRes = await sheets.spreadsheets.values.get({
              auth: googleAuth,
              spreadsheetId: GOOGLE_SHEET_ID,
              range: `${GOOGLE_WORKSHEET_NAME}!A:T`,
            });
            const betsRows = betsRes.data.values || [];
            
            // กรองเฉพาะรายการของคนนี้
            const myBets = [];
            for (let i = 1; i < betsRows.length; i++) {
              const row = betsRows[i];
              if (!row) continue;
              const userAId = row[1] || '';
              const userBId = row[17] || '';
              
              if (userAId === message.userId || userBId === message.userId) {
                const isUserA = userAId === message.userId;
                const slipName = row[4] || '-';
                const side = isUserA ? (row[5] || '-') : (row[12] || '-');
                const amount = isUserA ? (row[6] || '0') : (row[7] || '0');
                const winLose = isUserA ? (row[9] || '') : (row[10] || '');
                const netAmount = isUserA ? (row[18] || '') : (row[19] || '');
                const opponent = isUserA ? (row[11] || '-') : (row[2] || '-');
                
                myBets.push({ slipName, side, amount, winLose, netAmount, opponent });
              }
            }
            
            // สร้างข้อความสรุป
            let msg = `📊 สรุปยอดแทงของ ${displayName}\n`;
            msg += `═══════════════════\n\n`;
            
            if (myBets.length === 0) {
              msg += `ไม่พบรายการเล่น\n`;
            } else {
              let totalWin = 0;
              let totalLose = 0;
              let pending = 0;
              
              for (const bet of myBets) {
                const net = parseFloat(bet.netAmount) || 0;
                const status = bet.winLose || '⏳';
                const amountNum = parseFloat(bet.amount) || 0;
                
                if (bet.winLose === '✅') totalWin += net;
                else if (bet.winLose === '❌' || bet.winLose === '⛔️') totalLose += net;
                if (!bet.winLose) pending++;
                
                const netStr = bet.netAmount ? ` → ${net >= 0 ? '+' : ''}${net.toFixed(0)}` : '';
                msg += `${status} ${bet.slipName} | ${bet.side} | ${amountNum}฿${netStr}\n`;
              }
              
              msg += `\n═══════════════════\n`;
              msg += `📝 รวม ${myBets.length} รายการ`;
              if (pending > 0) msg += ` (รอผล ${pending})`;
              msg += `\n`;
              msg += `✅ ได้: +${totalWin.toFixed(0)} บาท\n`;
              msg += `❌ เสีย: ${totalLose.toFixed(0)} บาท\n`;
            }
            
            msg += `\n💵 เติมเงินรวม: ${totalDeposits.toLocaleString()} บาท`;
            msg += `\n💰 ยอดเงินคงเหลือ: ${balance.toLocaleString()} บาท`;
            
            // ส่งข้อความ (แบ่งถ้ายาวเกิน)
            const maxLength = 4000;
            if (msg.length > maxLength) {
              const parts = [];
              let currentPart = '';
              const lines = msg.split('\n');
              for (const line of lines) {
                if ((currentPart + line + '\n').length > maxLength) {
                  if (currentPart) parts.push(currentPart);
                  currentPart = line + '\n';
                } else {
                  currentPart += line + '\n';
                }
              }
              if (currentPart) parts.push(currentPart);
              for (const part of parts) {
                await sendLineMessage(message.groupId, part, accessToken);
              }
            } else {
              await sendLineMessage(message.groupId, msg, accessToken);
            }
            console.log(`✅ Personal summary sent for ${displayName}`);
          } catch (error) {
            console.error(`❌ Error generating personal summary: ${error.message}`);
          }
        } else if (message.content.trim() === 'บช') {
          console.log(`💳 Bank account command detected`);
          const bankMessage = `💳✨ ช่องทางการเติมเงิน ✨💳\n\n🏦 ธนาคารกรุงไทย\n🔢 เลขที่บัญชี: 865-0-35901-9\n👤 ชื่อบัญชี: ชญาภา พรรณวงค์\n\n📎 กรุณาส่งสลิปการโอนเงินในห้องแชทนี้`;
          await sendLineMessage(message.groupId, bankMessage, accessToken);
          console.log(`✅ Bank account info sent`);
        } else if (message.content.trim() === 'กติกา') {
          console.log(`📋 Rules command detected`);
          const rulesMessage = `วิธีการแทง 👇\n\n📌 วิธีที่ 1 กรณีมีราคาช่าง\nชล100ฟ้า\nชถ100ฟ้า\n\n📌 วิธีที่ 2 ร้องราคา\n300-330ล500ฟ้า\n300-330ย500ฟ้า\n\n💥ขั้นต่ำ 100 บาท 💥\n💥 ยอดเล่นได้เสียหัก10% ทุกกรณี\n💥 ออกกลางหัก5% ทุกรณี`;
          await sendLineMessage(message.groupId, rulesMessage, accessToken);
          console.log(`✅ Rules sent`);
        } else if (message.content.trim() === 'กต') {
          console.log(`📋 Rules command detected (กต)`);
          const rulesMessage = `วิธีการแทง 👇\n\n📌 วิธีที่ 1 กรณีมีราคาช่าง\nชล100ฟ้า\nชถ100ฟ้า\n\n📌 วิธีที่ 2 ร้องราคา\n300-330ล500ฟ้า\n300-330ย500ฟ้า\n\n💥ขั้นต่ำ 100 บาท 💥\n💥 ยอดเล่นได้เสียหัก10% ทุกกรณี\n💥 ออกกลางหัก5% ทุกรณี`;
          await sendLineMessage(message.groupId, rulesMessage, accessToken);
          console.log(`✅ Rules sent`);
        } else if (message.content.trim() === 'ถอน') {
          console.log(`💰 Withdrawal command detected`);
          
          try {
            // ดึงข้อมูลผู้เล่นจากชีท Players เพื่อตรวจสอบชื่อและเอา Token
            const playersResponse = await sheets.spreadsheets.values.get({
              auth: googleAuth,
              spreadsheetId: GOOGLE_SHEET_ID,
              range: `Players!A:K`,
            });
            
            const playerRows = playersResponse.data.values || [];
            let userToken = '';
            let userDisplayName = '';
            let userBalance = 0;
            let foundUser = false;
            
            // ค้นหาผู้เล่นจาก userId
            for (let i = 1; i < playerRows.length; i++) {
              const row = playerRows[i];
              if (row && row[0] === message.userId) {
                userDisplayName = row[1] || '';
                userToken = row[10] || ''; // Column K = Token
                userBalance = parseFloat(row[4]) || 0; // Column E = Balance
                foundUser = true;
                break;
              }
            }
            
            if (!foundUser || !userDisplayName) {
              console.log(`⚠️  User not found in Players sheet`);
              const notFoundMessage = `❌ ไม่พบข้อมูลของคุณในระบบ\nกรุณาติดต่อแอดมิน`;
              await sendLineMessageToUser(message.userId, notFoundMessage, userToken || accessToken);
              return;
            }
            
            // ส่งข้อความไปที่กลุ่ม
            const groupWithdrawalMessage = `📱 ${userDisplayName} ต้องการถอนเงิน\n📱 ติดต่อแอดมิน หากต้องการถอนเงิน\nhttps://lin.ee/9EDgGIV`;
            await sendLineMessage(message.groupId, groupWithdrawalMessage, userToken || accessToken);
            console.log(`✅ Withdrawal notification sent to group`);
            
            // ส่งข้อความไปที่ส่วนตัว
            const personalWithdrawalMessage = `📱 ติดต่อแอดมิน หากต้องการถอนเงิน\nhttps://lin.ee/9EDgGIV\n\n💰 ยอดเงินปัจจุบัน: ${userBalance} บาท`;
            await sendLineMessageToUser(message.userId, personalWithdrawalMessage, userToken || accessToken);
            console.log(`✅ Withdrawal message sent to user`);
            
          } catch (error) {
            console.error(`❌ Error processing withdrawal command: ${error.message}`);
            const errorMessage = `❌ เกิดข้อผิดพลาด: ${error.message}`;
            await sendLineMessageToUser(message.userId, errorMessage, accessToken);
          }
        } else if (message.content.trim() === 'สรุป') {
          console.log(`📊 Summary command detected`);
          const summaryMessage = `📊 สรุปรายการเล่น\nhttps://lin.ee/9EDgGIV`;
          await sendLineMessage(message.groupId, summaryMessage, accessToken);
          console.log(`✅ Summary link sent`);
        } else {
          // Check if this is a result announcement
          const resultData = parseResultMessage(message.content);
          
          if (resultData) {
              console.log(`📊 Result announcement detected`);
              console.log(`   Firework: ${resultData.fireworkName}`);
              console.log(`   Number: ${resultData.resultNumber}`);
              console.log(`   Result: ${resultData.result}`);
              
              // ใช้ AutoMatchingService
              const AutoMatchingService = require('./services/betting/autoMatchingService');
              const matchingService = new AutoMatchingService(googleAuth, GOOGLE_SHEET_ID, GOOGLE_WORKSHEET_NAME);
              
              // ดึงข้อมูลยอดเงินของผู้เล่น
              const playerBalances = await getPlayerBalances();
              
              // จับคู่เล่นอัตโนมัติ
              const matchedPairs = await matchingService.autoMatchPlayers(resultData.fireworkName, playerBalances);
              console.log(`   ✅ จับคู่สำเร็จ ${matchedPairs.length} คู่`);
              
              // คำนวนแพ้ชนะและส่งข้อความให้ผู้เล่น
              const groupSummaryParts = [];
              let groupSummary = `📊 ประกาศผลแพ้ชนะ: ${resultData.fireworkName}\n`;
              groupSummary += `ผลที่ออก: ${resultData.resultNumber} ${resultData.result}\n`;
              groupSummary += `═══════════════════════════════════\n\n`;
              
              for (const pair of matchedPairs) {
                try {
                  // คำนวนแพ้ชนะ
                  const winLoss = await matchingService.calculateWinLoss(pair, resultData.result, resultData.resultNumber, message.groupId);
                  
                  // อัปเดตผลลัพธ์
                  await matchingService.updateResultAndBalance(pair, winLoss, resultData.resultNumber);
                  
                  // อัปเดตยอดเงินผู้เล่น
                  if (pair.playerA.userA && pair.playerA.userAName) {
                    await updatePlayerBalance(pair.playerA.userA, pair.playerA.userAName, winLoss.winningsA);
                  }
                  if (pair.playerB.userA && pair.playerB.userAName) {
                    await updatePlayerBalance(pair.playerB.userA, pair.playerB.userAName, winLoss.winningsB);
                  }
                  
                  // คำนวนยอดเงินหลังการเล่น
                  const updatedBalances = {
                    userA: pair.balanceA + winLoss.winningsA,
                    userB: pair.balanceB + winLoss.winningsB
                  };
                  
                  // สร้างข้อความแจ้งผล พร้อมยอดเงินคงเหลือ
                  const resultMessages = matchingService.createResultMessage(pair, winLoss, updatedBalances);
                  
                  // ส่งข้อความให้ผู้เล่น A
                  console.log(`   📤 ส่งข้อความให้ ${pair.playerA.userAName}`);
                  await sendLineMessageToUser(pair.playerA.userA, resultMessages.messageA, accessToken);
                  
                  // ส่งข้อความให้ผู้เล่น B
                  console.log(`   📤 ส่งข้อความให้ ${pair.playerB.userAName}`);
                  await sendLineMessageToUser(pair.playerB.userA, resultMessages.messageB, accessToken);
                  
                  // เพิ่มสรุปรายการเล่นเข้าไปในกลุ่ม
                  const betAmount = pair.betAmount;
                  let resultLine = '';
                  
                  if (winLoss.resultA === '✅') {
                    resultLine = `✅ ${pair.playerA.userAName} ชนะ vs ${pair.playerB.userAName}\n`;
                    resultLine += `   เดิมพัน: ${betAmount} บาท | ได้รับ: ${winLoss.winningsA.toFixed(0)} บาท\n`;
                  } else if (winLoss.resultA === '❌') {
                    resultLine = `❌ ${pair.playerB.userAName} ชนะ vs ${pair.playerA.userAName}\n`;
                    resultLine += `   เดิมพัน: ${betAmount} บาท | ได้รับ: ${winLoss.winningsB.toFixed(0)} บาท\n`;
                  } else {
                    resultLine = `⛔️ ${pair.playerA.userAName} vs ${pair.playerB.userAName} เสมอ\n`;
                    resultLine += `   เดิมพัน: ${betAmount} บาท | ค่าธรรมเนียม: ${Math.abs(winLoss.winningsA).toFixed(0)} บาท\n`;
                  }
                  
                  groupSummary += resultLine;
                  
                  console.log(`   ✅ ส่งข้อความสำเร็จ`);
                } catch (pairError) {
                  console.error(`   ❌ ข้อผิดพลาด: ${pairError.message}`);
                }
              }
              
              // ส่งสรุปรายการเล่นเข้าไปในกลุ่มแชท
              if (matchedPairs.length > 0) {
                groupSummary += `═══════════════════════════════════\n`;
                groupSummary += `📝 รวมทั้งสิ้น: ${matchedPairs.length} รายการ`;
                
                console.log(`   📤 ส่งสรุปรายการเล่นเข้าไปในกลุ่ม`);
                await sendLineMessage(message.groupId, groupSummary, accessToken);
              }
              
              // Find matching bets (legacy) - เฉพาะกรณีที่ autoMatchingService ไม่ได้จัดการ
              if (matchedPairs.length === 0) {
                const matchingBets = await findMatchingBets(resultData.priceRange, resultData.fireworkName, resultData.resultNumber);
                console.log(`   Found ${matchingBets.length} matching bet(s) (legacy - sheet update only)`);
                
                // Update each matching bet (เฉพาะ Column I, J, K, R, S, T ไม่ส่ง LINE ซ้ำ)
                for (const bet of matchingBets) {
                  await updateBetResultSheetOnly(bet.rowIndex, resultData.resultNumber, resultData.result, accessToken);
                }
                
                if (matchingBets.length > 0) {
                  console.log(`✅ Results updated successfully`);
                }
              } else {
                console.log(`   ⏭️  Skip legacy flow - autoMatchingService already handled ${matchedPairs.length} pair(s)`);
              }
            } else {
              // ✅ ใช้ bettingRoundController ที่ทำงานถูกต้องแล้ว
              console.log(`🎯 Using bettingRoundController for message processing`);
              
              let isHandledByController = false;
              let controllerResult = null;
              try {
                const bettingRoundController = require('./services/betting/bettingRoundController');
                
                // ดึงชื่อผู้เล่น
                let playerDisplayName = await getLineUserProfile(message.userId, accessToken) || 
                                        await getLineGroupMemberProfile(message.groupId, message.userId, accessToken) || 
                                        'Unknown';

                // ถ้าดึงชื่อไม่ได้ (Unknown) ให้แจ้งในกลุ่มให้เพิ่มเพื่อน OA
                if (playerDisplayName === 'Unknown') {
                  console.log(`⚠️  Player is Unknown - sending add friend message to group`);
                  const addFriendMessage = `⚠️ ไม่สามารถระบุตัวตนผู้เล่นได้\n\n` +
                    `💡 กรุณาเติมเงินก่อนเริ่มเล่น\n` +
                    `📱 เลข บช. 865-0-35901-9 กรุงไทย\n` +
                    `ชญาภา พรรณวงค์`;
                  await sendLineMessage(message.groupId, addFriendMessage, accessToken);
                  break;
                }

                // ✅ ดึงชื่อได้แล้ว → อัปเดตชื่อ Unknown ในชีทถ้ามี
                await updateUnknownPlayerName(message.userId, playerDisplayName, accessToken);

                // เตรียมข้อมูลสำหรับ bettingRoundController
                controllerResult = await bettingRoundController.handleMessage({
                  message: {
                    text: message.content,
                    id: message.messageId,
                    quotedMessageId: message.quotedMessageId
                  },
                  source: {
                    userId: message.userId,
                    displayName: playerDisplayName,
                    groupId: message.groupId
                  }
                });
                
                console.log(`✅ bettingRoundController processed successfully`);
                console.log(`   Result:`, controllerResult);
                
                // ส่งข้อความตอบกลับให้ผู้ใช้ (เฉพาะข้อความจับคู่สำเร็จและการบันทึกสำเร็จเท่านั้น)
                if (controllerResult && controllerResult.text) {
                  // ตรวจสอบว่าเป็นข้อความสำเร็จหรือข้อความแจ้งเตือนข้อผิดพลาด
                  const isSuccessMessage = controllerResult.text.includes('จับคู่เล่นสำเร็จ') || 
                                          controllerResult.text.includes('บันทึกการเดิมพันสำเร็จ') ||
                                          controllerResult.text.includes('ไม่พบชื่อบั้งไฟ') ||
                                          controllerResult.text.includes('ประกาศราคาช่างสำเร็จ') ||
                                          controllerResult.text.includes('ช่างไม่ต่อย') ||
                                          controllerResult.text.includes('ช่างยังไม่ต่อย') ||
                                          controllerResult.text.includes('บันทึกบั้งไฟ') ||
                                          controllerResult.text.includes('ถูกจับคู่ไปแล้ว') ||
                                          controllerResult.isBetAttempt === true;
                  
                  if (isSuccessMessage) {
                    // ส่งข้อความแจ้งเตือนชื่อบั้งไฟผิดเข้ากลุ่ม
                    if (controllerResult.text.includes('ไม่พบชื่อบั้งไฟ') ||
                        controllerResult.text.includes('ประกาศราคาช่างสำเร็จ') ||
                        controllerResult.text.includes('ช่างไม่ต่อย') ||
                        controllerResult.text.includes('ช่างยังไม่ต่อย') ||
                        controllerResult.text.includes('บันทึกบั้งไฟ') ||
                        controllerResult.text.includes('ถูกจับคู่ไปแล้ว') ||
                        controllerResult.isBetAttempt === true) {
                      // ถูกจับคู่ไปแล้ว → ส่ง DM คน reply ซ้ำอย่างเดียว ไม่ส่งเข้ากลุ่ม
                      if (controllerResult.text.includes('ถูกจับคู่ไปแล้ว')) {
                        await sendLineMessageToUser(message.userId, controllerResult.text, accessToken);
                        console.log(`   ✅ DM sent to duplicate replier`);
                      } else {
                        console.log(`   📤 Sending message to group`);
                        await sendLineMessage(message.groupId, controllerResult.text, accessToken);
                        console.log(`   ✅ Group message sent`);
                      }
                      // ส่ง DM ให้คน reply ซ้ำด้วย
                      if (controllerResult.text.includes('ถูกจับคู่ไปแล้ว')) {
                        await sendLineMessageToUser(message.userId, controllerResult.text, accessToken);
                        console.log(`   ✅ DM sent to duplicate replier`);
                      }
                    } else {
                      console.log(`   📤 Sending reply message to user`);
                      await sendLineMessageToUser(message.userId, controllerResult.text, accessToken);
                      console.log(`   ✅ Reply sent`);
                    }
                  } else {
                    // ข้อความแจ้งเตือนข้อผิดพลาด - ไม่ส่ง
                    console.log(`   ⏭️  Skipping error message (not sending to user)`);
                  }
                }
                
                // ถ้า bettingRoundController จัดการการจับคู่แล้ว ให้ส่งข้อความเข้ากลุ่มและแจ้งผู้เล่น A ด้วย
                if (controllerResult && controllerResult.text && controllerResult.text.includes('จับคู่เล่นสำเร็จ')) {
                  isHandledByController = true;
                  console.log(`✅ Pair matched - sending notifications to both players and group`);
                  
                  // ดึงข้อมูลจาก Bets sheet เป็นหลัก
                  try {
                    const bettingPairingService = require('./services/betting/bettingPairingService');
                    const groupBets = await bettingPairingService.getBetsByGroupId(message.groupId || '');
                    
                    // ค้นหาแถวที่เพิ่งจับคู่ (มี User B + ยังไม่มีผล)
                    const matchedBets = groupBets.filter(bet => 
                      bet.userBId && bet.userBId !== '' && !bet.result
                    );
                    const latestBet = matchedBets[matchedBets.length - 1];
                    
                    if (latestBet) {
                      // สร้างข้อความจากข้อมูลใน sheet
                      const matchMsg = `📢 ✅ จับคู่เล่นสำเร็จ\n\n` +
                        `🎆 บั้งไฟ: ${latestBet.slipName}\n` +
                        `💹 ราคา: ${latestBet.price || 'ราคาช่าง'}\n\n` +
                        `👤 ${latestBet.displayName}\n` +
                        `   ฝั่ง: ${latestBet.sideCode}\n` +
                        `   ยอดเงิน: ${latestBet.amount} บาท\n\n` +
                        `👤 ${latestBet.userBName}\n` +
                        `   ฝั่ง: ${latestBet.sideBCode || '-'}\n` +
                        `   ยอดเงิน: ${latestBet.amountB} บาท\n\n` +
                        `⏳ รอการประกาศผล...`;
                      
                      // ส่งให้ Player A
                      if (latestBet.userId) {
                        console.log(`   📤 Sending notification to Player A: ${latestBet.displayName}`);
                        await sendLineMessageToUser(latestBet.userId, matchMsg, accessToken);
                        console.log(`   ✅ Player A notification sent`);
                      }
                      
                      // ส่งให้ Player B
                      if (latestBet.userBId) {
                        console.log(`   📤 Sending notification to Player B: ${latestBet.userBName}`);
                        await sendLineMessageToUser(latestBet.userBId, matchMsg, accessToken);
                        console.log(`   ✅ Player B notification sent`);
                      }
                      
                      // ส่งเข้ากลุ่ม
                      if (message.sourceType === 'group') {
                        console.log(`   📢 Sending group notification`);
                        await sendLineMessage(message.groupId, matchMsg, accessToken);
                        console.log(`   ✅ Group notification sent`);
                      }
                    }
                  } catch (notifyError) {
                    console.error(`   ⚠️  Failed to send match notifications: ${notifyError.message}`);
                  }
                }
                
              } catch (controllerError) {
                console.error(`❌ bettingRoundController error: ${controllerError.message}`);
                console.error(controllerError.stack);
              }
              
              // ข้ามการบันทึกซ้ำถ้า bettingRoundController ได้จัดการแล้ว
              // ถ้า controller ได้ประมวลผลข้อความแล้ว (ไม่ว่าจะสำเร็จหรือ error) ให้ข้าม detectPair
              if (isHandledByController || controllerResult) {
                if (!isHandledByController && controllerResult) {
                  console.log(`   ⏭️  Skipping detectPair - bettingRoundController already processed this message`);
                }
                return;
              }

              
              // Detect pair
              const pair = detectPair(message);
              
              if (pair) {
                console.log(`   messageA: "${pair.messageA}"`);
                console.log(`   messageB: "${pair.messageB}"`);
                
                // Extract bet details
                const betDetailsA = {
                  priceRange: extractPriceRange(pair.messageA),
                  fireworkName: extractFireworkName(pair.messageA),
                  betType: extractBetType(pair.messageA),
                  betAmount: extractBetAmount(pair.messageA)
                };
                
                const betDetailsB = {
                  priceRange: extractPriceRange(pair.messageB),
                  fireworkName: extractFireworkName(pair.messageB),
                  betType: extractBetType(pair.messageB),
                  betAmount: extractBetAmount(pair.messageB)
                };
                
                console.log(`   🎯 Bet Details A: price=${betDetailsA.priceRange}, firework=${betDetailsA.fireworkName}, type=${betDetailsA.betType}, amount=${betDetailsA.betAmount}`);
                console.log(`   🎯 Bet Details B: firework=${betDetailsB.fireworkName}, type=${betDetailsB.betType}, amount=${betDetailsB.betAmount}`);
                
                // ตรวจสอบว่า User A มีประเภทเดิมพันหรือไม่
                if (!betDetailsA.betType) {
                  console.log(`❌ Missing bet type in User A message`);
                  return;
                }
                
                // ตรวจสอบว่าประเภทตรงข้ามกัน (✅ vs ❌ หรือ ต่ำ vs สูง)
                const isOpposite = (typeA, typeB) => {
                  // ยั้ง: ชถ, ย
                  // ไล่: ชล, ล
                  const lowBetTypes = ['ชถ', 'ย'];
                  const highBetTypes = ['ชล', 'ล'];
                  
                  const typeAIsLow = lowBetTypes.includes(typeA);
                  const typeAIsHigh = highBetTypes.includes(typeA);
                  const typeBIsLow = lowBetTypes.includes(typeB);
                  const typeBIsHigh = highBetTypes.includes(typeB);
                  
                  // ต่ำ vs สูง = ตรงข้าม
                  return (typeAIsLow && typeBIsHigh) || (typeAIsHigh && typeBIsLow);
                };
                
                // 🎯 REPLY MATCHING: ถ้า User B ไม่ระบุประเภท ให้ถือว่า User B เล่นฝั่งตรงข้าม
                let userBBetType = betDetailsB.betType;
                if (!userBBetType) {
                  // ถ้า User B ไม่ระบุประเภท ให้ใช้ประเภทตรงข้ามกับ User A
                  const opposites = {
                    // ยั้ง → ไล่
                    'ชถ': 'ชล',
                    'ย': 'ล',
                    
                    // ไล่ → ยั้ง
                    'ชล': 'ชถ',
                    'ล': 'ย',
                  };
                  userBBetType = opposites[betDetailsA.betType];
                  console.log(`   ℹ️  User B didn't specify bet type, assuming opposite: ${userBBetType}`);
                }
                
                // ตรวจสอบว่าประเภทตรงข้ามกันหรือไม่
                if (!isOpposite(betDetailsA.betType, userBBetType)) {
                  console.log(`❌ Bet types are not opposite: "${betDetailsA.betType}" vs "${userBBetType}"`);
                  return;
                }
                
                console.log(`✅ Bet types are opposite: "${betDetailsA.betType}" vs "${userBBetType}"`);
                
                // 🎯 REPLY MATCHING: ตรวจสอบช่วงราคาตรงกัน
                const priceRangeA = betDetailsA.priceRange;
                const priceRangeB = betDetailsB.priceRange;
                
                console.log(`   Price Range A: ${priceRangeA}`);
                console.log(`   Price Range B: ${priceRangeB}`);
                
                // ถ้า User B ไม่มีช่วงราคา ให้ใช้ของ User A
                const finalPriceRangeB = priceRangeB || priceRangeA;
                
                // ถ้า User A มีช่วงราคา ต้องตรวจสอบ
                if (priceRangeA) {
                  if (priceRangeA !== finalPriceRangeB) {
                    console.log(`❌ Price ranges don't match: "${priceRangeA}" vs "${finalPriceRangeB}"`);
                    return;
                  }
                  console.log(`✅ Price ranges match: "${priceRangeA}"`);
                } else {
                  // ถ้า User A ไม่มีช่วงราคา ใช้ได้ (เล่นแบบเดิม)
                  console.log(`✅ No price range (traditional betting)`);
                }
                
                // 🎯 REPLY MATCHING: ตรวจสอบชื่อบั้งไฟตรงกัน (ถ้ามี)
                const fireworkNameA = betDetailsA.fireworkName;
                const fireworkNameB = betDetailsB.fireworkName;
                
                // ถ้า User B ไม่มีชื่อบั้งไฟ ให้ใช้ของ User A
                const finalFireworkNameB = fireworkNameB || fireworkNameA;
                
                // ถ้าทั้งสองมีชื่อบั้งไฟ ต้องตรงกัน
                if (fireworkNameA && fireworkNameB) {
                  if (fireworkNameA !== fireworkNameB) {
                    console.log(`❌ Firework names don't match: "${fireworkNameA}" vs "${fireworkNameB}"`);
                    return;
                  }
                  console.log(`✅ Firework names match: "${fireworkNameA}"`);
                } else if (fireworkNameA || fireworkNameB) {
                  // ถ้าเพียงอันเดียวมีชื่อบั้งไฟ ใช้ชื่อของ User A
                  console.log(`✅ Using User A firework name: "${fireworkNameA}"`);
                } else {
                  // ถ้าทั้งสองไม่มีชื่อบั้งไฟ ใช้ได้ (เล่นแบบร้องราคา)
                  console.log(`✅ No firework names (price range betting)`);
                }
                
                // 🎯 REPLY MATCHING: ยึด User A เป็นหลัก ไม่ต้องตรวจชื่อบั้งไฟ
                // ใช้ยอดเงินของ User A เป็นหลัก
                const betAmount = betDetailsA.betAmount || 0;
                
                // Fetch user names first
                console.log('👤 Fetching user profiles and group name...');
                const userAName = await getLineUserProfile(pair.userA, accessToken) || 'Unknown';
                const userBName = await getLineUserProfile(pair.userB, accessToken) || 'Unknown';
                const groupName = await getLineGroupName(pair.groupId, accessToken);
                
                console.log(`   User A: ${userAName}`);
                console.log(`   User B: ${userBName}`);
                console.log(`   Group: ${groupName}`);
                console.log(`   📱 Using LINE Account: ${accountNumber === 1 ? 'Primary' : 'Secondary'}`);
                
                // Get player balances
                const userABalanceData = await getPlayerBalance(pair.userA, userAName);
                const userBBalanceData = await getPlayerBalance(pair.userB, userBName);
                
                const userABalance = userABalanceData.balance;
                const userBBalance = userBBalanceData.balance;
                const userAFound = userABalanceData.found;
                const userBFound = userBBalanceData.found;
                
                console.log(`   💰 User A Balance: ${userABalance} บาท (Found: ${userAFound})`);
                console.log(`   💰 User B Balance: ${userBBalance} บาท (Found: ${userBFound})`);
                console.log(`   💰 Bet Amount (from User A): ${betAmount} บาท`);
                
                // Check if players are registered
                if (!userAFound || !userBFound) {
                  console.log(`❌ Player not registered`);
                  
                  // สร้างข้อความแจ้งเตือนในกลุ่ม
                  let names = [];
                  if (!userAFound) names.push(userAName);
                  if (!userBFound) names.push(userBName);
                  
                  const groupWarningMessage = `⚠️ ${names.join(', ')} ยังไม่ได้เติมเงิน\n\n` +
                    `💡 กรุณาเติมเงินก่อนเริ่มเล่น\n` +
                    `📱 เลข บช. 865-0-35901-9 กรุงไทย\n` +
                    `ชญาภา พรรณวงค์`;
                  
                  console.log(`   📢 Sending group warning message`);
                  await sendLineMessage(pair.groupId, groupWarningMessage, accessToken);
                } else if (userABalance < betAmount || userBBalance < betAmount) {
                  console.log(`❌ Insufficient balance detected`);
                  
                  // สร้างข้อความแจ้งเตือนในกลุ่ม
                  let names = [];
                  if (userABalance < betAmount) names.push(`${userAName} (ขาด ${(betAmount - userABalance).toFixed(0)} บาท)`);
                  if (userBBalance < betAmount) names.push(`${userBName} (ขาด ${(betAmount - userBBalance).toFixed(0)} บาท)`);
                  
                  const groupWarningMessage2 = `⚠️ ${names.join(', ')} ยอดเงินไม่พอ\n\n` +
                    `💡 กรุณาเติมเงินก่อนเริ่มเล่น\n` +
                    `📱 เลข บช. 865-0-35901-9 กรุงไทย\n` +
                    `ชญาภา พรรณวงค์`;
                  
                  console.log(`   📢 Sending group warning message`);
                  await sendLineMessage(pair.groupId, groupWarningMessage2, accessToken);
                } else {
                  // ยอดเงินเพียงพอ บันทึกการเดิมพัน
                  console.log(`✅ Balance sufficient for both players`);
                  console.log(`   📝 Recording bet to Bets sheet...`);
                  
                  try {
                    await appendToGoogleSheets(pair, userAName, userBName, groupName, 'reply', accessToken);
                    console.log(`✅ Pair recorded successfully`);
                    
                    // 📢 ส่งข้อความแจ้งเตือนเมื่อจับคู่เล่นสำเร็จ
                    // ดึงชื่อบั้งไฟจากข้อความ (สำหรับ Method 2: 370-400 ล 20 แอด → แอด)
                    let fireworkName = extractFireworkName(pair.messageA);
                    if (!fireworkName) {
                      // ถ้าไม่พบ ให้ดึงจากท้ายข้อความ
                      const parts = pair.messageA.trim().split(/\s+/);
                      fireworkName = parts[parts.length - 1];
                    }
                    const betAmount = pair.betAmount || extractBetAmount(pair.messageA);
                    
                    // ข้อความแจ้งเตือนส่วนตัวสำหรับผู้เล่น A
                    const userANotification = `✅ จับคู่เล่นสำเร็จ\n\n` +
                      `👤 คุณ: ${userAName}\n` +
                      `👤 คู่แข่ง: ${userBName}\n` +
                      `🎆 บั้งไฟ: ${fireworkName}\n` +
                      `💰 ยอดเงิน: ${betAmount} บาท\n\n` +
                      `⏳ รอการประกาศผล...`;
                    
                    // ข้อความแจ้งเตือนส่วนตัวสำหรับผู้เล่น B
                    const userBNotification = `✅ จับคู่เล่นสำเร็จ\n\n` +
                      `👤 คุณ: ${userBName}\n` +
                      `👤 คู่แข่ง: ${userAName}\n` +
                      `🎆 บั้งไฟ: ${fireworkName}\n` +
                      `💰 ยอดเงิน: ${betAmount} บาท\n\n` +
                      `⏳ รอการประกาศผล...`;
                    
                    // ข้อความแจ้งเตือนในกลุ่มแชท
                    const groupNotification = `✅ จับคู่เล่นสำเร็จ\n\n` +
                      `👤 ${userAName} vs ${userBName}\n` +
                      `🎆 บั้งไฟ: ${fireworkName}\n` +
                      `💰 ยอดเงิน: ${betAmount} บาท\n\n` +
                      `⏳ รอการประกาศผล...`;
                    
                    // ส่งข้อความแจ้งเตือนส่วนตัว
                    console.log(`   📤 Sending pairing notification to ${userAName}`);
                    await sendLineMessageToUser(pair.userA, userANotification, accessToken);
                    
                    // Add delay between messages to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    console.log(`   📤 Sending pairing notification to ${userBName}`);
                    await sendLineMessageToUser(pair.userB, userBNotification, accessToken);
                    
                    // Add delay before sending group message
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    // ส่งข้อความแจ้งเตือนในกลุ่ม
                    console.log(`   📤 Sending pairing notification to group`);
                    await sendLineMessage(pair.groupId, groupNotification, accessToken);
                    
                    console.log(`✅ Pairing notifications sent`);
                  } catch (recordError) {
                    console.error(`❌ Failed to record pair: ${recordError.message}`);
                  }
                }
              } else {
                console.log(`⏭️  No pair detected (waiting for reply)`);
              }
            }
          }
        } else if (event.type === 'join') {
        // Handle join event (bot joined a new group)
        console.log(`\n✅ Bot joined a new group`);
        
        const groupId = event.source.groupId;
        const timestamp = event.timestamp;
        
        console.log(`   Group ID: ${groupId}`);
        console.log(`   Timestamp: ${timestamp}`);
        console.log(`   Account: ${accountNumber}`);
        
        try {
          // Get group name
          const groupName = await getLineGroupName(groupId, accessToken);
          console.log(`   Group Name: ${groupName}`);
          
          // Register group
          registerGroup(groupId, groupName, accountNumber);
          console.log(`   ✅ Group registered successfully`);
          
          // Send welcome message
          const welcomeMessage = `👋 สวัสดีค่ะ ฉันเป็น LINE Betting Bot\n\n` +
            `📝 วิธีใช้:\n` +
            `1. ส่งข้อความแทง (เช่น "ชล 100")\n` +
            `2. ตอบกลับข้อความของคนอื่น เพื่อสร้างคู่แทง\n` +
            `3. ส่ง "สรุปยอดแทง" เพื่อดูสรุปยอด\n\n` +
            `✅ ระบบพร้อมบันทึกข้อมูลแทงของกลุ่ม: ${groupName}`;
          
          await sendLineMessage(groupId, welcomeMessage, accessToken);
          console.log(`✅ Welcome message sent to new group`);
        } catch (error) {
          console.error(`❌ Error handling join event:`, error.message);
        }
      } else if (event.type === 'leave') {
        // Handle leave event (bot left a group)
        console.log(`\n👋 Bot left a group`);
        
        const groupId = event.source.groupId;
        console.log(`   Group ID: ${groupId}`);
        console.log(`   ℹ️  Bot will no longer receive messages from this group`);
      } else if (event.type === 'unsend') {
        // Handle unsend (message deletion)
        console.log(`\n❌ Message unsend detected`);
        
        const unsendEvent = event;
        const userId = event.source.userId;
        const messageId = event.unsend.messageId;
        const timestamp = event.timestamp;
        
        console.log(`   Message ID: ${messageId}`);
        console.log(`   User ID: ${userId}`);
        
        // Get user name
        const userName = await getLineUserProfile(userId, accessToken) || 'Unknown';
        
        // Get group name
        const groupId = event.source.groupId || event.source.userId;
        const groupName = await getLineGroupName(groupId, accessToken);
        
        // Calculate time difference
        const now = new Date();
        const unsendTime = new Date(timestamp);
        const diffSeconds = Math.floor((now - unsendTime) / 1000);
        
        let timeAgo = '';
        if (diffSeconds < 60) {
          timeAgo = `${diffSeconds} วินาทีที่แล้ว`;
        } else if (diffSeconds < 3600) {
          timeAgo = `${Math.floor(diffSeconds / 60)} นาทีที่แล้ว`;
        } else {
          timeAgo = `${Math.floor(diffSeconds / 3600)} ชั่วโมงที่แล้ว`;
        }
        
        const unsendTime24h = unsendTime.toLocaleString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        // Create unsend report
        const unsendReport = `❌ [ พบการยกเลิกข้อความ ]\n` +
          `❌\n` +
          `• ผู้ยกเลิก: ${userName}\n` +
          `• ยกเลิกเมื่อ: ${timeAgo}\n` +
          `• เวลา: ${unsendTime24h} ที่ยกเลิก\n` +
          `• Message ID: ${messageId}\n` +
          `• Group: ${groupName}`;
        
        console.log(`📤 Sending unsend report...`);
        console.log(unsendReport);
        
        // Send report to group
        await sendLineMessage(groupId, unsendReport, accessToken);
        console.log(`✅ Unsend report sent`);
      }
    }
    
    console.log('✅ Webhook handler completed\n');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== INITIALIZE SHEETS =====
async function initializeSheets() {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }
  
  try {
    console.log('🔧 Initializing Google Sheets...');
    
    // Verify access
    await sheets.spreadsheets.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
    });
    
    console.log('✅ Google Sheets access verified');
    
    // Create headers
    const headers = [
      'Timestamp',
      'User A ID',
      'ชื่อ User A',
      'ข้อความ A',
      'ชื่อบั้งไฟ',
      'รายการเล่น',
      'ยอดเงิน',
      'ยอดเงิน B',
      'ผลที่ออก',
      'ผลแพ้ชนะ',
      'User B ID',
      'ชื่อ User B',
      'รายการแทง',
      'ชื่อกลุ่มแชท',
    ];
    
    console.log('📝 Creating headers...');
    
    await sheets.spreadsheets.values.update({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A1:N1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers],
      },
    });
    
    console.log('✅ Headers created');
  } catch (error) {
    console.warn('⚠️  Warning: Could not initialize sheets:', error.message);
  }
}

// ===== HELPER FUNCTIONS FOR SLIP RECORDING =====

// ===== UPDATE UNKNOWN NAMES =====
/**
 * อัปเดตชื่อ "Unknown" ในชีท Players, Transactions, UsersBalance
 * เมื่อระบบสามารถดึงชื่อ LINE ได้แล้ว
 */
async function updateUnknownPlayerName(userId, newDisplayName, accessToken) {
  if (!googleAuth || !userId || !newDisplayName || newDisplayName === 'Unknown') return;

  try {
    console.log(`\n🔄 === Checking for Unknown name to update ===`);
    console.log(`   User ID: ${userId}`);
    console.log(`   New Name: ${newDisplayName}`);

    let updated = false;

    // 1) อัปเดตชีท Players
    const playersRes = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `Players!A:B`,
    });
    const playersRows = playersRes.data.values || [];
    for (let i = 1; i < playersRows.length; i++) {
      if (playersRows[i] && playersRows[i][0] === userId && playersRows[i][1] === 'Unknown') {
        await sheets.spreadsheets.values.update({
          auth: googleAuth,
          spreadsheetId: GOOGLE_SHEET_ID,
          range: `Players!B${i + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[newDisplayName]] },
        });
        console.log(`   ✅ Players row ${i + 1}: Unknown → ${newDisplayName}`);
        updated = true;
      }
    }

    // 2) อัปเดตชีท UsersBalance
    const ubRes = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `UsersBalance!A:B`,
    });
    const ubRows = ubRes.data.values || [];
    for (let i = 1; i < ubRows.length; i++) {
      if (ubRows[i] && ubRows[i][0] === userId && ubRows[i][1] === 'Unknown') {
        await sheets.spreadsheets.values.update({
          auth: googleAuth,
          spreadsheetId: GOOGLE_SHEET_ID,
          range: `UsersBalance!B${i + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[newDisplayName]] },
        });
        console.log(`   ✅ UsersBalance row ${i + 1}: Unknown → ${newDisplayName}`);
        updated = true;
      }
    }

    // 3) อัปเดตชีท Transactions (Column B = ชื่อผู้เล่น, Column M = userId)
    try {
      const transRes = await sheets.spreadsheets.values.get({
        auth: googleAuth,
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `Transactions!B:M`,
      });
      const transRows = transRes.data.values || [];
      for (let i = 1; i < transRows.length; i++) {
        // Column B (index 0 ใน range B:M) = ชื่อ, Column M (index 11 ใน range B:M) = userId
        if (transRows[i] && transRows[i][0] === 'Unknown' && transRows[i][11] === userId) {
          await sheets.spreadsheets.values.update({
            auth: googleAuth,
            spreadsheetId: GOOGLE_SHEET_ID,
            range: `Transactions!B${i + 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[newDisplayName]] },
          });
          console.log(`   ✅ Transactions row ${i + 1}: Unknown → ${newDisplayName}`);
          updated = true;
        }
      }
    } catch (transError) {
      console.error(`   ⚠️  Failed to update Transactions: ${transError.message}`);
    }

    if (!updated) {
      console.log(`   ℹ️  No Unknown names found for this user`);
    }

    console.log(`   🔄 === End Update Unknown Name ===\n`);
  } catch (error) {
    console.error(`   ⚠️  Failed to update Unknown name: ${error.message}`);
  }
}

async function _recordPlayerToSheetFromSlip(googleAuth, googleSheetId, userId, lineUserName, accessToken, amount) {
  try {
    console.log(`📝 _recordPlayerToSheetFromSlip called:`);
    console.log(`   userId: ${userId}`);
    console.log(`   lineUserName: ${lineUserName}`);
    console.log(`   amount: ${amount}`);
    
    const sheets = google.sheets('v4');

    // ใช้ชื่อที่ส่งเข้ามา ถ้าไม่ใช่ "Unknown" ให้ดึงจาก LINE Profile API
    let actualUserName = lineUserName;
    if (!actualUserName || actualUserName === 'Unknown') {
      try {
        console.log(`   🔄 ชื่อเป็น Unknown ดึงจาก LINE Profile API...`);
        actualUserName = await getLineUserProfile(userId, accessToken) || 'Unknown';
        console.log(`   📝 ดึงชื่อจาก LINE Profile: ${actualUserName}`);
      } catch (error) {
        console.warn(`   ⚠️  ไม่สามารถดึงชื่อจาก LINE Profile: ${error.message}`);
        actualUserName = lineUserName || 'Unknown';
      }
    }

    // ตรวจสอบว่าผู้เล่นมีอยู่แล้วหรือไม่
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Players!A:K`,
    });

    const rows = response.data.values || [];
    let playerRowIndex = null;
    let currentBalance = 0;
    let totalDeposits = 0;

    // ✅ ค้นหาจากชื่อ LINE เป็นหลัก (PRIMARY)
    console.log(`   🔍 PRIMARY: Searching by LINE name: "${actualUserName}"`);
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][1] === actualUserName) {
        playerRowIndex = i + 1;
        currentBalance = parseFloat(rows[i][4]) || 0;
        totalDeposits = parseFloat(rows[i][5]) || 0;
        console.log(`   ✅ FOUND by LINE name at row ${playerRowIndex}: balance=${currentBalance}, deposits=${totalDeposits}`);
        break;
      }
    }

    // ถ้าไม่พบจากชื่อ LINE ให้ค้นหาจาก User ID (BACKUP)
    if (!playerRowIndex) {
      console.log(`   ℹ️  BACKUP: Not found by LINE name, searching by User ID: "${userId}"`);
      for (let i = 1; i < rows.length; i++) {
        if (rows[i] && rows[i][0] === userId) {
          playerRowIndex = i + 1;
          currentBalance = parseFloat(rows[i][4]) || 0;
          totalDeposits = parseFloat(rows[i][5]) || 0;
          console.log(`   ✅ FOUND by User ID at row ${playerRowIndex}: balance=${currentBalance}, deposits=${totalDeposits}`);
          break;
        }
      }
    }

    console.log(`   📊 Current Balance: ${currentBalance} บาท`);
    console.log(`   📊 Total Deposits: ${totalDeposits} บาท`);

    const now = new Date();
    const dateStr = now.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const newBalance = currentBalance + amount;
    const newTotalDeposits = totalDeposits + amount;

    if (playerRowIndex) {
      // อัปเดตผู้เล่นที่มีอยู่แล้ว
      console.log(`   📝 UPDATE: Updating player: ${actualUserName} (row ${playerRowIndex})`);

      const updateResponse = await sheets.spreadsheets.values.get({
        auth: googleAuth,
        spreadsheetId: googleSheetId,
        range: `Players!A${playerRowIndex}:K${playerRowIndex}`,
      });

      const currentRow = updateResponse.data.values ? updateResponse.data.values[0] : [];

      const newRow = [
        userId,
        actualUserName,  // ✅ ใช้ชื่อ LINE เป็นหลัก
        currentRow[2] || '',
        currentRow[3] || '',
        newBalance,
        newTotalDeposits,
        currentRow[6] || 0,
        'active',
        currentRow[8] || dateStr,
        dateStr,
        accessToken,
      ];

      await sheets.spreadsheets.values.update({
        auth: googleAuth,
        spreadsheetId: googleSheetId,
        range: `Players!A${playerRowIndex}:K${playerRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [newRow],
        },
      });

      console.log(`   ✅ UPDATE SUCCESS: ${actualUserName} | Balance: ${currentBalance} → ${newBalance} บาท`);
      
      // 🔄 อัปเดต UsersBalance ด้วย
      console.log(`   🔄 Updating UsersBalance sheet...`);
      try {
        const usersBalanceResponse = await sheets.spreadsheets.values.get({
          auth: googleAuth,
          spreadsheetId: googleSheetId,
          range: `UsersBalance!A:C`,
        });
        
        const usersBalanceRows = usersBalanceResponse.data.values || [];
        let usersBalanceRowIndex = null;
        
        // ค้นหาผู้เล่นในชีท UsersBalance
        for (let i = 1; i < usersBalanceRows.length; i++) {
          if (usersBalanceRows[i] && usersBalanceRows[i][1] === actualUserName) {
            usersBalanceRowIndex = i + 1;
            break;
          }
        }
        
        if (usersBalanceRowIndex) {
          // อัปเดตยอดเงินในชีท UsersBalance
          await sheets.spreadsheets.values.update({
            auth: googleAuth,
            spreadsheetId: googleSheetId,
            range: `UsersBalance!C${usersBalanceRowIndex}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[newBalance]],
            },
          });
          console.log(`   ✅ UsersBalance updated: ${newBalance} บาท`);
        } else {
          // สร้างแถวใหม่ในชีท UsersBalance
          const nextRowIndex = usersBalanceRows.length + 1;
          await sheets.spreadsheets.values.update({
            auth: googleAuth,
            spreadsheetId: googleSheetId,
            range: `UsersBalance!A${nextRowIndex}:C${nextRowIndex}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[userId, actualUserName, newBalance]],
            },
          });
          console.log(`   ✅ UsersBalance created: ${newBalance} บาท`);
        }
      } catch (usersBalanceError) {
        console.error(`   ⚠️  Failed to update UsersBalance: ${usersBalanceError.message}`);
      }
    } else {
      // สร้างผู้เล่นใหม่
      console.log(`   📝 CREATE: Creating new player: ${actualUserName}`);

      const newRow = [
        userId,
        actualUserName,  // ✅ ใช้ชื่อ LINE เป็นหลัก
        '',
        '',
        amount,
        amount,
        0,
        'active',
        dateStr,
        dateStr,
        accessToken,
      ];

      const nextRowIndex = rows.length + 1;

      await sheets.spreadsheets.values.update({
        auth: googleAuth,
        spreadsheetId: googleSheetId,
        range: `Players!A${nextRowIndex}:K${nextRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [newRow],
        },
      });

      console.log(`   ✅ CREATE SUCCESS: ${actualUserName} | Balance: ${amount} บาท`);
      
      // 🔄 เพิ่มลงชีท UsersBalance ด้วย
      console.log(`   🔄 Adding to UsersBalance sheet...`);
      try {
        const usersBalanceResponse = await sheets.spreadsheets.values.get({
          auth: googleAuth,
          spreadsheetId: googleSheetId,
          range: `UsersBalance!A:C`,
        });
        
        const usersBalanceRows = usersBalanceResponse.data.values || [];
        const nextRowIndex = usersBalanceRows.length + 1;
        
        await sheets.spreadsheets.values.update({
          auth: googleAuth,
          spreadsheetId: googleSheetId,
          range: `UsersBalance!A${nextRowIndex}:C${nextRowIndex}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[userId, actualUserName, amount]],
          },
        });
        console.log(`   ✅ UsersBalance created: ${amount} บาท`);
      } catch (usersBalanceError) {
        console.error(`   ⚠️  Failed to add to UsersBalance: ${usersBalanceError.message}`);
      }
    }

    return {
      success: true,
      newBalance: newBalance,
    };
  } catch (error) {
    console.error(`   ❌ ข้อผิดพลาด: ${error.message}`);
    throw error;
  }
}

async function _recordTransactionToSheetFromSlip(googleAuth, googleSheetId, userId, lineUserName, accessToken, slipData, balanceBefore = 0) {
  try {
    const sheets = google.sheets('v4');

    // ดึงจำนวนแถวปัจจุบัน
    const transResponse = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Transactions!A:A`,
    });

    const transRows = transResponse.data.values || [];
    const nextRowIndex = transRows.length + 1;

    const now = new Date();
    const dateStr = now.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const timeStr = now.toLocaleString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // ถ้าไม่ได้ส่ง balanceBefore มา ให้ดึงจาก Players sheet
    if (balanceBefore === 0) {
      console.log(`   📊 Fetching balance from Players sheet...`);
      const playerData = await sheets.spreadsheets.values.get({
        auth: googleAuth,
        spreadsheetId: googleSheetId,
        range: `Players!A:K`,
      });

      const playerDataRows = playerData.data.values || [];
      for (let i = 1; i < playerDataRows.length; i++) {
        if (playerDataRows[i] && playerDataRows[i][0] === userId) {
          balanceBefore = parseFloat(playerDataRows[i][4]) || 0;
          console.log(`   Found balance: ${balanceBefore}`);
          break;
        }
      }
    }

    const balanceAfter = balanceBefore + slipData.amount;

    console.log(`   💰 Balance Before: ${balanceBefore}`);
    console.log(`   💰 Amount: ${slipData.amount}`);
    console.log(`   💰 Balance After: ${balanceAfter}`);

    const transactionRow = [
      dateStr,
      lineUserName,
      'deposit',
      slipData.amount,
      slipData.referenceId || '',
      '',
      'verified',
      `Slip verified from LINE OA - Ref: ${slipData.referenceId}`,
      balanceBefore,
      balanceAfter,
      `${dateStr} ${timeStr}`,
      accessToken,
      userId,
    ];

    await sheets.spreadsheets.values.update({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Transactions!A${nextRowIndex}:M${nextRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [transactionRow],
      },
    });

    console.log(`   ✅ บันทึกรายการเงินสำเร็จ`);
  } catch (error) {
    console.error(`   ❌ ข้อผิดพลาด: ${error.message}`);
    throw error;
  }
}

// Get player balance
async function getPlayerBalance(userId, userName) {
  if (!googleAuth) {
    console.warn(`⚠️  googleAuth not initialized`);
    return { balance: 0, found: false };
  }
  
  try {
    console.log(`\n📊 === Getting Player Balance ===`);
    console.log(`   User ID: ${userId}`);
    console.log(`   User Name: ${userName}`);
    
    // ลองดึงข้อมูลหลายครั้งเพื่อรอให้ Google Sheets อัปเดตเสร็จ
    let retries = 3;
    let balance = 0;
    let found = false;
    let lastErrorWasQuota = false;
    
    while (retries > 0 && !found) {
      try {
        // ดึงข้อมูลจาก Players sheet
        const response = await sheets.spreadsheets.values.get({
          auth: googleAuth,
          spreadsheetId: GOOGLE_SHEET_ID,
          range: `Players!A:E`,
        });
        
        const rows = response.data.values || [];
        console.log(`   📊 Total rows in Players sheet: ${rows.length} (attempt ${4 - retries})`);
        
        // แสดงข้อมูลทั้งหมด (สำหรับ debug)
        if (rows.length > 1) {
          console.log(`   📋 Players data:`);
          for (let i = 1; i < Math.min(rows.length, 10); i++) {
            if (rows[i]) {
              console.log(`      Row ${i + 1}: Name=${rows[i][1]}, UserID=${rows[i][0]}, Balance=${rows[i][4]}`);
            }
          }
        }
        
        // ค้นหาผู้เล่นจาก User ID เป็นหลัก
        console.log(`   🔍 Searching by User ID: "${userId}"`);
        for (let i = 1; i < rows.length; i++) {
          if (rows[i] && rows[i][0] === userId) {  // ✅ Column A (index 0) = User ID
            balance = parseFloat(rows[i][4]) || 0;  // ✅ Column E (index 4) = Balance
            console.log(`   ✅ Found player by User ID at row ${i + 1}: ${rows[i][1]} (balance: ${balance} บาท)`);
            found = true;
            break;
          }
        }
        
        // ถ้าไม่พบจาก User ID ให้ลองค้นหาจากชื่อ LINE (fallback)
        if (!found) {
          console.log(`   ℹ️  Not found by User ID, searching by LINE name...`);
          for (let i = 1; i < rows.length; i++) {
            if (rows[i] && rows[i][1] === userName) {  // ✅ Column B (index 1) = ชื่อ
              balance = parseFloat(rows[i][4]) || 0;  // ✅ Column E (index 4) = Balance
              console.log(`   ✅ Found player by LINE name at row ${i + 1}: ${rows[i][1]} (balance: ${balance} บาท)`);
              found = true;
              break;
            }
          }
        }
        
        // ถ้าไม่พบ ให้รอและลองใหม่
        if (!found && retries > 1) {
          console.log(`   ⏳ Player not found, retrying in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (apiError) {
        console.error(`   ⚠️  API error (attempt ${4 - retries}): ${apiError.message}`);
        // ตรวจสอบว่าเป็น quota error หรือไม่
        if (apiError.code === 429 || apiError.response?.status === 429 || 
            apiError.message?.includes('Quota exceeded')) {
          if (retries <= 1) {
            // retry หมดแล้ว - ให้ return found: true เพื่อไม่ให้ระบบบอกว่า "ไม่พบในระบบ"
            console.warn(`   ⚠️  All retries exhausted due to quota error - assuming player exists`);
            console.log(`   📊 === End Getting Player Balance (QUOTA ERROR) ===\n`);
            return { balance: 0, found: true, apiError: true };
          }
        }
        if (retries > 1) {
          console.log(`   ⏳ Retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      retries--;
    }
    
    if (!found) {
      console.log(`   ⚠️  Player not found in sheet after retries (will return 0)`);
    }
    
    console.log(`   📊 === End Getting Player Balance ===\n`);
    return { balance, found };
  } catch (error) {
    console.error('❌ Error getting player balance:', error.message);
    console.log(`   📊 === End Getting Player Balance (ERROR) ===\n`);
    return { balance: 0, found: false };
  }
}

// Get all player balances (ยึดชื่อ LINE เป็นหลัก)
async function getPlayerBalances() {
  if (!googleAuth) {
    console.warn(`⚠️  googleAuth not initialized`);
    return {};
  }
  
  try {
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `Players!A:K`,
    });
    
    const rows = response.data.values || [];
    const balances = {};
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i]) {
        const userId = rows[i][0];
        const userName = rows[i][1] || 'Unknown';
        const balance = parseFloat(rows[i][4]) || 0;
        
        // ยึดชื่อ LINE เป็นหลัก
        if (userName && userName !== 'Unknown') {
          balances[userName] = balance;
          console.log(`   📊 Player: ${userName} - Balance: ${balance}`);
        }
        
        // เก็บ User ID เป็น backup
        if (userId) {
          balances[userId] = balance;
        }
      }
    }
    
    return balances;
  } catch (error) {
    console.error('❌ Error getting player balances:', error.message);
    return {};
  }
}

// ===== START SERVER =====
async function start() {
  try {
    await initializeSheets();
    
    // Register Slip Check API router
    const createSlipCheckApiRouter = require('./routes/slipCheckApi');
    const slipCheckApiRouter = createSlipCheckApiRouter(process.env.SLIP2GO_SECRET_KEY);
    app.use(upload.single('file'), slipCheckApiRouter);

    // Register Slip2Go webhook router
    const createSlip2GoWebhookRouter = require('./routes/slip2GoWebhook');
    const slip2GoRouter = createSlip2GoWebhookRouter(
      googleAuth,
      GOOGLE_SHEET_ID,
      LINE_CHANNEL_ACCESS_TOKEN_3,
      process.env.SLIP2GO_SECRET_KEY,
      reprocessStoredMessages  // Pass the re-processing function
    );
    app.use('/slip2go', slip2GoRouter);

    // Serve QR payment images
    app.use('/qrpayments', express.static('qrpayments'));

    // Register Line Slip Verification router
    const createLineSlipVerificationRouter = require('./routes/lineSlipVerificationWebhook');
    const slipVerificationRouter = createLineSlipVerificationRouter(
      process.env.SLIP2GO_SECRET_KEY,
      process.env.LINE_SLIP_VERIFICATION_ACCESS_TOKEN,
      process.env.LINE_SLIP_VERIFICATION_CHANNEL_SECRET,
      googleAuth,
      GOOGLE_SHEET_ID
    );
    app.use('/', slipVerificationRouter);
    
    app.listen(PORT, () => {
      console.log(`\n🚀 LINE Betting Bot listening on port ${PORT}`);
      console.log(`📍 Webhook URL: http://localhost:${PORT}/webhook`);
      console.log(`📍 Slip Check API: http://localhost:${PORT}/api/slip/verify`);
      console.log(`📍 Slip2Go Webhook URL: http://localhost:${PORT}/slip2go/slip-verified`);
      console.log(`✅ Ready to receive messages\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
