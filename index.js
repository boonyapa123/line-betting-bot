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
    const options = {
      hostname: 'api.line.me',
      path: `/v2/bot/profile/${userId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const profile = JSON.parse(data);
          console.log(`      👤 Profile response:`, profile);
          if (profile.displayName) {
            resolve(profile.displayName);
          } else {
            console.log(`      ⚠️  No displayName in profile`);
            resolve('Unknown');
          }
        } catch (e) {
          console.log(`      ❌ Parse error:`, e.message);
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
  const opposites = {
    'ชล': 'ถอย',
    'ถอย': 'ชล',
    'ชถ': 'ถอย',
    'ยั้ง': 'ล่าง',
    'ล่าง': 'ยั้ง',
    'บน': 'ล่าง',
    'ล่าง': 'บน',
    'สูง': 'ต่ำ',
    'ต่ำ': 'สูง',
    'ถ': 'ชล',
    'ช': 'ถอย',
    'ย': 'ล่าง',
    'ล': 'ยั้ง',
    'บ': 'ล่าง',
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
  // Format: "ชื่อบั้งไฟ เลขที่ออก ✅/❌/⛔️"
  // Example: "อาจารย์อั๋น 310✅"
  
  const resultMatch = message.match(/(.+?)\s+(\d+)\s*(✅|❌|⛔️)/);
  if (!resultMatch) return null;
  
  return {
    fireworkName: resultMatch[1].trim(),
    resultNumber: resultMatch[2],
    result: resultMatch[3]
  };
}

// Find matching bets in Google Sheets
async function findMatchingBets(fireworkName, resultNumber) {
  if (!googleAuth) return [];
  
  try {
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:N`,
    });
    
    const rows = response.data.values || [];
    const matchingRows = [];
    
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 5) continue;
      
      // Column E (index 4) = ชื่อบั้งไฟ
      const rowFireworkName = row[4] || '';
      
      // Check if firework name matches
      if (rowFireworkName.toLowerCase().includes(fireworkName.toLowerCase()) ||
          fireworkName.toLowerCase().includes(rowFireworkName.toLowerCase())) {
        matchingRows.push({
          rowIndex: i + 1,
          data: row,
          fireworkName: rowFireworkName
        });
      }
    }
    
    return matchingRows;
  } catch (error) {
    console.error('❌ Error finding matching bets:', error.message);
    return [];
  }
}

// Update result in Google Sheets
async function updateBetResult(rowIndex, resultNumber, resultSymbol, accessToken) {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }
  
  try {
    // Column I (index 8) = ผลที่ออก
    // Column J (index 9) = ผลแพ้ชนะ User A
    // Column K (index 10) = ผลแพ้ชนะ User B (opposite)
    
    // Get opposite result for User B
    const oppositeResult = getOppositeResultSymbol(resultSymbol);
    
    // ดึงข้อมูลการเดิมพันจากชีท
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A${rowIndex}:N${rowIndex}`,
    });
    
    const row = response.data.values?.[0] || [];
    const userAId = row[1] || '';
    const userAName = row[2] || '';
    const userBId = row[11] || '';  // L = User B ID (index 11)
    const userBName = row[12] || '';  // M = ชื่อ User B (index 12)
    const betAmount = parseFloat(row[6]) || 0;
    const fireworkName = row[4] || '';
    const userAToken = row[15] || '';  // P = User A Token (index 15)
    const userBToken = row[17] || '';  // R = User B Token (index 17)
    const groupId = row[16] || '';     // Q = Group ID (index 16)
    
    // อัปเดตผลลัพธ์ในชีท
    await sheets.spreadsheets.values.update({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!I${rowIndex}:K${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[resultNumber, resultSymbol, oppositeResult]],
      },
    });
    
    console.log(`   ✅ Updated row ${rowIndex}: ${resultNumber} | User A: ${resultSymbol} | User B: ${oppositeResult}`);
    
    // 💰 คำนวนแพ้ชนะและอัปเดตยอดเงิน
    console.log(`   💰 Calculating winnings and updating balances...`);
    
    let userAWinnings = 0;
    let userBWinnings = 0;
    
    if (resultSymbol === '✅') {
      // User A ชนะ
      const commission = betAmount * 0.1; // 10% commission
      userAWinnings = betAmount - commission;
      userBWinnings = -betAmount;
    } else if (resultSymbol === '❌') {
      // User A แพ้
      userAWinnings = -betAmount;
      const commission = betAmount * 0.1; // 10% commission
      userBWinnings = betAmount - commission;
    } else {
      // เสมอ
      const commission = betAmount * 0.05; // 5% commission
      userAWinnings = -commission;
      userBWinnings = -commission;
    }
    
    // อัปเดตยอดเงินของ User A
    if (userAId && userAName) {
      await updatePlayerBalance(userAId, userAName, userAWinnings);
    }
    
    // อัปเดตยอดเงินของ User B
    if (userBId && userBName) {
      await updatePlayerBalance(userBId, userBName, userBWinnings);
    }
    
    // 📤 ส่งข้อความแจ้งผลให้ผู้เล่นทั้งสองฝั่ง
    console.log(`   📤 Sending result messages to players...`);
    
    // ดึงยอดเงินคงเหลือใหม่ของผู้เล่น
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
    
    if (resultSymbol === '✅') {
      // User A ชนะ
      const messageA = `✅ ชนะแล้ว\n\n` +
        `🎆 บั้งไฟ: ${fireworkName}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `🏆 ได้รับ: ${userAWinnings.toFixed(0)} บาท\n` +
        `💵 ยอดคงเหลือ: ${userANewBalance.toFixed(0)} บาท\n` +
        `${userBName ? `👤 ผู้แพ้: ${userBName}\n\n` : ''}\n` +
        `ยินดีด้วย! 🎉`;
      
      if (userAId && userAName) {
        await sendLineMessageToUser(userAId, messageA, userAToken);
      }
      
      // ส่งข้อความให้ User B ถ้ามี
      if (userBId && userBName) {
        const messageB = `❌ แพ้แล้ว\n\n` +
          `🎆 บั้งไฟ: ${fireworkName}\n` +
          `💰 เดิมพัน: ${betAmount} บาท\n` +
          `💸 เสีย: ${Math.abs(userBWinnings).toFixed(0)} บาท\n` +
          `💵 ยอดคงเหลือ: ${userBNewBalance.toFixed(0)} บาท\n` +
          `👤 ผู้ชนะ: ${userAName}\n\n` +
          `ลองใหม่นะ 💪`;
        
        await sendLineMessageToUser(userBId, messageB, userBToken);
      }
    } else if (resultSymbol === '❌') {
      // User A แพ้
      const messageA = `❌ แพ้แล้ว\n\n` +
        `🎆 บั้งไฟ: ${fireworkName}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `💸 เสีย: ${Math.abs(userAWinnings).toFixed(0)} บาท\n` +
        `💵 ยอดคงเหลือ: ${userANewBalance.toFixed(0)} บาท\n` +
        `${userBName ? `👤 ผู้ชนะ: ${userBName}\n\n` : ''}\n` +
        `ลองใหม่นะ 💪`;
      
      if (userAId && userAName) {
        await sendLineMessageToUser(userAId, messageA, userAToken);
      }
      
      // ส่งข้อความให้ User B ถ้ามี
      if (userBId && userBName) {
        const messageB = `✅ ชนะแล้ว\n\n` +
          `🎆 บั้งไฟ: ${fireworkName}\n` +
          `💰 เดิมพัน: ${betAmount} บาท\n` +
          `🏆 ได้รับ: ${userBWinnings.toFixed(0)} บาท\n` +
          `💵 ยอดคงเหลือ: ${userBNewBalance.toFixed(0)} บาท\n` +
          `👤 ผู้แพ้: ${userAName}\n\n` +
          `ยินดีด้วย! 🎉`;
        
        await sendLineMessageToUser(userBId, messageB, userBToken);
      }
    } else {
      // เสมอ
      const messageA = `⛔️ เสมอ\n\n` +
        `🎆 บั้งไฟ: ${fireworkName}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `💸 ค่าธรรมเนียม: ${Math.abs(userAWinnings).toFixed(0)} บาท\n` +
        `💵 ยอดคงเหลือ: ${userANewBalance.toFixed(0)} บาท\n` +
        `${userBName ? `👤 คู่แข่ง: ${userBName}\n\n` : ''}\n` +
        `ผลเสมอ 🤝`;
      
      if (userAId && userAName) {
        await sendLineMessageToUser(userAId, messageA, userAToken);
      }
      
      // ส่งข้อความให้ User B ถ้ามี
      if (userBId && userBName) {
        const messageB = `⛔️ เสมอ\n\n` +
          `🎆 บั้งไฟ: ${fireworkName}\n` +
          `💰 เดิมพัน: ${betAmount} บาท\n` +
          `💸 ค่าธรรมเนียม: ${Math.abs(userBWinnings).toFixed(0)} บาท\n` +
          `💵 ยอดคงเหลือ: ${userBNewBalance.toFixed(0)} บาท\n` +
          `👤 คู่แข่ง: ${userAName}\n\n` +
          `ผลเสมอ 🤝`;
        
        await sendLineMessageToUser(userBId, messageB, userBToken);
      }
    }
    
    console.log(`   ✅ Result messages sent successfully`);
  } catch (error) {
    console.error('❌ Failed to update result:', error.message);
  }
}

async function updatePlayerBalance(userId, userName, winnings) {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }
  
  try {
    console.log(`   💰 Updating balance for ${userName}: ${winnings > 0 ? '+' : ''}${winnings.toFixed(0)} บาท`);
    
    // ดึงข้อมูลผู้เล่นจากชีท Players
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `Players!A:D`,
    });
    
    const rows = response.data.values || [];
    let playerRowIndex = -1;
    let currentBalance = 0;
    
    // 🎯 ค้นหาตามชื่อ LINE เป็นหลัก
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      
      const playerName = row[0] || '';
      const balance = parseFloat(row[3]) || 0;
      
      // ตรวจสอบชื่อ LINE ก่อน
      if (playerName === userName) {
        playerRowIndex = i + 1;
        currentBalance = balance;
        console.log(`      🔍 Found player by LINE name: ${playerName}`);
        break;
      }
    }
    
    // ถ้าไม่พบตามชื่อ ค่อยค้นหาจาก Linked IDs
    if (playerRowIndex === -1) {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        
        const playerName = row[0] || '';
        const linkedIdsStr = row[1] || '';
        const balance = parseFloat(row[3]) || 0;
        
        try {
          const linkedIds = JSON.parse(linkedIdsStr);
          if (Array.isArray(linkedIds) && linkedIds.includes(userId)) {
            playerRowIndex = i + 1;
            currentBalance = balance;
            console.log(`      🔍 Found player by Linked ID: ${playerName}`);
            break;
          }
        } catch (e) {
          // ถ้า parse ไม่ได้ ให้ข้ามไป
        }
      }
    }
    
    if (playerRowIndex > 0) {
      const newBalance = Math.max(0, currentBalance + winnings); // ไม่ให้ยอดเงินติดลบ
      
      // อัปเดตยอดเงิน
      await sheets.spreadsheets.values.update({
        auth: googleAuth,
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `Players!D${playerRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[newBalance]],
        },
      });
      
      console.log(`      ✅ Balance updated: ${currentBalance} → ${newBalance} บาท`);
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
      range: `${GOOGLE_WORKSHEET_NAME}!A:N`,
    });
    
    const rows = response.data.values || [];
    const bets = [];
    let currentGroupName = 'Unknown Group';
    
    console.log(`📊 Total rows: ${rows.length}`);
    if (rows.length > 0) {
      console.log(`   Header (${rows[0].length} cols): ${JSON.stringify(rows[0])}`);
    }
    if (rows.length > 1) {
      console.log(`   Row 1 (${rows[1].length} cols): ${JSON.stringify(rows[1])}`);
    }
    
    // Get groups for this account
    const accountGroups = getGroupsForAccount(accountNumber);
    const accountGroupNames = accountGroups.map(g => g.name);
    console.log(`   📍 Groups for Account ${accountNumber}: ${accountGroupNames.join(', ') || 'ไม่มีกลุ่มที่ลงทะเบียน'}`);
    
    // If no groups registered, show all bets (fallback)
    const useAllBets = accountGroupNames.length === 0;
    if (useAllBets) {
      console.log(`   ⚠️  ไม่มีกลุ่มที่ลงทะเบียน จะแสดงเบตทั้งหมด`);
    }
    
    // Parse all bets (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 1) continue;
      
      // Column O (index 14) = ชื่อกลุ่มแชท
      let rowGroupName = '';
      if (row.length > 14) {
        rowGroupName = row[14] || '';
      }
      
      if (i <= 3) {
        console.log(`   Row ${i}: length=${row.length}, col14="${rowGroupName}"`);
      }
      
      // Only include bets from groups in this account (or all if no groups registered)
      if (!useAllBets && !accountGroupNames.includes(rowGroupName)) {
        continue;
      }
      
      // Store group name from any row that has it
      if (rowGroupName && currentGroupName === 'Unknown Group') {
        currentGroupName = rowGroupName;
        console.log(`   ✅ Found group name: ${currentGroupName}`);
      }
      
      // Column J (index 9) = ผลแพ้ชนะ User A
      // Column K (index 10) = ผลแพ้ชนะ User B
      const resultA = row[9] || '';
      const resultB = row[10] || '';
      
      // Only include bets with results
      if (!resultA && !resultB) continue;
      
      bets.push({
        timestamp: row[0],
        userA: row[1],
        userAName: row[2],
        messageA: row[3],
        fireworkName: row[4],
        betTypeA: row[5],
        amount: row[6],
        resultNumber: row[8],
        resultA: resultA,
        resultB: resultB,
        userB: row[11],
        userBName: row[11],
        betTypeB: row[13],
        groupName: rowGroupName
      });
    }
    
    if (bets.length === 0) {
      return '📊 ยังไม่มีการแทงที่มีผลลัพธ์';
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
    
    // Add group names if available
    const uniqueGroups = [...new Set(bets.map(b => b.groupName))];
    if (uniqueGroups.length > 0) {
      summary += `🏘️  กลุ่มแชท: ${uniqueGroups.join(', ')}\n`;
      summary += '═══════════════════\n\n';
    }
    
    for (const [pairKey, pairData] of Object.entries(pairs)) {
      let userAWins = 0;
      let userBWins = 0;
      let draws = 0;
      let totalAmount = 0;
      let userATotal = 0;
      let userBTotal = 0;
      let userACommission = 0;
      let userBCommission = 0;
      
      summary += `🎯 ${pairData.userAName} vs ${pairData.userBName}\n`;
      
      for (const bet of pairData.bets) {
        const betAmount = parseInt(bet.amount) || 0;
        totalAmount += betAmount;
        
        // Show bet details
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
    
    return summary;
  } catch (error) {
    console.error('❌ Error generating summary:', error.message);
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

function extractBetAmount(message) {
  if (!message) return null;
  
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
  // รูปแบบใหม่: ต1000, ย1000, ส1000, ล1000
  const newFormatMatch = message.match(/([ตยสล])(\d+)/);
  if (newFormatMatch) {
    const typeChar = newFormatMatch[1];
    const typeMap = {
      'ต': 'ต่ำ/ยั่ง',
      'ย': 'ต่ำ/ยั่ง',
      'ส': 'สูง/ไล่',
      'ล': 'สูง/ไล่'
    };
    const betType = typeMap[typeChar];
    console.log(`      ✅ Bet type (new format): ${betType}`);
    return betType;
  }
  
  // รูปแบบเดิม
  const betTypes = {
    'ถอย': 'ถอย',
    'ยั้ง': 'ยั้ง',
    'ล่าง': 'ล่าง',
    'บน': 'บน',
    'ชล': 'ชล',
    'ชถ': 'ชล',
    'สกัด': 'สกัด',
    'ติด': 'ยั้ง', // "ติด" = ยั้ง
    'สูง': 'สูง',
    'ต่ำ': 'ต่ำ',
    'ถ': 'ถอย',
    'ย': 'ยั้ง',
    'ล': 'ล่าง',
    'บ': 'บน',
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

function extractFireworkName(message) {
  // ลองค้นหาตัวเลขที่มีตัวคั่นก่อน (เช่น 310, 310.5, 310/5)
  const withSeparator = message.match(/\d+[.\/*\-]\d+(?:[.\/*\-]\d+)*/);
  if (withSeparator) {
    console.log(`      ✅ Firework name (with separator): ${withSeparator[0]}`);
    return withSeparator[0];
  }
  
  // ถ้าไม่พบ ให้ค้นหาชื่อบั้งไฟที่เป็นข้อความ (เช่น "ลูกชายภูน้อย", "ชล", "ชถ")
  // ค้นหาคำแรกที่ไม่ใช่ตัวเลขและไม่ใช่ประเภทเดิมพัน
  const betTypes = ['ถอย', 'ยั้ง', 'ล่าง', 'บน', 'ชล', 'ชถ', 'สกัด', 'ต่ำ', 'สูง', 'ไล่', '✅', '❌', 'ต', 'ย', 'ส', 'ล'];
  
  // แยกข้อความเป็นคำ
  const words = message.split(/\s+/);
  
  for (const word of words) {
    // ข้ามคำที่เป็นตัวเลข
    if (/^\d+$/.test(word)) continue;
    
    // ข้ามคำที่เป็นประเภทเดิมพัน
    if (betTypes.includes(word)) continue;
    
    // ข้ามคำที่เป็นสัญลักษณ์
    if (['✅', '❌', 'ต', 'ย', 'ส', 'ล'].includes(word)) continue;
    
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
async function appendToGoogleSheets(pair, userAName, userBName, groupName, matchType = 'reply') {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }
  
  try {
    console.log('📤 Recording to Google Sheets...');
    console.log(`   Match Type: ${matchType}`);
    
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
      betType: extractBetType(pair.messageA),
      betAmount: extractBetAmount(pair.messageA)
    };
    
    const betDetailsB = {
      fireworkName: extractFireworkName(pair.messageB),
      betType: extractBetType(pair.messageB),
      betAmount: extractBetAmount(pair.messageB)
    };
    
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
      '',                  // [9] = J: ผลแพ้ชนะ (ว่าง - อัปเดตเมื่อประกาศผล)
      '',                  // [10] = K: ผลแพ้ชนะ (ว่าง - อัปเดตเมื่อประกาศผล)
      pair.userB,          // [11] = L: User B ID (ตำแหน่ง K)
      userBName,           // [12] = M: ชื่อ User B (ตำแหน่ง L)
      oppositeBetType,     // [13] = N: รายการแทง (ตำแหน่ง M)
      groupName,           // [14] = O: ชื่อกลุ่มแชท (ตำแหน่ง N)
      userAToken,          // [15] = P: User A Token (ตำแหน่ง O)
      pair.groupId || '',  // [16] = Q: Group ID (ตำแหน่ง P)
      userBToken           // [17] = R: User B Token (ตำแหน่ง Q)
    ];
    
    console.log(`   📊 Row data (17 columns):`);
    row.forEach((val, idx) => {
      const colLetter = String.fromCharCode(65 + idx); // A=65
      console.log(`      [${colLetter}]: "${val}"`);
    });
    
    // Get current row count
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:A`,
    });
    
    const rows = response.data.values || [];
    const nextRowIndex = rows.length + 1;
    
    console.log(`   📊 Current rows: ${rows.length}, appending to row ${nextRowIndex}`);
    
    // Append row
    await sheets.spreadsheets.values.update({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A${nextRowIndex}:Q${nextRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });
    
    console.log(`   ✅ Row appended successfully to row ${nextRowIndex}`);
    
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

    https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`   ✅ Group message sent successfully`);
        } else {
          console.log(`   ⚠️  Group message send status: ${res.statusCode}`);
        }
        resolve(true);
      });
    })
      .on('error', (err) => {
        console.log(`   ❌ Error sending group message: ${err.message}`);
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
          let receiverAccount = getReceiverAccount(event.source.userId);
          
          if (!receiverAccount) {
            console.log(`   ⚠️  No receiver account configured`);
          } else {
            console.log(`   ✅ Using receiver account: ${receiverAccount}`);
          }
          
          const checkCondition = {
            checkDuplicate: true,  // ตรวจสอบสลิปซ้ำ
            checkReceiver: receiverAccount ? [
              {
                accountType: '01004',
                accountNumber: receiverAccount
              }
            ] : []
          };

          const verificationResult = await verificationService.verifySlipFromImage(imageBuffer, checkCondition);
          console.log(`   ✅ Verification result:`, verificationResult);

          // Get LINE user profile
          console.log(`👤 Getting LINE user profile...`);
          let lineUserName = 'Unknown';
          try {
            lineUserName = await getLineUserProfile(event.source.userId, accessToken);
            console.log(`   ✅ User name: ${lineUserName}`);
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

          // ตรวจสอบบัญชีตรงกันหรือไม่ SECOND
          if (!verificationService.isReceiverMatched(verificationResult)) {
            console.log(`\n❌ Receiver account not matched (Code: 200401)`);
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

          // ตรวจสอบสลิปจริงหรือไม่ THIRD (สลิปปลอม)
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
            const replyMessage = verificationService.createLineMessage(verificationResult);
            console.log(`   📝 Reply message created`);

            // Send reply to user AFTER recording
            console.log(`   📤 Sending reply to user...`);
            try {
              await sendLineMessageToUser(event.source.userId, replyMessage, accessToken);
              console.log(`   ✅ Reply sent`);
            } catch (replyError) {
              console.error(`   ⚠️  Failed to send reply: ${replyError.message}`);
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
          console.log(`📋 Summary command detected`);
          const summary = await generateBettingSummary(message.groupId, message.sourceType, accountNumber);
          
          // LINE has a 5000 character limit per message, so split if needed
          const maxLength = 4000;
          if (summary.length > maxLength) {
            const parts = [];
            let currentPart = '';
            const lines = summary.split('\n');
            
            for (const line of lines) {
              if ((currentPart + line + '\n').length > maxLength) {
                if (currentPart) parts.push(currentPart);
                currentPart = line + '\n';
              } else {
                currentPart += line + '\n';
              }
            }
            if (currentPart) parts.push(currentPart);
            
            console.log(`   📤 Sending ${parts.length} message parts`);
            for (const part of parts) {
              await sendLineMessage(message.groupId, part, accessToken);
            }
          } else {
            await sendLineMessage(message.groupId, summary, accessToken);
          }
          console.log(`✅ Summary sent`);
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
                  const winLoss = matchingService.calculateWinLoss(pair, resultData.result);
                  
                  // อัปเดตผลลัพธ์
                  await matchingService.updateResultAndBalance(pair, winLoss);
                  
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
                    resultLine = `🤝 ${pair.playerA.userAName} vs ${pair.playerB.userAName} เสมอ\n`;
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
              
              // Find matching bets (legacy)
              const matchingBets = await findMatchingBets(resultData.fireworkName, resultData.resultNumber);
              console.log(`   Found ${matchingBets.length} matching bet(s)`);
              
              // Update each matching bet
              for (const bet of matchingBets) {
                await updateBetResult(bet.rowIndex, resultData.resultNumber, resultData.result, accessToken);
              }
              
              if (matchingBets.length > 0) {
                console.log(`✅ Results updated successfully`);
              }
            } else {
              // ตรวจสอบว่าเป็นข้อความแทงหรือไม่
              const betAmount = extractBetAmount(message.content);
              
              if (betAmount > 0) {
                // นี่คือข้อความแทง ตรวจสอบยอดเงินทันที
                console.log(`💰 Betting message detected: ${betAmount} บาท`);
                
                // ดึงชื่อผู้เล่น
                const userName = await getLineUserProfile(message.userId, accessToken);
                console.log(`   Player: ${userName}`);
                
                // ตรวจสอบยอดเงินของผู้เล่น
                const playerBalanceData = await getPlayerBalance(message.userId, userName);
                const playerBalance = playerBalanceData.balance;
                const playerFound = playerBalanceData.found;
                
                console.log(`   Current balance: ${playerBalance} บาท (Found: ${playerFound})`);
                console.log(`   Bet amount: ${betAmount} บาท`);
                
                // ถ้าผู้เล่นไม่ลงทะเบียน ให้แจ้งเลย
                if (!playerFound) {
                  console.log(`❌ Player not registered: ${userName}`);
                  
                  // ใช้ balanceCheckService เพื่อส่งข้อความแจ้งเตือนผ่าน Account ที่ถูกต้อง
                  const balanceCheckService = require('./services/betting/balanceCheckService');
                  
                  // ส่งข้อความแจ้งเตือนส่วนตัวและในกลุ่มผ่าน balanceCheckService
                  await balanceCheckService.notifyPlayerNotRegistered(
                    userName,
                    message.userId,
                    accountNumber,
                    message.groupId // ส่ง groupId เพื่อแจ้งเตือนในกลุ่มด้วย
                  );
                  console.log(`   📤 Personal message sent to ${userName} via Account ${accountNumber}`);
                  console.log(`   📢 Group warning message sent via Account ${accountNumber}`);
                  
                  // ❌ หยุดการประมวลผลทันที ไม่บันทึกการเล่น
                  continue;

                } else if (playerBalance < betAmount) {
                  console.log(`❌ Insufficient balance for ${userName}`);
                  
                  // ใช้ balanceCheckService เพื่อส่งข้อความแจ้งเตือนผ่าน Account ที่ถูกต้อง
                  const balanceCheckService = require('./services/betting/balanceCheckService');
                  
                  // ส่งข้อความแจ้งเตือนส่วนตัวและในกลุ่มผ่าน balanceCheckService
                  await balanceCheckService.notifyInsufficientBalance(
                    userName,
                    playerBalance,
                    betAmount,
                    betAmount - playerBalance,
                    message.userId,
                    accountNumber,
                    message.groupId // ส่ง groupId เพื่อแจ้งเตือนในกลุ่มด้วย
                  );
                  console.log(`   📤 Personal message sent to ${userName} via Account ${accountNumber}`);
                  console.log(`   📢 Group warning message sent via Account ${accountNumber}`);
                  
                  // ❌ หยุดการประมวลผลทันที ไม่บันทึกการเล่น
                  continue;
                } else {
                  console.log(`✅ Balance sufficient for ${userName}`);
                  
                  // 🎯 AUTO MATCHING: ตรวจชื่อบั้งไฟต้องตรงกัน ใช้ยอดเงินน้อยกว่าเป็นหลัก
                  const betAmount = extractBetAmount(message.content);
                  const fireworkName = extractFireworkName(message.content);
                  const betType = extractBetType(message.content);
                  
                  if (betAmount > 0 && fireworkName && betType) {
                    console.log(`🔍 Looking for matching players for firework: ${fireworkName}`);
                    
                    // ดึงข้อมูลการเดิมพันทั้งหมดจาก Google Sheets
                    try {
                      const response = await sheets.spreadsheets.values.get({
                        auth: googleAuth,
                        spreadsheetId: GOOGLE_SHEET_ID,
                        range: `${GOOGLE_WORKSHEET_NAME}!A:O`,
                      });
                      
                      const rows = response.data.values || [];
                      const matchingBets = [];
                      
                      // ค้นหาการเดิมพันที่ยังไม่มีผลลัพธ์ และเล่นบั้งไฟเดียวกัน
                      for (let i = 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row) continue;
                        
                        const rowFireworkName = row[4] || ''; // Column E
                        const rowResultA = row[9] || ''; // Column J
                        const rowResultB = row[10] || ''; // Column K
                        const rowUserA = row[1] || ''; // Column B
                        const rowUserB = row[11] || ''; // Column L
                        const rowBetTypeA = row[5] || ''; // Column F
                        
                        // ตรวจสอบว่าเป็นการเดิมพันที่ยังไม่มีผลลัพธ์ และเล่นบั้งไฟเดียวกัน
                        // ✅ ต้องตรวจชื่อบั้งไฟให้ตรงกันทั้งหมด
                        if (!rowResultA && !rowResultB && 
                            rowFireworkName === fireworkName &&
                            rowUserA !== message.userId && rowUserB !== message.userId) {
                          
                          // ตรวจสอบว่าประเภทเดิมพันตรงข้ามกันหรือไม่
                          const isOpposite = (typeA, typeB) => {
                            const opposites = {
                              '✅': '❌',
                              '❌': '✅',
                              'ต่ำ/ยั่ง': 'สูง/ไล่',
                              'สูง/ไล่': 'ต่ำ/ยั่ง',
                              'ถอย': 'ยั้ง',
                              'ยั้ง': 'ถอย',
                              'ล่าง': 'บน',
                              'บน': 'ล่าง'
                            };
                            return opposites[typeA] === typeB;
                          };
                          
                          if (isOpposite(rowBetTypeA, betType)) {
                            matchingBets.push({
                              rowIndex: i + 1,
                              userA: rowUserA,
                              userB: rowUserB,
                              amountA: parseFloat(row[6]) || 0,
                              amountB: parseFloat(row[7]) || 0,
                              betTypeA: rowBetTypeA
                            });
                          }
                        }
                      }
                      
                      if (matchingBets.length > 0) {
                        console.log(`✅ Found ${matchingBets.length} matching bet(s)`);
                        
                        // จับคู่กับการเดิมพันแรกที่พบ
                        const matchedBet = matchingBets[0];
                        const matchedUserBalanceData = await getPlayerBalance(matchedBet.userA, '');
                        const matchedUserBalance = matchedUserBalanceData.balance || 0;
                        
                        // ✅ ยึดจากคนยอดน้อยกว่า
                        const finalBetAmount = Math.min(betAmount, matchedBet.amountA, matchedUserBalance, playerBalance);
                        
                        console.log(`🎯 Auto-matching with user: ${matchedBet.userA}`);
                        console.log(`   Final bet amount: ${finalBetAmount} บาท (using minimum)`);
                        
                        // บันทึกการเดิมพันใหม่ (ผู้เล่นที่จับคู่ vs ผู้เล่นปัจจุบัน)
                        const groupName = await getLineGroupName(message.groupId, accessToken);
                        const matchedUserName = await getLineUserProfile(matchedBet.userA, accessToken);
                        
                        const pair = {
                          userA: matchedBet.userA,
                          messageA: `${fireworkName} ${matchedBet.betTypeA} ${matchedBet.amountA}`,
                          timestampA: Date.now(),
                          userB: message.userId,
                          messageB: message.content,
                          timestampB: message.timestamp,
                          groupId: message.groupId
                        };
                        
                  try {
                    await appendToGoogleSheets(pair, matchedUserName, userName, groupName, 'auto');
                    console.log(`✅ Auto-matched pair recorded successfully`);
                  } catch (recordError) {
                    console.error(`❌ Failed to record pair: ${recordError.message}`);
                  }
                      } else {
                        console.log(`⏭️  No matching bets found, storing in memory for future matching...`);
                        
                        // 📝 เก็บการเดิมพันแรกไว้ในหน่วยความจำ (ไม่บันทึกลงชีท)
                        const tempPair = {
                          userA: message.userId,
                          messageA: message.content,
                          timestampA: message.timestamp,
                          userB: '', // ยังไม่มี User B
                          messageB: '',
                          timestampB: message.timestamp,
                          groupId: message.groupId
                        };
                        
                        // เก็บไว้ในตัวแปร messageMap เพื่อรอการจับคู่
                        messageMap.set(message.messageId, {
                          userId: message.userId,
                          content: message.content,
                          timestamp: message.timestamp,
                          groupId: message.groupId,
                          userName: userName,
                          betAmount: betAmount,
                          fireworkName: fireworkName,
                          betType: betType
                        });
                        
                        console.log(`   📦 Stored in memory: ${fireworkName} ${betType} ${betAmount} บาท`);
                      }
                    } catch (matchError) {
                      console.error(`⚠️  Error finding matching bets: ${matchError.message}`);
                    }
                  }
                }
              }
              
              // Detect pair
              const pair = detectPair(message);
              
              if (pair) {
                console.log(`   messageA: "${pair.messageA}"`);
                console.log(`   messageB: "${pair.messageB}"`);
                
                // Extract bet details
                const betDetailsA = {
                  fireworkName: extractFireworkName(pair.messageA),
                  betType: extractBetType(pair.messageA),
                  betAmount: extractBetAmount(pair.messageA)
                };
                
                const betDetailsB = {
                  fireworkName: extractFireworkName(pair.messageB),
                  betType: extractBetType(pair.messageB),
                  betAmount: extractBetAmount(pair.messageB)
                };
                
                console.log(`   🎯 Bet Details A: firework=${betDetailsA.fireworkName}, type=${betDetailsA.betType}, amount=${betDetailsA.betAmount}`);
                console.log(`   🎯 Bet Details B: firework=${betDetailsB.fireworkName}, type=${betDetailsB.betType}, amount=${betDetailsB.betAmount}`);
                
                // ตรวจสอบว่า User A มีประเภทเดิมพันหรือไม่
                if (!betDetailsA.betType) {
                  console.log(`❌ Missing bet type in User A message`);
                  return;
                }
                
                // ตรวจสอบว่าประเภทตรงข้ามกัน (✅ vs ❌ หรือ ต่ำ vs สูง)
                const isOpposite = (typeA, typeB) => {
                  const opposites = {
                    '✅': '❌',
                    '❌': '✅',
                    'ต่ำ/ยั่ง': 'สูง/ไล่',
                    'สูง/ไล่': 'ต่ำ/ยั่ง',
                    'ถอย': 'ยั้ง',
                    'ยั้ง': 'ถอย',
                    'ล่าง': 'บน',
                    'บน': 'ล่าง',
                    'ชล': 'ชล'
                  };
                  return opposites[typeA] === typeB;
                };
                
                // 🎯 REPLY MATCHING: ถ้า User B ไม่ระบุประเภท ให้ถือว่า User B เล่นฝั่งตรงข้าม
                let userBBetType = betDetailsB.betType;
                if (!userBBetType) {
                  // ถ้า User B ไม่ระบุประเภท ให้ใช้ประเภทตรงข้ามกับ User A
                  const opposites = {
                    '✅': '❌',
                    '❌': '✅',
                    'ต่ำ/ยั่ง': 'สูง/ไล่',
                    'สูง/ไล่': 'ต่ำ/ยั่ง',
                    'ถอย': 'ยั้ง',
                    'ยั้ง': 'ถอย',
                    'ล่าง': 'บน',
                    'บน': 'ล่าง',
                    'ชล': 'ชล'
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
                
                // 🎯 REPLY MATCHING: ยึด User A เป็นหลัก ไม่ต้องตรวจชื่อบั้งไฟ
                // ใช้ยอดเงินของ User A เป็นหลัก
                const betAmount = betDetailsA.betAmount || 0;
                
                // Fetch user names first
                console.log('👤 Fetching user profiles and group name...');
                const userAName = await getLineUserProfile(pair.userA, accessToken);
                const userBName = await getLineUserProfile(pair.userB, accessToken);
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
                  let groupWarningMessage = `⚠️ ⚠️ ⚠️ ผู้เล่นยังไม่ลงทะเบียน ⚠️ ⚠️ ⚠️\n\n`;
                  
                  // Send message to User A if not registered
                  if (!userAFound) {
                    const userADetailMessage = `❌ ยังไม่ลงทะเบียนในระบบ\n\n` +
                      `ชื่อ: ${userAName}\n` +
                      `ข้อความ: ${pair.messageA}\n\n` +
                      `💡 วิธีแก้ไข:\n` +
                      `1️⃣  ติดต่อแอดมิน\n` +
                      `2️⃣  ให้แอดมินเพิ่มชื่อของคุณในระบบ\n` +
                      `3️⃣  ลองเดิมพันใหม่อีกครั้ง\n\n` +
                      `📱 ติดต่อแอดมิน หากมีปัญหา`;
                    console.log(`   📤 Sending not registered message to ${userAName}`);
                    await sendLineMessageToUser(pair.userA, userADetailMessage, accessToken);
                    groupWarningMessage += `👤 ${userAName} ยังไม่ลงทะเบียน\n`;
                  }
                  
                  // Send message to User B if not registered
                  if (!userBFound) {
                    const userBDetailMessage = `❌ ยังไม่ลงทะเบียนในระบบ\n\n` +
                      `ชื่อ: ${userBName}\n` +
                      `ข้อความ: ${pair.messageB}\n\n` +
                      `💡 วิธีแก้ไข:\n` +
                      `1️⃣  ติดต่อแอดมิน\n` +
                      `2️⃣  ให้แอดมินเพิ่มชื่อของคุณในระบบ\n` +
                      `3️⃣  ลองเดิมพันใหม่อีกครั้ง\n\n` +
                      `📱 ติดต่อแอดมิน หากมีปัญหา`;
                    console.log(`   📤 Sending not registered message to ${userBName}`);
                    await sendLineMessageToUser(pair.userB, userBDetailMessage, accessToken);
                    groupWarningMessage += `👤 ${userBName} ยังไม่ลงทะเบียน\n`;
                  }
                  
                  // แจ้งในกลุ่มด้วย
                  groupWarningMessage += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                  groupWarningMessage += `💡 วิธีแก้ไข:\n`;
                  groupWarningMessage += `1️⃣  ติดต่อแอดมิน\n`;
                  groupWarningMessage += `2️⃣  ให้แอดมินเพิ่มชื่อในระบบ\n`;
                  groupWarningMessage += `3️⃣  ลองเดิมพันใหม่อีกครั้ง\n\n`;
                  groupWarningMessage += `📱 ติดต่อแอดมิน หากมีปัญหา`;
                  console.log(`   📢 Sending group warning message`);
                  await sendLineMessageToGroup(pair.groupId, groupWarningMessage, accessToken);
                } else if (userABalance < betAmount || userBBalance < betAmount) {
                  console.log(`❌ Insufficient balance detected`);
                  
                  // สร้างข้อความแจ้งเตือนในกลุ่ม
                  let groupWarningMessage = `⚠️ ⚠️ ⚠️ ยอดเงินไม่เพียงพอ ⚠️ ⚠️ ⚠️\n\n`;
                  
                  // Send detailed message to User A if balance is insufficient
                  if (userABalance < betAmount) {
                    const userADetailMessage = `❌ ยอดเงินไม่เพียงพอ\n\n` +
                      `ชื่อ: ${userAName}\n` +
                      `ข้อความ: ${pair.messageA}\n` +
                      `ยอดเงินปัจจุบัน: ${userABalance} บาท\n` +
                      `ต้องการ: ${betAmount} บาท\n` +
                      `ขาดอีก: ${(betAmount - userABalance).toFixed(0)} บาท\n\n` +
                      `💳 ช่องทางเติมเงิน:\n` +
                      `• เพิ่มเพื่อน @774pojob\n` +
                      `• https://lin.ee/JO6X7FE`;
                    console.log(`   📤 Sending insufficient balance message to ${userAName}`);
                    await sendLineMessageToUser(pair.userA, userADetailMessage, accessToken);
                    groupWarningMessage += `👤 ${userAName} ยอดเงินไม่พอ (ขาด ${(betAmount - userABalance).toFixed(0)} บาท)\n`;
                  }
                  
                  // Send detailed message to User B if balance is insufficient
                  if (userBBalance < betAmount) {
                    const userBDetailMessage = `❌ ยอดเงินไม่เพียงพอ\n\n` +
                      `ชื่อ: ${userBName}\n` +
                      `ข้อความ: ${pair.messageB}\n` +
                      `ยอดเงินปัจจุบัน: ${userBBalance} บาท\n` +
                      `ต้องการ: ${betAmount} บาท\n` +
                      `ขาดอีก: ${(betAmount - userBBalance).toFixed(0)} บาท\n\n` +
                      `💳 ช่องทางเติมเงิน:\n` +
                      `• เพิ่มเพื่อน @774pojob\n` +
                      `• https://lin.ee/JO6X7FE`;
                    console.log(`   📤 Sending insufficient balance message to ${userBName}`);
                    await sendLineMessageToUser(pair.userB, userBDetailMessage, accessToken);
                    groupWarningMessage += `👤 ${userBName} ยอดเงินไม่พอ (ขาด ${(betAmount - userBBalance).toFixed(0)} บาท)\n`;
                  }
                  
                  // แจ้งในกลุ่มด้วย
                  groupWarningMessage += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                  groupWarningMessage += `💡 วิธีแก้ไข:\n`;
                  groupWarningMessage += `1️⃣  โอนเงินเพิ่มเติมให้เพียงพอ\n`;
                  groupWarningMessage += `2️⃣  ส่งสลิปการโอนให้ระบบตรวจสอบ\n`;
                  groupWarningMessage += `3️⃣  รอการยืนยันจากระบบ\n`;
                  groupWarningMessage += `4️⃣  ลองเดิมพันใหม่อีกครั้ง\n\n`;
                  groupWarningMessage += `📱 ติดต่อแอดมิน หากมีปัญหา`;
                  console.log(`   📢 Sending group warning message`);
                  await sendLineMessageToGroup(pair.groupId, groupWarningMessage, accessToken);
                } else {
                  // ยอดเงินเพียงพอ บันทึกการเดิมพัน
                  console.log(`✅ Balance sufficient for both players`);
                  console.log(`   📝 Recording bet to Bets sheet...`);
                  
                  try {
                    await appendToGoogleSheets(pair, userAName, userBName, groupName, 'reply');
                    console.log(`✅ Pair recorded successfully`);
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
        const userName = await getLineUserProfile(userId, accessToken);
        
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
        actualUserName = await getLineUserProfile(userId, accessToken);
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
    ];

    await sheets.spreadsheets.values.update({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Transactions!A${nextRowIndex}:L${nextRowIndex}`,
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
    
    while (retries > 0 && !found) {
      // ดึงข้อมูลจาก Players sheet
      const response = await sheets.spreadsheets.values.get({
        auth: googleAuth,
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `Players!A:K`,
      });
      
      const rows = response.data.values || [];
      console.log(`   📊 Total rows in Players sheet: ${rows.length} (attempt ${4 - retries})`);
      
      // แสดงข้อมูลทั้งหมด (สำหรับ debug)
      if (rows.length > 1) {
        console.log(`   📋 Players data:`);
        for (let i = 1; i < Math.min(rows.length, 10); i++) {
          if (rows[i]) {
            console.log(`      Row ${i + 1}: Name=${rows[i][1]}, LinkedIDs=${rows[i][2]}, Balance=${rows[i][4]}`);
          }
        }
      }
      
      // ค้นหาผู้เล่นจาก ชื่อ LINE เป็นหลัก
      console.log(`   🔍 Searching by LINE name: "${userName}"`);
      for (let i = 1; i < rows.length; i++) {
        if (rows[i] && rows[i][1] === userName) {
          balance = parseFloat(rows[i][4]) || 0;
          console.log(`   ✅ Found player by LINE name at row ${i + 1}: ${rows[i][1]} (balance: ${balance} บาท)`);
          found = true;
          break;
        }
      }
      
      // ถ้าไม่พบจากชื่อ ให้ลองค้นหาจาก User ID ในรายการ Linked IDs
      if (!found) {
        console.log(`   ℹ️  Not found by LINE name, searching in Linked IDs...`);
        for (let i = 1; i < rows.length; i++) {
          if (rows[i] && rows[i][2]) {
            try {
              const linkedIds = JSON.parse(rows[i][2]);
              if (Array.isArray(linkedIds) && linkedIds.includes(userId)) {
                balance = parseFloat(rows[i][4]) || 0;
                console.log(`   ✅ Found player by Linked ID at row ${i + 1}: ${rows[i][1]} (balance: ${balance} บาท)`);
                found = true;
                break;
              }
            } catch (e) {
              // ถ้า parse JSON ไม่ได้ ให้ข้ามไป
            }
          }
        }
      }
      
      // ถ้าไม่พบ ให้ลองค้นหาจาก User ID ตรง (backup)
      if (!found) {
        console.log(`   ℹ️  Not found in Linked IDs, trying by User ID directly...`);
        for (let i = 1; i < rows.length; i++) {
          if (rows[i] && rows[i][0] === userId) {
            balance = parseFloat(rows[i][4]) || 0;
            console.log(`   ✅ Found player by User ID at row ${i + 1}: ${rows[i][1]} (balance: ${balance} บาท)`);
            found = true;
            break;
          }
        }
      }
      
      // ถ้าไม่พบ ให้รอและลองใหม่
      if (!found && retries > 1) {
        console.log(`   ⏳ Player not found, retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries--;
      } else {
        retries = 0;
      }
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
