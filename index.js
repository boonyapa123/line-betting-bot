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
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.line.me',
      path: `/v2/bot/profile/${userId}`,
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
          const profile = JSON.parse(data);
          console.log(`      👤 Profile response:`, profile);
          resolve(profile.displayName || 'Unknown');
        } catch (e) {
          console.log(`      ❌ Parse error:`, e.message);
          resolve('Unknown');
        }
      });
    }).on('error', (err) => {
      console.log(`      ❌ API error:`, err.message);
      resolve('Unknown');
    }).end();
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
async function updateBetResult(rowIndex, resultNumber, resultSymbol) {
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
  } catch (error) {
    console.error('❌ Failed to update result:', error.message);
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
    console.log(`   📍 Groups for Account ${accountNumber}: ${accountGroupNames.join(', ')}`);
    
    // Parse all bets (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 1) continue;
      
      // Column N (index 13) = ชื่อกลุ่มแชท
      let rowGroupName = '';
      if (row.length > 13) {
        rowGroupName = row[13] || '';
      }
      
      if (i <= 3) {
        console.log(`   Row ${i}: length=${row.length}, col13="${rowGroupName}"`);
      }
      
      // Only include bets from groups in this account
      if (!accountGroupNames.includes(rowGroupName)) {
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
        betTypeB: row[12],
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
  
  // Get all numbers
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
  const betTypes = {
    'ถอย': 'ถอย',
    'ยั้ง': 'ยั้ง',
    'ล่าง': 'ล่าง',
    'บน': 'บน',
    'ชล': 'ชล',
    'ชถ': 'ชล',
    'สกัด': 'สกัด',
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
  // Look for numbers with separators
  const withSeparator = message.match(/\d+[.\/*\-]\d+(?:[.\/*\-]\d+)*/);
  if (withSeparator) {
    console.log(`      ✅ Firework name: ${withSeparator[0]}`);
    return withSeparator[0];
  }
  
  console.log(`      ❌ No firework name found`);
  return null;
}

// ===== PAIR DETECTION =====
const messageMap = new Map(); // messageId -> message data
const recordedPairs = new Set();
const unsendLog = new Map(); // messageId -> unsend details

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
async function appendToGoogleSheets(pair, userAName, userBName, groupName) {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }
  
  try {
    console.log('📤 Recording to Google Sheets...');
    
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
    
    // Use largest amount
    const betAmount = Math.max(betDetailsA.betAmount || 0, betDetailsB.betAmount || 0);
    
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
      timestamp,
      pair.userA,
      userAName,
      pair.messageA,
      betDetailsA.fireworkName || '',
      betDetailsA.betType || '',
      betAmount,
      betAmount,
      '',
      '',
      userBResult,
      userBName,
      oppositeBetType,
      groupName
    ];
    
    console.log(`   📊 Row data (14 columns):`);
    row.forEach((val, idx) => {
      console.log(`      [${idx}]: "${val}"`);
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
      range: `${GOOGLE_WORKSHEET_NAME}!A${nextRowIndex}:N${nextRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });
    
    console.log(`   ✅ Row appended successfully to row ${nextRowIndex}`);
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
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.line.me',
      path: `/v2/bot/message/${messageId}/content`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    };

    console.log(`   📡 Requesting: https://api.line.me/v2/bot/message/${messageId}/content`);

    https.request(options, (res) => {
      console.log(`   📡 Response status: ${res.statusCode}`);
      
      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', chunk => {
          errorData += chunk;
        });
        res.on('end', () => {
          console.error(`   ❌ Error response: ${errorData}`);
          reject(new Error(`Failed to download image: ${res.statusCode}`));
        });
        return;
      }

      let data = Buffer.alloc(0);
      res.on('data', chunk => {
        data = Buffer.concat([data, chunk]);
      });
      res.on('end', () => {
        console.log(`   ✅ Downloaded (${data.length} bytes)`);
        resolve(data);
      });
    }).on('error', (err) => {
      console.error(`   ❌ Request error: ${err.message}`);
      reject(err);
    }).end();
  });
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

// ===== WEBHOOK HANDLER =====
app.post('/webhook', async (req, res) => {
  try {
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
    
    const accessToken = credentials.token;
    const events = req.body.events || [];
    const accountNumber = getAccountNumber(channelId);
    
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
          const Slip2GoImageVerificationService = require('../services/betting/slip2GoImageVerificationService');
          const verificationService = new Slip2GoImageVerificationService(process.env.SLIP2GO_SECRET_KEY);
          
          const checkCondition = {
            checkDuplicate: process.env.SLIP_CHECK_DUPLICATE === 'true',
            checkReceiver: process.env.SLIP_CHECK_RECEIVER === 'true' ? [
              {
                accountType: '01004',
                accountNumber: accountNumber
              }
            ] : []
          };

          const verificationResult = await verificationService.verifySlipFromImage(imageBuffer, checkCondition);
          console.log(`   ✅ Verification result:`, verificationResult);

          // Create reply message
          const replyMessage = verificationService.createLineMessage(verificationResult);
          console.log(`   📝 Reply message created`);

          // Send reply to user
          console.log(`   📤 Sending reply to user...`);
          await sendLineMessageToUser(event.source.userId, replyMessage, accessToken);
          console.log(`   ✅ Reply sent`);

          // Record to Google Sheets if verified
          if (verificationService.isVerified(verificationResult)) {
            const slipData = verificationService.extractSlipData(verificationResult);
            console.log(`\n💾 Recording slip data:`, slipData);
            
            try {
              // Record to Players sheet
              console.log(`📝 Recording to Players sheet...`);
              await _recordPlayerToSheetFromSlip(
                googleAuth,
                GOOGLE_SHEET_ID,
                event.source.userId,
                verificationResult.data.amount
              );

              // Record to Transactions sheet
              console.log(`📝 Recording to Transactions sheet...`);
              await _recordTransactionToSheetFromSlip(
                googleAuth,
                GOOGLE_SHEET_ID,
                event.source.userId,
                slipData
              );

              console.log(`   ✅ Recorded to Google Sheets`);
            } catch (recordError) {
              console.error(`   ⚠️  Failed to record to Google Sheets: ${recordError.message}`);
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
          await sendLineMessage(message.groupId, summary, accessToken);
          console.log(`✅ Summary sent`);
        } else {
          // Check if this is a slip verification message from LINE OA
          const LineSlipParserService = require('./services/betting/lineSlipParserService');
          const slipParser = new LineSlipParserService();
          
          if (slipParser.isValidSlip(message.content)) {
            console.log(`📸 Slip verification message detected`);
            const slipData = slipParser.parseSlipMessage(message.content);
            
            if (slipData && slipData.amount) {
              console.log(`✅ Valid slip found: ${slipData.amount} บาท`);
              
              // Record to Players sheet
              console.log(`📝 Recording to Players sheet...`);
              const playerResult = await _recordPlayerToSheetFromSlip(
                googleAuth,
                GOOGLE_SHEET_ID,
                message.userId,
                slipData.amount
              );
              
              // Record to Transactions sheet
              console.log(`📝 Recording to Transactions sheet...`);
              await _recordTransactionToSheetFromSlip(
                googleAuth,
                GOOGLE_SHEET_ID,
                message.userId,
                slipData
              );
              
              // Send confirmation message
              const confirmMessage = `✅ ตรวจสอบสลิปสำเร็จ\n\n` +
                `💰 เติมเงิน: ${slipData.amount} บาท\n` +
                `💳 ยอดเงินใหม่: ${playerResult.newBalance} บาท\n\n` +
                `🎉 พร้อมเล่นแล้ว!`;
              
              await sendLineMessageToUser(message.userId, confirmMessage, accessToken);
              console.log(`✅ Confirmation sent`);
            }
          } else {
            // Check if this is a result announcement
            const resultData = parseResultMessage(message.content);
            
            if (resultData) {
              console.log(`📊 Result announcement detected`);
              console.log(`   Firework: ${resultData.fireworkName}`);
              console.log(`   Number: ${resultData.resultNumber}`);
              console.log(`   Result: ${resultData.result}`);
              
              // Find matching bets
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
                
                // Validate betting limits
                const betAmount = Math.max(betDetailsA.betAmount || 0, betDetailsB.betAmount || 0);
                let validationResult = { valid: true, message: 'OK' };
                
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
                const userABalance = await getPlayerBalance(pair.userA, userAName);
                const userBBalance = await getPlayerBalance(pair.userB, userBName);
                
                if (bettingLimitValidator) {
                  validationResult = bettingLimitValidator.validateBet({
                    amount: betAmount,
                    bettingType: betDetailsA.betType,
                    playerBalance: userABalance || 999999,
                    totalAmount: 0
                  });
                }
                
                if (!validationResult.valid) {
                  console.log(`❌ Betting limit validation failed: ${validationResult.message}`);
                  console.log(`   📱 Sending error via LINE Account: ${accountNumber === 1 ? 'Primary' : 'Secondary'}`);
                  const errorMessage = `❌ ${validationResult.message}`;
                  await sendLineMessage(message.groupId, errorMessage, accessToken);
                  
                  // Use Registration Bot (Secondary Account) for insufficient balance notifications
                  const registrationBotToken = LINE_CHANNEL_ACCESS_TOKEN_2;
                  
                  // Check if it's insufficient balance error
                  if (validationResult.message.includes('ยอดเงินไม่เพียงพอ')) {
                    // Send detailed message to User A if balance is insufficient
                    if (userABalance !== null && userABalance < betAmount) {
                      const userADetailMessage = `❌ ยอดเงินไม่เพียงพอ\n\n` +
                        `ชื่อ: ${userAName}\n` +
                        `ข้อความ: ${pair.messageA}\n` +
                        `ยอดเงินปัจจุบัน: ${userABalance} บาท\n` +
                        `ต้องการ: ${betAmount} บาท\n` +
                        `ขาดอีก: ${(betAmount - userABalance).toFixed(0)} บาท`;
                      console.log(`   📤 Sending insufficient balance message to ${userAName} via Registration Bot`);
                      await sendLineMessageToUser(pair.userA, userADetailMessage, registrationBotToken);
                    }
                    
                    // Send detailed message to User B if balance is insufficient
                    if (userBBalance !== null && userBBalance < betAmount) {
                      const userBDetailMessage = `❌ ยอดเงินไม่เพียงพอ\n\n` +
                        `ชื่อ: ${userBName}\n` +
                        `ข้อความ: ${pair.messageB}\n` +
                        `ยอดเงินปัจจุบัน: ${userBBalance} บาท\n` +
                        `ต้องการ: ${betAmount} บาท\n` +
                        `ขาดอีก: ${(betAmount - userBBalance).toFixed(0)} บาท`;
                      console.log(`   📤 Sending insufficient balance message to ${userBName} via Registration Bot`);
                      await sendLineMessageToUser(pair.userB, userBDetailMessage, registrationBotToken);
                    }
                  } else {
                    // Send generic error to both users
                    const userADetailMessage = `❌ ข้อผิดพลาด\n\n` +
                      `ชื่อ: ${userAName}\n` +
                      `ข้อความ: ${pair.messageA}\n\n` +
                      `${validationResult.message}`;
                    const userBDetailMessage = `❌ ข้อผิดพลาด\n\n` +
                      `ชื่อ: ${userBName}\n` +
                      `ข้อความ: ${pair.messageB}\n\n` +
                      `${validationResult.message}`;
                    
                    console.log(`   📤 Sending error message to ${userAName} and ${userBName}`);
                    await sendLineMessageToUser(pair.userA, userADetailMessage, registrationBotToken);
                    await sendLineMessageToUser(pair.userB, userBDetailMessage, registrationBotToken);
                  }
                } else {
                  // Record to Google Sheets
                  await appendToGoogleSheets(pair, userAName, userBName, groupName);
                  console.log(`✅ Pair recorded successfully`);
                }
              } else {
                console.log(`⏭️  No pair detected (waiting for reply)`);
              }
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

async function _recordPlayerToSheetFromSlip(googleAuth, googleSheetId, userId, amount) {
  try {
    const sheets = google.sheets('v4');

    // ตรวจสอบว่าผู้เล่นมีอยู่แล้วหรือไม่
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Players!A:J`,
    });

    const rows = response.data.values || [];
    let playerRowIndex = null;
    let currentBalance = 0;
    let totalDeposits = 0;

    // หาแถวของผู้เล่น
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === userId) {
        playerRowIndex = i + 1;
        currentBalance = parseFloat(rows[i][4]) || 0;
        totalDeposits = parseFloat(rows[i][5]) || 0;
        break;
      }
    }

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
      console.log(`   📝 อัปเดตผู้เล่น: ${userId}`);

      const updateResponse = await sheets.spreadsheets.values.get({
        auth: googleAuth,
        spreadsheetId: googleSheetId,
        range: `Players!A${playerRowIndex}:J${playerRowIndex}`,
      });

      const currentRow = updateResponse.data.values ? updateResponse.data.values[0] : [];

      const newRow = [
        userId,
        currentRow[1] || 'Unknown',
        currentRow[2] || '',
        currentRow[3] || '',
        newBalance,
        newTotalDeposits,
        currentRow[6] || 0,
        'active',
        currentRow[8] || dateStr,
        dateStr,
      ];

      await sheets.spreadsheets.values.update({
        auth: googleAuth,
        spreadsheetId: googleSheetId,
        range: `Players!A${playerRowIndex}:J${playerRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [newRow],
        },
      });

      console.log(`   ✅ อัปเดตสำเร็จ: ${newBalance} บาท`);
    } else {
      // สร้างผู้เล่นใหม่
      console.log(`   📝 สร้างผู้เล่นใหม่: ${userId}`);

      const newRow = [
        userId,
        'Unknown',
        '',
        '',
        amount,
        amount,
        0,
        'active',
        dateStr,
        dateStr,
      ];

      const nextRowIndex = rows.length + 1;

      await sheets.spreadsheets.values.update({
        auth: googleAuth,
        spreadsheetId: googleSheetId,
        range: `Players!A${nextRowIndex}:J${nextRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [newRow],
        },
      });

      console.log(`   ✅ สร้างสำเร็จ: ${amount} บาท`);
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

async function _recordTransactionToSheetFromSlip(googleAuth, googleSheetId, userId, slipData) {
  try {
    const sheets = google.sheets('v4');

    // ดึงข้อมูลผู้เล่นเพื่อหาชื่อ
    const playerResponse = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Players!A:B`,
    });

    const playerRows = playerResponse.data.values || [];
    let playerName = 'Unknown';

    for (let i = 1; i < playerRows.length; i++) {
      if (playerRows[i] && playerRows[i][0] === userId) {
        playerName = playerRows[i][1] || 'Unknown';
        break;
      }
    }

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

    // ดึงยอดเงินก่อนหน้า
    const playerData = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Players!A:E`,
    });

    const playerDataRows = playerData.data.values || [];
    let balanceBefore = 0;

    for (let i = 1; i < playerDataRows.length; i++) {
      if (playerDataRows[i] && playerDataRows[i][0] === userId) {
        balanceBefore = parseFloat(playerDataRows[i][4]) || 0;
        break;
      }
    }

    const balanceAfter = balanceBefore + slipData.amount;

    const transactionRow = [
      dateStr,
      playerName,
      'deposit',
      slipData.amount,
      slipData.referenceId || '',
      '',
      'verified',
      `Slip verified from LINE OA - Ref: ${slipData.referenceId}`,
      balanceBefore,
      balanceAfter,
      `${dateStr} ${timeStr}`,
    ];

    await sheets.spreadsheets.values.update({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Transactions!A${nextRowIndex}:K${nextRowIndex}`,
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
      process.env.SLIP2GO_SECRET_KEY
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
